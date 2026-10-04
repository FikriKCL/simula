from sqlalchemy import exists, or_, select

from app.models import Attempt, Lesson, Module, Progress, Quiz

from .common import ServiceError, add, record, records, require, transactional


def module_for_edit(db, mid, user):
    module = require(
        db.scalar(
            select(Module)
            .where(Module.id == mid)
            .with_for_update()
            .execution_options(populate_existing=True)
        )
    )
    if user["role"] != "ADMIN" and module.created_by != user["id"]:
        raise ServiceError(403, "Hanya pembuat atau admin dapat mengubah modul")
    if module.status not in ("DRAFT", "REJECTED"):
        raise ServiceError(
            409, "Modul sedang ditinjau atau sudah terbit; buat modul baru untuk revisi"
        )
    return module


def unfinished_lessons(mid, uid):
    completed = exists(
        select(Progress.id)
        .where(Progress.lesson_id == Lesson.id, Progress.user_id == uid)
        .correlate(Lesson)
    )
    return select(Lesson.id).where(Lesson.module_id == mid, ~completed)


def accessible_module(db, mid, user):
    module = require(db.get(Module, mid))
    if user["role"] in ("ADMIN", "REVIEWER") or (
        user["role"] == "INSTRUCTOR" and module.created_by == user["id"]
    ):
        return module
    if module.status != "PUBLISHED":
        raise ServiceError(404, "Modul belum diterbitkan")
    has_lessons = exists(
        select(Lesson.id).where(Lesson.module_id == Module.id).correlate(Module)
    )
    unfinished = unfinished_lessons(Module.id, user["id"]).correlate(Module).exists()
    locked = db.scalar(
        select(Module.id)
        .where(
            Module.status == "PUBLISHED",
            Module.level < module.level,
            Module.topic_id == module.topic_id,
            or_(
                ~has_lessons,
                unfinished,
                unfinished_posttests(Module.id, user["id"]).correlate(Module).exists(),
            ),
        )
        .limit(1)
    )
    if locked:
        raise ServiceError(403, "Selesaikan materi level sebelumnya")
    return module


def modules(limit, offset, user, db):
    query = select(Module)
    if user["role"] not in ("ADMIN", "REVIEWER"):
        query = query.where(
            or_(Module.status == "PUBLISHED", Module.created_by == user["id"])
        )
    return records(db.scalars(query.order_by(Module.level).limit(limit).offset(offset)))


@transactional
def module_create(data, user, db):
    return record(add(db, Module(**data.model_dump(), created_by=user["id"])))


@transactional
def module_update(mid, data, user, db):
    module = module_for_edit(db, mid, user)
    for key, value in data.model_dump().items():
        setattr(module, key, value)
    module.status = "DRAFT"
    module.review_note = None
    module.reviewed_by = None
    db.flush()
    return record(module)


def module_detail(mid, user, db):
    result = record(accessible_module(db, mid, user))
    result["lessons"] = records(
        db.scalars(
            select(Lesson).where(Lesson.module_id == mid).order_by(Lesson.position)
        )
    )
    result["quizzes"] = records(
        db.scalars(select(Quiz).where(Quiz.module_id == mid).order_by(Quiz.id))
    )
    return result


def lesson_values(data):
    return data.model_dump(mode="json")


@transactional
def lesson_create(mid, data, user, db):
    module_for_edit(db, mid, user)
    return record(add(db, Lesson(module_id=mid, **lesson_values(data))))


@transactional
def lesson_update(lid, data, user, db):
    lesson = require(db.get(Lesson, lid))
    module_for_edit(db, lesson.module_id, user)
    for key, value in lesson_values(data).items():
        setattr(lesson, key, value)
    db.flush()
    return record(lesson)


@transactional
def lesson_delete(lid, user, db):
    lesson = require(db.get(Lesson, lid))
    module_for_edit(db, lesson.module_id, user)
    db.delete(lesson)
    db.flush()


@transactional
def submit_review(mid, user, db):
    module = module_for_edit(db, mid, user)
    if not db.scalar(select(Lesson.id).where(Lesson.module_id == mid).limit(1)):
        raise ServiceError(422, "Tambahkan minimal satu materi")
    module.status = "PENDING"
    module.review_note = None
    module.reviewed_by = None
    db.flush()
    return record(module)


@transactional
def review_module(mid, data, user, db):
    module = require(
        db.scalar(
            select(Module)
            .where(Module.id == mid)
            .with_for_update()
            .execution_options(populate_existing=True)
        )
    )
    if module.created_by == user["id"]:
        raise ServiceError(403, "Materi harus divalidasi oleh akun lain")
    if module.status != "PENDING":
        raise ServiceError(409, "Modul tidak sedang menunggu validasi")
    module.status = "PUBLISHED" if data.approved else "REJECTED"
    module.review_note = data.note
    module.reviewed_by = user["id"]
    db.flush()
    return record(module)


def unfinished_posttests(mid, uid):
    passed = exists(
        select(Attempt.id)
        .where(
            Attempt.quiz_id == Quiz.id, Attempt.user_id == uid, Attempt.passed.is_(True)
        )
        .correlate(Quiz)
    )
    return select(Quiz.id).where(Quiz.module_id == mid, Quiz.kind == "POST", ~passed)
