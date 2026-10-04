from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import settings


class Base(DeclarativeBase):
    pass


def create_database(url=None):
    connection_url = make_url(url or settings().psycopg_url).set(
        drivername="postgresql+psycopg"
    )
    engine = create_engine(
        connection_url,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=5,
        hide_parameters=True,
    )
    return engine, sessionmaker(bind=engine, expire_on_commit=False)
