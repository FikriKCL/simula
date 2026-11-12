"""Development-only, additive and repeatable demo dataset: python -m app.seed."""
import os
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import select
from app.database import create_database
from app.models import School, User, Topic, Module, Lesson, Material, Quiz, Question, Badge
from app.security import hasher


def seed(db, password):
    asset_base = os.getenv("DEMO_ASSET_BASE_URL", "http://localhost:8000").rstrip("/")
    def ensure(model, where, **values):
        existing = db.scalar(select(model).filter_by(**where))
        if existing:
            return existing
        row = model(**where, **values)
        db.add(row)
        db.flush()
        return row

    school = ensure(School, {"name": "SD SIMULA Demo"}, address="Sekolah contoh")
    teacher = ensure(User, {"username": "demo_teacher"}, display_name="Pengajar Demo",
                     password_hash=hasher.hash(password), role="INSTRUCTOR", school_id=school.id)
    ensure(User, {"username": "demo_student"}, display_name="Raka Demo",
           password_hash=hasher.hash(password), role="STUDENT", school_id=school.id)
    # Existing accounts are never reset, nor are learner progress/answers fabricated.
    for code, name, position in [("PP", "Pertolongan Pertama", 1),
                                  ("ASB", "Ayo Siaga Bencana", 2),
                                  ("PRS", "Perilaku Hidup Sehat", 3)]:
        topic = ensure(Topic, {"code": code}, name=name, position=position)
        for level in range(1, 4):
            module = ensure(Module, {"topic_id": topic.id, "level": level},
                            title=f"{name} — Level {level}",
                            description="Modul dummy untuk pengujian integrasi. Konten belum ditinjau ahli.",
                            status="PUBLISHED", created_by=teacher.id)
            # Do not attach demo content to pre-existing real modules.
            if module.created_by != teacher.id:
                continue
            lesson = ensure(Lesson, {"module_id": module.id, "position": 1},
                            title=f"Mengenal {name}", body="Pelajaran contoh untuk menguji aplikasi SIMULA.")
            text = (f"## {name}\n\n**Data dummy untuk pengujian aplikasi.**\n\n"
                    "Materi ini belum ditinjau ahli dan bukan panduan tindakan medis.\n\n"
                    "### Tujuan belajar\n\n- Mengenali topik pembelajaran.\n- Membaca materi sampai selesai.\n"
                    "- Mengajak guru atau orang dewasa berdiskusi.\n\n"
                    "### Cerita Piko\n\nPiko sedang belajar bersama teman-temannya. Ia membaca artikel, "
                    "melihat cerita bergambar, lalu menjawab pertanyaan. Ketika belum memahami sesuatu, "
                    "Piko bertanya kepada guru. Setelah itu ia menandai materi sebagai selesai.\n\n"
                    "### Refleksi\n\nCeritakan kembali apa yang baru kau pelajari kepada temanmu.")
            key = {"PP": "plaster", "ASB": "kit", "PRS": "hand"}[code]
            ensure(Material, {"lesson_id": lesson.id, "position": 1},
                   title=f"Artikel {name}", kind="ARTICLE", body=text, thumbnail_key=key, required=True)
            ensure(Material, {"lesson_id": lesson.id, "position": 2},
                   title=f"Cerita Piko — {name}", kind="COMIC", body="Cerita bergambar dummy Piko belajar bersama guru.",
                   thumbnail_key="heart", pages=[
                       {"image_url": f"{asset_base}/static/demo/comic-{i}.svg",
                        "alt": f"Piko belajar, panel {i}", "text": t}
                       for i, t in [(1, "Piko membaca materi bersama teman."), (2, "Piko bertanya kepada guru.")]],
                   page_count=2, required=True)
            # Playback sample only; not claimed to be curriculum content.
            ensure(Material, {"lesson_id": lesson.id, "position": 3},
                   title="Video demo pemutar (bukan materi kurikulum)", kind="VIDEO",
                   body="Video contoh untuk menguji embed. Bukan materi pembelajaran PMR.",
                   thumbnail_key=key, video_provider="youtube", video_id="aqz-KE-bpKQ",
                   duration_seconds=596, required=False)
            for kind in ["PRE", "POST"]:
                quiz = ensure(Quiz, {"module_id": module.id, "kind": kind},
                              title=f"{'Latihan awal' if kind == 'PRE' else 'Tes akhir'} {name}", pass_score=70)
                for prompt, options, answer, explanation in [
                    ("Siapa tokoh pada cerita contoh?", ["Piko", "Budi", "Ani"], 0, "Tokoh cerita contoh adalah Piko."),
                    ("Kepada siapa Piko bertanya?", ["Tidak siapa-siapa", "Guru", "Batu"], 1, "Piko bertanya kepada guru."),
                    ("Apa yang dilakukan setelah membaca materi?", ["Menutup tanpa membaca", "Menghapus akun", "Menandai selesai"], 2,
                     "Tandai materi selesai setelah membacanya.")]:
                    ensure(Question, {"quiz_id": quiz.id, "prompt": prompt}, options=options,
                           correct_index=answer, explanation=explanation)
            ensure(Badge, {"module_id": module.id}, name=f"Sahabat {code} {level}",
                   description="Diperoleh setelah pelajaran dan tes akhir selesai.")


def main():
    load_dotenv(Path(__file__).resolve().parent.parent / ".env")
    password = os.getenv("DEMO_PASSWORD", "SimulaDemo2026!")
    if len(password) < 10:
        raise SystemExit("DEMO_PASSWORD minimal 10 karakter")
    engine, factory = create_database()
    try:
        with factory.begin() as db:
            seed(db, password)
        print("Seed demo selesai. Username: demo_student / demo_teacher. Password: DEMO_PASSWORD atau SimulaDemo2026!")
    finally:
        engine.dispose()

if __name__ == "__main__":
    main()
