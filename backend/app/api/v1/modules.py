from fastapi import APIRouter, Depends, Query

from app import schemas as out
from app.dependencies import current_user, editor, get_db, reviewer
from app.schemas import ModuleCreate, Review
from app.services import module_service as service

router = APIRouter()


@router.get("/modules", tags=["Modules"], response_model=list[out.ModuleSummary])
def modules(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user=Depends(current_user),
    db=Depends(get_db),
):
    return service.modules(limit, offset, user, db)


@router.post(
    "/modules", status_code=201, tags=["Modules"], response_model=out.ModuleOut
)
def module_create(data: ModuleCreate, user=Depends(editor), db=Depends(get_db)):
    return service.module_create(data, user, db)


@router.put("/modules/{mid}", tags=["Modules"], response_model=out.ModuleOut)
def module_update(
    mid: int, data: ModuleCreate, user=Depends(editor), db=Depends(get_db)
):
    return service.module_update(mid, data, user, db)


@router.get("/modules/{mid}", tags=["Modules"], response_model=out.ModuleDetail)
def module_detail(mid: int, user=Depends(current_user), db=Depends(get_db)):
    return service.module_detail(mid, user, db)


@router.post(
    "/modules/{mid}/submit-review", tags=["Validation"], response_model=out.ModuleOut
)
def submit_review(mid: int, user=Depends(editor), db=Depends(get_db)):
    return service.submit_review(mid, user, db)


@router.post("/modules/{mid}/review", tags=["Validation"], response_model=out.ModuleOut)
def review_module(mid: int, data: Review, user=Depends(reviewer), db=Depends(get_db)):
    return service.review_module(mid, data, user, db)
