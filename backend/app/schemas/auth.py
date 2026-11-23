from pydantic import BaseModel, EmailStr, Field, model_validator


class Register(BaseModel):
    email: EmailStr | None = None
    # Opsional di pendaftaran publik: bila kosong, dibuat otomatis dari email.
    username: str | None = Field(default=None, min_length=3, max_length=40, pattern=r"^[a-z0-9_]+$")
    display_name: str = Field(min_length=2, max_length=100)
    password: str = Field(min_length=10, max_length=128)
    school_id: int | None = Field(default=None, gt=0)

    @model_validator(mode="after")
    def need_identifier(self):
        if not self.email and not self.username:
            raise ValueError("Isi email atau username")
        return self


class TokenOut(BaseModel):
    access_token: str
    token_type: str
    expires_in: int


class Login(BaseModel):
    email: EmailStr | None = None

    @model_validator(mode="after")
    def identifier(self):
        if not self.email and not self.username:
            raise ValueError("Isi email atau username")
        return self

    username: str | None = Field(default=None, min_length=1, max_length=254)
    password: str = Field(min_length=1, max_length=128)
