from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Progress(Base):
    __tablename__ = "Progress"
    __table_args__ = (UniqueConstraint("user_id", "lesson_id"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("User.id", ondelete="CASCADE", onupdate="CASCADE"),
        index=True,
    )
    lesson_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("Lesson.id", ondelete="CASCADE", onupdate="CASCADE"),
        index=True,
    )
    completed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
