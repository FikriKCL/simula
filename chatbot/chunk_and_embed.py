"""
Memotong materi Markdown di processed/ menjadi potongan (chunks) lalu membuat embedding.

Setiap potongan menyimpan jalur judul induknya (parent_title), misalnya
"Prinsip Dasar Gerakan" untuk potongan "1. Kemanusiaan", dan subjudul kecil yang
bersebelahan digabung menjadi satu potongan. Tanpa ini, daftar seperti 7 Prinsip Dasar
terpecah menjadi potongan-potongan kecil tanpa konteks dan sulit ditemukan.

Embedding yang teksnya tidak berubah dipakai ulang dari knowledge_base.json lama.
Jalankan dari folder simula/:  python chatbot/chunk_and_embed.py  [--dry-run]
"""
import os
import re
import sys
import json
import hashlib
import logging
import time
from pathlib import Path
from dotenv import load_dotenv

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

CURRENT_DIR = Path(__file__).resolve().parent
PROCESSED_DIR = os.path.join(CURRENT_DIR, "processed")
OUTPUT_JSON = os.path.join(PROCESSED_DIR, "knowledge_base.json")
# Embeddings are checkpointed here after every batch so a run stopped by the API quota can resume
EMBED_CACHE_JSON = os.path.join(PROCESSED_DIR, "embedding_cache.json")

MAX_CHARS = 1300  # target size of one chunk
MIN_CHARS = 350  # chunks smaller than this keep absorbing following sections of the same topic
MAX_LIST_CHARS = 2400  # a numbered list under one heading (e.g. 7 Prinsip Dasar) stays in one chunk
OVERLAP = 150

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
    {
        "filename": "14_ayo_siaga_bencana_madya.md",
        "doc_title": "Buku Panduan Ayo Siaga Bencana (PMR Madya)",
        "category": "kesiapsiagaan_bencana",
    },
    {
        "filename": "15_ayo_siaga_bencana_wira.md",
        "doc_title": "Buku Panduan Ayo Siaga Bencana (PMR Wira)",
        "category": "kesiapsiagaan_bencana",
    },
    {
        "filename": "16_fasilitator_ayo_siaga_bencana_mula.md",
        "doc_title": "Panduan Fasilitator Ayo Siaga Bencana (PMR Mula)",
        "category": "kesiapsiagaan_bencana",
    },
    {
        "filename": "17_fasilitator_ayo_siaga_bencana_madya.md",
        "doc_title": "Panduan Fasilitator Ayo Siaga Bencana (PMR Madya)",
        "category": "kesiapsiagaan_bencana",
    },
    {
        "filename": "18_fasilitator_ayo_siaga_bencana_wira.md",
        "doc_title": "Panduan Fasilitator Ayo Siaga Bencana (PMR Wira)",
        "category": "kesiapsiagaan_bencana",
    },
]

# Sections that never answer a learner's question
FRONT_MATTER = re.compile(
    r"^(daftar\s+isi|kata\s+pengantar|sambutan|tim\s+penyusun|penyusun|kontributor|editor|"
    r"daftar\s+pustaka|ucapan\s+terima\s*kasih|catatan(\s+edukasi)?|pesan\s+edukasi\s+sampul)\b",
    re.IGNORECASE,
)
PAGE_MARKER = re.compile(r"^\s*(?:<!--\s*Halaman\s+(\d+)\s*-->|#{1,3}\s*Halaman\s+(\d+)\s*)$", re.IGNORECASE)
MD_HEADING = re.compile(r"^(#{1,6})\s+(.+?)\s*#*\s*$")
LIST_ITEM = re.compile(r"^\s*([-*•]|\d{1,2}[.)]|[a-z][.)])\s+")


WRAPPER_LINE = re.compile(r"^berikut (adalah|ini).*(ekstrak|ekstraksi|transkrip|transkripsi|teks)", re.IGNORECASE)


def clean_heading(text: str) -> str:
    text = re.sub(r"[*_`­]+", "", text).strip()
    return re.sub(r"\s+", " ", text).rstrip(":").strip()


def is_likely_heading(line: str) -> bool:
    """Heading heuristics for text-layer PDFs, which have no Markdown '#' markers."""
    if len(line) < 4 or len(line) > 70 or not (line[0].isupper() or line[0].isdigit()):
        return False
    words = line.split()
    if len(words) > 9 or line.endswith((",", ";")):
        return False
    if re.match(r"^(BAB|MODUL|SESI|BAGIAN)\s+[IVXLCDM\d]+\b", line, re.IGNORECASE):
        return True
    if re.match(r"^([IVX]+|[A-Z])\.\s+[A-Z]", line):
        return True
    if any(ch in line for ch in ".,;!()[]"):
        return False
    small = {"dan", "di", "ke", "dari", "pada", "untuk", "atau", "yang", "dalam", "dengan", "&"}
    caps = sum(1 for w in words if w[0].isupper() or w[0].isdigit() or w.lower() in small)
    return caps == len(words) and len(words) >= 2


def heuristic_level(line: str, first_on_page: bool) -> int:
    if re.match(r"^(BAB|MODUL|SESI|BAGIAN)\s", line, re.IGNORECASE):
        return 1
    # Single letters (A. ... I.) are lesson-plan items; "I." is not treated as a Roman numeral
    if re.match(r"^[A-Z]\.\s", line):
        return 3
    if re.match(r"^[IVX]{2,}\.\s", line):
        return 2
    return 2 if first_on_page else 3


def parse_sections(text: str, doc_title: str):
    """Splits a Markdown document into sections, each with its full heading path and page."""
    lines = text.splitlines()
    md_headings = sum(
        1 for ln in lines[1:] if MD_HEADING.match(ln.strip()) and not PAGE_MARKER.match(ln.strip())
    )
    use_markdown = md_headings >= 5

    sections = []
    stack: list[tuple[int, str]] = []
    page = None
    first_on_page = False
    current = {"path": (), "page": None, "lines": []}

    def flush():
        body = "\n".join(current["lines"]).strip()
        if body:
            sections.append({"path": current["path"], "page": current["page"], "body": body})

    def open_section(level: int, title: str):
        nonlocal current
        flush()
        while stack and stack[-1][0] >= level:
            stack.pop()
        stack.append((level, title))
        current = {"path": tuple(t for _, t in stack), "page": page, "lines": []}

    for idx, raw in enumerate(lines):
        line = raw.strip()
        if idx == 0 and line.startswith("# "):
            continue  # document title
        pm = PAGE_MARKER.match(line)
        if pm:
            page = int(pm.group(1) or pm.group(2))
            first_on_page = True
            if current["page"] is None:
                current["page"] = page
            continue
        if not line:
            current["lines"].append("")
            continue
        if WRAPPER_LINE.match(line) or re.fullmatch(r"[-*_]{3,}", line):
            continue

        heading = None
        if use_markdown:
            m = MD_HEADING.match(line)
            if m:
                heading = (min(len(m.group(1)), 4), clean_heading(m.group(2)))
            elif re.fullmatch(r"\*\*[^*]{3,70}\*\*:?", line):
                heading = (4, clean_heading(line))
        elif is_likely_heading(line):
            heading = (heuristic_level(line, first_on_page), clean_heading(line))

        first_on_page = False
        if heading and heading[1] and heading[1].lower() != doc_title.lower():
            open_section(*heading)
        else:
            current["lines"].append(raw.rstrip())
    flush()
    return sections


def join_wrapped_lines(body: str) -> str:
    """Re-joins lines that a PDF text layer broke in the middle of a sentence."""
    out: list[str] = []
    for line in body.replace("­", "").splitlines():
        s = line.strip()
        if (
            out
            and out[-1]
            and s
            and not LIST_ITEM.match(s)
            and not s.startswith(("|", ">", "#"))
            and not out[-1].rstrip().endswith((".", ":", "!", "?", "|"))
            and s[0].islower()
        ):
            out[-1] = out[-1].rstrip() + " " + s
        else:
            out.append(s)
    return re.sub(r"\n{3,}", "\n\n", "\n".join(out)).strip()


def is_front_matter(section) -> bool:
    if any(FRONT_MATTER.match(p) for p in section["path"]):
        return True
    body = section["body"]
    return bool(re.search(r"\bISBN\b|Hak\s+Cipta\s*©", body))


def is_garbage(text: str) -> bool:
    low = text.lower()
    if "kanvas kosong" in low or "tampak sepenuhnya kosong" in low or "unggah ulang gambar" in low:
        return True
    words = re.findall(r"[a-zA-Z]{3,}", text)
    return len(words) < 12


def split_long(text: str, max_chars: int = MAX_CHARS, overlap: int = OVERLAP):
    if len(text) <= MAX_LIST_CHARS and text.count("### ") >= 2:
        return [text]  # a merged numbered list is kept whole
    paragraphs = []
    for p in re.split(r"\n\s*\n|\n(?=\s*(?:[-*•]|\d{1,2}[.)])\s)", text):
        p = p.strip()
        if len(p) > max_chars:
            # Very long paragraph: break it at sentence boundaries
            paragraphs.extend(x for x in re.split(r"(?<=[.!?])\s+", p) if x)
        elif p:
            paragraphs.append(p)
    chunks, current, size = [], [], 0
    for p in paragraphs:
        if size + len(p) > max_chars and current:
            chunks.append("\n\n".join(current))
            tail = current[-1] if len(current[-1]) < overlap else current[-1][-overlap:]
            current, size = [tail, p], len(tail) + len(p)
        else:
            current.append(p)
            size += len(p)
    if current:
        chunks.append("\n\n".join(current))
    return chunks


def page_label(pages) -> str:
    pages = sorted({p for p in pages if p})
    if not pages:
        return ""
    return f"Hal. {pages[0]}" if pages[0] == pages[-1] else f"Hal. {pages[0]}-{pages[-1]}"


def build_chunks(doc_info, text: str):
    doc_title = doc_info["doc_title"]
    sections = [s for s in parse_sections(text, doc_title) if not is_front_matter(s)]
    for s in sections:
        s["body"] = join_wrapped_lines(s["body"])

    # Group consecutive sections: siblings under the same parent are merged while they fit,
    # and a group that is still tiny keeps absorbing sections of the same top-level topic.
    groups: list[list[dict]] = []
    for s in sections:
        size = len(s["body"]) + len(s["path"][-1] if s["path"] else "")
        if groups:
            g = groups[-1]
            g_size = sum(len(x["body"]) for x in g)
            same_parent = g[-1]["path"][:-1] == s["path"][:-1]
            same_topic = g[-1]["path"][:1] == s["path"][:1]
            numbered_list = same_parent and all(
                x["path"] and re.match(r"^\d{1,2}[.)]\s", x["path"][-1]) for x in (*g, s)
            )
            limit = MAX_LIST_CHARS if numbered_list else MAX_CHARS
            if g_size + size <= limit and (same_parent or (g_size < MIN_CHARS and same_topic)):
                g.append(s)
                continue
        groups.append([s])

    chunks = []
    for g in groups:
        paths = [s["path"] for s in g]
        leaf_titles = [p[-1] for p in paths if p]
        common = os.path.commonprefix(paths)
        if len(g) == 1:
            section_title = leaf_titles[0] if leaf_titles else ""
            parent = paths[0][:-1]
        elif common:
            # e.g. "Prinsip Dasar Gerakan" for merged "1. Kemanusiaan" ... "7. Kesemestaan"
            section_title = common[-1]
            parent = common[:-1]
        else:
            section_title = f"{leaf_titles[0]} s.d. {leaf_titles[-1]}" if leaf_titles else ""
            parent = ()

        parts = []
        for s in g:
            own_title = s["path"][-1] if s["path"] else ""
            if len(g) > 1 and own_title and own_title != section_title:
                parts.append(f"### {own_title}\n{s['body']}")
            else:
                parts.append(s["body"])
        content = "\n\n".join(parts)

        label = page_label(s["page"] for s in g)
        title_with_page = f"{section_title} ({label})" if section_title and label else (section_title or label or "Materi")
        for piece in split_long(content):
            if is_garbage(piece):
                continue
            chunks.append({
                "doc_title": doc_title,
                "category": doc_info.get("category", "umum"),
                "parent_title": " > ".join(parent),
                "section_title": title_with_page,
                "content": piece,
            })
    return chunks


def embedding_text(item) -> str:
    path = " > ".join(p for p in (item["doc_title"], item.get("parent_title"), item["section_title"]) if p)
    return f"[{item.get('category', '').upper()}] {path}\n{item['content']}"


def embed_hash(item) -> str:
    return hashlib.sha1(embedding_text(item).encode("utf-8")).hexdigest()


def process_documents(dry_run: bool = False):
    existing = {}
    if os.path.exists(OUTPUT_JSON):
        try:
            with open(OUTPUT_JSON, "r", encoding="utf-8") as f:
                for item in json.load(f):
                    if item.get("embedding"):
                        existing[item.get("embed_hash") or embed_hash(item)] = item["embedding"]
        except Exception as e:
            print(f"Warning loading cache: {e}")
    if os.path.exists(EMBED_CACHE_JSON):
        with open(EMBED_CACHE_JSON, "r", encoding="utf-8") as f:
            existing.update(json.load(f))
    print(f"Loaded {len(existing)} previously cached embeddings.")

    all_items = []
    for doc_info in FILES:
        filepath = os.path.join(PROCESSED_DIR, doc_info["filename"])
        if not os.path.exists(filepath):
            print(f"Skipping {doc_info['filename']} (file not found)")
            continue
        with open(filepath, "r", encoding="utf-8") as f:
            chunks = build_chunks(doc_info, f.read())
        print(f"{doc_info['filename']}: {len(chunks)} chunks")
        all_items.extend(chunks)

    for i, item in enumerate(all_items, start=1):
        item["id"] = i
        item["embed_hash"] = embed_hash(item)
        if item["embed_hash"] in existing:
            item["embedding"] = existing[item["embed_hash"]]

    print(f"Total chunks: {len(all_items)}")
    needed = [item for item in all_items if "embedding" not in item]
    print(f"Chunks needing new embeddings: {len(needed)} / {len(all_items)}")

    if dry_run:
        out = os.path.join(PROCESSED_DIR, "knowledge_base.preview.json")
        with open(out, "w", encoding="utf-8") as f:
            json.dump([{k: v for k, v in it.items() if k != "embedding"} for it in all_items], f, ensure_ascii=False, indent=2)
        print(f"Dry run: chunks written without embeddings to {out}")
        return

    if needed:
        logging.getLogger("google_genai").setLevel(logging.ERROR)
        from google import genai
        from google.genai import types

        for env_file in (CURRENT_DIR.parent / "backend" / ".env", CURRENT_DIR / ".env", CURRENT_DIR.parent / ".env"):
            if env_file.exists():
                load_dotenv(env_file)
                break
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY tidak ditemukan! Isi GEMINI_API_KEY di backend/.env")
        client = genai.Client(api_key=api_key)

        print("Generating embeddings via Gemini API (model: gemini-embedding-001, dimension: 768)...")
        config = types.EmbedContentConfig(output_dimensionality=768, task_type="RETRIEVAL_DOCUMENT")
        batch_size = 20  # small batches stay under the per-minute token quota
        total_batches = (len(needed) + batch_size - 1) // batch_size
        for batch_idx in range(total_batches):
            batch = needed[batch_idx * batch_size:(batch_idx + 1) * batch_size]
            for attempt in range(8):
                try:
                    res = client.models.embed_content(
                        model="gemini-embedding-001",
                        contents=[embedding_text(item) for item in batch],
                        config=config,
                    )
                    for item, emb in zip(batch, res.embeddings):
                        item["embedding"] = emb.values
                        existing[item["embed_hash"]] = emb.values
                    with open(EMBED_CACHE_JSON, "w", encoding="utf-8") as f:
                        json.dump(existing, f)
                    print(f"Processed batch {batch_idx + 1}/{total_batches}")
                    time.sleep(8)
                    break
                except Exception as e:
                    wait_time = 30 * (attempt + 1)
                    print(f"Batch {batch_idx + 1} attempt {attempt + 1} failed: {str(e)[:150]}. Waiting {wait_time}s...")
                    time.sleep(wait_time)
            else:
                raise RuntimeError("Embedding gagal setelah beberapa percobaan; jalankan ulang untuk melanjutkan.")

    missing = sum(1 for item in all_items if "embedding" not in item)
    if missing:
        raise RuntimeError(f"{missing} chunks tanpa embedding; knowledge_base.json tidak ditimpa.")
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(all_items, f, ensure_ascii=False, indent=2)
    print(f"SUCCESS: Saved knowledge base ({len(all_items)} chunks) to: {OUTPUT_JSON}")


if __name__ == "__main__":
    process_documents(dry_run="--dry-run" in sys.argv)
