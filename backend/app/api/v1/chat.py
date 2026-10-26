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


from fastapi.responses import StreamingResponse

@router.post(
    "/chat/test",
    tags=["Chatbot"],
)
def test_chat(data: ChatInput):
    from app.services.rag_service import query_rag
    history_dicts = [{"sender": h.sender, "text": h.text} for h in data.history] if data.history else []
    return query_rag(data.message, history=history_dicts)


@router.post(
    "/chat/test/stream",
    tags=["Chatbot"],
)
def test_chat_stream(data: ChatInput):
    from app.services.rag_service import query_rag_stream
    history_dicts = [{"sender": h.sender, "text": h.text} for h in data.history] if data.history else []
    return StreamingResponse(
        query_rag_stream(data.message, history=history_dicts),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
