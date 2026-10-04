from fastapi import APIRouter, Depends

from app import schemas as out
from app.dependencies import current_user, editor, get_db
from app.schemas import BadgeCreate
from app.services import badge_service as service

router = APIRouter()


@router.post(
    "/modules/{mid}/badge",
    status_code=201,
    tags=["Badges"],
    response_model=out.BadgeOut,
)
def badge_create(mid: int, data: BadgeCreate, user=Depends(editor), db=Depends(get_db)):
    return service.badge_create(mid, data, user, db)


@router.get(
    "/learning/badges", tags=["Badges"], response_model=list[out.EarnedBadgeOut]
)
def badges(user=Depends(current_user), db=Depends(get_db)):
    return service.badges(user, db)
