from pydantic import BaseModel, Field


class SchoolCreate(BaseModel):
    name: str = Field(min_length=2, max_length=150)
    address: str | None = Field(default=None, max_length=500)


class SchoolOut(SchoolCreate):
    id: int
