from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Badge(Base):
    __tablename__ = "Badge"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    module_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("Module.id", ondelete="CASCADE", onupdate="CASCADE"),
        index=True,
        unique=True,
    )
    name: Mapped[str] = mapped_column(Text)
    description: Mapped[str] = mapped_column(Text)


class UserBadge(Base):
    __tablename__ = "UserBadge"
    __table_args__ = (UniqueConstraint("user_id", "badge_id"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("User.id", ondelete="CASCADE", onupdate="CASCADE"),
        index=True,
    )
    badge_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("Badge.id", ondelete="CASCADE", onupdate="CASCADE"),
        index=True,
    )
    earned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
