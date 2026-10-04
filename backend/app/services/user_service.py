from sqlalchemy import select

from app.models import User
from app.security import hasher

from .common import ServiceError, add, record, require, transactional


@transactional
def create_user(data, role, db):
    if db.scalar(select(User.id).where(User.username == data.username)):
        raise ServiceError(409, "Username sudah terdaftar")
    if data.email and db.scalar(
        select(User.id).where(User.email == str(data.email).lower())
    ):
        raise ServiceError(409, "Email sudah terdaftar")
    user = add(
        db,
        User(
            username=data.username,
            display_name=data.display_name,
            password_hash=hasher.hash(data.password),
            email=str(data.email).lower() if data.email else None,
            school_id=data.school_id,
            role=role,
        ),
    )
    # Always serialize through an allow-list to keep password_hash private.
    return {
        key: value
        for key, value in record(user).items()
        if key not in ("password_hash", "created_at")
    }


def me(user):
    return user


def staff_create(data, user, db):
    return create_user(data, data.role, db)


@transactional
def user_state(uid, data, user, db):
    if uid == user["id"]:
        raise ServiceError(409, "Tidak dapat menonaktifkan akun sendiri")
    account = require(db.get(User, uid))
    account.active = data.active
    db.flush()
    return {"id": account.id, "active": account.active}
