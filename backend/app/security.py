from datetime import datetime, timedelta, timezone
import jwt
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from pwdlib import PasswordHash
from app.config import settings
from app.db import get_db, one

hasher = PasswordHash.recommended()
DUMMY_HASH = hasher.hash("dummy-password-for-timing")
bearer = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token")

def token_for(user_id):
    config = settings()
    return jwt.encode({"sub": str(user_id), "iat": datetime.now(timezone.utc),
                       "exp": datetime.now(timezone.utc) + timedelta(minutes=config.access_token_minutes),
                       "iss": "simula-api", "aud": "simula-web"}, config.jwt_secret, algorithm="HS256")

def current_user(token: str = Depends(bearer), db=Depends(get_db)):
    try:
        claims = jwt.decode(token, settings().jwt_secret, algorithms=["HS256"],
                            issuer="simula-api", audience="simula-web",
                            options={"require": ["exp", "iat", "sub"]})
        uid = int(claims["sub"])
    except (jwt.InvalidTokenError, ValueError, TypeError):
        raise HTTPException(401, "Token tidak valid atau kedaluwarsa", headers={"WWW-Authenticate": "Bearer"})
    user = one(db, 'SELECT id,username,display_name,role,school_id,xp,active FROM "User" WHERE id=%s', (uid,))
    if not user or not user["active"]:
        raise HTTPException(401, "Akun tidak aktif")
    return user

def roles(*allowed):
    def dependency(user=Depends(current_user)):
        if user["role"] not in allowed:
            raise HTTPException(403, "Tidak memiliki izin")
        return user
    return dependency

editor = roles("ADMIN", "INSTRUCTOR")
reviewer = roles("ADMIN", "REVIEWER")
admin = roles("ADMIN")
