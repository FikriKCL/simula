from fastapi import APIRouter, Depends, Query

from app import schemas as out
from app.dependencies import current_user, get_db
from app.services import learning_service as service

router = APIRouter()


@router.post(
    "/lessons/{lid}/complete", tags=["Learning"], response_model=out.CompletionOut
)
def complete(lid: int, user=Depends(current_user), db=Depends(get_db)):
    # Serialize rewards for one learner. The unique key also enforces idempotency.
    return service.complete(lid, user, db)


@router.get(
    "/learning/progress", tags=["Learning"], response_model=list[out.ProgressOut]
)
def progress(user=Depends(current_user), db=Depends(get_db)):
    return service.progress(user, db)


@router.get("/learning/attempts", tags=["Quizzes"], response_model=list[out.AttemptOut])
def attempts(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user=Depends(current_user),
    db=Depends(get_db),
):
    return service.attempts(limit, offset, user, db)
