from fastapi import APIRouter, Depends

from app import schemas as out
from app.dependencies import admin, current_user, get_db
from app.schemas import StaffCreate, UserState
from app.services import user_service as service

router = APIRouter()


@router.get("/users/me", tags=["Users"], response_model=out.UserOut)
def me(user=Depends(current_user)):
    return service.me(user)


@router.post(
    "/admin/users", status_code=201, tags=["Admin"], response_model=out.UserOut
)
def staff_create(data: StaffCreate, user=Depends(admin), db=Depends(get_db)):
    return service.staff_create(data, user, db)


@router.patch("/admin/users/{uid}/active", tags=["Admin"])
def user_state(uid: int, data: UserState, user=Depends(admin), db=Depends(get_db)):
    return service.user_state(uid, data, user, db)
