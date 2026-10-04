from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordRequestForm

from app import schemas as out
from app.dependencies import get_db
from app.schemas import Login, Register
from app.services import auth_service as service

router = APIRouter()


@router.post(
    "/auth/register", status_code=201, tags=["Auth"], response_model=out.UserOut
)
def register(data: Register, db=Depends(get_db)):
    return service.register(data, db)


@router.post("/auth/login", tags=["Auth"], response_model=out.TokenOut)
def login(data: Login, db=Depends(get_db)):
    return service.login(data, db)


@router.post("/auth/token", tags=["Auth"], response_model=out.TokenOut)
def swagger_login(data: OAuth2PasswordRequestForm = Depends(), db=Depends(get_db)):
    return service.login(Login(username=data.username, password=data.password), db)
