from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, HttpUrl, model_validator

from .quiz import QuestionOut


class TopicEdit(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    position: int = Field(default=1, gt=0)


class TopicOut(TopicEdit):
    id: int
    code: str


class ComicPage(BaseModel):
    image_url: HttpUrl
    alt: str = Field(min_length=3, max_length=1000)
    text: str = Field(default="", max_length=10000)


class MaterialCreate(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    kind: Literal["PDF", "VIDEO", "COMIC"]
    url: HttpUrl | None = None
    thumbnail_url: HttpUrl | None = None
    body: str = Field(
        min_length=10,
        max_length=50000,
        description="Teks/transkrip materi untuk pencarian katalog",
    )
    pages: list[ComicPage] = Field(default_factory=list, max_length=100)
    page_count: int | None = Field(default=None, gt=0)
    duration_seconds: int | None = Field(default=None, gt=0)
    position: int = Field(gt=0)
    required: bool = True

    @model_validator(mode="after")
    def format_rules(self):
        if self.kind in ("PDF", "VIDEO") and not self.url:
            raise ValueError("PDF/video memerlukan URL")
        if self.kind == "COMIC" and not self.pages:
            raise ValueError("Komik memerlukan halaman berurutan")
        if self.kind != "COMIC" and self.pages:
            raise ValueError("pages hanya untuk komik")
        if self.kind == "COMIC":
            self.page_count = len(self.pages)
        return self


class MaterialOut(BaseModel):
    id: int
    lesson_id: int
    title: str
    kind: str
    url: str | None
    thumbnail_url: str | None
    body: str
    pages: list[ComicPage]
    page_count: int | None
    duration_seconds: int | None
    position: int
    required: bool
    opened: bool = False
    completed: bool = False
    locked: bool = False


class PathNode(BaseModel):
    id: int
    title: str
    level: int
    status: Literal["COMPLETED", "AVAILABLE", "LOCKED"]
    total_lessons: int
    completed_lessons: int
    posttests_passed: bool


class TopicPath(BaseModel):
    id: int
    code: str
    name: str
    levels: list[PathNode]


class ProfileEdit(BaseModel):
    display_name: str = Field(min_length=2, max_length=100)
    avatar_url: HttpUrl | None = None
    locale: Literal["id", "en"] = "id"
    theme: Literal["light", "dark", "system"] = "light"


class BadgeView(BaseModel):
    id: int
    module_id: int
    name: str
    description: str
    earned: bool
    earned_at: datetime | None


class FormatProgress(BaseModel):
    kind: str
    total: int
    opened: int
    completed: int


class ProfileUser(BaseModel):
    id: int
    username: str
    display_name: str
    email: str | None
    avatar_url: str | None
    locale: str
    theme: str
    role: str
    school_id: int | None
    active: bool
    xp: int
    created_at: datetime


class ProfileSummary(BaseModel):
    user: ProfileUser
    completed_levels: int
    total_levels: int
    current_level: int | None
    earned_badges: int
    opened_materials: int
    badges: list[BadgeView]
    material_progress: list[FormatProgress]


class RunOut(BaseModel):
    id: int
    quiz_id: int
    expires_at: datetime
    pass_score: int
    questions: list[QuestionOut]


class QuestionEdit(BaseModel):
    active: bool = True


class MaterialCard(BaseModel):
    id: int
    lesson_id: int
    module_id: int
    topic_id: int
    level: int
    title: str
    kind: Literal["PDF", "VIDEO", "COMIC"]
    thumbnail_url: str | None
    page_count: int | None
    duration_seconds: int | None
    locked: bool
    opened: bool
    completed: bool


class MaterialCatalogue(BaseModel):
    items: list[MaterialCard]
    total: int
    limit: int
    offset: int


class CertificateOut(BaseModel):
    id: int
    user_id: int
    quiz_id: int
    attempt_id: int
    code: str
    display_name: str
    module_title: str
    quiz_title: str
    score: int
    issued_at: datetime


class BankQuestionOut(BaseModel):
    id: int
    quiz_id: int
    prompt: str
    options: list[str]
    correct_index: int
    explanation: str
    active: bool
