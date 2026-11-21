from io import BytesIO
from typing import Literal
from uuid import uuid4
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from PIL import Image, UnidentifiedImageError
from app.dependencies import admin, get_db
from app.schemas.administration import RegistrationDecision
from app.services import admin_service as service
from app.uploads import upload_root

router = APIRouter(prefix="/admin", tags=["Admin"], dependencies=[Depends(admin)])

@router.get("/overview")
def overview(db=Depends(get_db)):
    return service.overview(db)

@router.get("/members")
def members(q: str = Query("", max_length=200), limit: int = Query(20, ge=1, le=100), offset: int = Query(0, ge=0), db=Depends(get_db)):
    return service.members(db, q, limit, offset)

@router.get("/registrations")
def registrations(q: str = Query("", max_length=200), status: Literal["PENDING", "APPROVED", "REJECTED"] | None = None,
                  limit: int = Query(20, ge=1, le=100), offset: int = Query(0, ge=0), db=Depends(get_db)):
    return service.accounts(db, q, status, limit, offset)

@router.patch("/registrations/{uid}")
def decision(uid: int, data: RegistrationDecision, db=Depends(get_db)):
    return service.registration(uid, data, db)

@router.get("/content")
def content(db=Depends(get_db)):
    return service.content(db)

@router.get("/lessons/{lid}/materials")
def materials(lid: int, limit: int = Query(20, ge=1, le=100), offset: int = Query(0, ge=0), db=Depends(get_db)):
    return service.materials(db, lid, limit, offset)

@router.post("/uploads/images", status_code=201)
async def upload_image(file: UploadFile = File(...)):
    # Raster files only. Re-encode to strip metadata and reject HTML/SVG masquerading as images.
    try:
        raw = await file.read(10 * 1024 * 1024 + 1)
    finally:
        await file.close()
    if len(raw) > 10 * 1024 * 1024:
        raise HTTPException(413, "Maksimal ukuran gambar 10 MB")
    try:
        with Image.open(BytesIO(raw)) as image:
            if image.format not in ("PNG", "JPEG", "WEBP") or image.width * image.height > 20_000_000:
                raise ValueError()
            image.load()
            name = f"{uuid4().hex}.webp"
            image.convert("RGB").save(upload_root() / name, "WEBP", quality=90)
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError):
        raise HTTPException(422, "Gunakan gambar PNG, JPEG, atau WebP maksimal 20 megapiksel")
    return {"path": f"/uploads/{name}"}


@router.get("/workspace")
def workspace(db=Depends(get_db)):
    return service.workspace(db)


from app.schemas.content import MaterialCreate
from fastapi import Response

@router.put("/materials/{aid}")
def edit_material(aid: int, data: MaterialCreate, withdraw: bool = False, db=Depends(get_db)):
    return service.edit_material(aid, data, withdraw, db)


@router.delete("/materials/{aid}", status_code=204)
def delete_material(aid: int, withdraw: bool = False, db=Depends(get_db)):
    service.delete_material(aid, withdraw, db)
    return Response(status_code=204)


@router.post("/lessons/{lid}/materials", status_code=201)
def create_material(lid: int, data: MaterialCreate, withdraw: bool = False, db=Depends(get_db)):
    return service.create_material(lid, data, withdraw, db)
