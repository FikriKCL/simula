from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, model_validator


class QuestionCreate(BaseModel):
    prompt: str = Field(min_length=3, max_length=2000)
    options: list[str] = Field(min_length=2, max_length=6)
    correct_index: int = Field(ge=0)
    explanation: str = Field(min_length=3, max_length=2000)

    @model_validator(mode="after")
    def validate_options(self):
        if self.correct_index >= len(self.options) or any(
            not s.strip() or len(s) > 500 for s in self.options
        ):
            raise ValueError("Pilihan tidak valid")
        if len(set(self.options)) != len(self.options):
            raise ValueError("Pilihan harus berbeda")
        return self


class QuizCreate(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    kind: Literal["PRE", "POST"]
    pass_score: int = Field(default=70, ge=0, le=100)
    questions: list[QuestionCreate] = Field(min_length=1, max_length=50)


class Submission(BaseModel):
    answers: dict[int, int] = Field(min_length=1, max_length=50)


class QuizOut(BaseModel):
    id: int
    module_id: int
    title: str
    kind: str
    pass_score: int


class QuestionOut(BaseModel):
    id: int
    prompt: str
    options: list[str]


class QuizDetail(QuizOut):
    questions: list[QuestionOut]


class AttemptOut(BaseModel):
    id: int
    user_id: int
    quiz_id: int
    score: int
    passed: bool
    answers: dict[str, int]
    created_at: datetime


class FeedbackOut(BaseModel):
    question_id: int
    correct: bool
    explanation: str


class SubmissionOut(AttemptOut):
    certificate_id: int | None = None
    xp_awarded: int
    feedback: list[FeedbackOut]
