from fastapi import APIRouter, Depends, Query

from app import schemas as out
from app.dependencies import admin, get_db
from app.schemas import SchoolCreate
from app.services import school_service as service

router = APIRouter()


@router.get("/schools", tags=["Schools"], response_model=list[out.SchoolOut])
def schools(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db=Depends(get_db),
):
    return service.schools(limit, offset, db)


@router.post(
    "/schools", status_code=201, tags=["Schools"], response_model=out.SchoolOut
)
def school_create(data: SchoolCreate, user=Depends(admin), db=Depends(get_db)):
    return service.school_create(data, user, db)
