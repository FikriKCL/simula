import os
import re
import json
import logging
import time
from pathlib import Path
from dotenv import load_dotenv

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
        "filename": "02_pertolongan_pertama_mula.md",
        "doc_title": "Buku Panduan Pertolongan Pertama (PMR Mula)"
    },
    {
        "filename": "03_ayo_siaga_bencana_mula.md",
        "doc_title": "Buku Panduan Ayo Siaga Bencana (PMR Mula)"
    },
    {
        "filename": "01_kesehatan_remaja_sebaya.md",
        "doc_title": "Pelatihan Remaja Sebaya (Kesehatan & Kesejahteraan Remaja)"
    }
]

def split_into_chunks(text: str, max_chars: int = 1000, overlap: int = 150):
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
            # Keep the last paragraph for overlap context
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
    # If knowledge_base.json already exists and is complete, load it
    existing_map = {}
    if os.path.exists(OUTPUT_JSON):
        try:
            with open(OUTPUT_JSON, "r", encoding="utf-8") as f:
                prev_data = json.load(f)
            for item in prev_data:
                if "embedding" in item:
                    existing_map[item["content"]] = item["embedding"]
            print(f"Loaded {len(existing_map)} previously cached embeddings.")
        except Exception:
            pass

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
            
        # Split by markdown headers
        sections = re.split(r"\n(?=#{1,3}\s+)", content)
        for sec in sections:
            sec_strip = sec.strip()
            if not sec_strip or len(sec_strip) < 40:
                continue
                
            header_match = re.match(r"^(#{1,3}\s+[^\n]+)", sec_strip)
            section_title = header_match.group(1).lstrip("#").strip() if header_match else "Materi Umum"
            
            # Split section if it's too long
            sub_chunks = split_into_chunks(sec_strip, max_chars=1200, overlap=150)
            for sub in sub_chunks:
                item = {
                    "id": chunk_id,
                    "doc_title": doc_info["doc_title"],
                    "section_title": section_title,
                    "content": sub
                }
                if sub in existing_map:
                    item["embedding"] = existing_map[sub]
                all_items.append(item)
                chunk_id += 1
                
    print(f"Total chunks created: {len(all_items)}")
    
    # Check chunks that still need embedding
    needed = [item for item in all_items if "embedding" not in item]
    print(f"Chunks needing embeddings: {len(needed)} / {len(all_items)}")

    if needed:
        print("Generating embeddings via Gemini API (dimension: 768)...")
        config = types.EmbedContentConfig(output_dimensionality=768)
        batch_size = 15
        
        for i in range(0, len(needed), batch_size):
            batch = needed[i:i+batch_size]
            texts = [f"{item['doc_title']} - {item['section_title']}\n{item['content']}" for item in batch]
            
            for attempt in range(5):
                try:
                    res = client.models.embed_content(
                        model="gemini-embedding-001",
                        contents=texts,
                        config=config
                    )
                    for item, emb in zip(batch, res.embeddings):
                        item["embedding"] = emb.values
                    print(f"Processed chunks {i+1} to {min(i+batch_size, len(needed))} / {len(needed)}")
                    break
                except Exception as e:
                    wait_time = 15 * (attempt + 1)
                    print(f"Batch {i//batch_size} attempt {attempt+1} rate-limited: {e}. Waiting {wait_time}s...")
                    time.sleep(wait_time)
            time.sleep(1)
        
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(all_items, f, ensure_ascii=False, indent=2)
    print(f"Saved complete knowledge base with embeddings to: {OUTPUT_JSON}")

if __name__ == "__main__":
    process_documents()
