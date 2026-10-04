import os

os.environ.setdefault(
    "DATABASE_URL",
    "postgresql://simula:simula_dev_password@localhost:5432/simula?schema=public",
)
os.environ.setdefault(
    "JWT_SECRET", "test-only-secret-that-is-at-least-thirty-two-characters"
)
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.engine import make_url

from app.config import settings
from app.database import Base, create_database
from app.main import app
from app.models import Topic, User
from app.security import hasher


@pytest.fixture
def client(monkeypatch):
    url = os.getenv("TEST_DATABASE_URL")
    if not url:
        pytest.skip("Set TEST_DATABASE_URL to a disposable PostgreSQL database")
    if make_url(url).database != "simula_test":
        raise RuntimeError("Test database must be named simula_test")
    monkeypatch.setenv("DATABASE_URL", url)
    settings.cache_clear()
    engine, factory = create_database()
    try:
        with factory.begin() as db:
            for table in reversed(Base.metadata.sorted_tables):
                db.execute(table.delete())
            db.add_all(
                [
                    Topic(id=1, code="PP", name="Pertolongan Pertama", position=1),
                    Topic(id=2, code="ASB", name="ASB", position=2),
                    Topic(id=3, code="PRS", name="PRS", position=3),
                ]
            )
            db.flush()
            for username, role in [
                ("admin", "ADMIN"),
                ("reviewer", "REVIEWER"),
                ("teacher", "INSTRUCTOR"),
            ]:
                db.add(
                    User(
                        username=username,
                        display_name=username,
                        password_hash=hasher.hash("secure-password-123"),
                        role=role,
                    )
                )
        monkeypatch.setattr("app.main.create_database", lambda: (engine, factory))
        with TestClient(app) as client:
            yield client
    finally:
        engine.dispose()
        settings.cache_clear()


@pytest.fixture
def auth(client):
    def login(username):
        result = client.post(
            "/api/v1/auth/login",
            json={"username": username, "password": "secure-password-123"},
        )
        assert result.status_code == 200, result.text
        return {"Authorization": "Bearer " + result.json()["access_token"]}

    return login
