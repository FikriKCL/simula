"""Exercise rollback using a real local SQLAlchemy database, without a PostgreSQL service."""

import pytest
from sqlalchemy import create_engine, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models import Module, User
from app.schemas.module import ModuleCreate
from app.services import module_service


def test_failed_write_rolls_back_and_session_can_be_reused():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    factory = sessionmaker(engine, expire_on_commit=False)
    try:
        with factory() as db:
            account = User(
                username="teacher",
                display_name="Teacher",
                password_hash="not-used",
                role="INSTRUCTOR",
            )
            db.add(account)
            db.commit()
            user = {"id": account.id, "role": "INSTRUCTOR"}
            data = ModuleCreate(
                title="First module", description="Example module description", level=1
            )
            first = module_service.module_create(data, user, db)
            with pytest.raises(IntegrityError):
                module_service.module_create(data, user, db)
            assert db.scalar(select(func.count(Module.id))) == 1
            second = module_service.module_create(
                data.model_copy(update={"level": 2}), user, db
            )
            assert second["id"] != first["id"]
            assert db.scalar(select(func.count(Module.id))) == 2
    finally:
        engine.dispose()
