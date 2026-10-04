from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Quiz(Base):
    __tablename__ = "Quiz"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    module_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("Module.id", ondelete="RESTRICT", onupdate="CASCADE"),
        index=True,
    )
    title: Mapped[str] = mapped_column(Text)
    kind: Mapped[str] = mapped_column(Text)
    pass_score: Mapped[int] = mapped_column(Integer, default=70, server_default="70")


class Question(Base):
    __tablename__ = "Question"
    active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    quiz_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("Quiz.id", ondelete="CASCADE", onupdate="CASCADE"),
        index=True,
    )
    prompt: Mapped[str] = mapped_column(Text)
    options: Mapped[dict | list] = mapped_column(
        JSON().with_variant(JSONB(), "postgresql")
    )
    correct_index: Mapped[int] = mapped_column(Integer)
    explanation: Mapped[str] = mapped_column(Text)


class Attempt(Base):
    __tablename__ = "Attempt"
    question_snapshot: Mapped[list] = mapped_column(
        JSON().with_variant(JSONB(), "postgresql"), default=list, server_default="[]"
    )
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("User.id", ondelete="CASCADE", onupdate="CASCADE"),
        index=True,
    )
    quiz_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("Quiz.id", ondelete="RESTRICT", onupdate="CASCADE"),
        index=True,
    )
    score: Mapped[int] = mapped_column(Integer)
    passed: Mapped[bool] = mapped_column(Boolean)
    answers: Mapped[dict | list] = mapped_column(
        JSON().with_variant(JSONB(), "postgresql")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
