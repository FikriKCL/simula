"""Import buku materi + komik PDF (Drive "Materi sama Komik") ke web, dibagi 3 level per topik.

    python -m app.import_modules <folder_sumber>

Folder sumber berisi sub-folder per topik (pp, asb, prs). Di tiap sub-folder:
`materi.pdf` = buku materi, PDF lain = komik (judul = nama file).
Tiap halaman PDF dirender jadi JPG di uploads/modul/.... Pembagian level (bagian buku, komik,
kuis, badge) diatur di app.module_levels. Topik di REMOVED_TOPICS dihapus.
Aman dijalankan ulang (idempoten).
"""
import os
import re
import shutil
import sys
from pathlib import Path

import pymupdf
from dotenv import load_dotenv
from sqlalchemy import delete, func, select

from app.database import create_database
from app.models import (
    Attempt,
    Badge,
    Certificate,
    Lesson,
    Material,
    Module,
    Question,
    Quiz,
    QuizRun,
    Topic,
    User,
    UserBadge,
)
from app.module_levels import LEVELS
from app.uploads import upload_root

# Folder sumber -> (kode topik, nama buku, ikon katalog, prefix judul komik, posisi topik)
TOPICS = {
    "pp": ("PP", "Pertolongan Pertama", "plaster", "", 1),
    "asb": ("ASB", "Siaga Bencana", "kit", "", 2),
    "prs": ("KR", "Kesehatan Remaja", "hand", "Edukasi ", 3),
}
REMOVED_TOPICS = ["PRS"]  # Topik demo "Perilaku Hidup Sehat", diganti Kesehatan Remaja.
FIRST_POSITION = 10  # Materi hasil impor mulai posisi 10; posisi 1-9 untuk materi buatan admin.
PARKED = 100_000  # Posisi sementara saat materi dipindah antar level.
ZOOM = 2.0  # A4 596pt -> ~1190px, tajam di layar retina kecil.
# Judul materi demo dari app.seed yang dibuang dari modul berisi materi asli.
DEMO_PREFIXES = ("Artikel ", "Cerita Piko", "Video demo pemutar")
COMIC_ICONS = ("heart", "plaster", "hand", "kit", "roll")


def slug(text):
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def clean_text(text):
    text = re.sub(r"[^\w\s.,;:!?()\-–—'\"/%&+°·]", "", text)  # buang emoji/ikon
    return re.sub(r"\n{3,}", "\n\n", text).strip()


def render(pdf, out_dir, base_url, title, keep_pdf=False):
    """Render semua halaman ke JPG. Kembalikan (pages, teks per halaman, url_pdf|None)."""
    doc = pymupdf.open(pdf)
    out_dir.mkdir(parents=True, exist_ok=True)
    rel = out_dir.relative_to(upload_root()).as_posix()
    pages, texts = [], []
    for i, page in enumerate(doc, start=1):
        name = f"{i:03d}.jpg"
        target = out_dir / name
        if not target.exists():
            page.get_pixmap(matrix=pymupdf.Matrix(ZOOM, ZOOM)).save(target, jpg_quality=82)
        pages.append({"image_url": f"{base_url}/uploads/{rel}/{name}",
                      "alt": f"{title} — halaman {i}", "text": ""})
        texts.append(page.get_text())
    url = None
    if keep_pdf:  # PDF komik ~12 MB; cukup gambar halamannya saja.
        shutil.copyfile(pdf, out_dir / "dokumen.pdf")
        url = f"{base_url}/uploads/{rel}/dokumen.pdf"
    return pages, texts, url


def owner_id(db):
    owner = (db.scalar(select(User).where(User.role == "ADMIN").order_by(User.id).limit(1))
             or db.scalar(select(User).where(User.role == "INSTRUCTOR").order_by(User.id).limit(1)))
    if not owner:
        raise SystemExit("Butuh akun ADMIN/INSTRUCTOR untuk membuat modul baru")
    return owner.id


def remove_topic(db, code):
    """Hapus permanen topik beserta modul, materi, kuis, nilai, sertifikat, dan badge-nya."""
    topic = db.scalar(select(Topic).filter_by(code=code))
    if not topic:
        return
    modules = list(db.scalars(select(Module.id).where(Module.topic_id == topic.id)))
    quizzes = list(db.scalars(select(Quiz.id).where(Quiz.module_id.in_(modules))))
    badges = select(Badge.id).where(Badge.module_id.in_(modules))
    db.execute(delete(Certificate).where(Certificate.quiz_id.in_(quizzes)))
    db.execute(delete(QuizRun).where(QuizRun.quiz_id.in_(quizzes)))
    db.execute(delete(Attempt).where(Attempt.quiz_id.in_(quizzes)))
    db.execute(delete(UserBadge).where(UserBadge.badge_id.in_(badges)))
    db.execute(delete(Quiz).where(Quiz.id.in_(quizzes)))  # soal ikut terhapus (cascade)
    db.execute(delete(Module).where(Module.id.in_(modules)))  # pelajaran, materi, badge ikut (cascade)
    db.delete(topic)
    db.flush()
    print(f"{code}: topik dihapus ({len(modules)} modul)")


def ensure_level(db, topic, n, spec, owner):
    """Pastikan modul + pelajaran level n ada, lalu isi teksnya."""
    module = db.scalar(select(Module).filter_by(topic_id=topic.id, level=n))
    if not module:
        module = Module(topic_id=topic.id, level=n, status="PUBLISHED", created_by=owner,
                        title="", description="")
        db.add(module)
        db.flush()
    module.title = f"{topic.name} — Level {n}: {spec['title']}"
    module.description = f"{spec['intro']} Diadaptasi dari buku PMI untuk PMR Mula."
    module.status = "PUBLISHED"
    lesson = db.scalar(select(Lesson).where(Lesson.module_id == module.id)
                       .order_by(Lesson.position).limit(1))
    if not lesson:
        lesson = Lesson(module_id=module.id, position=1, title="", body="")
        db.add(lesson)
    lesson.title = f"Bagian {n}: {spec['title']}"
    lesson.body = ("Baca bagian buku materi sampai selesai"
                   + (", lalu nikmati komiknya" if spec["comics"] else "")
                   + ". Setelah itu kerjakan tes akhir.")
    db.flush()
    for row in db.scalars(select(Material).where(
            Material.lesson_id == lesson.id, Material.position < FIRST_POSITION)):
        if row.title.startswith(DEMO_PREFIXES):
            print(f"{topic.code} L{n}: hapus materi demo '{row.title}'")
            db.delete(row)
    return module, lesson


def ensure_quizzes(db, label, module, spec):
    """Buat/perbarui kuis PRE/POST + badge modul. Soal lain dinonaktifkan (riwayat nilai aman)."""
    for kind, questions in (("PRE", spec["pre"]), ("POST", spec["post"])):
        title = f"{'Latihan awal' if kind == 'PRE' else 'Tes akhir'} {label}"
        quiz = db.scalar(select(Quiz).filter_by(module_id=module.id, kind=kind))
        if not quiz:
            quiz = Quiz(module_id=module.id, kind=kind, title=title, pass_score=70)
            db.add(quiz)
            db.flush()
        quiz.title = title
        for prompt, options, answer, explanation in questions:
            q = db.scalar(select(Question).filter_by(quiz_id=quiz.id, prompt=prompt))
            if not q:
                q = Question(quiz_id=quiz.id, prompt=prompt)
                db.add(q)
            q.options, q.correct_index, q.explanation, q.active = options, answer, explanation, True
        keep = [prompt for prompt, *_ in questions]
        for old in db.scalars(select(Question).where(
                Question.quiz_id == quiz.id, Question.prompt.not_in(keep), Question.active.is_(True))):
            old.active = False
    name, description = spec["badge"]
    badge = db.scalar(select(Badge).filter_by(module_id=module.id))
    if not badge:
        badge = Badge(module_id=module.id, name=name, description=description)
        db.add(badge)
    badge.name, badge.description = name, description
    db.flush()
    print(f"{label}: kuis {len(spec['pre'])}+{len(spec['post'])} soal, badge {name}")


def imported():
    """Penanda materi hasil skrip ini; materi buatan admin tidak pernah disentuh."""
    return ((Material.kind == "PDF") & Material.title.startswith("Buku Materi ")) | (
        (Material.kind == "COMIC") & Material.title.startswith("Komik "))


def place(db, lessons, lesson_id, position, used, aliases=(), **values):
    """Taruh materi (dicari dari judul, termasuk judul lama) di pelajaran/posisi tujuan."""
    row = None
    for title in (values["title"], *aliases):
        row = db.scalar(select(Material).where(
            Material.lesson_id.in_(lessons), Material.position >= PARKED,
            Material.title == title, Material.kind == values["kind"]).limit(1))
        if row:
            break
    if not row:
        row = Material()
        db.add(row)
    row.lesson_id, row.position = lesson_id, position
    for key, value in values.items():
        setattr(row, key, value)
    db.flush()
    used.add(row.id)


def import_topic(db, src, folder, base_url):
    code, book_name, icon, prefix, topic_position = TOPICS[folder]
    info = LEVELS[code]
    topic = db.scalar(select(Topic).filter_by(code=code))
    if not topic:
        topic = Topic(code=code, name=info["name"], position=topic_position)
        db.add(topic)
    topic.name, topic.position = info["name"], topic_position
    db.flush()
    owner = owner_id(db)
    levels = [ensure_level(db, topic, n, spec, owner) for n, spec in enumerate(info["levels"], start=1)]
    lessons = [lesson.id for _, lesson in levels]

    # Parkir semua materi hasil impor di topik ini, lalu susun ulang per level.
    for row in db.scalars(select(Material).where(
            Material.lesson_id.in_(lessons), Material.position >= FIRST_POSITION, imported())):
        row.position = PARKED + row.id
    db.flush()

    out = upload_root() / "modul" / folder
    book_pages, book_texts, book_url = render(
        src / "materi.pdf", out / "buku-materi", base_url, f"Buku Materi {book_name}", keep_pdf=True)
    used = set()
    for n, ((module, lesson), spec) in enumerate(zip(levels, info["levels"]), start=1):
        first, last = spec["pages"]
        pages = book_pages[first - 1:last]
        title = f"Buku Materi {book_name} — Bagian {n}"
        body = clean_text("\n".join(book_texts[first - 1:last])) or title
        place(db, lessons, lesson.id, FIRST_POSITION, used,
              aliases=(f"Buku Materi {book_name}",) if n == 1 else (),
              title=title, kind="PDF", url=book_url, pages=pages, page_count=len(pages), body=body,
              thumbnail_url=pages[0]["image_url"], thumbnail_key=icon,
              meta=f"Hal. {first}–{last} · {len(pages)} halaman", required=True,
              video_provider=None, video_id=None, duration_seconds=None)
        for i, stem in enumerate(spec["comics"], start=1):
            pdf = src / f"{stem}.pdf"
            comic_title = f"Komik {prefix}{stem}"
            comic_pages, comic_texts, _ = render(pdf, out / "komik" / slug(stem), base_url, comic_title)
            place(db, lessons, lesson.id, FIRST_POSITION + i, used,
                  title=comic_title, kind="COMIC", url=None, pages=comic_pages,
                  page_count=len(comic_pages), body=clean_text("\n".join(comic_texts)) or comic_title,
                  thumbnail_url=comic_pages[0]["image_url"], thumbnail_key=COMIC_ICONS[i % 5],
                  meta=f"{len(comic_pages)} halaman", required=False,
                  video_provider=None, video_id=None, duration_seconds=None)
        ensure_quizzes(db, f"{info['name']} {n}", module, spec)
        print(f"{code} L{n}: buku hal. {first}-{last} + {len(spec['comics'])} komik")

    # Materi impor lama yang tidak lagi dipakai (mis. buku utuh versi lama) dihapus.
    for row in db.scalars(select(Material).where(
            Material.lesson_id.in_(lessons), Material.position >= PARKED, Material.id.not_in(used))):
        print(f"{code}: hapus materi lama '{row.title}'")
        db.delete(row)
    db.flush()


def import_all(db, source, base_url):
    for code in REMOVED_TOPICS:
        remove_topic(db, code)
    for folder in TOPICS:
        src = source / folder
        if not (src / "materi.pdf").exists():
            print(f"lewati {folder}: materi.pdf tidak ada")
            continue
        import_topic(db, src, folder, base_url)
    # Rapikan urutan topik yang tersisa setelah topik impor.
    known = {code for code, *_ in TOPICS.values()}
    extra = db.scalars(select(Topic).where(Topic.code.not_in(known)).order_by(Topic.position))
    for i, topic in enumerate(extra, start=len(TOPICS) + 1):
        topic.position = i


def main():
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    load_dotenv(Path(__file__).resolve().parent.parent / ".env")
    base_url = os.getenv("ASSET_BASE_URL") or os.getenv("DEMO_ASSET_BASE_URL") or "http://localhost:8000"
    engine, factory = create_database()
    try:
        with factory.begin() as db:
            import_all(db, Path(sys.argv[1]).resolve(), base_url.rstrip("/"))
    finally:
        engine.dispose()


if __name__ == "__main__":
    main()
