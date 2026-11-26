from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, HttpUrl, field_validator, model_validator

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
    meta: str = Field(default="", max_length=200)
    title: str = Field(min_length=3, max_length=200)
    kind: Literal["ARTICLE", "PDF", "VIDEO", "COMIC"]
    url: HttpUrl | None = None
    thumbnail_url: HttpUrl | None = None
    thumbnail_key: Literal["plaster", "kit", "hand", "heart", "roll"] | None = None
    video_provider: Literal["youtube", "vimeo"] | None = None
    video_id: str | None = Field(default=None, max_length=32)
    body: str = Field(
        min_length=10,
        max_length=1000000,
        description="Teks/transkrip materi untuk pencarian katalog",
    )
    pages: list[ComicPage] = Field(default_factory=list, max_length=100)
    page_count: int | None = Field(default=None, gt=0)
    duration_seconds: int | None = Field(default=None, gt=0)
    position: int = Field(gt=0)
    required: bool = True

    @field_validator("video_id", mode="before")
    @classmethod
    def normalize_video_id(cls, value):
        if not isinstance(value, str):
            return value
        value = value.strip()
        if "://" not in value and not value.startswith(("www.", "youtube.com/", "m.youtube.com/", "youtu.be/")):
            return value
        from urllib.parse import parse_qs, urlsplit
        import re
        parsed = urlsplit(value if "://" in value else "https://" + value)
        host = (parsed.hostname or "").lower()
        if parsed.scheme not in ("http", "https") or parsed.username or parsed.password:
            raise ValueError("URL video tidak valid")
        parts = parsed.path.strip("/").split("/")
        if host in ("youtu.be", "www.youtu.be"):
            candidate = parts[0]
        elif host in ("youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtube-nocookie.com", "www.youtube-nocookie.com"):
            candidate = (parse_qs(parsed.query).get("v", [""])[0] if parsed.path.rstrip("/") == "/watch"
                         else parts[1] if len(parts) == 2 and parts[0] in ("shorts", "embed", "live") else "")
        else:
            raise ValueError("Gunakan URL YouTube atau ID video")
        if not re.fullmatch(r"[A-Za-z0-9_-]{11}", candidate):
            raise ValueError("URL YouTube tidak memiliki ID video yang valid")
        return candidate

    @model_validator(mode="after")
    def format_rules(self):
        if self.kind == "VIDEO" and (self.video_provider or self.video_id):
            import re
            if not self.video_provider or not self.video_id:
                raise ValueError("Isi provider dan ID video")
            pattern = r"[A-Za-z0-9_-]{11}" if self.video_provider == "youtube" else r"[0-9]{1,15}"
            if not re.fullmatch(pattern, self.video_id):
                raise ValueError("ID video tidak valid")
        elif self.kind == "VIDEO" and not self.url:
            raise ValueError("Video memerlukan provider dan ID")
        if self.kind != "VIDEO" and (self.video_provider or self.video_id):
            raise ValueError("Provider/ID hanya untuk video")
        if self.kind == "PDF" and not self.url:
            raise ValueError("PDF/video memerlukan URL")
        if self.kind == "COMIC" and not self.pages:
            raise ValueError("Komik memerlukan halaman berurutan")
        if self.kind not in ("COMIC", "PDF") and self.pages:
            raise ValueError("pages hanya untuk komik/buku PDF")
        if self.pages:
            self.page_count = len(self.pages)
        return self


class MaterialOut(BaseModel):
    meta: str = ""
    module_id: int | None = None
    id: int
    lesson_id: int
    title: str
    kind: str
    url: str | None
    thumbnail_url: str | None
    thumbnail_key: str | None = None
    video_provider: str | None = None
    video_id: str | None = None
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
    meta: str = ""
    thumbnail_key: str | None = None
    id: int
    lesson_id: int
    module_id: int
    topic_id: int
    level: int
    title: str
    kind: Literal["ARTICLE", "PDF", "VIDEO", "COMIC"]
    thumbnail_url: str | None
    cover_url: str | None = None
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
    question_type: str = "SINGLE_CHOICE"
    image_url: str | None = None
    option_images: list[str | None] = Field(default_factory=list)
    id: int
    quiz_id: int
    prompt: str
    options: list[str]
    correct_index: int
    explanation: str
    active: bool
