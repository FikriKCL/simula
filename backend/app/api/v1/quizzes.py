from fastapi import APIRouter, Depends

from app import schemas as out
from app.dependencies import current_user, editor, get_db
from app.schemas import QuizCreate, Submission
from app.services import quiz_service as service

router = APIRouter()


@router.post(
    "/modules/{mid}/quizzes",
    status_code=201,
    tags=["Quizzes"],
    response_model=out.QuizOut,
)
def quiz_create(mid: int, data: QuizCreate, user=Depends(editor), db=Depends(get_db)):
    return service.quiz_create(mid, data, user, db)


@router.get("/quizzes/{qid}", tags=["Quizzes"], response_model=out.QuizDetail)
def quiz_detail(qid: int, user=Depends(current_user), db=Depends(get_db)):
    return service.quiz_detail(qid, user, db)


@router.post(
    "/quizzes/{qid}/attempts",
    status_code=201,
    tags=["Quizzes"],
    response_model=out.SubmissionOut,
)
def attempt_create(
    qid: int, data: Submission, user=Depends(current_user), db=Depends(get_db)
):
    return service.attempt_create(qid, data, user, db)
