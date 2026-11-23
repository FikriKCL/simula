import re

from sqlalchemy import or_, select

from app.config import settings
from app.models import User
from app.security import DUMMY_HASH, hasher, token_for

from .common import ServiceError
from .user_service import create_user


def username_from_email(db, email):
    """Buat username unik dari email, mis. siti.aminah@x.id -> siti_aminah, siti_aminah2, …"""
    base = re.sub(r"[^a-z0-9_]+", "_", str(email).split("@")[0].lower()).strip("_")[:30]
    base = base if len(base) >= 3 else f"siswa_{base}".rstrip("_")
    name, n = base, 1
    while db.scalar(select(User.id).where(User.username == name)):
        n += 1
        name = f"{base}{n}"
    return name


def register(data, db):
    if not data.username:
        data.username = username_from_email(db, data.email)
    return create_user(data, "STUDENT", db, "PENDING" if settings().registration_approval_required else "APPROVED")


def login(data, db):
    identifier = str(data.email or data.username).lower()
    user = db.scalar(
        select(User).where(or_(User.username == identifier, User.email == identifier))
    )
    valid = hasher.verify(data.password, user.password_hash if user else DUMMY_HASH)
    if not user or not valid or not user.active:
        raise ServiceError(401, "Username atau password salah")
    if user.registration_status != "APPROVED":
        raise ServiceError(403, "Pendaftaran belum disetujui atau telah ditolak")
    return {
        "access_token": token_for(user.id),
        "token_type": "bearer",
        "expires_in": settings().access_token_minutes * 60,
    }
