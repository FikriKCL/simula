from pydantic import BaseModel


class ProgressOut(BaseModel):
    id: int
    title: str
    level: int
    total: int
    completed: int


class CompletionOut(BaseModel):
    completed: bool
    xp_awarded: int
