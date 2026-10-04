from fastapi import APIRouter, Depends
from sqlalchemy import select

from app.dependencies import get_db
from app.models import User

router = APIRouter(tags=["Health"])


@router.get("/health/live")
def live():
    return {"status": "ok"}


@router.get("/health/ready")
def ready(db=Depends(get_db)):
    db.execute(select(User.id).limit(1))
    return {"status": "ready"}
