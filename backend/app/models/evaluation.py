from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class QuizRun(Base):
    __tablename__ = "QuizRun"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("User.id", ondelete="CASCADE", onupdate="CASCADE"), index=True
    )
    quiz_id: Mapped[int] = mapped_column(
        ForeignKey("Quiz.id", ondelete="RESTRICT", onupdate="CASCADE"), index=True
    )
    question_snapshot: Mapped[list] = mapped_column(
        JSON().with_variant(JSONB(), "postgresql")
    )
    pass_score: Mapped[int] = mapped_column(Integer)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    attempt_id: Mapped[int | None] = mapped_column(
        ForeignKey("Attempt.id", ondelete="RESTRICT", onupdate="CASCADE"), unique=True
    )


class Certificate(Base):
    __tablename__ = "Certificate"
    __table_args__ = (UniqueConstraint("user_id", "quiz_id"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("User.id", ondelete="CASCADE", onupdate="CASCADE"), index=True
    )
    quiz_id: Mapped[int] = mapped_column(
        ForeignKey("Quiz.id", ondelete="RESTRICT", onupdate="CASCADE"), index=True
    )
    attempt_id: Mapped[int] = mapped_column(
        ForeignKey("Attempt.id", ondelete="RESTRICT", onupdate="CASCADE"), index=True
    )
    code: Mapped[str] = mapped_column(Text, unique=True)
    display_name: Mapped[str] = mapped_column(Text)
    module_title: Mapped[str] = mapped_column(Text)
    quiz_title: Mapped[str] = mapped_column(Text)
    score: Mapped[int] = mapped_column(Integer)
    issued_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
