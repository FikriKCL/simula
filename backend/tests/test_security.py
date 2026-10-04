from datetime import datetime, timedelta, timezone
import jwt
import pytest
from pydantic import ValidationError
from app.config import Settings
from app.schemas import QuestionCreate
from app.security import token_for

def test_jwt_has_expiry_and_expected_audience():
    from app.config import settings
    token=token_for(42)
    claims=jwt.decode(token,settings().jwt_secret,algorithms=['HS256'],audience='simula-web',issuer='simula-api')
    assert claims['sub']=='42'
    assert claims['exp']>claims['iat']
    with pytest.raises(jwt.InvalidAudienceError):
        jwt.decode(token,settings().jwt_secret,algorithms=['HS256'],audience='different-app')

def test_example_secret_rejected():
    with pytest.raises(ValidationError):
        Settings(database_url='postgresql://localhost/test',jwt_secret='replace-this-with-a-random-secret-of-at-least-32-characters')

def test_quiz_rejects_invalid_answer_key():
    with pytest.raises(ValidationError):
        QuestionCreate(prompt='Question',options=['Yes','No'],correct_index=2,explanation='Example explanation')

def test_prisma_schema_parameter_removed():
    s=Settings(database_url='postgresql://localhost/test?schema=public&sslmode=require',jwt_secret='x'*40)
    assert 'schema=' not in s.psycopg_url
    assert 'sslmode=require' in s.psycopg_url
