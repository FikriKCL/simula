from fastapi import APIRouter, Depends

from app import schemas as out
from app.dependencies import editor, get_db
from app.schemas import LessonCreate
from app.services import module_service as service

router = APIRouter()


@router.post(
    "/modules/{mid}/lessons",
    status_code=201,
    tags=["Lessons"],
    response_model=out.LessonOut,
)
def lesson_create(
    mid: int, data: LessonCreate, user=Depends(editor), db=Depends(get_db)
):
    return service.lesson_create(mid, data, user, db)


@router.put("/lessons/{lid}", tags=["Lessons"], response_model=out.LessonOut)
def lesson_update(
    lid: int, data: LessonCreate, user=Depends(editor), db=Depends(get_db)
):
    return service.lesson_update(lid, data, user, db)


@router.delete("/lessons/{lid}", status_code=204, tags=["Lessons"])
def lesson_delete(lid: int, user=Depends(editor), db=Depends(get_db)):
    return service.lesson_delete(lid, user, db)
