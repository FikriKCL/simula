from fastapi import APIRouter, Depends, Query

from app import schemas as out
from app.dependencies import current_user, get_db
from app.schemas import ChatInput
from app.services import chat_service as service

router = APIRouter()


@router.post(
    "/chat/sessions", status_code=201, tags=["Chatbot"], response_model=out.SessionOut
)
def chat_session(user=Depends(current_user), db=Depends(get_db)):
    return service.chat_session(user, db)


@router.get(
    "/chat/sessions/{sid}/messages",
    tags=["Chatbot"],
    response_model=list[out.MessageOut],
)
def chat_history(
    sid: int,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user=Depends(current_user),
    db=Depends(get_db),
):
    return service.chat_history(sid, limit, offset, user, db)


@router.post(
    "/chat/sessions/{sid}/messages",
    status_code=201,
    tags=["Chatbot"],
    response_model=out.ChatReplyOut,
)
def chat_message(
    sid: int, data: ChatInput, user=Depends(current_user), db=Depends(get_db)
):
    return service.chat_message(sid, data, user, db)
