from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Text, func, true
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class User(Base):
    __tablename__ = "User"
    email: Mapped[str | None] = mapped_column(Text, unique=True)
    avatar_url: Mapped[str | None] = mapped_column(Text)
    locale: Mapped[str] = mapped_column(Text, default="id", server_default="id")
    theme: Mapped[str] = mapped_column(Text, default="light", server_default="light")
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(Text, unique=True)
    display_name: Mapped[str] = mapped_column(Text)
    password_hash: Mapped[str] = mapped_column(Text)
    role: Mapped[str] = mapped_column(Text, default="STUDENT", server_default="STUDENT")
    school_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("School.id", ondelete="SET NULL", onupdate="CASCADE"),
        index=True,
        nullable=True,
    )
    active: Mapped[bool] = mapped_column(Boolean, default=True, server_default=true())
    xp: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
