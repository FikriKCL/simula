import os
os.environ.setdefault("DATABASE_URL", "postgresql://simula:simula_dev_password@localhost:5432/simula?schema=public")
os.environ.setdefault("JWT_SECRET", "test-only-secret-that-is-at-least-thirty-two-characters")
import pytest
from fastapi.testclient import TestClient
from psycopg import connect
from app.config import settings
from app.main import app
from app.security import hasher

@pytest.fixture
def client():
    # Only use a disposable DB, never a development or production DB.
    url = os.getenv("TEST_DATABASE_URL")
    if not url:
        pytest.skip("Set TEST_DATABASE_URL to a disposable PostgreSQL database")
    if not url.split('?')[0].endswith('/simula_test'):
        raise RuntimeError("Test database must be named simula_test")
    os.environ["DATABASE_URL"] = url
    settings.cache_clear()
    with connect(settings().psycopg_url) as db:
        db.execute('TRUNCATE "School", "User", "Module", "Lesson", "Progress", "Quiz", "Question", "Attempt", "Badge", "UserBadge", "ChatSession", "ChatMessage" RESTART IDENTITY CASCADE')
        for username,role in [('admin','ADMIN'),('reviewer','REVIEWER'),('teacher','INSTRUCTOR')]:
            db.execute('INSERT INTO "User" (username,display_name,password_hash,role) VALUES (%s,%s,%s,%s)',
                       (username,username,hasher.hash('secure-password-123'),role))
    with TestClient(app) as client:
        yield client

@pytest.fixture
def auth(client):
    def login(username):
        result = client.post('/api/v1/auth/login',json={'username':username,'password':'secure-password-123'})
        assert result.status_code == 200, result.text
        return {'Authorization':'Bearer '+result.json()['access_token']}
    return login
