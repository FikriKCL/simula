import logging
from contextlib import asynccontextmanager
from uuid import uuid4

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.api.health import router as health_router
from app.api.v1 import router
from app.config import settings
from app.database import create_database
from app.models import User
from app.services.common import ServiceError


@asynccontextmanager
async def lifespan(app):
    engine, factory = create_database()
    app.state.engine = engine
    app.state.session_factory = factory
    try:
        with factory() as db:
            db.execute(select(User.id).limit(1))
    except Exception as e:
        logging.getLogger("uvicorn.error").warning(
            "Database connection failed at startup (PostgreSQL offline?): %s", e
        )
    try:
        yield
    finally:
        engine.dispose()


app = FastAPI(
    title="SIMULA Backend",
    version="3.0.0",
    lifespan=lifespan,
    description="API PMR Mula. Router → service → SQLAlchemy ORM → PostgreSQL.",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings().cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)
app.include_router(health_router)
app.include_router(router, prefix="/api/v1")


@app.exception_handler(ServiceError)
async def service_error(request, exc):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.exception_handler(IntegrityError)
async def integrity_error(request, exc):
    code = getattr(exc.orig, "sqlstate", None)
    if code == "23505":
        return JSONResponse(
            status_code=409,
            content={"detail": "Data sudah terdaftar atau urutan sudah dipakai"},
        )
    if code in ("23503", "23514", "23502"):
        return JSONResponse(
            status_code=422, content={"detail": "Data atau referensi tidak valid"}
        )
    return await unexpected(request, exc)


@app.exception_handler(Exception)
async def unexpected(request, exc):
    reference = str(uuid4())
    logging.getLogger("simula").error("Unhandled error %s", reference, exc_info=exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "Terjadi kesalahan internal", "reference": reference},
    )
