from fastapi import APIRouter, Depends, Query

from app import schemas as out
from app.dependencies import get_db, reviewer
from app.services import report_service as service

router = APIRouter()


@router.get(
    "/reports/evaluation", tags=["Reports"], response_model=list[out.EvaluationOut]
)
def evaluation(
    school_id: int | None = Query(None, gt=0),
    user=Depends(reviewer),
    db=Depends(get_db),
):
    # First attempt by quiz kind: repeat practice does not overwrite the baseline.
    return service.evaluation(school_id, user, db)
