"""
OCR untuk buku PMI hasil scan (halaman berupa gambar) menggunakan Gemini Vision.

Setiap halaman dirender menjadi gambar lalu ditranskripsi ke Markdown dengan struktur
judul (#, ##, ###) yang dipertahankan, karena struktur ini dipakai chunk_and_embed.py
untuk menyimpan judul induk di setiap potongan materi.

Hasil per halaman disimpan di processed/ocr_cache/<slug>/ sehingga proses bisa
dilanjutkan bila terhenti (misalnya karena rate limit). Jalankan dari folder simula/:

    python chatbot/extract_scanned_materials.py            # semua dokumen
    python chatbot/extract_scanned_materials.py 14 15      # hanya output berawalan 14_ dan 15_
"""
import os
import re
import sys
import time
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import pymupdf
from dotenv import load_dotenv

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

logging.getLogger("google_genai").setLevel(logging.ERROR)
from google import genai
from google.genai import types

CURRENT_DIR = Path(__file__).resolve().parent
for env_file in (CURRENT_DIR.parent / "backend" / ".env", CURRENT_DIR / ".env"):
    if env_file.exists():
        load_dotenv(env_file)
        break

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("GEMINI_API_KEY tidak ditemukan di backend/.env")

client = genai.Client(api_key=api_key)
MODEL = os.getenv("GEMINI_OCR_MODEL") or os.getenv("GEMINI_MODEL") or "gemini-3.5-flash-lite"
WORKERS = int(os.getenv("OCR_WORKERS", "4"))

DATA_DIR = CURRENT_DIR / "data"
PROCESSED_DIR = CURRENT_DIR / "processed"
CACHE_DIR = PROCESSED_DIR / "ocr_cache"

DOCUMENTS = [
    # Buku PMR tingkat Mula: sebagian besar halaman berupa gambar, jadi seluruhnya di-OCR
    {"pdf": "2.1. PP PMR MULA.pdf", "output": "02_pertolongan_pertama_mula.md",
     "title": "BUKU PANDUAN PERTOLONGAN PERTAMA (PMR MULA)"},
    {"pdf": "3. KEPEMIMPINAN PMR (MULA-MADYA-WIRA).pdf", "output": "05_kepemimpinan_pmr.md",
     "title": "BUKU KEPEMIMPINAN PMR (MULA, MADYA, WIRA)"},
    {"pdf": "4. DONOR DARAH PMR (MULA-MADYA-WIRA).pdf", "output": "06_donor_darah_pmr.md",
     "title": "BUKU DONOR DARAH SUKARELA PMR (MULA, MADYA, WIRA)"},
    # Buku hasil scan yang belum masuk knowledge base
    {"pdf": "7.2. Ayo Siaga Madya.pdf", "output": "14_ayo_siaga_bencana_madya.md",
     "title": "BUKU PANDUAN AYO SIAGA BENCANA (PMR MADYA)"},
    {"pdf": "7.3. Ayo Siaga Wira.pdf", "output": "15_ayo_siaga_bencana_wira.md",
     "title": "BUKU PANDUAN AYO SIAGA BENCANA (PMR WIRA)"},
    {"pdf": "Panduan Fasilitator Ayo Siaga Bencana Mula.pdf", "output": "16_fasilitator_ayo_siaga_bencana_mula.md",
     "title": "PANDUAN FASILITATOR AYO SIAGA BENCANA (PMR MULA)"},
    {"pdf": "Panduan Fasilitator Ayo Siaga Bencana Madya.pdf", "output": "17_fasilitator_ayo_siaga_bencana_madya.md",
     "title": "PANDUAN FASILITATOR AYO SIAGA BENCANA (PMR MADYA)"},
    {"pdf": "Panduan Fasilitator Ayo Siaga Bencana WIra.pdf", "output": "18_fasilitator_ayo_siaga_bencana_wira.md",
     "title": "PANDUAN FASILITATOR AYO SIAGA BENCANA (PMR WIRA)"},
]

PROMPT = (
    "Transkripsikan halaman buku PMI/PMR ini ke Markdown secara lengkap dan setia pada teks aslinya.\n"
    "Aturan:\n"
    "1. Salin teks apa adanya (jangan diringkas, jangan menambah informasi yang tidak ada di halaman).\n"
    "2. Pertahankan struktur judul: judul bab/topik utama pakai `#`, subjudul pakai `##`, "
    "sub-subjudul atau poin bernomor yang berupa judul pakai `###`.\n"
    "3. Pertahankan penomoran dan daftar (1., 2., a., b., -) serta tabel (format tabel Markdown).\n"
    "4. Untuk ilustrasi/komik yang memuat pesan edukasi, tulis satu baris `> Ilustrasi: <pesan singkat>`. "
    "Abaikan ilustrasi dekoratif.\n"
    "5. Abaikan nomor halaman, header/footer berulang, dan logo.\n"
    "6. Jangan menulis kalimat pembuka/penutup seperti 'Berikut adalah transkripsi'.\n"
    "7. Jika halaman kosong atau hanya berisi gambar dekoratif, jawab persis: KOSONG"
)


def slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", name.lower()).strip("_")


def render_page(pdf_path: Path, page_idx: int) -> bytes:
    with pymupdf.open(pdf_path) as doc:
        pix = doc[page_idx].get_pixmap(dpi=150)
        return pix.tobytes("jpeg", jpg_quality=82)


def ocr_page(pdf_path: Path, page_idx: int, cache_file: Path) -> str:
    if cache_file.exists():
        return cache_file.read_text(encoding="utf-8")

    img = render_page(pdf_path, page_idx)
    for attempt in range(6):
        try:
            response = client.models.generate_content(
                model=MODEL,
                contents=[types.Part.from_bytes(data=img, mime_type="image/jpeg"), PROMPT],
                config=types.GenerateContentConfig(temperature=0.0),
            )
            text = (response.text or "").strip()
            text = re.sub(r"^```(?:markdown)?\s*|\s*```$", "", text).strip()
            cache_file.write_text(text, encoding="utf-8")
            return text
        except Exception as e:  # rate limit / transient error
            wait = 10 * (attempt + 1)
            print(f"  hal. {page_idx + 1}: percobaan {attempt + 1} gagal ({str(e)[:120]}), tunggu {wait}s")
            time.sleep(wait)
    raise RuntimeError(f"OCR gagal untuk {pdf_path.name} hal. {page_idx + 1}")


def extract_document(doc_info: dict) -> None:
    pdf_path = DATA_DIR / doc_info["pdf"]
    if not pdf_path.exists():
        print(f"Melewatkan {doc_info['pdf']}: file tidak ditemukan.")
        return
    cache = CACHE_DIR / slugify(Path(doc_info["output"]).stem)
    cache.mkdir(parents=True, exist_ok=True)

    with pymupdf.open(pdf_path) as doc:
        total = len(doc)
    print(f"OCR {doc_info['pdf']} ({total} hlm) -> {doc_info['output']}")

    pages: dict[int, str] = {}
    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        futures = {
            pool.submit(ocr_page, pdf_path, i, cache / f"page_{i + 1:03d}.md"): i
            for i in range(total)
        }
        done = 0
        for fut in as_completed(futures):
            pages[futures[fut]] = fut.result()
            done += 1
            if done % 10 == 0 or done == total:
                print(f"  {done}/{total} halaman")

    parts = [f"# {doc_info['title']}\n"]
    for i in range(total):
        text = pages[i].strip()
        if not text or text.upper().startswith("KOSONG"):
            continue
        parts.append(f"\n<!-- Halaman {i + 1} -->\n{text}")
    out_path = PROCESSED_DIR / doc_info["output"]
    out_path.write_text("\n".join(parts) + "\n", encoding="utf-8")
    print(f"Selesai: {out_path.name} ({out_path.stat().st_size / 1024:.1f} KB)")


if __name__ == "__main__":
    prefixes = sys.argv[1:]
    for d in DOCUMENTS:
        if not prefixes or any(d["output"].startswith(p) for p in prefixes):
            extract_document(d)
