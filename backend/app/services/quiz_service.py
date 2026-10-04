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
        add(db, Question(quiz_id=quiz.id, **question.model_dump()))
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


def public_questions(questions):
    return [{k: q[k] for k in ("id", "prompt", "options")} for q in questions]


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
    questions = snapshot(db, qid)
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
    if any(
        data.answers[q["id"]] < 0 or data.answers[q["id"]] >= len(q["options"])
        for q in questions
    ):
        raise ServiceError(422, "Indeks jawaban tidak valid")
    score = round(
        sum(data.answers[q["id"]] == q["correct_index"] for q in questions)
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
                "correct": data.answers[q["id"]] == q["correct_index"],
                "explanation": q["explanation"],
            }
            for q in questions
        ],
    )


@transactional
def submit_run(qid, rid, data, user, db):
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
    quiz = require(db.get(Quiz, qid))
    eligible(db, quiz, user)
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
    return record(add(db, Question(quiz_id=qid, **data.model_dump())))


@transactional
def question_update(qid, question_id, data, db):
    require(db.scalar(select(Quiz).where(Quiz.id == qid).with_for_update()))
    question = require(
        db.scalar(
            select(Question).where(Question.id == question_id, Question.quiz_id == qid)
        )
    )
    for k, v in data.model_dump().items():
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
