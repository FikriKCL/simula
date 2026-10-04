from datetime import datetime

from pydantic import BaseModel, Field, HttpUrl

from .quiz import QuizOut


class ModuleCreate(BaseModel):
    topic_id: int = Field(default=1, gt=0)
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


class ModuleSummary(BaseModel):
    topic_id: int = 1
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


class ModuleDetail(ModuleOut):
    lessons: list[LessonOut]
    quizzes: list[QuizOut]
