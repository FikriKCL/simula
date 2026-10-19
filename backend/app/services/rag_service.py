import json
import logging
import os
from functools import lru_cache
from typing import Any, Dict, List, Tuple

from dotenv import load_dotenv

logger = logging.getLogger(__name__)
logging.getLogger("google_genai").setLevel(logging.ERROR)

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
_cached_kb_mtime: float = 0.0


def load_knowledge_base() -> List[Dict[str, Any]]:
    global _cached_kb, _cached_kb_mtime
    for path in CANDIDATE_PATHS:
        if os.path.exists(path):
            try:
                mtime = os.path.getmtime(path)
                if _cached_kb is not None and mtime == _cached_kb_mtime:
                    return _cached_kb
                with open(path, "r", encoding="utf-8") as f:
                    _cached_kb = json.load(f)
                _cached_kb_mtime = mtime
                logger.info("Loaded %d knowledge base chunks from %s", len(_cached_kb), path)
                return _cached_kb
            except Exception as e:
                logger.error("Failed to load knowledge base from %s: %s", path, e)
    return _cached_kb or []


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


def condense_query(query: str, history: List[Dict[str, Any]], client) -> str:
    """
    If conversation history exists, rewrite follow-up questions (e.g. 'bagaimana cara menanganinya?')
    into a self-contained standalone query (e.g. 'bagaimana cara menangani luka bakar melepuh?').
    """
    if not history or not client:
        return query

    # Filter out empty or initial welcome messages
    clean_history = [
        h for h in history
        if h.get("text") and not h.get("text", "").startswith("Halo! Saya **Asisten")
    ]
    if not clean_history:
        return query

    transcript_parts = []
    for item in clean_history[-6:]:
        sender_label = "User" if item.get("sender") == "user" else "Assistant"
        # Truncate past long text to preserve brevity
        text_preview = item.get("text", "").strip()[:300]
        transcript_parts.append(f"{sender_label}: {text_preview}")

    transcript = "\n".join(transcript_parts)

    condense_prompt = (
        "Anda adalah perumus kueri pencarian (Query Re-writer) untuk sistem pencarian materi kepalangmerahan PMI.\n"
        "Tugas: Analisis riwayat percakapan dan pertanyaan terbaru pengguna. "
        "Ubah pertanyaan terbaru menjadi SATU kalimat pertanyaan pencarian mandiri (standalone search query) yang eksplisit, "
        "menggantikan semua kata ganti ambigu (seperti: 'itu', 'dia', 'tersebut', 'menanganinya', 'alatnya', 'caranya') "
        "dengan topik spesifik yang sedang dibahas sebelumnya.\n\n"
        "Aturan Ketat:\n"
        "- Jika pertanyaan terbaru sudah mandiri dan lengkap, kembalikan pertanyaan asli tanpa perubahan.\n"
        "- HANYA keluarkan satu baris pertanyaan hasil rumusan, tanpa penjelasan atau tanda kutip tambahan.\n\n"
        f"Riwayat Percakapan:\n{transcript}\n\n"
        f"Pertanyaan Terbaru: {query}\n\n"
        f"Pertanyaan Mandiri:"
    )

    try:
        from google.genai import types
        res = client.models.generate_content(
            model="gemini-3.5-flash-lite",
            contents=condense_prompt,
            config=types.GenerateContentConfig(
                temperature=0.0,
                max_output_tokens=100,
            ),
        )
        condensed = res.text.strip().strip('"').strip("'")
        if condensed and len(condensed) > 3:
            logger.info("Conversational Query Condensed: '%s' -> '%s'", query, condensed)
            return condensed
    except Exception as e:
        logger.warning("Failed to condense query, falling back to original: %s", e)

    return query


def query_rag(
    query: str,
    history: List[Dict[str, Any]] | None = None,
    top_k: int = 4,
    threshold: float = 0.50,
) -> Dict[str, Any]:
    """
    Multi-Turn Conversational RAG pipeline:
    1. Condense ambiguous follow-up query using conversation history
    2. Embed standalone query via gemini-embedding-001 (768-dim)
    3. Retrieve top-k chunks from 885-chunk knowledge base
    4. Check threshold guardrail
    5. Prompt Gemini with conversation history + retrieved context
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

    # 1. Condense follow-up query if history is provided
    search_query = query
    if history:
        search_query = condense_query(query, history, client)

    # 2. Embed standalone search query
    try:
        config = types.EmbedContentConfig(output_dimensionality=768)
        emb_res = client.models.embed_content(
            model="gemini-embedding-001",
            contents=search_query,
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

    # 3. Similarity search over all knowledge base chunks
    scored: List[Tuple[float, Dict[str, Any]]] = []
    for item in kb:
        if "embedding" in item and item["embedding"]:
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

    # 4. Guardrail: Similarity Threshold
    if best_score < threshold:
        return {
            "reply": "Maaf, pertanyaan Anda di luar konteks materi kurikulum kepalangmerahan kami. Saya hanya dapat menjawab pertanyaan seputar materi resmi PMR/PMI (Pertolongan Pertama, Kesiapsiagaan Bencana, 7 Prinsip Palang Merah & Gerakan PMI, Donor Darah Sukarela, Kepemimpinan, Sanitasi/WASH, dan Kesehatan Remaja Sebaya).",
            "sources": [],
            "mode": "rag_filtered_out_of_scope",
        }

    # 5. Prepare context and sources
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

    # 6. Format recent conversation history for prompt continuity
    history_str = ""
    if history:
        clean_history = [
            h for h in history
            if h.get("text") and not h.get("text", "").startswith("Halo! Saya **Asisten")
        ]
        if clean_history:
            history_lines = []
            for item in clean_history[-5:]:
                role = "Pengguna" if item.get("sender") == "user" else "Asisten"
                snippet = item.get("text", "").strip()[:350]
                history_lines.append(f"{role}: {snippet}")
            history_str = "Riwayat Dialog Sebelumnya:\n" + "\n".join(history_lines) + "\n\n"

    system_instruction = (
        "Anda adalah asisten virtual resmi edukasi Kepalangmerahan (SIMULA PMI). "
        "Tugas utama Anda adalah menjawab pertanyaan pengguna secara ramah, jelas, terstruktur, dan edukatif "
        "HANYA berdasarkan potongan materi modul resmi PMI yang disediakan di bawah ini.\n\n"
        "Aturan Percakapan & Kontinuitas:\n"
        "1. Pahami riwayat dialog sebelumnya jika pertanyaan pengguna merupakan pertanyaan lanjutan (follow-up). "
        "Jawablah secara berkesinambungan dan koheren tanpa mengulangi penjelasan yang tidak perlu.\n"
        "2. Jawab HANYA menggunakan informasi dari materi modul pembelajaran yang disediakan.\n"
        "3. Jika jawaban tidak tercantum di dalam materi, katakan dengan sopan: "
        "'Maaf, informasi tersebut tidak ditemukan dalam modul kepalangmerahan kami.'\n"
        "4. JANGAN menjawab pertanyaan umum di luar topik kepalangmerahan, pertolongan pertama, donor darah, atau bencana.\n"
        "5. Gunakan format yang rapi (bullet points/nomor jika berupa langkah-langkah atau daftar).\n"
        "6. Cantumkan rujukan nama modul dan topiknya di akhir jawaban secara singkat."
    )

    prompt = (
        f"{history_str}"
        f"Kumpulan Potongan Materi Modul Resmi PMI:\n{context_str}\n\n"
        f"Pertanyaan Terbaru Pengguna: {query}\n\n"
        f"Jawaban Edukatif:"
    )

    # 7. Generate contextual response via Gemini
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
        "search_query": search_query,
    }


def _format_sse(data: Dict[str, Any]) -> str:
    return f"data: {json.dumps(data)}\n\n"


def query_rag_stream(
    query: str,
    history: List[Dict[str, Any]] | None = None,
    top_k: int = 4,
    threshold: float = 0.50,
):
    """
    Yields Server-Sent Events (SSE) in the format:
    data: {"type": "meta", "mode": ..., "sources": [...], "search_query": ...}\n\n
    data: {"type": "delta", "text": "..."}\n\n
    data: {"type": "done"}\n\n
    """
    client = get_gemini_client()
    kb = load_knowledge_base()

    if not client or not kb:
        err_msg = "Sistem AI sedang dalam konfigurasi. Silakan periksa GEMINI_API_KEY atau basis materi."
        yield _format_sse({"type": "meta", "mode": "rag_unavailable", "sources": []})
        yield _format_sse({"type": "delta", "text": err_msg})
        yield _format_sse({"type": "done"})
        return

    from google.genai import types

    # 1. Condense follow-up query if history is provided
    search_query = query
    if history:
        search_query = condense_query(query, history, client)

    # 2. Embed standalone search query
    try:
        config = types.EmbedContentConfig(output_dimensionality=768)
        emb_res = client.models.embed_content(
            model="gemini-embedding-001",
            contents=search_query,
            config=config,
        )
        q_emb = emb_res.embeddings[0].values
    except Exception as e:
        logger.error("Error generating query embedding: %s", e)
        yield _format_sse({"type": "meta", "mode": "rag_error", "sources": []})
        yield _format_sse({"type": "delta", "text": "Maaf, terjadi gangguan saat memproses pencarian materi."})
        yield _format_sse({"type": "done"})
        return

    # 3. Similarity search
    scored: List[Tuple[float, Dict[str, Any]]] = []
    for item in kb:
        if "embedding" in item and item["embedding"]:
            sim = cosine_sim(q_emb, item["embedding"])
            scored.append((sim, item))

    scored.sort(key=lambda x: x[0], reverse=True)
    top_items = scored[:top_k]

    if not top_items:
        yield _format_sse({"type": "meta", "mode": "rag_no_match", "sources": []})
        yield _format_sse({"type": "delta", "text": "Maaf, materi terkait belum tersedia di kurikulum kami."})
        yield _format_sse({"type": "done"})
        return

    best_score = top_items[0][0]

    # 4. Guardrail: Similarity Threshold
    if best_score < threshold:
        blocked_msg = "Maaf, pertanyaan Anda di luar konteks materi kurikulum kepalangmerahan kami. Saya hanya dapat menjawab pertanyaan seputar materi resmi PMR/PMI (Pertolongan Pertama, Kesiapsiagaan Bencana, 7 Prinsip Palang Merah & Gerakan PMI, Donor Darah Sukarela, Kepemimpinan, Sanitasi/WASH, dan Kesehatan Remaja Sebaya)."
        yield _format_sse({"type": "meta", "mode": "rag_filtered_out_of_scope", "sources": [], "search_query": search_query})
        yield _format_sse({"type": "delta", "text": blocked_msg})
        yield _format_sse({"type": "done"})
        return

    # 5. Prepare context and sources
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

    # Send meta event IMMEDIATELY before streaming text!
    yield _format_sse({"type": "meta", "mode": "rag_verified_module", "sources": sources, "search_query": search_query})

    context_str = "\n\n---\n\n".join(context_blocks)

    # 6. Format recent conversation history
    history_str = ""
    if history:
        clean_history = [
            h for h in history
            if h.get("text") and not h.get("text", "").startswith("Halo! Saya **Asisten")
        ]
        if clean_history:
            history_lines = []
            for item in clean_history[-5:]:
                role = "Pengguna" if item.get("sender") == "user" else "Asisten"
                snippet = item.get("text", "").strip()[:350]
                history_lines.append(f"{role}: {snippet}")
            history_str = "Riwayat Dialog Sebelumnya:\n" + "\n".join(history_lines) + "\n\n"

    system_instruction = (
        "Anda adalah asisten virtual resmi edukasi Kepalangmerahan (SIMULA PMI). "
        "Tugas utama Anda adalah menjawab pertanyaan pengguna secara ramah, jelas, terstruktur, dan edukatif "
        "HANYA berdasarkan potongan materi modul resmi PMI yang disediakan di bawah ini.\n\n"
        "Aturan Percakapan & Kontinuitas:\n"
        "1. Pahami riwayat dialog sebelumnya jika pertanyaan pengguna merupakan pertanyaan lanjutan (follow-up). "
        "Jawablah secara berkesinambungan dan koheren tanpa mengulangi penjelasan yang tidak perlu.\n"
        "2. Jawab HANYA menggunakan informasi dari materi modul pembelajaran yang disediakan.\n"
        "3. Jika jawaban tidak tercantum di dalam materi, katakan dengan sopan: "
        "'Maaf, informasi tersebut tidak ditemukan dalam modul kepalangmerahan kami.'\n"
        "4. JANGAN menjawab pertanyaan umum di luar topik kepalangmerahan, pertolongan pertama, donor darah, atau bencana.\n"
        "5. Gunakan format yang rapi (bullet points/nomor jika berupa langkah-langkah atau daftar).\n"
        "6. Cantumkan rujukan nama modul dan topiknya di akhir jawaban secara singkat."
    )

    prompt = (
        f"{history_str}"
        f"Kumpulan Potongan Materi Modul Resmi PMI:\n{context_str}\n\n"
        f"Pertanyaan Terbaru Pengguna: {query}\n\n"
        f"Jawaban Edukatif:"
    )

    # 7. Generate stream from Gemini
    try:
        response_stream = client.models.generate_content_stream(
            model="gemini-3.5-flash-lite",
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.2,
            ),
        )
        for chunk in response_stream:
            if chunk.text:
                yield _format_sse({"type": "delta", "text": chunk.text})
    except Exception as e:
        logger.error("Error in streaming Gemini reply: %s", e)
        yield _format_sse({"type": "delta", "text": "\n\n*(Terjadi kendala saat streaming respon)*"})

    yield _format_sse({"type": "done"})



