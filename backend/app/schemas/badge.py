from datetime import datetime

from pydantic import BaseModel, Field


class BadgeCreate(BaseModel):
    name: str = Field(min_length=3, max_length=100)
    description: str = Field(min_length=3, max_length=1000)


class BadgeOut(BaseModel):
    id: int
    module_id: int
    name: str
    description: str


class EarnedBadgeOut(BadgeOut):
    earned_at: datetime
