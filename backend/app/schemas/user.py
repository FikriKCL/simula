from typing import Literal

from pydantic import BaseModel, Field

from .auth import Register


class StaffCreate(Register):
    # Akun staf dibuat admin dan selalu butuh username eksplisit.
    username: str = Field(min_length=3, max_length=40, pattern=r"^[a-z0-9_]+$")
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
    registration_status: str = "APPROVED"  # PENDING bila pendaftaran butuh persetujuan admin


class UserState(BaseModel):
    active: bool
