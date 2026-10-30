from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class ChatHistoryItem(BaseModel):
    sender: Literal["user", "bot", "assistant"]
    text: str = Field(max_length=8000)


class ChatInput(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    # Only the last few turns are used for context; cap to keep payloads small
    history: list[ChatHistoryItem] = Field(default_factory=list, max_length=20)


class SessionOut(BaseModel):
    id: int
    user_id: int
    created_at: datetime


class SourceOut(BaseModel):
    lesson_id: int | None = None
    module_id: int | None = None
    title: str | None = None
    doc_title: str | None = None
    section_title: str | None = None
    similarity: float | None = None


class MessageOut(BaseModel):
    id: int
    session_id: int
    role: str
    content: str
    sources: list[SourceOut]
    created_at: datetime


class ChatReplyOut(MessageOut):
    mode: str
    suggestions: list[str] = Field(default_factory=list)
    is_emergency: bool = False
