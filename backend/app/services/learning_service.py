from sqlalchemy import and_, func, select

from app.models import Attempt, Lesson, Module, Progress, User

from .badge_service import award_badge
from .common import ServiceError, add, records, require, transactional
from .module_service import accessible_module


def lock_learner(db, uid):
    return require(
        db.scalar(
            select(User)
            .where(User.id == uid)
            .with_for_update()
            .execution_options(populate_existing=True)
        )
    )


@transactional
def complete(lid, user, db):
    learner = lock_learner(db, user["id"])
    lesson = require(db.get(Lesson, lid))
    module = accessible_module(db, lesson.module_id, user)
    if module.status != "PUBLISHED":
        raise ServiceError(409, "Hanya materi terbit dapat diselesaikan")
    from .content_service import unfinished_materials

    if unfinished_materials(db, lid, user["id"]):
        raise ServiceError(403, "Selesaikan materi wajib pada pelajaran ini")
    already = db.scalar(
        select(Progress.id).where(
            Progress.user_id == learner.id, Progress.lesson_id == lid
        )
    )
    if not already:
        add(db, Progress(user_id=learner.id, lesson_id=lid))
        learner.xp += 10
        db.flush()
    award_badge(db, learner.id, lesson.module_id)
    return {"completed": True, "xp_awarded": 0 if already else 10}


def progress(user, db):
    query = (
        select(
            Module.id,
            Module.title,
            Module.level,
            func.count(Lesson.id).label("total"),
            func.count(Progress.id).label("completed"),
        )
        .outerjoin(Lesson, Lesson.module_id == Module.id)
        .outerjoin(
            Progress,
            and_(Progress.lesson_id == Lesson.id, Progress.user_id == user["id"]),
        )
        .where(Module.status == "PUBLISHED")
        .group_by(Module.id, Module.title, Module.level)
        .order_by(Module.level)
    )
    return [dict(row) for row in db.execute(query).mappings()]


def attempts(limit, offset, user, db):
    return records(
        db.scalars(
            select(Attempt)
            .where(Attempt.user_id == user["id"])
            .order_by(Attempt.id.desc())
            .limit(limit)
            .offset(offset)
        )
    )
