from typing import Literal

from pydantic import BaseModel

from .auth import Register


class StaffCreate(Register):
    role: Literal["STUDENT", "INSTRUCTOR", "REVIEWER", "ADMIN"] = "INSTRUCTOR"


class UserOut(BaseModel):
    email: str | None = None
    avatar_url: str | None = None
    locale: str = "id"
    theme: str = "light"
    id: int
    username: str
    display_name: str
    role: str
    school_id: int | None
    xp: int
    active: bool = True


class UserState(BaseModel):
    active: bool
