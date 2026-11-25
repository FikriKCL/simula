import random
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select

from app.models import Attempt, Question, Quiz, QuizRun

from .badge_service import award_badge
from .common import ServiceError, add, record, require, transactional
from .learning_service import lock_learner
from .module_service import accessible_module, module_for_edit, unfinished_lessons


@transactional
def quiz_create(mid, data, user, db):
    module_for_edit(db, mid, user)
    quiz = add(
        db,
        Quiz(
            module_id=mid, title=data.title, kind=data.kind, pass_score=data.pass_score
        ),
    )
    for question in data.questions:
        add(db, Question(quiz_id=quiz.id, **question.model_dump(mode="json")))
    return record(quiz)


def snapshot(db, qid):
    return [
        record(q)
        for q in db.scalars(
            select(Question)
            .where(Question.quiz_id == qid, Question.active.is_(True))
            .order_by(Question.id)
        )
    ]


SEQUENCE_TYPES = ("ORDERING", "MATCHING")


def with_shuffle(questions):
    """Soal urutkan/cocokkan: opsi kanan diacak per sesi. perm[d] = indeks asli opsi yang tampil di posisi d."""
    out = []
    for q in questions:
        q = dict(q)
        if q.get("question_type") in SEQUENCE_TYPES:
            perm = list(range(len(q["options"])))
            # Jangan tampilkan dalam urutan benar (kalau bisa diacak)
            while len(perm) > 1 and perm == sorted(perm):
                random.shuffle(perm)
            q["perm"] = perm
        out.append(q)
    return out


def shown_options(q):
    perm = q.get("perm")
    return [q["options"][i] for i in perm] if perm else q["options"]


def public_questions(questions):
    return [
        dict(
            id=q["id"],
            prompt=q["prompt"],
            options=shown_options(q),
            question_type=q.get("question_type", "SINGLE_CHOICE"),
            image_url=q.get("image_url"),
            option_images=q.get("option_images", []),
            left_items=q.get("left_items") or [],
            left_images=q.get("left_images") or [],
        )
        for q in questions
    ]


def valid_answer(q, answer):
    n = len(q["options"])
    if q.get("question_type") in SEQUENCE_TYPES:
        # Daftar berisi setiap posisi tampil tepat sekali
        return isinstance(answer, list) and sorted(answer) == list(range(n))
    return isinstance(answer, int) and not isinstance(answer, bool) and 0 <= answer < n


def correct_answer(q):
    """Kunci jawaban dalam indeks yang dilihat siswa."""
    if q.get("question_type") in SEQUENCE_TYPES:
        perm = q.get("perm") or list(range(len(q["options"])))
        # ORDERING: posisi tampil untuk langkah ke-k; MATCHING: posisi tampil pasangan kiri ke-k
        return [perm.index(k) for k in range(len(perm))]
    return q["correct_index"]


def is_correct(q, answer):
    return answer == correct_answer(q)


def quiz_detail(qid, user, db):
    quiz = require(db.get(Quiz, qid))
    accessible_module(db, quiz.module_id, user)
    return dict(record(quiz), questions=public_questions(snapshot(db, qid)))


def eligible(db, quiz, user):
    module = accessible_module(db, quiz.module_id, user)
    if module.status != "PUBLISHED":
        raise ServiceError(409, "Kuis belum terbit")
    if quiz.kind == "POST" and db.scalar(
        unfinished_lessons(quiz.module_id, user["id"]).limit(1)
    ):
        raise ServiceError(403, "Selesaikan semua materi sebelum post-test")


@transactional
def start_run(qid, user, db):
    quiz = require(db.scalar(select(Quiz).where(Quiz.id == qid).with_for_update()))
    eligible(db, quiz, user)
    questions = with_shuffle(snapshot(db, qid))
    if not questions:
        raise ServiceError(409, "Bank soal belum memiliki soal aktif")
    run = add(
        db,
        QuizRun(
            user_id=user["id"],
            quiz_id=qid,
            question_snapshot=questions,
            pass_score=quiz.pass_score,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=60),
        ),
    )
    return {
        "id": run.id,
        "quiz_id": qid,
        "pass_score": run.pass_score,
        "expires_at": run.expires_at,
        "questions": public_questions(questions),
    }


def grade(db, quiz, questions, pass_score, data, user):
    if not questions or set(data.answers) != {q["id"] for q in questions}:
        raise ServiceError(422, "Jawab tepat semua soal pada kuis ini")
    if not all(valid_answer(q, data.answers[q["id"]]) for q in questions):
        raise ServiceError(422, "Indeks jawaban tidak valid")
    score = round(
        sum(is_correct(q, data.answers[q["id"]]) for q in questions)
        * 100
        / len(questions)
    )
    learner = lock_learner(db, user["id"])
    prior = db.scalar(
        select(Attempt.id)
        .where(
            Attempt.user_id == learner.id,
            Attempt.quiz_id == quiz.id,
            Attempt.passed.is_(True),
        )
        .limit(1)
    )
    attempt = add(
        db,
        Attempt(
            user_id=learner.id,
            quiz_id=quiz.id,
            score=score,
            passed=score >= pass_score,
            answers={str(k): v for k, v in data.answers.items()},
            question_snapshot=questions,
        ),
    )
    reward = 20 if attempt.passed and not prior and quiz.kind == "POST" else 0
    learner.xp += reward
    db.flush()
    award_badge(db, learner.id, quiz.module_id)
    from .certificate_service import issue

    certificate = (
        issue(db, attempt, quiz, learner)
        if attempt.passed and quiz.kind == "POST"
        else None
    )
    return dict(
        record(attempt),
        xp_awarded=reward,
        certificate_id=certificate.id if certificate else None,
        feedback=[
            {
                "question_id": q["id"],
                "correct": is_correct(q, data.answers[q["id"]]),
                "explanation": q["explanation"],
            }
            for q in questions
        ],
    )


def open_run(db, qid, rid, user):
    run = require(
        db.scalar(
            select(QuizRun)
            .where(
                QuizRun.id == rid, QuizRun.quiz_id == qid, QuizRun.user_id == user["id"]
            )
            .with_for_update()
            .execution_options(populate_existing=True)
        )
    )
    if run.submitted_at:
        raise ServiceError(409, "Tes sudah dikirim")
    expires = (
        run.expires_at
        if run.expires_at.tzinfo
        else run.expires_at.replace(tzinfo=timezone.utc)
    )
    if expires <= datetime.now(timezone.utc):
        raise ServiceError(409, "Sesi tes kedaluwarsa")
    return run


@transactional
def check_answer(qid, rid, data, user, db):
    """Periksa satu soal. Jawaban pertama dikunci, jadi umpan balik tidak bisa dipakai menebak ulang."""
    run = open_run(db, qid, rid, user)
    eligible(db, require(db.get(Quiz, qid)), user)
    question = next((q for q in run.question_snapshot if q["id"] == data.question_id), None)
    if not question:
        raise ServiceError(404, "Soal tidak ada di sesi ini")
    if not valid_answer(question, data.answer):
        raise ServiceError(422, "Jawaban tidak valid untuk tipe soal ini")
    checked = dict(run.checked_answers or {})
    answer = checked.setdefault(str(question["id"]), data.answer)
    run.checked_answers = checked
    db.flush()
    return {
        "question_id": question["id"],
        "answer": answer,
        "correct": is_correct(question, answer),
        "correct_index": correct_answer(question),
        "explanation": question["explanation"],
    }


@transactional
def submit_run(qid, rid, data, user, db):
    run = open_run(db, qid, rid, user)
    quiz = require(db.get(Quiz, qid))
    eligible(db, quiz, user)
    # Soal yang sudah diperiksa memakai jawaban terkunci, bukan kiriman baru.
    for key, answer in (run.checked_answers or {}).items():
        data.answers[int(key)] = answer
    result = grade(db, quiz, run.question_snapshot, run.pass_score, data, user)
    run.submitted_at = datetime.now(timezone.utc)
    run.attempt_id = result["id"]
    db.flush()
    return result


@transactional
def attempt_create(qid, data, user, db):
    # Legacy endpoint retained. New frontend uses run snapshots instead.
    quiz = require(db.scalar(select(Quiz).where(Quiz.id == qid).with_for_update()))
    eligible(db, quiz, user)
    return grade(db, quiz, snapshot(db, qid), quiz.pass_score, data, user)


def bank(qid, db):
    require(db.get(Quiz, qid))
    return [
        record(q)
        for q in db.scalars(
            select(Question).where(Question.quiz_id == qid).order_by(Question.id)
        )
    ]


def check_bank_capacity(qid, db):
    count = db.scalar(
        select(func.count(Question.id)).where(
            Question.quiz_id == qid, Question.active.is_(True)
        )
    )
    if count >= 50:
        raise ServiceError(
            409, "Maksimal 50 soal aktif per kuis; arsipkan soal terlebih dahulu"
        )


@transactional
def question_add(qid, data, db):
    require(db.scalar(select(Quiz).where(Quiz.id == qid).with_for_update()))
    check_bank_capacity(qid, db)
    return record(add(db, Question(quiz_id=qid, **data.model_dump(mode="json"))))


@transactional
def question_update(qid, question_id, data, db):
    require(db.scalar(select(Quiz).where(Quiz.id == qid).with_for_update()))
    question = require(
        db.scalar(
            select(Question).where(Question.id == question_id, Question.quiz_id == qid)
        )
    )
    for k, v in data.model_dump(mode="json").items():
        setattr(question, k, v)
    db.flush()
    return record(question)


@transactional
def question_archive(qid, question_id, data, db):
    require(db.scalar(select(Quiz).where(Quiz.id == qid).with_for_update()))
    question = require(
        db.scalar(
            select(Question).where(Question.id == question_id, Question.quiz_id == qid)
        )
    )
    if data.active and not question.active:
        check_bank_capacity(qid, db)
    question.active = data.active
    db.flush()
    return record(question)
