from datetime import datetime, timezone

from sqlalchemy import func, or_, select

from app.models import (
    Badge,
    Lesson,
    Material,
    MaterialProgress,
    Module,
    Topic,
    User,
    UserBadge,
)

from .common import ServiceError, add, record, records, require, transactional
from .learning_service import lock_learner
from .module_service import (
    accessible_module,
    module_for_edit,
    unfinished_lessons,
    unfinished_posttests,
)


def topics(db):
    return records(db.scalars(select(Topic).order_by(Topic.position, Topic.id)))


@transactional
def topic_edit(tid, data, db):
    topic = require(db.get(Topic, tid))
    topic.name = data.name
    topic.position = data.position
    db.flush()
    return record(topic)


@transactional
def material_create(lid, data, user, db):
    lesson = require(db.get(Lesson, lid))
    module_for_edit(db, lesson.module_id, user)
    return record(add(db, Material(lesson_id=lid, **data.model_dump(mode="json"))))


@transactional
def material_edit(aid, data, user, db):
    material = require(db.get(Material, aid))
    lesson = require(db.get(Lesson, material.lesson_id))
    module_for_edit(db, lesson.module_id, user)
    for k, v in data.model_dump(mode="json").items():
        setattr(material, k, v)
    db.flush()
    return record(material)


@transactional
def material_delete(aid, user, db):
    material = require(db.get(Material, aid))
    lesson = require(db.get(Lesson, material.lesson_id))
    module_for_edit(db, lesson.module_id, user)
    db.delete(material)
    db.flush()


def material_detail(aid, user, db):
    material = require(db.get(Material, aid))
    lesson = require(db.get(Lesson, material.lesson_id))
    accessible_module(db, lesson.module_id, user)
    progress = db.scalar(
        select(MaterialProgress).where(
            MaterialProgress.user_id == user["id"], MaterialProgress.material_id == aid
        )
    )
    return dict(
        record(material),
        opened=bool(progress),
        completed=bool(progress and progress.completed_at),
    )


def library(q, kind, topic_id, limit, offset, user, db):
    # Catalogue intentionally exposes titles/thumbnails, including locked levels, but no body or source URL.
    query = (
        select(Material, Module.id.label("module_id"), Module.level, Module.topic_id)
        .join(Lesson, Lesson.id == Material.lesson_id)
        .join(Module, Module.id == Lesson.module_id)
        .where(Module.status == "PUBLISHED")
    )
    if q:
        query = query.where(
            or_(
                Material.title.icontains(q, autoescape=True),
                Material.body.icontains(q, autoescape=True),
            )
        )
    if kind:
        query = query.where(Material.kind == kind)
    if topic_id:
        query = query.where(Module.topic_id == topic_id)
    total = db.scalar(select(func.count()).select_from(query.subquery()))
    items = []
    for mat, mid, level, tid in db.execute(
        query.order_by(Module.topic_id, Module.level, Material.position, Material.id)
        .limit(limit)
        .offset(offset)
    ):
        locked = False
        try:
            accessible_module(db, mid, user)
        except ServiceError as e:
            if e.status_code != 403:
                raise
            locked = True
        progress = db.scalar(
            select(MaterialProgress).where(
                MaterialProgress.user_id == user["id"],
                MaterialProgress.material_id == mat.id,
            )
        )
        items.append(
            {
                "id": mat.id,
                "lesson_id": mat.lesson_id,
                "module_id": mid,
                "topic_id": tid,
                "level": level,
                "title": mat.title,
                "kind": mat.kind,
                "thumbnail_url": mat.thumbnail_url,
                "page_count": mat.page_count,
                "duration_seconds": mat.duration_seconds,
                "locked": locked,
                "opened": bool(progress),
                "completed": bool(progress and progress.completed_at),
            }
        )
    return {"items": items, "total": total, "limit": limit, "offset": offset}


@transactional
def track(aid, completed, user, db):
    lock_learner(db, user["id"])
    material = require(db.get(Material, aid))
    lesson = require(db.get(Lesson, material.lesson_id))
    module = accessible_module(db, lesson.module_id, user)
    if module.status != "PUBLISHED":
        raise ServiceError(409, "Materi belum diterbitkan")
    progress = db.scalar(
        select(MaterialProgress).where(
            MaterialProgress.user_id == user["id"], MaterialProgress.material_id == aid
        )
    )
    if not progress:
        progress = add(db, MaterialProgress(user_id=user["id"], material_id=aid))
    if completed and not progress.completed_at:
        progress.completed_at = datetime.now(timezone.utc)
    db.flush()
    return {"id": aid, "opened": True, "completed": bool(progress.completed_at)}


def unfinished_materials(db, lid, uid):
    completed = (
        select(MaterialProgress.id)
        .where(
            MaterialProgress.material_id == Material.id,
            MaterialProgress.user_id == uid,
            MaterialProgress.completed_at.is_not(None),
        )
        .correlate(Material)
        .exists()
    )
    return db.scalar(
        select(Material.id)
        .where(Material.lesson_id == lid, Material.required.is_(True), ~completed)
        .limit(1)
    )


def learning_path(user, db):
    result = []
    for topic in db.scalars(select(Topic).order_by(Topic.position, Topic.id)):
        levels = []
        blocked = False
        for m in db.scalars(
            select(Module)
            .where(Module.topic_id == topic.id, Module.status == "PUBLISHED")
            .order_by(Module.level)
        ):
            total = db.scalar(
                select(func.count(Lesson.id)).where(Lesson.module_id == m.id)
            )
            unfinished = bool(db.scalar(unfinished_lessons(m.id, user["id"]).limit(1)))
            done_count = total - len(
                list(db.scalars(unfinished_lessons(m.id, user["id"])))
            )
            tests_done = not bool(
                db.scalar(unfinished_posttests(m.id, user["id"]).limit(1))
            )
            done = bool(total) and not unfinished and tests_done
            levels.append(
                {
                    "id": m.id,
                    "title": m.title,
                    "level": m.level,
                    "status": "COMPLETED"
                    if done
                    else "LOCKED"
                    if blocked
                    else "AVAILABLE",
                    "total_lessons": total,
                    "completed_lessons": done_count,
                    "posttests_passed": tests_done,
                }
            )
            if not done:
                blocked = True
        result.append(
            {"id": topic.id, "code": topic.code, "name": topic.name, "levels": levels}
        )
    return result


@transactional
def edit_profile(data, user, db):
    account = require(db.get(User, user["id"]))
    for k, v in data.model_dump(mode="json").items():
        setattr(account, k, v)
    db.flush()
    return {k: v for k, v in record(account).items() if k != "password_hash"}


def profile(user, db):
    account = require(db.get(User, user["id"]))
    path = learning_path(user, db)
    levels = [m for t in path for m in t["levels"]]
    badge_rows = db.execute(
        select(Badge, UserBadge.earned_at)
        .join(Module, Module.id == Badge.module_id)
        .outerjoin(
            UserBadge,
            (UserBadge.badge_id == Badge.id) & (UserBadge.user_id == user["id"]),
        )
        .where(Module.status == "PUBLISHED")
        .order_by(Module.topic_id, Module.level)
    )
    badges = [
        dict(record(b), earned=earned_at is not None, earned_at=earned_at)
        for b, earned_at in badge_rows
    ]
    stats = []
    for kind in ("PDF", "VIDEO", "COMIC"):
        base = (
            select(Material.id)
            .join(Lesson, Lesson.id == Material.lesson_id)
            .join(Module, Module.id == Lesson.module_id)
            .where(Material.kind == kind, Module.status == "PUBLISHED")
        )
        total = db.scalar(select(func.count()).select_from(base.subquery()))
        tracked = select(MaterialProgress).where(
            MaterialProgress.user_id == user["id"],
            MaterialProgress.material_id.in_(base),
        )
        opened = db.scalar(select(func.count()).select_from(tracked.subquery()))
        completed = db.scalar(
            select(func.count()).select_from(
                tracked.where(MaterialProgress.completed_at.is_not(None)).subquery()
            )
        )
        stats.append(
            {"kind": kind, "total": total, "opened": opened, "completed": completed}
        )
    available = [m["level"] for m in levels if m["status"] == "AVAILABLE"]
    return {
        "user": {k: v for k, v in record(account).items() if k != "password_hash"},
        "completed_levels": sum(m["status"] == "COMPLETED" for m in levels),
        "total_levels": len(levels),
        "current_level": available[0] if available else None,
        "earned_badges": sum(b["earned"] for b in badges),
        "opened_materials": sum(s["opened"] for s in stats),
        "badges": badges,
        "material_progress": stats,
    }
