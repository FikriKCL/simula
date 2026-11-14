"""Portable integration checks; PG concurrency tests remain in the existing suite."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select, func, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.database import Base
from app.main import app
from app.models import Material, Module, Question, User
from app.schemas.content import MaterialCreate
from app.seed import seed

@pytest.fixture
def demo(monkeypatch):
    engine=create_engine("sqlite://",connect_args={"check_same_thread":False},poolclass=StaticPool)
    @event.listens_for(engine,"connect")
    def foreign_keys(connection, record):
        connection.execute("PRAGMA foreign_keys=ON")
    Base.metadata.create_all(engine)
    factory=sessionmaker(engine,expire_on_commit=False)
    with factory.begin() as db: seed(db,"SimulaDemo2026!")
    monkeypatch.setattr("app.main.create_database",lambda:(engine,factory))
    with TestClient(app) as client: yield client,factory
    engine.dispose()

def login(client):
    r=client.post("/api/v1/auth/login",json={"username":"demo_student","password":"SimulaDemo2026!"})
    assert r.status_code==200,r.text
    return {"Authorization":"Bearer "+r.json()["access_token"]}

def test_repeatable_seed(demo):
    client,factory=demo
    with factory.begin() as db:
        models=(User,Module,Material,Question)
        counts=[db.scalar(select(func.count()).select_from(m)) for m in models]
        user=db.scalar(select(User).where(User.username=="demo_student"))
        user.display_name="Nama baru"
        seed(db,"PasswordDifferent!")
        assert counts==[db.scalar(select(func.count()).select_from(m)) for m in models]
        assert user.display_name=="Nama baru"
    assert login(client)

def test_learning_flow(demo):
    client,factory=demo; h=login(client)
    def get(path):
        r=client.get("/api/v1"+path,headers=h); assert r.status_code==200,r.text; return r.json()
    def post(path,data=None,expected=200):
        r=client.post("/api/v1"+path,headers=h,json=data); assert r.status_code==expected,r.text; return r.json()
    assert client.get("/api/v1/materials").status_code==401
    path=get("/learning/path"); mid=path[0]["levels"][0]["id"]
    assert path[0]["levels"][1]["status"]=="LOCKED"
    later=path[0]["levels"][1]["id"]
    assert client.get(f"/api/v1/modules/{later}",headers=h).status_code==403
    items=get(f"/materials?module_id={mid}")["items"]
    assert len(items)==3 and {m["kind"] for m in items}=={"ARTICLE","COMIC","VIDEO"}
    assert len(get("/materials?kind=ARTICLE&q=refleksi")["items"])==9
    detail=get(f'/materials/{items[0]["id"]}')
    assert len(detail["body"])>255 and detail["module_id"]==mid and detail["thumbnail_key"]=="plaster"
    module=get(f"/modules/{mid}");lid=module["lessons"][0]["id"]
    post(f"/lessons/{lid}/complete",expected=403)
    quiz=next(q for q in module["quizzes"] if q["kind"]=="POST")
    post(f'/quizzes/{quiz["id"]}/runs',expected=403)
    for material in items:
        post(f'/materials/{material["id"]}/open');post(f'/materials/{material["id"]}/complete')
    assert post(f"/lessons/{lid}/complete")["xp_awarded"]==10
    assert post(f"/lessons/{lid}/complete")["xp_awarded"]==0
    run=post(f'/quizzes/{quiz["id"]}/runs',expected=201)
    assert all("correct_index" not in q for q in run["questions"])
    with factory() as db:
        answers={q.id:q.correct_index for q in db.scalars(select(Question).where(Question.quiz_id==quiz["id"]))}
    result=post(f'/quizzes/{quiz["id"]}/runs/{run["id"]}/submit',{"answers":answers},201)
    assert result["score"]==100 and result["xp_awarded"]==20
    post(f'/quizzes/{quiz["id"]}/runs/{run["id"]}/submit',{"answers":answers},409)
    assert get("/learning/path")[0]["levels"][1]["status"]=="AVAILABLE"
    summary=get("/users/me/summary")
    assert summary["completed_levels"]==1 and summary["earned_badges"]==1 and summary["user"]["xp"]==30
    patch=client.patch("/api/v1/users/me",headers=h,json={"display_name":"Raka Baru","locale":"id","theme":"light"})
    assert patch.status_code==200 and get("/users/me/summary")["user"]["display_name"]=="Raka Baru"
    cert=get("/certificates")[0]
    pdf=client.get(f'/api/v1/certificates/{cert["id"]}/download',headers=h)
    assert pdf.status_code==200 and pdf.content.startswith(b"%PDF")

def test_validation():
    assert MaterialCreate(title="Artikel",kind="ARTICLE",body="x"*100000,position=1).url is None
    for values in [{"video_provider":"youtube","video_id":"<iframe>"},{"video_provider":"youtube"}]:
        with pytest.raises(ValueError): MaterialCreate(title="Video",kind="VIDEO",body="Transkrip contoh",position=1,**values)
