from datetime import datetime, timedelta, timezone

import jwt
from fastapi.security import OAuth2PasswordBearer
from pwdlib import PasswordHash

from app.config import settings

hasher = PasswordHash.recommended()
DUMMY_HASH = hasher.hash("dummy-password-for-timing")
bearer = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token")


def token_for(user_id):
    config = settings()
    return jwt.encode(
        {
            "sub": str(user_id),
            "iat": datetime.now(timezone.utc),
            "exp": datetime.now(timezone.utc)
            + timedelta(minutes=config.access_token_minutes),
            "iss": "simula-api",
            "aud": "simula-web",
        },
        config.jwt_secret,
        algorithm="HS256",
    )
