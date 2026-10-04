import jwt
from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.config import settings
from app.models import User
from app.security import bearer


def get_db(request: Request):
    # One transaction per request. Commit occurs before the route returns its response.
    with request.app.state.session_factory() as db:
        try:
            yield db
        except Exception:
            db.rollback()
            raise
        finally:
            db.rollback()  # read-only transactions; services explicitly commit writes


def current_user(token: str = Depends(bearer), db: Session = Depends(get_db)):
    try:
        claims = jwt.decode(
            token,
            settings().jwt_secret,
            algorithms=["HS256"],
            issuer="simula-api",
            audience="simula-web",
            options={"require": ["exp", "iat", "sub"]},
        )
        uid = int(claims["sub"])
    except (jwt.InvalidTokenError, ValueError, TypeError):
        raise HTTPException(
            401,
            "Token tidak valid atau kedaluwarsa",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = db.get(User, uid)
    if not user or not user.active:
        raise HTTPException(401, "Akun tidak aktif")
    return {
        "id": user.id,
        "username": user.username,
        "display_name": user.display_name,
        "role": user.role,
        "school_id": user.school_id,
        "xp": user.xp,
        "active": user.active,
        "email": user.email,
        "avatar_url": user.avatar_url,
        "locale": user.locale,
        "theme": user.theme,
        "created_at": user.created_at,
    }


def roles(*allowed):
    def dependency(user=Depends(current_user)):
        if user["role"] not in allowed:
            raise HTTPException(403, "Tidak memiliki izin")
        return user

    return dependency


editor = roles("ADMIN", "INSTRUCTOR")
reviewer = roles("ADMIN", "REVIEWER")
admin = roles("ADMIN")
