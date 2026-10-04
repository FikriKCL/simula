from datetime import datetime

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Topic(Base):
    __tablename__ = "Topic"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(Text, unique=True)
    name: Mapped[str] = mapped_column(Text)
    position: Mapped[int] = mapped_column(Integer, default=1, server_default="1")


class Material(Base):
    __tablename__ = "Material"
    __table_args__ = (UniqueConstraint("lesson_id", "position"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    lesson_id: Mapped[int] = mapped_column(
        ForeignKey("Lesson.id", ondelete="CASCADE", onupdate="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(Text)
    kind: Mapped[str] = mapped_column(Text)
    url: Mapped[str | None] = mapped_column(Text)
    thumbnail_url: Mapped[str | None] = mapped_column(Text)
    body: Mapped[str] = mapped_column(Text, default="", server_default="")
    pages: Mapped[list] = mapped_column(
        JSON().with_variant(JSONB(), "postgresql"), default=list, server_default="[]"
    )
    page_count: Mapped[int | None] = mapped_column(Integer)
    duration_seconds: Mapped[int | None] = mapped_column(Integer)
    position: Mapped[int] = mapped_column(Integer)
    required: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")


class MaterialProgress(Base):
    __tablename__ = "MaterialProgress"
    __table_args__ = (UniqueConstraint("user_id", "material_id"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("User.id", ondelete="CASCADE", onupdate="CASCADE"), index=True
    )
    material_id: Mapped[int] = mapped_column(
        ForeignKey("Material.id", ondelete="CASCADE", onupdate="CASCADE"), index=True
    )
    opened_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
