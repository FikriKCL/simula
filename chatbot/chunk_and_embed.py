import os
import re
import sys
import json
import logging
import time
from pathlib import Path
from dotenv import load_dotenv

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# Suppress SDK warning in terminal
logging.getLogger("google_genai").setLevel(logging.ERROR)
from google import genai
from google.genai import types

# Resolve .env file dynamically regardless of current working directory
CURRENT_DIR = Path(__file__).resolve().parent
ENV_CANDIDATES = [
    CURRENT_DIR.parent / "backend" / ".env",
    CURRENT_DIR / ".env",
    CURRENT_DIR.parent / ".env",
]
for env_file in ENV_CANDIDATES:
    if env_file.exists():
        load_dotenv(env_file)
        break
else:
    load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError(
        "GEMINI_API_KEY tidak ditemukan! Pastikan Anda telah mengisi GEMINI_API_KEY di file backend/.env"
    )

client = genai.Client(api_key=api_key)

PROCESSED_DIR = os.path.join(CURRENT_DIR, "processed")
OUTPUT_JSON = os.path.join(PROCESSED_DIR, "knowledge_base.json")

FILES = [
    {
        "filename": "01_kesehatan_remaja_sebaya.md",
        "doc_title": "Pelatihan Remaja Sebaya (Kesehatan & Kesejahteraan Remaja)",
        "category": "kesehatan_remaja",
    },
    {
        "filename": "02_pertolongan_pertama_mula.md",
        "doc_title": "Buku Panduan Pertolongan Pertama (PMR Mula)",
        "category": "pertolongan_pertama",
    },
    {
        "filename": "03_ayo_siaga_bencana_mula.md",
        "doc_title": "Buku Panduan Ayo Siaga Bencana (PMR Mula)",
        "category": "kesiapsiagaan_bencana",
    },
    {
        "filename": "04_pertolongan_pertama_wira.md",
        "doc_title": "Buku Panduan Pertolongan Pertama (PMR Wira)",
        "category": "pertolongan_pertama",
    },
    {
        "filename": "05_kepemimpinan_pmr.md",
        "doc_title": "Buku Kepemimpinan PMR (Mula, Madya, Wira)",
        "category": "kepemimpinan",
    },
    {
        "filename": "06_donor_darah_pmr.md",
        "doc_title": "Buku Donor Darah Sukarela PMR (Mula, Madya, Wira)",
        "category": "donor_darah",
    },
    {
        "filename": "07_fasilitator_gerakan_palang_merah.md",
        "doc_title": "Panduan Fasilitator PMR: Gerakan Palang Merah & Bulan Sabit Merah",
        "category": "gerakan_pmi",
    },
    {
        "filename": "08_fasilitator_pertolongan_pertama.md",
        "doc_title": "Panduan Fasilitator PMR: Pertolongan Pertama",
        "category": "pertolongan_pertama",
    },
    {
        "filename": "09_fasilitator_kepemimpinan.md",
        "doc_title": "Panduan Fasilitator PMR: Kepemimpinan",
        "category": "kepemimpinan",
    },
    {
        "filename": "10_fasilitator_donor_darah.md",
        "doc_title": "Panduan Fasilitator PMR: Donor Darah Sukarela",
        "category": "donor_darah",
    },
    {
        "filename": "11_fasilitator_kesehatan_remaja.md",
        "doc_title": "Panduan Fasilitator PMR: Kesehatan Remaja & Remaja Sebaya",
        "category": "kesehatan_remaja",
    },
    {
        "filename": "12_fasilitator_remaja_sehat_wash.md",
        "doc_title": "Panduan Fasilitator PMR: Remaja Sehat Peduli Sesama (WASH & Kebersihan)",
        "category": "sanitasi_kesehatan",
    },
    {
        "filename": "13_manajemen_pmr.md",
        "doc_title": "Buku Manajemen Pembinaan dan Pengembangan PMR PMI",
        "category": "manajemen_pmr",
    },
]


def is_garbage_chunk(raw_content: str) -> bool:
    content = raw_content.strip()
    low = content.lower()
    if "kanvas kosong" in low or "tampak sepenuhnya kosong" in low or "unggah ulang gambar" in low:
        return True
    lines = [
        ln.strip()
        for ln in content.splitlines()
        if ln.strip()
        and not ln.strip().startswith("#")
        and not ln.strip().startswith("<!--")
        and not re.match(r"^[-*_]{3,}$", ln.strip())
    ]
    body_without_wrapper = [
        ln
        for ln in lines
        if not re.match(
            r"^berikut adalah (ekstrak|ekstraksi|seluruh teks|transkrip|ringkasan)",
            ln.lower(),
        )
        and ln.lower() != "palang merah remaja mula"
    ]
    return len(" ".join(body_without_wrapper).strip()) < 35


def is_likely_heading(line: str, doc_title: str) -> bool:
    if not line or len(line) < 4 or len(line) > 65:
        return False
    if line.lower() == doc_title.lower():
        return False
    if not line[0].isupper() and not line[0].isdigit():
        return False
    if any(ch in line for ch in (".", ",", ";", "!", ")", "]")) and not re.match(
        r"^([IVXLCDM]+|[A-Z]|\d+)\.\s+[A-Z]", line
    ):
        if not line.endswith("?"):
            return False
    words = line.split()
    if len(words) > 9:
        return False
    if re.match(
        r"^(BAB\s+[IVXLCDM\d]+|MODUL\s+[IVXLCDM\d]+|[IVXLCDM]+\.\s+[A-Z]|[A-Z]\.\s+[A-Z]|\d+\.\s+[A-Z])",
        line,
    ):
        return True
    cap_words = sum(
        1
        for w in words
        if w[0].isupper()
        or w.lower() in {"dan", "di", "ke", "dari", "pada", "untuk", "atau", "yang", "dalam", "dengan"}
    )
    return cap_words == len(words) and len(words) >= 2


def infer_section_title(raw_content: str, doc_title: str, current_sec: str) -> str:
    current_sec_clean = re.sub(r"[#*_`]+", "", current_sec).strip().rstrip(":")
    pages = [int(p) for p in re.findall(r"(?:<!--\s*Halaman|##\s*Halaman|\[Hal\.)\s*(\d+)", raw_content)]
    page_label = ""
    if pages:
        min_p, max_p = min(pages), max(pages)
        page_label = f"Hal. {min_p}" if min_p == max_p else f"Hal. {min_p}-{max_p}"

    is_generic = (
        not current_sec_clean
        or current_sec_clean.lower() == doc_title.lower()
        or (current_sec_clean.isupper() and len(current_sec_clean) > 30)
        or re.match(r"^halaman\s+\d+$", current_sec_clean.lower())
        or current_sec_clean.lower() == "materi umum"
        or len(current_sec_clean) > 75
    )

    topic_cand = "" if is_generic else current_sec_clean
    if not topic_cand:
        lines = [ln.strip() for ln in raw_content.splitlines() if ln.strip()]
        for idx, s in enumerate(lines):
            if s.startswith("<!--") or re.match(r"^[-*_]{3,}$", s):
                continue
            if idx == 0 and not s.startswith("#") and len(lines) > 1:
                continue
            s_clean = re.sub(r"^(\[Hal\.\s*\d+\]\s*|[#>*\-\s]+)", "", s)
            s_clean = re.sub(r"[*_`]+", "", s_clean).strip()
            if is_likely_heading(s_clean, doc_title):
                topic_cand = s_clean.rstrip(":")
                break

    if page_label and topic_cand:
        return topic_cand if page_label.lower() in topic_cand.lower() else f"{topic_cand} ({page_label})"
    return topic_cand or page_label or current_sec_clean or "Materi Pokok"


def clean_chunk_content(raw_content: str) -> str:
    text = re.sub(r"<!--\s*Halaman\s+(\d+)\s*-->\s*", r"[Hal. \1] ", raw_content)
    cleaned_lines = []
    for ln in text.splitlines():
        s = ln.strip()
        if re.match(r"^berikut adalah (ekstrak|ekstraksi|seluruh teks|transkrip).*?:\s*$", s.lower()):
            continue
        if re.match(r"^[-*_]{3,}$", s):
            continue
        cleaned_lines.append(ln)
    return re.sub(r"\n{3,}", "\n\n", "\n".join(cleaned_lines)).strip()


def split_into_chunks(text: str, max_chars: int = 1100, overlap: int = 150):
    paragraphs = text.split("\n\n")
    chunks = []
    current_chunk = []
    current_len = 0
    
    for p in paragraphs:
        p_clean = p.strip()
        if not p_clean:
            continue
        if current_len + len(p_clean) > max_chars and current_chunk:
            chunk_text = "\n\n".join(current_chunk)
            chunks.append(chunk_text)
            last = current_chunk[-1] if len(current_chunk[-1]) < overlap else current_chunk[-1][-overlap:]
            current_chunk = [last, p_clean]
            current_len = len(last) + len(p_clean)
        else:
            current_chunk.append(p_clean)
            current_len += len(p_clean)
            
    if current_chunk:
        chunk_text = "\n\n".join(current_chunk)
        if len(chunk_text.strip()) > 50:
            chunks.append(chunk_text)
            
    return chunks


def process_documents():
    existing_map = {}
    if os.path.exists(OUTPUT_JSON):
        try:
            with open(OUTPUT_JSON, "r", encoding="utf-8") as f:
                prev_data = json.load(f)
            for item in prev_data:
                if "embedding" in item and item["embedding"]:
                    existing_map[item["content"]] = item["embedding"]
            print(f"Loaded {len(existing_map)} previously cached embeddings.")
        except Exception as e:
            print(f"Warning loading cache: {e}")

    all_items = []
    chunk_id = 1
    
    for doc_info in FILES:
        filepath = os.path.join(PROCESSED_DIR, doc_info["filename"])
        if not os.path.exists(filepath):
            print(f"Skipping {filepath} (file not found)")
            continue
            
        print(f"Reading {doc_info['filename']}...")
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
            
        sections = re.split(r"\n(?=#{1,3}\s+)", content)
        for sec in sections:
            sec_strip = sec.strip()
            if not sec_strip or len(sec_strip) < 40:
                continue
                
            header_match = re.match(r"^(#{1,3}\s+[^\n]+)", sec_strip)
            raw_section_title = header_match.group(1).lstrip("#").strip() if header_match else "Materi Umum"
            
            sub_chunks = split_into_chunks(sec_strip, max_chars=1100, overlap=150)
            for sub in sub_chunks:
                if is_garbage_chunk(sub):
                    continue
                cleaned_sub = clean_chunk_content(sub)
                sec_title = infer_section_title(sub, doc_info["doc_title"], raw_section_title)
                item = {
                    "id": chunk_id,
                    "doc_title": doc_info["doc_title"],
                    "category": doc_info.get("category", "umum"),
                    "section_title": sec_title,
                    "content": cleaned_sub,
                }
                if cleaned_sub in existing_map:
                    item["embedding"] = existing_map[cleaned_sub]
                elif sub in existing_map:
                    item["embedding"] = existing_map[sub]
                all_items.append(item)
                chunk_id += 1
                
    print(f"Total clean chunks created across all documents: {len(all_items)}")
    
    needed = [item for item in all_items if "embedding" not in item]
    print(f"Chunks needing new embeddings: {len(needed)} / {len(all_items)}")

    if needed:
        print("Generating embeddings via Gemini API (model: gemini-embedding-001, dimension: 768)...")
        config = types.EmbedContentConfig(
            output_dimensionality=768,
            task_type="RETRIEVAL_DOCUMENT",
        )
        batch_size = 20
        total_batches = (len(needed) + batch_size - 1) // batch_size
        
        for batch_idx in range(total_batches):
            start_i = batch_idx * batch_size
            end_i = min(start_i + batch_size, len(needed))
            batch = needed[start_i:end_i]
            
            texts = [
                f"[{item.get('category', '').upper()}] {item['doc_title']} - {item['section_title']}\n{item['content']}"
                for item in batch
            ]
            
            for attempt in range(5):
                try:
                    res = client.models.embed_content(
                        model="gemini-embedding-001",
                        contents=texts,
                        config=config
                    )
                    for item, emb in zip(batch, res.embeddings):
                        item["embedding"] = emb.values
                    print(f"Processed batch {batch_idx + 1}/{total_batches} (chunks {start_i + 1} to {end_i} / {len(needed)})")
                    break
                except Exception as e:
                    wait_time = 12 * (attempt + 1)
                    print(f"Batch {batch_idx + 1} attempt {attempt + 1} rate-limited or error: {e}. Waiting {wait_time}s...")
                    time.sleep(wait_time)
                    
            if (batch_idx + 1) % 10 == 0:
                with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
                    json.dump(all_items, f, ensure_ascii=False, indent=2)
                print("Checkpoint saved to knowledge_base.json")
                
            time.sleep(1.2)
        
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(all_items, f, ensure_ascii=False, indent=2)
    print(f"SUCCESS: Saved complete knowledge base ({len(all_items)} chunks) with embeddings to: {OUTPUT_JSON}")

if __name__ == "__main__":
    process_documents()
