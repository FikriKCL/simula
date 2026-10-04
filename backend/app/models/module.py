from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Module(Base):
    __tablename__ = "Module"
    __table_args__ = (UniqueConstraint("topic_id", "level"),)
    topic_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("Topic.id", ondelete="RESTRICT", onupdate="CASCADE"),
        default=1,
        server_default="1",
        index=True,
    )
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(Text)
    description: Mapped[str] = mapped_column(Text)
    level: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(Text, default="DRAFT", server_default="DRAFT")
    review_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewed_by: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("User.id", ondelete="SET NULL", onupdate="CASCADE"),
        index=True,
        nullable=True,
    )
    created_by: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("User.id", ondelete="RESTRICT", onupdate="CASCADE"),
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class Lesson(Base):
    __tablename__ = "Lesson"
    __table_args__ = (UniqueConstraint("module_id", "position"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    module_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("Module.id", ondelete="CASCADE", onupdate="CASCADE"),
        index=True,
    )
    title: Mapped[str] = mapped_column(Text)
    body: Mapped[str] = mapped_column(Text)
    image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    video_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    position: Mapped[int] = mapped_column(Integer)
