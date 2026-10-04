from typing import Literal

from fastapi import APIRouter, Depends, Query, Response

from app.config import settings
from app.dependencies import admin, current_user, editor, get_db
from app.schemas.content import (
    BankQuestionOut,
    CertificateOut,
    MaterialCatalogue,
    MaterialCreate,
    MaterialOut,
    ProfileEdit,
    ProfileSummary,
    QuestionEdit,
    RunOut,
    TopicEdit,
    TopicOut,
    TopicPath,
)
from app.schemas.quiz import QuestionCreate, Submission, SubmissionOut
from app.schemas.user import UserOut
from app.services import certificate_service as cert
from app.services import content_service as content
from app.services import quiz_service as quiz

router = APIRouter()


@router.get("/ui/config", tags=["Frontend"])
def ui_config():
    s = settings()
    return {
        "chatbot_enabled": False,
        "contact_email": s.contact_email,
        "guide_url": s.guide_url,
        "supported_locales": ["id", "en"],
        "hearts_enabled": False,
        "password_reset_enabled": False,
    }


@router.get("/topics", response_model=list[TopicOut], tags=["Frontend"])
def topics(db=Depends(get_db)):
    return content.topics(db)


@router.patch("/admin/topics/{tid}", response_model=TopicOut, tags=["Admin"])
def topic_edit(tid: int, data: TopicEdit, user=Depends(admin), db=Depends(get_db)):
    return content.topic_edit(tid, data, db)


@router.get("/learning/path", response_model=list[TopicPath], tags=["Learning"])
def path(user=Depends(current_user), db=Depends(get_db)):
    return content.learning_path(user, db)


@router.get("/materials", tags=["Materials"], response_model=MaterialCatalogue)
def catalogue(
    q: str = Query("", max_length=200),
    kind: Literal["PDF", "VIDEO", "COMIC"] | None = None,
    topic_id: int | None = Query(None, gt=0),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user=Depends(current_user),
    db=Depends(get_db),
):
    return content.library(q, kind, topic_id, limit, offset, user, db)


@router.get("/materials/{aid}", response_model=MaterialOut, tags=["Materials"])
def detail(aid: int, user=Depends(current_user), db=Depends(get_db)):
    return content.material_detail(aid, user, db)


@router.post(
    "/lessons/{lid}/materials",
    response_model=MaterialOut,
    status_code=201,
    tags=["Materials"],
)
def material_create(
    lid: int, data: MaterialCreate, user=Depends(editor), db=Depends(get_db)
):
    return content.material_create(lid, data, user, db)


@router.put("/materials/{aid}", response_model=MaterialOut, tags=["Materials"])
def material_edit(
    aid: int, data: MaterialCreate, user=Depends(editor), db=Depends(get_db)
):
    return content.material_edit(aid, data, user, db)


@router.delete("/materials/{aid}", status_code=204, tags=["Materials"])
def material_delete(aid: int, user=Depends(editor), db=Depends(get_db)):
    return content.material_delete(aid, user, db)


@router.post("/materials/{aid}/open", tags=["Materials"])
def opened(aid: int, user=Depends(current_user), db=Depends(get_db)):
    return content.track(aid, False, user, db)


@router.post("/materials/{aid}/complete", tags=["Materials"])
def completed(aid: int, user=Depends(current_user), db=Depends(get_db)):
    return content.track(aid, True, user, db)


@router.get("/users/me/summary", response_model=ProfileSummary, tags=["Users"])
def summary(user=Depends(current_user), db=Depends(get_db)):
    return content.profile(user, db)


@router.patch("/users/me", response_model=UserOut, tags=["Users"])
def profile_edit(data: ProfileEdit, user=Depends(current_user), db=Depends(get_db)):
    return content.edit_profile(data, user, db)


@router.get(
    "/admin/quizzes/{qid}/questions",
    tags=["Admin"],
    response_model=list[BankQuestionOut],
)
def bank(qid: int, user=Depends(admin), db=Depends(get_db)):
    return quiz.bank(qid, db)


@router.post(
    "/admin/quizzes/{qid}/questions",
    status_code=201,
    tags=["Admin"],
    response_model=BankQuestionOut,
)
def question_add(
    qid: int, data: QuestionCreate, user=Depends(admin), db=Depends(get_db)
):
    return quiz.question_add(qid, data, db)


@router.put(
    "/admin/quizzes/{qid}/questions/{question_id}",
    tags=["Admin"],
    response_model=BankQuestionOut,
)
def question_update(
    qid: int,
    question_id: int,
    data: QuestionCreate,
    user=Depends(admin),
    db=Depends(get_db),
):
    return quiz.question_update(qid, question_id, data, db)


@router.patch(
    "/admin/quizzes/{qid}/questions/{question_id}/active",
    tags=["Admin"],
    response_model=BankQuestionOut,
)
def question_archive(
    qid: int,
    question_id: int,
    data: QuestionEdit,
    user=Depends(admin),
    db=Depends(get_db),
):
    return quiz.question_archive(qid, question_id, data, db)


@router.post(
    "/quizzes/{qid}/runs", response_model=RunOut, status_code=201, tags=["Quizzes"]
)
def start_run(qid: int, user=Depends(current_user), db=Depends(get_db)):
    return quiz.start_run(qid, user, db)


@router.post(
    "/quizzes/{qid}/runs/{rid}/submit",
    response_model=SubmissionOut,
    status_code=201,
    tags=["Quizzes"],
)
def submit_run(
    qid: int, rid: int, data: Submission, user=Depends(current_user), db=Depends(get_db)
):
    return quiz.submit_run(qid, rid, data, user, db)


@router.get("/certificates", tags=["Certificates"], response_model=list[CertificateOut])
def certificates(user=Depends(current_user), db=Depends(get_db)):
    return cert.certificates(user, db)


@router.get("/certificates/{cid}/download", tags=["Certificates"])
def download(cid: int, user=Depends(current_user), db=Depends(get_db)):
    certificate = cert.owned(cid, user, db)
    return Response(
        cert.pdf_bytes(certificate),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{certificate.code}.pdf"',
            "Cache-Control": "private, no-store",
        },
    )
