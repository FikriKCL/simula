from sqlalchemy import or_, select

from app.config import settings
from app.models import User
from app.security import DUMMY_HASH, hasher, token_for

from .common import ServiceError
from .user_service import create_user


def register(data, db):
    return create_user(data, "STUDENT", db)


def login(data, db):
    identifier = str(data.email or data.username).lower()
    user = db.scalar(
        select(User).where(or_(User.username == identifier, User.email == identifier))
    )
    valid = hasher.verify(data.password, user.password_hash if user else DUMMY_HASH)
    if not user or not valid or not user.active:
        raise ServiceError(401, "Username atau password salah")
    return {
        "access_token": token_for(user.id),
        "token_type": "bearer",
        "expires_in": settings().access_token_minutes * 60,
    }
