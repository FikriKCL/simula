import time
from collections import defaultdict, deque
from threading import Lock

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse

from app import schemas as out
from app.config import settings
from app.dependencies import current_user, get_db
from app.schemas import ChatInput
from app.services import chat_service as service

router = APIRouter()

# The /chat/test playground endpoints are public and every call can hit the Gemini API,
# so they are throttled per client IP (in-memory, per worker process).
_RATE_WINDOW_SECONDS = 60
_rate_hits: dict[str, deque[float]] = defaultdict(deque)
_rate_lock = Lock()


def _client_key(request: Request) -> str:
    host = request.client.host if request.client else "unknown"
    # The Next.js proxy runs on the same machine; only then trust the browser IP it forwards.
    if host in ("127.0.0.1", "::1"):
        forwarded = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
        if forwarded:
            return forwarded
    return host


def playground_rate_limit(request: Request):
    limit = settings().chat_playground_rate_limit
    key = _client_key(request)
    now = time.monotonic()
    with _rate_lock:
        if len(_rate_hits) > 10_000:
            for stale in [k for k, v in _rate_hits.items() if not v or now - v[-1] > _RATE_WINDOW_SECONDS]:
                del _rate_hits[stale]
        hits = _rate_hits[key]
        while hits and now - hits[0] > _RATE_WINDOW_SECONDS:
            hits.popleft()
        if len(hits) >= limit:
            retry_after = max(1, int(_RATE_WINDOW_SECONDS - (now - hits[0])))
            raise HTTPException(
                status_code=429,
                detail="Terlalu banyak pertanyaan dalam waktu singkat. Coba lagi sebentar lagi.",
                headers={"Retry-After": str(retry_after)},
            )
        hits.append(now)


def _history_dicts(data: ChatInput):
    return [{"sender": h.sender, "text": h.text} for h in data.history]


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


@router.post(
    "/chat/test",
    tags=["Chatbot"],
    dependencies=[Depends(playground_rate_limit)],
)
def test_chat(data: ChatInput):
    from app.services.rag_service import query_rag

    return query_rag(data.message, history=_history_dicts(data))


@router.post(
    "/chat/test/stream",
    tags=["Chatbot"],
    dependencies=[Depends(playground_rate_limit)],
)
def test_chat_stream(data: ChatInput):
    from app.services.rag_service import query_rag_stream

    return StreamingResponse(
        query_rag_stream(data.message, history=_history_dicts(data)),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
