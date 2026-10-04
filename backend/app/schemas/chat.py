from datetime import datetime

from pydantic import BaseModel, Field


class ChatInput(BaseModel):
    message: str = Field(min_length=2, max_length=2000)


class SessionOut(BaseModel):
    id: int
    user_id: int
    created_at: datetime


class SourceOut(BaseModel):
    lesson_id: int
    module_id: int
    title: str


class MessageOut(BaseModel):
    id: int
    session_id: int
    role: str
    content: str
    sources: list[SourceOut]
    created_at: datetime


class ChatReplyOut(MessageOut):
    mode: str
