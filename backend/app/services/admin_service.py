from datetime import timezone
from sqlalchemy import select, func, or_
from app.models import User, Topic, Module, Lesson, Material, MaterialProgress, Progress, Quiz, Question, Attempt
from .common import record, require, ServiceError, transactional


def account_out(user):
    return {k: getattr(user, k) for k in ("id", "username", "display_name", "email", "role", "active", "registration_status", "created_at", "school_id", "xp")}


def accounts(db, q, status, limit, offset):
    query = select(User).where(User.role == "STUDENT")
    if q:
        query = query.where(or_(User.display_name.icontains(q, autoescape=True), User.username.icontains(q, autoescape=True), User.email.icontains(q, autoescape=True)))
    if status:
        query = query.where(User.registration_status == status)
    total = db.scalar(select(func.count()).select_from(query.subquery()))
    rows = db.scalars(query.order_by(User.created_at.desc(), User.id.desc()).limit(limit).offset(offset))
    return {"items": [account_out(u) for u in rows], "total": total, "limit": limit, "offset": offset}


@transactional
def registration(uid, data, db):
    user = require(db.scalar(select(User).where(User.id == uid).with_for_update()))
    if user.role != "STUDENT":
        raise ServiceError(409, "Persetujuan pendaftaran hanya untuk siswa")
    user.registration_status = data.status
    user.active = data.status == "APPROVED"
    db.flush()
    return account_out(user)


def content(db):
    # Admin-only metadata tree, including drafts; never expose password hashes or quiz answers.
    return {
        "topics": [record(t) for t in db.scalars(select(Topic).order_by(Topic.position, Topic.id))],
        "modules": [record(m) for m in db.scalars(select(Module).order_by(Module.topic_id, Module.level))],
        "lessons": [record(l) for l in db.scalars(select(Lesson).order_by(Lesson.module_id, Lesson.position))],
        "quizzes": [record(q) for q in db.scalars(select(Quiz).order_by(Quiz.module_id, Quiz.id))],
    }


def materials(db, lid, limit, offset):
    require(db.get(Lesson, lid))
    query = select(Material).where(Material.lesson_id == lid)
    return {"items": [record(m) for m in db.scalars(query.order_by(Material.position, Material.id).limit(limit).offset(offset))],
            "total": db.scalar(select(func.count()).select_from(query.subquery())), "limit": limit, "offset": offset,
            "next_position": (db.scalar(select(func.max(Material.position)).where(Material.lesson_id == lid)) or 0) + 1}


def overview(db):
    count = lambda model, *conditions: db.scalar(select(func.count()).select_from(model).where(*conditions))
    return {"students": count(User, User.role == "STUDENT"),
            "pending": count(User, User.role == "STUDENT", User.registration_status == "PENDING"),
            "materials": count(Material), "active_questions": count(Question, Question.active.is_(True)),
            "published_modules": count(Module, Module.status == "PUBLISHED")}


def members(db, q, limit, offset):
    accounts_page = accounts(db, q, None, limit, offset)
    # Progress is completed published lessons / published lessons, per topic and overall.
    lesson_topics = list(db.execute(select(Lesson.id, Topic.code).join(Module, Module.id == Lesson.module_id).join(Topic, Topic.id == Module.topic_id).where(Module.status == "PUBLISHED")))
    lesson_ids = {lid for lid, code in lesson_topics}
    totals = {code: sum(c == code for _, c in lesson_topics) for code in ("PP", "ASB", "KR")}
    for user in accounts_page["items"]:
        uid = user["id"]
        done = set(db.scalars(select(Progress.lesson_id).where(Progress.user_id == uid))) & lesson_ids
        user["progress"] = {code: round(100 * sum(lid in done and c == code for lid, c in lesson_topics) / total) if total else 0 for code, total in totals.items()}
        user["total_progress"] = round(100 * len(done) / len(lesson_ids)) if lesson_ids else 0
        timestamps = [db.scalar(select(func.max(Progress.completed_at)).where(Progress.user_id == uid)),
                      db.scalar(select(func.max(MaterialProgress.opened_at)).where(MaterialProgress.user_id == uid)),
                      db.scalar(select(func.max(MaterialProgress.completed_at)).where(MaterialProgress.user_id == uid)),
                      db.scalar(select(func.max(Attempt.created_at)).where(Attempt.user_id == uid))]
        user["last_learning_at"] = max((t.replace(tzinfo=timezone.utc) if t.tzinfo is None else t for t in timestamps if t), default=None)
    return accounts_page


def workspace(db):
    # Complete admin workspace for the supplied UI's local search/filter/pagination.
    return dict(content(db), members=members(db, "", 1000000, 0)["items"],
                registrations=accounts(db, "", None, 1000000, 0)["items"],
                materials=[record(m) for m in db.scalars(select(Material).order_by(Material.id))],
                questions=[record(q) for q in db.scalars(select(Question).where(Question.active.is_(True)).order_by(Question.id))])


def editable_admin_module(db, mid, withdraw):
    row = require(db.scalar(select(Module).where(Module.id == mid).with_for_update()))
    if row.status == "PUBLISHED":
        if not withdraw:
            raise ServiceError(409, "Konfirmasi tarik dari publikasi sebelum mengubah materi terbit")
        row.status = "DRAFT"
        row.reviewed_by = None
        row.review_note = None
    elif row.status not in ("DRAFT", "REJECTED"):
        raise ServiceError(409, "Modul sedang ditinjau")
    return row


@transactional
def edit_material(aid, data, withdraw, db):
    mat = require(db.get(Material, aid))
    lesson = require(db.get(Lesson, mat.lesson_id))
    editable_admin_module(db, lesson.module_id, withdraw)
    if db.scalar(select(Material.id).where(Material.lesson_id == mat.lesson_id, Material.position == data.position, Material.id != mat.id)):
        raise ServiceError(409, "Urutan materi sudah dipakai")
    for k, v in data.model_dump(mode="json").items():
        setattr(mat, k, v)
    db.flush()
    return record(mat)


@transactional
def delete_material(aid, withdraw, db):
    mat = require(db.get(Material, aid))
    lesson = require(db.get(Lesson, mat.lesson_id))
    editable_admin_module(db, lesson.module_id, withdraw)
    db.delete(mat)
    db.flush()


@transactional
def create_material(lid, data, withdraw, db):
    lesson = require(db.get(Lesson, lid))
    editable_admin_module(db, lesson.module_id, withdraw)
    if db.scalar(select(Material.id).where(Material.lesson_id == lid, Material.position == data.position)):
        raise ServiceError(409, "Urutan materi sudah dipakai")
    mat = Material(lesson_id=lid, **data.model_dump(mode="json"))
    db.add(mat)
    db.flush()
    return record(mat)
