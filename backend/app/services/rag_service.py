import json
import logging
import os
from functools import lru_cache
from typing import Any, Dict, List, Tuple

from dotenv import load_dotenv

logger = logging.getLogger(__name__)

# Locate knowledge base JSON
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
# Check backend/../chatbot/processed/knowledge_base.json
CANDIDATE_PATHS = [
    os.path.join(CURRENT_DIR, "..", "..", "..", "chatbot", "processed", "knowledge_base.json"),
    os.path.join(CURRENT_DIR, "..", "..", "chatbot", "processed", "knowledge_base.json"),
    os.path.join(os.getcwd(), "chatbot", "processed", "knowledge_base.json"),
    os.path.join(os.getcwd(), "simula", "chatbot", "processed", "knowledge_base.json"),
]
KB_PATH = next((p for p in CANDIDATE_PATHS if os.path.exists(p)), CANDIDATE_PATHS[0])

_cached_kb: List[Dict[str, Any]] | None = None


def load_knowledge_base() -> List[Dict[str, Any]]:
    global _cached_kb
    if _cached_kb is not None:
        return _cached_kb
    for path in CANDIDATE_PATHS:
        if os.path.exists(path):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    _cached_kb = json.load(f)
                logger.info("Loaded %d knowledge base chunks from %s", len(_cached_kb), path)
                return _cached_kb
            except Exception as e:
                logger.error("Failed to load knowledge base from %s: %s", path, e)
    return []


def get_gemini_client():
    from google import genai
    from app.config import settings
    api_key = None
    try:
        api_key = settings().gemini_api_key
    except Exception:
        pass
    if not api_key:
        api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        # Try loading from backend/.env explicitly
        for env_path in [".env", "backend/.env", "../backend/.env"]:
            if os.path.exists(env_path):
                load_dotenv(env_path)
                api_key = os.getenv("GEMINI_API_KEY")
                if api_key:
                    break
    if not api_key:
        return None
    return genai.Client(api_key=api_key)



def cosine_sim(a: List[float], b: List[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    na = sum(x * x for x in a) ** 0.5
    nb = sum(y * y for y in b) ** 0.5
    return dot / (na * nb) if na and nb else 0.0


def query_rag(query: str, top_k: int = 3, threshold: float = 0.52) -> Dict[str, Any]:
    """
    RAG pipeline:
    1. Embed query
    2. Retrieve top-k chunks from knowledge base
    3. Check threshold guardrail
    4. Prompt Gemini with retrieved context
    """
    client = get_gemini_client()
    kb = load_knowledge_base()

    if not client or not kb:
        return {
            "reply": "Sistem AI sedang dalam konfigurasi. Silakan periksa GEMINI_API_KEY atau basis materi.",
            "sources": [],
            "mode": "rag_unavailable",
        }

    from google.genai import types

    # 1. Embed query
    try:
        config = types.EmbedContentConfig(output_dimensionality=768)
        emb_res = client.models.embed_content(
            model="gemini-embedding-001",
            contents=query,
            config=config,
        )
        q_emb = emb_res.embeddings[0].values
    except Exception as e:
        logger.error("Error generating query embedding: %s", e)
        return {
            "reply": "Maaf, terjadi gangguan saat memproses pencarian materi.",
            "sources": [],
            "mode": "rag_error",
        }

    # 2. Similarity search
    scored: List[Tuple[float, Dict[str, Any]]] = []
    for item in kb:
        if "embedding" in item:
            sim = cosine_sim(q_emb, item["embedding"])
            scored.append((sim, item))

    scored.sort(key=lambda x: x[0], reverse=True)
    top_items = scored[:top_k]

    if not top_items:
        return {
            "reply": "Maaf, materi terkait belum tersedia di kurikulum kami.",
            "sources": [],
            "mode": "rag_no_match",
        }

    best_score = top_items[0][0]

    # 3. Guardrail 1: Similarity Threshold
    if best_score < threshold:
        return {
            "reply": "Maaf, pertanyaan Anda di luar konteks materi modul kepalangmerahan kami. Saya hanya dapat menjawab pertanyaan seputar Pertolongan Pertama, Kesiapsiagaan Bencana, dan Kesehatan Remaja Sebaya PMR/PMI.",
            "sources": [],
            "mode": "rag_filtered_out_of_scope",
        }

    # 4. Prepare context for LLM
    context_blocks = []
    sources = []
    for score, item in top_items:
        context_blocks.append(
            f"[{item.get('doc_title', 'Modul')} - {item.get('section_title', '')}]\n{item.get('content', '')}"
        )
        sources.append({
            "doc_title": item.get("doc_title"),
            "section_title": item.get("section_title"),
            "similarity": round(score, 4),
        })

    context_str = "\n\n---\n\n".join(context_blocks)

    system_instruction = (
        "Anda adalah asisten virtual resmi edukasi Kepalangmerahan (SIMULA PMI). "
        "Tugas utama Anda adalah menjawab pertanyaan pengguna secara ramah, jelas, dan edukatif "
        "HANYA berdasarkan potongan materi modul yang disediakan di bawah ini.\n\n"
        "Aturan Ketat:\n"
        "1. Jawab HANYA menggunakan informasi dari materi pembelajaran yang disediakan.\n"
        "2. Jika jawaban tidak tercantum di dalam materi, katakan dengan sopan: "
        "'Maaf, informasi tersebut tidak ditemukan dalam modul kepalangmerahan kami.'\n"
        "3. JANGAN menjawab pertanyaan umum di luar topik kepalangmerahan, pertolongan pertama, atau bencana.\n"
        "4. Gunakan format yang rapi (bullet points/nomor jika berupa langkah-langkah).\n"
        "5. Cantumkan rujukan nama modul dan topiknya di akhir jawaban secara singkat."
    )

    prompt = (
        f"Kumpulan Potongan Materi Modul:\n{context_str}\n\n"
        f"Pertanyaan Pengguna: {query}\n\n"
        f"Jawaban Edukatif:"
    )

    # 5. Generate content via Gemini
    try:
        response = client.models.generate_content(
            model="gemini-3.5-flash-lite",
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.2,
            ),
        )
        reply_text = response.text.strip()
    except Exception as e:
        logger.error("Error generating LLM reply: %s", e)
        reply_text = "Maaf, terjadi kendala saat merangkum materi pembelajaran. Silakan coba lagi sebentar lagi."

    return {
        "reply": reply_text,
        "sources": sources,
        "mode": "rag_verified_module",
    }
