from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, HttpUrl, model_validator


class QuestionCreate(BaseModel):
    # ORDERING: options disimpan dalam urutan benar. MATCHING: left_items[i] berpasangan dengan options[i].
    question_type: Literal["SINGLE_CHOICE", "IMAGE_CHOICE", "TRUE_FALSE", "ORDERING", "MATCHING"] = "SINGLE_CHOICE"
    left_items: list[str] = Field(default_factory=list, max_length=6)
    left_images: list[HttpUrl | None] = Field(default_factory=list, max_length=6)
    image_url: HttpUrl | None = None
    option_images: list[HttpUrl | None] = Field(default_factory=list, max_length=6)
    prompt: str = Field(min_length=3, max_length=2000)
    options: list[str] = Field(min_length=2, max_length=6)
    correct_index: int = Field(ge=0)
    explanation: str = Field(min_length=3, max_length=2000)

    @model_validator(mode="after")
    def validate_options(self):
        if self.question_type == "TRUE_FALSE" and len(self.options) != 2:
            raise ValueError("Soal benar/salah memerlukan dua opsi")
        if self.option_images and len(self.option_images) != len(self.options):
            raise ValueError("Jumlah gambar opsi harus sama dengan jumlah opsi")
        if self.correct_index >= len(self.options) or any(
            not s.strip() or len(s) > 500 for s in self.options
        ):
            raise ValueError("Pilihan tidak valid")
        if len(set(self.options)) != len(self.options):
            raise ValueError("Pilihan harus berbeda")
        if self.question_type in ("ORDERING", "MATCHING"):
            # Kunci jawaban ada di urutan opsi, bukan di correct_index
            self.correct_index = 0
            if self.option_images:
                raise ValueError("Soal urutkan/cocokkan tidak memakai gambar opsi")
        if self.question_type == "MATCHING":
            if len(self.left_items) != len(self.options):
                raise ValueError("Setiap pasangan memerlukan sisi kiri dan kanan")
            if any(not s.strip() or len(s) > 500 for s in self.left_items):
                raise ValueError("Sisi kiri pasangan tidak boleh kosong")
            if len(set(self.left_items)) != len(self.left_items):
                raise ValueError("Sisi kiri pasangan harus berbeda")
            if self.left_images and len(self.left_images) != len(self.left_items):
                raise ValueError("Jumlah gambar sisi kiri harus sama dengan jumlah pasangan")
        elif self.left_items or self.left_images:
            raise ValueError("left_items hanya untuk soal cocokkan")
        return self


class QuizCreate(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    kind: Literal["PRE", "POST"]
    pass_score: int = Field(default=70, ge=0, le=100)
    questions: list[QuestionCreate] = Field(min_length=1, max_length=50)


# Jawaban: indeks opsi, atau daftar indeks untuk soal urutkan (urutan) / cocokkan (kanan per kiri)
Answer = int | list[int]


class Submission(BaseModel):
    answers: dict[int, Answer] = Field(min_length=1, max_length=50)


class AnswerCheck(BaseModel):
    question_id: int
    answer: Answer


class AnswerCheckOut(BaseModel):
    question_id: int
    answer: Answer
    correct: bool
    correct_index: Answer
    explanation: str


class QuizOut(BaseModel):
    id: int
    module_id: int
    title: str
    kind: str
    pass_score: int


class QuestionOut(BaseModel):
    question_type: str = "SINGLE_CHOICE"
    left_items: list[str] = Field(default_factory=list)
    left_images: list[str | None] = Field(default_factory=list)
    image_url: str | None = None
    option_images: list[str | None] = Field(default_factory=list)
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
    answers: dict[str, Answer]
    created_at: datetime


class FeedbackOut(BaseModel):
    question_id: int
    correct: bool
    explanation: str


class SubmissionOut(AttemptOut):
    certificate_id: int | None = None
    xp_awarded: int
    feedback: list[FeedbackOut]
