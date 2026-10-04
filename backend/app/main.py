from contextlib import asynccontextmanager
from uuid import uuid4
import logging
import re
from fastapi import FastAPI, Depends, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from psycopg import errors
from psycopg.types.json import Jsonb
from app.config import settings
from app.db import create_pool, get_db, one, many
from app.security import current_user, editor, reviewer, admin, hasher, DUMMY_HASH, token_for
from app.schemas import (Register, StaffCreate, SchoolCreate, ModuleCreate, LessonCreate,
                         Review, QuizCreate, Submission, BadgeCreate, ChatInput)
from app import schemas as out
from pydantic import BaseModel, Field

log = logging.getLogger("simula")

@asynccontextmanager
async def lifespan(app):
    pool = create_pool(settings().psycopg_url)
    pool.open()
    pool.wait(timeout=20)
    app.state.pool = pool
    try:
        yield
    finally:
        pool.close()

app = FastAPI(title="SIMULA Backend", version="1.0.0", lifespan=lifespan,
              description="API pembelajaran PMR Mula. Materi harus divalidasi sebelum diterbitkan.")
app.add_middleware(CORSMiddleware, allow_origins=settings().cors_origins,
                   allow_credentials=False, allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
                   allow_headers=["Authorization", "Content-Type"])

@app.exception_handler(errors.UniqueViolation)
async def conflict(request, exc):
    return JSONResponse(status_code=409, content={"detail": "Data sudah terdaftar atau urutan sudah dipakai"})

@app.exception_handler(errors.ForeignKeyViolation)
async def foreign_key(request, exc):
    return JSONResponse(status_code=422, content={"detail": "Referensi data tidak tersedia atau masih digunakan"})

@app.exception_handler(Exception)
async def unexpected(request, exc):
    reference = str(uuid4())
    log.error("Unhandled error %s", reference, exc_info=exc)
    return JSONResponse(status_code=500, content={"detail": "Terjadi kesalahan internal", "reference": reference})

P = "/api/v1"


def require(row, message="Data tidak ditemukan"):
    if row is None:
        raise HTTPException(404, message)
    return row


def module_for_edit(db, mid, user):
    module = require(one(db, 'SELECT * FROM "Module" WHERE id=%s FOR UPDATE', (mid,)))
    if user["role"] != "ADMIN" and module["created_by"] != user["id"]:
        raise HTTPException(403, "Hanya pembuat atau admin dapat mengubah modul")
    if module["status"] not in ("DRAFT", "REJECTED"):
        raise HTTPException(409, "Modul sedang ditinjau atau sudah terbit; buat modul baru untuk revisi")
    return module


def accessible_module(db, mid, user):
    module = require(one(db, 'SELECT * FROM "Module" WHERE id=%s', (mid,)))
    if user["role"] in ("ADMIN", "REVIEWER"):
        return module
    if user["role"] == "INSTRUCTOR" and module["created_by"] == user["id"]:
        return module
    if module["status"] != "PUBLISHED":
        raise HTTPException(404, "Modul belum diterbitkan")
    # Lower published levels must be completed before moving to the next level.
    incomplete = one(db, '''SELECT m.id FROM "Module" m WHERE m.status='PUBLISHED' AND m.level<%s
        AND (NOT EXISTS (SELECT 1 FROM "Lesson" l WHERE l.module_id=m.id)
             OR EXISTS (SELECT 1 FROM "Lesson" l WHERE l.module_id=m.id
                        AND NOT EXISTS (SELECT 1 FROM "Progress" p WHERE p.lesson_id=l.id AND p.user_id=%s)))
        LIMIT 1''', (module["level"], user["id"]))
    if incomplete:
        raise HTTPException(403, "Selesaikan materi level sebelumnya")
    return module


@app.get("/health/live", tags=["Health"])
def live():
    return {"status": "ok"}

@app.get("/health/ready", tags=["Health"])
def ready(db=Depends(get_db)):
    one(db, "SELECT 1")
    # Check the schema as well as the connection.
    one(db, 'SELECT id FROM "User" LIMIT 1')
    return {"status": "ready"}


def create_user(db, data, role):
    return one(db, '''INSERT INTO "User" (username,display_name,password_hash,school_id,role)
        VALUES (%s,%s,%s,%s,%s) RETURNING id,username,display_name,role,school_id,xp''',
        (data.username, data.display_name, hasher.hash(data.password), data.school_id, role))

@app.post(P+"/auth/register", status_code=201, tags=["Auth"], response_model=out.UserOut)
def register(data: Register, db=Depends(get_db)):
    return create_user(db, data, "STUDENT")

class Login(BaseModel):
    username: str = Field(min_length=1, max_length=40)
    password: str = Field(min_length=1, max_length=128)

# JSON login for Next.js. OAuth2 form route is supplied separately for Swagger.
@app.post(P+"/auth/login", tags=["Auth"], response_model=out.TokenOut)
def login(data: Login, db=Depends(get_db)):
    user = one(db, 'SELECT * FROM "User" WHERE username=%s', (data.username.lower(),))
    valid = hasher.verify(data.password, user["password_hash"] if user else DUMMY_HASH)
    if not user or not valid or not user["active"]:
        raise HTTPException(401, "Username atau password salah")
    return {"access_token": token_for(user["id"]), "token_type": "bearer",
            "expires_in": settings().access_token_minutes * 60}

from fastapi.security import OAuth2PasswordRequestForm
@app.post(P+"/auth/token", tags=["Auth"], response_model=out.TokenOut)
def swagger_login(data: OAuth2PasswordRequestForm = Depends(), db=Depends(get_db)):
    return login(Login(username=data.username, password=data.password), db)

@app.get(P+"/users/me", tags=["Users"], response_model=out.UserOut)
def me(user=Depends(current_user)):
    return user

@app.post(P+"/admin/users", status_code=201, tags=["Admin"], response_model=out.UserOut)
def staff_create(data: StaffCreate, user=Depends(admin), db=Depends(get_db)):
    return create_user(db, data, data.role)

class UserState(BaseModel):
    active: bool

@app.patch(P+"/admin/users/{uid}/active", tags=["Admin"])
def user_state(uid: int, data: UserState, user=Depends(admin), db=Depends(get_db)):
    if uid == user["id"]:
        raise HTTPException(409, "Tidak dapat menonaktifkan akun sendiri")
    return require(one(db, 'UPDATE "User" SET active=%s WHERE id=%s RETURNING id,active', (data.active, uid)))

@app.get(P+"/schools", tags=["Schools"], response_model=list[out.SchoolOut])
def schools(limit: int = Query(20, ge=1, le=100), offset: int = Query(0, ge=0), db=Depends(get_db)):
    return many(db, 'SELECT * FROM "School" ORDER BY id LIMIT %s OFFSET %s', (limit, offset))

@app.post(P+"/schools", status_code=201, tags=["Schools"], response_model=out.SchoolOut)
def school_create(data: SchoolCreate, user=Depends(admin), db=Depends(get_db)):
    return one(db, 'INSERT INTO "School" (name,address) VALUES (%s,%s) RETURNING *', (data.name, data.address))

@app.get(P+"/modules", tags=["Modules"], response_model=list[out.ModuleSummary])
def modules(limit: int = Query(20, ge=1, le=100), offset: int = Query(0, ge=0),
            user=Depends(current_user), db=Depends(get_db)):
    return many(db, '''SELECT id,title,description,level,status,review_note FROM "Module"
        WHERE status='PUBLISHED' OR %s IN ('ADMIN','REVIEWER') OR created_by=%s
        ORDER BY level LIMIT %s OFFSET %s''', (user["role"], user["id"], limit, offset))

@app.post(P+"/modules", status_code=201, tags=["Modules"], response_model=out.ModuleOut)
def module_create(data: ModuleCreate, user=Depends(editor), db=Depends(get_db)):
    return one(db, '''INSERT INTO "Module" (title,description,level,created_by)
        VALUES (%s,%s,%s,%s) RETURNING *''', (data.title, data.description, data.level, user["id"]))

@app.put(P+"/modules/{mid}", tags=["Modules"], response_model=out.ModuleOut)
def module_update(mid: int, data: ModuleCreate, user=Depends(editor), db=Depends(get_db)):
    module_for_edit(db, mid, user)
    return one(db, '''UPDATE "Module" SET title=%s,description=%s,level=%s,status='DRAFT',
        review_note=NULL,reviewed_by=NULL WHERE id=%s RETURNING *''', (data.title,data.description,data.level,mid))

@app.get(P+"/modules/{mid}", tags=["Modules"], response_model=out.ModuleDetail)
def module_detail(mid: int, user=Depends(current_user), db=Depends(get_db)):
    module = accessible_module(db, mid, user)
    module["lessons"] = many(db, 'SELECT * FROM "Lesson" WHERE module_id=%s ORDER BY position', (mid,))
    module["quizzes"] = many(db, 'SELECT * FROM "Quiz" WHERE module_id=%s ORDER BY id', (mid,))
    return module

@app.post(P+"/modules/{mid}/lessons", status_code=201, tags=["Lessons"], response_model=out.LessonOut)
def lesson_create(mid: int, data: LessonCreate, user=Depends(editor), db=Depends(get_db)):
    module_for_edit(db, mid, user)
    return one(db, '''INSERT INTO "Lesson" (module_id,title,body,image_url,video_url,position)
        VALUES (%s,%s,%s,%s,%s,%s) RETURNING *''', (mid,data.title,data.body,
        str(data.image_url) if data.image_url else None, str(data.video_url) if data.video_url else None,data.position))

@app.put(P+"/lessons/{lid}", tags=["Lessons"], response_model=out.LessonOut)
def lesson_update(lid: int, data: LessonCreate, user=Depends(editor), db=Depends(get_db)):
    lesson = require(one(db, 'SELECT * FROM "Lesson" WHERE id=%s', (lid,)))
    module_for_edit(db, lesson["module_id"], user)
    return one(db, '''UPDATE "Lesson" SET title=%s,body=%s,image_url=%s,video_url=%s,position=%s
        WHERE id=%s RETURNING *''', (data.title,data.body,str(data.image_url) if data.image_url else None,
        str(data.video_url) if data.video_url else None,data.position,lid))

@app.delete(P+"/lessons/{lid}", status_code=204, tags=["Lessons"])
def lesson_delete(lid: int, user=Depends(editor), db=Depends(get_db)):
    lesson = require(one(db, 'SELECT * FROM "Lesson" WHERE id=%s', (lid,)))
    module_for_edit(db, lesson["module_id"], user)
    db.execute('DELETE FROM "Lesson" WHERE id=%s', (lid,))

@app.post(P+"/modules/{mid}/submit-review", tags=["Validation"], response_model=out.ModuleOut)
def submit_review(mid: int, user=Depends(editor), db=Depends(get_db)):
    module_for_edit(db, mid, user)
    if not one(db, 'SELECT id FROM "Lesson" WHERE module_id=%s LIMIT 1', (mid,)):
        raise HTTPException(422, "Tambahkan minimal satu materi")
    return one(db, '''UPDATE "Module" SET status='PENDING',review_note=NULL,reviewed_by=NULL
        WHERE id=%s RETURNING *''', (mid,))

@app.post(P+"/modules/{mid}/review", tags=["Validation"], response_model=out.ModuleOut)
def review_module(mid: int, data: Review, user=Depends(reviewer), db=Depends(get_db)):
    module = require(one(db, 'SELECT * FROM "Module" WHERE id=%s FOR UPDATE', (mid,)))
    if module["created_by"] == user["id"]:
        raise HTTPException(403, "Materi harus divalidasi oleh akun lain")
    if module["status"] != "PENDING":
        raise HTTPException(409, "Modul tidak sedang menunggu validasi")
    return one(db, '''UPDATE "Module" SET status=%s,review_note=%s,reviewed_by=%s WHERE id=%s RETURNING *''',
               ("PUBLISHED" if data.approved else "REJECTED",data.note,user["id"],mid))

@app.post(P+"/lessons/{lid}/complete", tags=["Learning"], response_model=out.CompletionOut)
def complete(lid: int, user=Depends(current_user), db=Depends(get_db)):
    # Serialize rewards for one learner. The unique key also enforces idempotency.
    one(db, 'SELECT id FROM "User" WHERE id=%s FOR UPDATE', (user["id"],))
    lesson = require(one(db, 'SELECT * FROM "Lesson" WHERE id=%s', (lid,)))
    module = accessible_module(db, lesson["module_id"], user)
    if module["status"] != "PUBLISHED":
        raise HTTPException(409, "Hanya materi terbit dapat diselesaikan")
    result = one(db, '''INSERT INTO "Progress" (user_id,lesson_id) VALUES (%s,%s)
        ON CONFLICT (user_id,lesson_id) DO NOTHING RETURNING *''', (user["id"],lid))
    if result:
        db.execute('UPDATE "User" SET xp=xp+10 WHERE id=%s', (user["id"],))
    award_badge(db, user["id"], lesson["module_id"])
    return {"completed": True, "xp_awarded": 10 if result else 0}


def award_badge(db, uid, mid):
    unfinished = one(db, '''SELECT id FROM "Lesson" l WHERE module_id=%s AND NOT EXISTS
        (SELECT 1 FROM "Progress" p WHERE p.lesson_id=l.id AND p.user_id=%s) LIMIT 1''', (mid,uid))
    if unfinished:
        return
    # When a post-test exists, require a passing attempt for each post-test.
    failed = one(db, '''SELECT id FROM "Quiz" q WHERE module_id=%s AND kind='POST' AND NOT EXISTS
        (SELECT 1 FROM "Attempt" a WHERE a.quiz_id=q.id AND a.user_id=%s AND passed) LIMIT 1''', (mid,uid))
    if not failed:
        db.execute('''INSERT INTO "UserBadge" (user_id,badge_id) SELECT %s,id FROM "Badge" WHERE module_id=%s
            ON CONFLICT (user_id,badge_id) DO NOTHING''', (uid,mid))

@app.get(P+"/learning/progress", tags=["Learning"], response_model=list[out.ProgressOut])
def progress(user=Depends(current_user), db=Depends(get_db)):
    return many(db, '''SELECT m.id,m.title,m.level,count(l.id)::int AS total,
        count(p.id)::int AS completed FROM "Module" m LEFT JOIN "Lesson" l ON l.module_id=m.id
        LEFT JOIN "Progress" p ON p.lesson_id=l.id AND p.user_id=%s WHERE m.status='PUBLISHED'
        GROUP BY m.id ORDER BY m.level''', (user["id"],))

@app.post(P+"/modules/{mid}/quizzes", status_code=201, tags=["Quizzes"], response_model=out.QuizOut)
def quiz_create(mid: int, data: QuizCreate, user=Depends(editor), db=Depends(get_db)):
    module_for_edit(db, mid, user)
    quiz = one(db, '''INSERT INTO "Quiz" (module_id,title,kind,pass_score) VALUES (%s,%s,%s,%s) RETURNING *''',
               (mid,data.title,data.kind,data.pass_score))
    for question in data.questions:
        db.execute('''INSERT INTO "Question" (quiz_id,prompt,options,correct_index,explanation)
            VALUES (%s,%s,%s,%s,%s)''', (quiz["id"],question.prompt,Jsonb(question.options),question.correct_index,question.explanation))
    return quiz

@app.get(P+"/quizzes/{qid}", tags=["Quizzes"], response_model=out.QuizDetail)
def quiz_detail(qid: int, user=Depends(current_user), db=Depends(get_db)):
    quiz = require(one(db, 'SELECT * FROM "Quiz" WHERE id=%s', (qid,)))
    accessible_module(db, quiz["module_id"], user)
    quiz["questions"] = many(db, 'SELECT id,prompt,options FROM "Question" WHERE quiz_id=%s ORDER BY id', (qid,))
    return quiz

@app.post(P+"/quizzes/{qid}/attempts", status_code=201, tags=["Quizzes"], response_model=out.SubmissionOut)
def attempt_create(qid: int, data: Submission, user=Depends(current_user), db=Depends(get_db)):
    quiz = require(one(db, 'SELECT * FROM "Quiz" WHERE id=%s', (qid,)))
    module = accessible_module(db, quiz["module_id"], user)
    if module["status"] != "PUBLISHED":
        raise HTTPException(409, "Kuis belum terbit")
    if quiz["kind"] == "POST" and one(db, '''SELECT id FROM "Lesson" l WHERE module_id=%s AND NOT EXISTS
        (SELECT 1 FROM "Progress" p WHERE p.lesson_id=l.id AND p.user_id=%s) LIMIT 1''', (quiz["module_id"],user["id"])):
        raise HTTPException(403, "Selesaikan semua materi sebelum post-test")
    questions = many(db, 'SELECT * FROM "Question" WHERE quiz_id=%s ORDER BY id', (qid,))
    if not questions or set(data.answers) != {q["id"] for q in questions}:
        raise HTTPException(422, "Jawab tepat semua soal pada kuis ini")
    if any(data.answers[q["id"]] < 0 or data.answers[q["id"]] >= len(q["options"]) for q in questions):
        raise HTTPException(422, "Indeks jawaban tidak valid")
    score = round(sum(data.answers[q["id"]] == q["correct_index"] for q in questions)*100/len(questions))
    one(db, 'SELECT id FROM "User" WHERE id=%s FOR UPDATE', (user["id"],))
    prior = one(db, 'SELECT id FROM "Attempt" WHERE user_id=%s AND quiz_id=%s AND passed LIMIT 1', (user["id"],qid))
    result = one(db, '''INSERT INTO "Attempt" (user_id,quiz_id,score,passed,answers) VALUES (%s,%s,%s,%s,%s) RETURNING *''',
                 (user["id"],qid,score,score >= quiz["pass_score"],Jsonb({str(k):v for k,v in data.answers.items()})))
    reward = 20 if result["passed"] and not prior and quiz["kind"] == "POST" else 0
    if reward:
        db.execute('UPDATE "User" SET xp=xp+%s WHERE id=%s', (reward,user["id"]))
    award_badge(db, user["id"], quiz["module_id"])
    result["xp_awarded"] = reward
    result["feedback"] = [{"question_id":q["id"],"correct":data.answers[q["id"]]==q["correct_index"],
                           "explanation":q["explanation"]} for q in questions]
    return result

@app.get(P+"/learning/attempts", tags=["Quizzes"], response_model=list[out.AttemptOut])
def attempts(limit: int=Query(20,ge=1,le=100), offset: int=Query(0,ge=0), user=Depends(current_user), db=Depends(get_db)):
    return many(db, 'SELECT * FROM "Attempt" WHERE user_id=%s ORDER BY id DESC LIMIT %s OFFSET %s', (user["id"],limit,offset))

@app.post(P+"/modules/{mid}/badge", status_code=201, tags=["Badges"], response_model=out.BadgeOut)
def badge_create(mid: int, data: BadgeCreate, user=Depends(editor), db=Depends(get_db)):
    module_for_edit(db, mid, user)
    return one(db, 'INSERT INTO "Badge" (module_id,name,description) VALUES (%s,%s,%s) RETURNING *', (mid,data.name,data.description))

@app.get(P+"/learning/badges", tags=["Badges"], response_model=list[out.EarnedBadgeOut])
def badges(user=Depends(current_user), db=Depends(get_db)):
    return many(db, '''SELECT b.*,ub.earned_at FROM "UserBadge" ub JOIN "Badge" b ON b.id=ub.badge_id
        WHERE ub.user_id=%s ORDER BY ub.earned_at DESC''', (user["id"],))

@app.get(P+"/reports/evaluation", tags=["Reports"], response_model=list[out.EvaluationOut])
def evaluation(school_id: int | None = Query(None,gt=0), user=Depends(reviewer), db=Depends(get_db)):
    # First attempt by quiz kind: repeat practice does not overwrite the baseline.
    return many(db, '''WITH first_attempt AS (
        SELECT DISTINCT ON (a.user_id,q.module_id,q.kind) a.user_id,q.module_id,q.kind,a.score
        FROM "Attempt" a JOIN "Quiz" q ON q.id=a.quiz_id
        ORDER BY a.user_id,q.module_id,q.kind,a.created_at,a.id
    ), per_student AS (
        SELECT a.user_id,a.module_id,max(score) FILTER (WHERE kind='PRE') AS pre_score,
        max(score) FILTER (WHERE kind='POST') AS post_score
        FROM first_attempt a JOIN "User" u ON u.id=a.user_id
        WHERE u.role='STUDENT' AND (%s::int IS NULL OR u.school_id=%s)
        GROUP BY a.user_id,a.module_id
    ) SELECT module_id,count(*)::int AS participants,
        count(*) FILTER (WHERE pre_score IS NOT NULL AND post_score IS NOT NULL)::int AS paired_participants,
        avg(pre_score) AS mean_pre,avg(post_score) AS mean_post,
        avg(post_score-pre_score) FILTER (WHERE pre_score IS NOT NULL AND post_score IS NOT NULL) AS mean_gain
        FROM per_student GROUP BY module_id ORDER BY module_id''', (school_id,school_id))

@app.post(P+"/chat/sessions", status_code=201, tags=["Chatbot"], response_model=out.SessionOut)
def chat_session(user=Depends(current_user), db=Depends(get_db)):
    return one(db, 'INSERT INTO "ChatSession" (user_id) VALUES (%s) RETURNING *', (user["id"],))


def owned_session(db, sid, uid):
    return require(one(db, 'SELECT id FROM "ChatSession" WHERE id=%s AND user_id=%s', (sid,uid)), "Percakapan tidak ditemukan")

@app.get(P+"/chat/sessions/{sid}/messages", tags=["Chatbot"], response_model=list[out.MessageOut])
def chat_history(sid: int, limit: int=Query(50,ge=1,le=100), offset: int=Query(0,ge=0), user=Depends(current_user), db=Depends(get_db)):
    owned_session(db,sid,user["id"])
    return many(db, 'SELECT * FROM "ChatMessage" WHERE session_id=%s ORDER BY id LIMIT %s OFFSET %s', (sid,limit,offset))

@app.post(P+"/chat/sessions/{sid}/messages", status_code=201, tags=["Chatbot"], response_model=out.ChatReplyOut)
def chat_message(sid: int, data: ChatInput, user=Depends(current_user), db=Depends(get_db)):
    owned_session(db,sid,user["id"])
    # Retrieval-only: return excerpts of validated material, never invent medical instructions.
    rows = many(db, '''SELECT l.id,l.title,l.body,l.module_id,
        ts_rank(to_tsvector('simple',l.title || ' ' || l.body),plainto_tsquery('simple',%s)) AS rank
        FROM "Lesson" l JOIN "Module" m ON m.id=l.module_id WHERE m.status='PUBLISHED'
        AND to_tsvector('simple',l.title || ' ' || l.body) @@ plainto_tsquery('simple',%s)
        ORDER BY rank DESC,l.id LIMIT 3''', (data.message,data.message))
    if not rows:
        words = [w for w in re.findall(r"\w+",data.message.lower()) if len(w)>3 and w not in {"bagaimana","apakah","tentang","tolong","jelaskan","dengan","untuk","yang"}][:8]
        if words:
            rows = many(db, '''SELECT l.id,l.title,l.body,l.module_id FROM "Lesson" l
                JOIN "Module" m ON m.id=l.module_id WHERE m.status='PUBLISHED'
                AND EXISTS (SELECT 1 FROM unnest(%s::text[]) w WHERE strpos(lower(l.title || ' ' || l.body),w)>0)
                ORDER BY l.id LIMIT 3''', (words,))
    sources = [{"lesson_id":r["id"],"module_id":r["module_id"],"title":r["title"]} for r in rows]
    reply = ("Berikut kutipan materi SIMULA yang telah divalidasi:\n\n" + "\n\n".join(r["title"]+": "+r["body"][:800] for r in rows)) if rows else "Aku belum menemukan jawaban dalam materi tervalidasi. Tanyakan kepada pembina PMR atau relawan PMI."
    db.execute('INSERT INTO "ChatMessage" (session_id,role,content,sources) VALUES (%s,%s,%s,%s)', (sid,"user",data.message,Jsonb([])))
    result = one(db, 'INSERT INTO "ChatMessage" (session_id,role,content,sources) VALUES (%s,%s,%s,%s) RETURNING *', (sid,"assistant",reply,Jsonb(sources)))
    result["mode"] = "validated_material_retrieval"
    return result
