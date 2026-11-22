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
    assert len(get("/materials?kind=ARTICLE&q=refleksi")["items"])==6  # 2 topik demo x 3 level
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


def staff_headers(client, factory, username="admin_demo", role="ADMIN"):
    from app.security import hasher
    with factory.begin() as db:
        user=User(username=username,display_name="Admin Test",role=role,password_hash=hasher.hash("AdminTesting123!"))
        db.add(user)
    r=client.post("/api/v1/auth/login",json={"username":username,"password":"AdminTesting123!"})
    assert r.status_code==200,r.text
    return {"Authorization":"Bearer "+r.json()["access_token"]}


def test_admin_permissions_and_real_catalogue(demo):
    client,factory=demo
    student=login(client)
    h=staff_headers(client,factory)
    paths=["/admin/overview","/admin/members","/admin/content","/admin/registrations"]
    for path in paths:
        assert client.get("/api/v1"+path).status_code==401
        assert client.get("/api/v1"+path,headers=student).status_code==403
        r=client.get("/api/v1"+path,headers=h)
        assert r.status_code==200,r.text
        assert "password_hash" not in r.text
    summary=client.get("/api/v1/admin/overview",headers=h).json()
    assert summary["materials"]==18 and summary["active_questions"]==36
    assert summary["students"]==1 and summary["pending"]==0
    members=client.get("/api/v1/admin/members?q=demo_student",headers=h).json()
    assert members["total"]==1 and members["items"][0]["total_progress"]==0
    assert members["items"][0]["last_learning_at"] is None
    tree=client.get("/api/v1/admin/content",headers=h).json()
    lid=tree["lessons"][0]["id"]
    r=client.get(f"/api/v1/admin/lessons/{lid}/materials?limit=1",headers=h)
    assert r.status_code==200 and r.json()["total"]==3 and len(r.json()["items"])==1
    m=r.json()["items"][0]
    assert client.delete(f'/api/v1/materials/{m["id"]}',headers=h).status_code==409


def test_registration_review_preserves_existing_accounts(demo):
    from app.config import settings
    client,factory=demo;h=staff_headers(client,factory)
    config=settings();old=config.registration_approval_required
    config.registration_approval_required=True
    try:
        assert login(client) # Existing demo remains approved.
        r=client.post("/api/v1/auth/register",json={"username":"pending_student","display_name":"Siswa Baru","password":"PasswordTesting123!"})
        assert r.status_code==201,r.text
        uid=r.json()["id"]
        credentials={"username":"pending_student","password":"PasswordTesting123!"}
        assert client.post("/api/v1/auth/login",json=credentials).status_code==403
        rows=client.get("/api/v1/admin/registrations?status=PENDING",headers=h).json()
        assert rows["total"]==1 and rows["items"][0]["id"]==uid
        r=client.patch(f"/api/v1/admin/registrations/{uid}",headers=h,json={"status":"APPROVED"})
        assert r.status_code==200 and r.json()["active"] is True
        signed=client.post("/api/v1/auth/login",json=credentials)
        assert signed.status_code==200
        token={"Authorization":"Bearer "+signed.json()["access_token"]}
        assert client.get("/api/v1/users/me",headers=token).status_code==200
        assert client.patch(f"/api/v1/admin/registrations/{uid}",headers=h,json={"status":"REJECTED"}).status_code==200
        assert client.get("/api/v1/users/me",headers=token).status_code==401
        assert client.post("/api/v1/auth/login",json=credentials).status_code==401
        assert client.patch(f"/api/v1/admin/registrations/{uid}",headers=h,json={"status":"PENDING"}).json()["registration_status"]=="PENDING"
        assert client.get("/api/v1/admin/registrations?status=PENDING",headers=h).json()["total"]==1
    finally:
        config.registration_approval_required=old


def test_admin_draft_publish_and_student_visibility(demo):
    client,factory=demo;h=staff_headers(client,factory)
    teacher=client.post("/api/v1/auth/login",json={"username":"demo_teacher","password":"SimulaDemo2026!"}).json()
    teacher={"Authorization":"Bearer "+teacher["access_token"]}
    tree=client.get("/api/v1/admin/content",headers=h).json()
    topic=tree["topics"][0]["id"]
    r=client.post("/api/v1/modules",headers=teacher,json={"topic_id":topic,"title":"Modul Admin Baru","description":"Modul pengujian admin","level":4})
    assert r.status_code==201,r.text
    mid=r.json()["id"]
    r=client.post(f"/api/v1/modules/{mid}/lessons",headers=h,json={"title":"Pelajaran Admin","body":"Pengantar pelajaran admin","position":1})
    assert r.status_code==201,r.text
    lid=r.json()["id"]
    data={"title":"Artikel Admin Baru","kind":"ARTICLE","body":"## Artikel\n\nIni teks panjang yang disimpan admin.","position":1,"thumbnail_key":"hand"}
    r=client.post(f"/api/v1/lessons/{lid}/materials",headers=h,json=data)
    assert r.status_code==201,r.text
    aid=r.json()["id"]
    data["body"]+="\n\nIsi revisi."
    assert client.put(f"/api/v1/materials/{aid}",headers=h,json=data).status_code==200
    student=login(client)
    assert client.get("/api/v1/materials?q=Artikel%20Admin",headers=student).json()["total"]==0
    # Admin may see unpublished materials through the admin route.
    assert client.get(f"/api/v1/admin/lessons/{lid}/materials",headers=h).json()["items"][0]["body"].endswith("Isi revisi.")
    assert client.post(f"/api/v1/modules/{mid}/submit-review",headers=teacher).status_code==200
    assert client.post(f"/api/v1/modules/{mid}/review",headers=teacher,json={"approved":True,"note":"Konten ditinjau"}).status_code==403
    assert client.post(f"/api/v1/modules/{mid}/review",headers=h,json={"approved":True,"note":"Konten ditinjau"}).status_code==200
    catalogue=client.get("/api/v1/materials?q=Artikel%20Admin",headers=student).json()
    assert catalogue["total"]==1 and catalogue["items"][0]["locked"] is True
    assert client.put(f"/api/v1/materials/{aid}",headers=h,json=data).status_code==409


def test_admin_question_edit_archive_and_upload(demo,tmp_path,monkeypatch):
    from io import BytesIO
    from PIL import Image
    client,factory=demo;h=staff_headers(client,factory)
    tree=client.get("/api/v1/admin/content",headers=h).json();qid=tree["quizzes"][0]["id"]
    r=client.post(f"/api/v1/admin/quizzes/{qid}/questions",headers=h,json={"prompt":"Pertanyaan baru?","options":["Satu","Dua"],"correct_index":1,"explanation":"Jawabannya dua."})
    assert r.status_code==201,r.text
    question=r.json();aid=question["id"]
    r=client.put(f"/api/v1/admin/quizzes/{qid}/questions/{aid}",headers=h,json={"prompt":"Pertanyaan revisi?","options":["Satu","Dua"],"correct_index":0,"explanation":"Jawabannya satu."})
    assert r.status_code==200 and r.json()["correct_index"]==0
    assert client.patch(f"/api/v1/admin/quizzes/{qid}/questions/{aid}/active",headers=h,json={"active":False}).status_code==200
    public=client.get(f"/api/v1/quizzes/{qid}",headers=login(client)).json()
    assert aid not in [q["id"] for q in public["questions"]]
    monkeypatch.setattr("app.api.v1.administration.upload_root",lambda:tmp_path)
    image=BytesIO();Image.new("RGB",(40,40),"red").save(image,"PNG")
    r=client.post("/api/v1/admin/uploads/images",headers=h,files={"file":("test.png",image.getvalue(),"image/png")})
    assert r.status_code==201,r.text
    assert (tmp_path/r.json()["path"].split("/")[-1]).is_file()
    assert client.post("/api/v1/admin/uploads/images",headers=login(client),files={"file":("test.png",image.getvalue(),"image/png")}).status_code==403
    assert client.post("/api/v1/admin/uploads/images",headers=h,files={"file":("fake.png",b"<script>bad</script>","image/png")}).status_code==422
    assert client.post("/api/v1/admin/uploads/images",headers=h,files={"file":("big.png",b"a"*(10*1024*1024+1),"image/png")}).status_code==413


def test_admin_workspace_keeps_answers_private_from_students(demo):
    client,factory=demo;h=staff_headers(client,factory)
    assert client.get("/api/v1/admin/workspace",headers=login(client)).status_code==403
    result=client.get("/api/v1/admin/workspace",headers=h)
    assert result.status_code==200,result.text
    data=result.json()
    assert "password_hash" not in result.text
    assert len(data["materials"])==18 and len(data["questions"])==36
    assert data["members"][0]["username"]=="demo_student"


def test_atomic_admin_revision_of_published_material(demo):
    from app.models import MaterialProgress
    client,factory=demo;h=staff_headers(client,factory);student=login(client)
    tree=client.get("/api/v1/admin/content",headers=h).json();lid=tree["lessons"][0]["id"];mid=tree["lessons"][0]["module_id"]
    material=client.get(f"/api/v1/admin/lessons/{lid}/materials",headers=h).json()["items"][0];aid=material["id"]
    assert client.post(f"/api/v1/materials/{aid}/complete",headers=student).status_code==200
    payload={"title":"Artikel revisi admin","kind":"ARTICLE","body":"Isi artikel revisi disimpan admin.","position":1,"meta":"5 menit baca"}
    assert client.put(f"/api/v1/admin/materials/{aid}",headers=h,json=payload).status_code==409
    # Invalid duplicate position must roll back the attempted withdrawal too.
    bad={**payload,"position":2}
    assert client.put(f"/api/v1/admin/materials/{aid}?withdraw=true",headers=h,json=bad).status_code==409
    with factory() as db: assert db.get(Module,mid).status=="PUBLISHED"
    r=client.put(f"/api/v1/admin/materials/{aid}?withdraw=true",headers=h,json=payload)
    assert r.status_code==200,r.text
    assert r.json()["meta"]=="5 menit baca"
    with factory() as db:
        assert db.get(Module,mid).status=="DRAFT"
        assert db.scalar(select(MaterialProgress).where(MaterialProgress.material_id==aid)).completed_at is not None
    assert client.get(f"/api/v1/materials/{aid}",headers=student).status_code==404
    assert client.post(f"/api/v1/modules/{mid}/submit-review",headers=h).status_code==200
    assert client.post(f"/api/v1/modules/{mid}/review",headers=h,json={"approved":True,"note":"Revisi diperiksa"}).status_code==200
    assert client.get(f"/api/v1/materials/{aid}",headers=student).json()["body"]==payload["body"]


def test_admin_image_question_snapshot(demo):
    client,factory=demo;h=staff_headers(client,factory);student=login(client)
    tree=client.get("/api/v1/admin/content",headers=h).json();qid=next(q["id"] for q in tree["quizzes"] if q["kind"]=="PRE")
    payload={"prompt":"Pilih gambar yang tepat","options":["Gambar satu","Gambar dua"],"correct_index":0,"explanation":"Gambar satu benar.","image_url":"https://example.org/prompt.webp","option_images":["https://example.org/a.webp",None]}
    r=client.post(f"/api/v1/admin/quizzes/{qid}/questions",headers=h,json=payload)
    assert r.status_code==201,r.text
    aid=r.json()["id"]
    run=client.post(f"/api/v1/quizzes/{qid}/runs",headers=student).json()
    public=next(q for q in run["questions"] if q["id"]==aid)
    assert public["image_url"]==payload["image_url"] and public["option_images"]==payload["option_images"]
    assert "correct_index" not in public
    changed={**payload,"image_url":"https://example.org/new.webp"}
    assert client.put(f"/api/v1/admin/quizzes/{qid}/questions/{aid}",headers=h,json=changed).status_code==200
    from app.models import QuizRun
    with factory() as db:
        saved=db.get(QuizRun,run["id"])
        assert next(q for q in saved.question_snapshot if q["id"]==aid)["image_url"]==payload["image_url"]
    invalid={**payload,"option_images":[None]}
    assert client.post(f"/api/v1/admin/quizzes/{qid}/questions",headers=h,json=invalid).status_code==422
