from typing import Literal
from pydantic import BaseModel, Field, HttpUrl, model_validator

class Register(BaseModel):
    username: str = Field(min_length=3, max_length=40, pattern=r"^[a-z0-9_]+$")
    display_name: str = Field(min_length=2, max_length=100)
    password: str = Field(min_length=10, max_length=128)
    school_id: int | None = Field(default=None, gt=0)

class StaffCreate(Register):
    role: Literal["STUDENT", "INSTRUCTOR", "REVIEWER", "ADMIN"] = "INSTRUCTOR"

class SchoolCreate(BaseModel):
    name: str = Field(min_length=2, max_length=150)
    address: str | None = Field(default=None, max_length=500)

class ModuleCreate(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    description: str = Field(min_length=3, max_length=5000)
    level: int = Field(gt=0, le=1000)

class LessonCreate(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    body: str = Field(min_length=10, max_length=50000)
    image_url: HttpUrl | None = None
    video_url: HttpUrl | None = None
    position: int = Field(gt=0)

class Review(BaseModel):
    approved: bool
    note: str = Field(min_length=3, max_length=2000)

class QuestionCreate(BaseModel):
    prompt: str = Field(min_length=3, max_length=2000)
    options: list[str] = Field(min_length=2, max_length=6)
    correct_index: int = Field(ge=0)
    explanation: str = Field(min_length=3, max_length=2000)

    @model_validator(mode="after")
    def validate_options(self):
        if self.correct_index >= len(self.options) or any(not s.strip() or len(s)>500 for s in self.options):
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

class BadgeCreate(BaseModel):
    name: str = Field(min_length=3, max_length=100)
    description: str = Field(min_length=3, max_length=1000)

class ChatInput(BaseModel):
    message: str = Field(min_length=2, max_length=2000)

# Response contracts also appear in Swagger/OpenAPI for TypeScript consumers.
from datetime import datetime

class TokenOut(BaseModel):
    access_token: str
    token_type: str
    expires_in: int

class UserOut(BaseModel):
    id: int
    username: str
    display_name: str
    role: str
    school_id: int | None
    xp: int
    active: bool = True

class SchoolOut(SchoolCreate):
    id: int

class ModuleSummary(BaseModel):
    id: int
    title: str
    description: str
    level: int
    status: str
    review_note: str | None

class ModuleOut(ModuleSummary):
    created_by: int
    reviewed_by: int | None
    created_at: datetime

class LessonOut(BaseModel):
    id: int
    module_id: int
    title: str
    body: str
    image_url: str | None
    video_url: str | None
    position: int

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

class ModuleDetail(ModuleOut):
    lessons: list[LessonOut]
    quizzes: list[QuizOut]

class ProgressOut(BaseModel):
    id: int
    title: str
    level: int
    total: int
    completed: int

class CompletionOut(BaseModel):
    completed: bool
    xp_awarded: int

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
    xp_awarded: int
    feedback: list[FeedbackOut]

class BadgeOut(BaseModel):
    id: int
    module_id: int
    name: str
    description: str

class EarnedBadgeOut(BadgeOut):
    earned_at: datetime

class EvaluationOut(BaseModel):
    module_id: int
    participants: int
    paired_participants: int
    mean_pre: float | None
    mean_post: float | None
    mean_gain: float | None

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
