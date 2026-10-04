import re

from sqlalchemy import cast, func, literal, or_, select
from sqlalchemy.dialects.postgresql import REGCONFIG

from app.models import ChatMessage, ChatSession, Lesson, Module

from .common import add, record, records, require, transactional


@transactional
def chat_session(user, db):
    return record(add(db, ChatSession(user_id=user["id"])))


def owned_session(db, sid, uid):
    return require(
        db.scalar(
            select(ChatSession).where(ChatSession.id == sid, ChatSession.user_id == uid)
        ),
        "Percakapan tidak ditemukan",
    )


def chat_history(sid, limit, offset, user, db):
    owned_session(db, sid, user["id"])
    return records(
        db.scalars(
            select(ChatMessage)
            .where(ChatMessage.session_id == sid)
            .order_by(ChatMessage.id)
            .limit(limit)
            .offset(offset)
        )
    )


def search_materials(db, message):
    configuration = cast(literal("simple"), REGCONFIG)
    content = Lesson.title + literal(" ") + Lesson.body
    vector = func.to_tsvector(configuration, content)
    query = func.plainto_tsquery(configuration, message)
    base = (
        select(Lesson)
        .join(Module, Module.id == Lesson.module_id)
        .where(Module.status == "PUBLISHED")
    )
    rows = list(
        db.scalars(
            base.where(vector.op("@@")(query))
            .order_by(func.ts_rank(vector, query).desc(), Lesson.id)
            .limit(3)
        )
    )
    if not rows:
        words = [
            w
            for w in re.findall(r"\w+", message.lower())
            if len(w) > 3
            and w
            not in {
                "bagaimana",
                "apakah",
                "tentang",
                "tolong",
                "jelaskan",
                "dengan",
                "untuk",
                "yang",
            }
        ][:8]
        if words:
            matches = or_(
                *(func.strpos(func.lower(content), word) > 0 for word in words)
            )
            rows = list(db.scalars(base.where(matches).order_by(Lesson.id).limit(3)))
    return rows


@transactional
def chat_message(sid, data, user, db):
    owned_session(db, sid, user["id"])
    rows = search_materials(db, data.message)
    sources = [
        {"lesson_id": r.id, "module_id": r.module_id, "title": r.title} for r in rows
    ]
    reply = (
        (
            "Berikut kutipan materi SIMULA yang telah divalidasi:\n\n"
            + "\n\n".join(r.title + ": " + r.body[:800] for r in rows)
        )
        if rows
        else "Aku belum menemukan jawaban dalam materi tervalidasi. Tanyakan kepada pembina PMR atau relawan PMI."
    )
    add(db, ChatMessage(session_id=sid, role="user", content=data.message, sources=[]))
    response = add(
        db,
        ChatMessage(session_id=sid, role="assistant", content=reply, sources=sources),
    )
    return dict(record(response), mode="validated_material_retrieval")
