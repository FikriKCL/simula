import json
import logging
import os
import re
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


INDONESIAN_STOPWORDS = {
    "yang", "dan", "di", "ke", "dari", "ini", "itu", "untuk", "pada", "adalah",
    "sebagai", "dengan", "atau", "juga", "karena", "oleh", "dalam", "bisa", "dapat",
    "ada", "tidak", "akan", "sudah", "saya", "kamu", "dia", "mereka", "kita",
    "apa", "bagaimana", "mengapa", "kenapa", "kapan", "siapa", "mana", "cara",
    "apakah", "tersebut", "tentang", "mengenai", "agar", "supaya"
}


def tokenize_id(text: str) -> List[str]:
    words = re.findall(r"\w+", text.lower())
    return [w for w in words if w not in INDONESIAN_STOPWORDS and len(w) > 1]


_cached_bm25 = None
_cached_bm25_mtime: float = 0.0


def get_bm25_index(kb: List[Dict[str, Any]], mtime: float):
    global _cached_bm25, _cached_bm25_mtime
    if _cached_bm25 is not None and mtime == _cached_bm25_mtime:
        return _cached_bm25
    from rank_bm25 import BM25Okapi
    corpus = [
        tokenize_id(f"{item.get('doc_title', '')} {item.get('section_title', '')} {item.get('content', '')}")
        for item in kb
    ]
    _cached_bm25 = BM25Okapi(corpus)
    _cached_bm25_mtime = mtime
    logger.info("Initialized BM25 index over %d documents", len(corpus))
    return _cached_bm25


_cached_vocab = None
_cached_vocab_mtime: float = 0.0


def get_corpus_vocab(kb: List[Dict[str, Any]], mtime: float):
    global _cached_vocab, _cached_vocab_mtime
    if _cached_vocab is not None and mtime == _cached_vocab_mtime:
        return _cached_vocab
    vocab = set()
    for item in kb:
        text = f"{item.get('doc_title', '')} {item.get('section_title', '')} {item.get('content', '')}"
        vocab.update(tokenize_id(text))
    _cached_vocab = vocab
    _cached_vocab_mtime = mtime
    return _cached_vocab


def hybrid_retrieve(
    search_query: str,
    q_emb: List[float],
    kb: List[Dict[str, Any]],
    top_k: int = 4,
    threshold: float = 0.50,
) -> Tuple[bool, List[str], List[Dict[str, Any]], str]:
    """
    Hybrid Search combining:
    1. Dense Vector Search (Gemini Embedding 768-dim) for semantic matching
    2. BM25 Lexical Search (Rank-BM25) for exact keyword/acronym matching
    3. Reciprocal Rank Fusion (RRF) for robust rank-based score blending

    Returns: (is_allowed, context_blocks, sources, mode)
    """
    if not kb:
        return False, [], [], "rag_no_match"

    # 1. Dense Vector Scoring
    vector_scores: List[Tuple[int, float]] = []
    for idx, item in enumerate(kb):
        if "embedding" in item and item["embedding"]:
            sim = cosine_sim(q_emb, item["embedding"])
            vector_scores.append((idx, sim))

    vector_scores.sort(key=lambda x: x[1], reverse=True)
    best_vector = vector_scores[0][1] if vector_scores else 0.0

    # 2. Sparse BM25 Scoring
    bm25 = get_bm25_index(kb, _cached_kb_mtime)
    q_tokens = tokenize_id(search_query)
    bm25_scores: List[Tuple[int, float]] = []
    if q_tokens:
        raw_bm25 = bm25.get_scores(q_tokens)
        for idx, score in enumerate(raw_bm25):
            if score > 0.0:
                bm25_scores.append((idx, float(score)))
        bm25_scores.sort(key=lambda x: x[1], reverse=True)

    best_bm25 = bm25_scores[0][1] if bm25_scores else 0.0

    # 3. Hybrid Vocabulary & Semantic Guardrail Check
    vocab = get_corpus_vocab(kb, _cached_kb_mtime)
    matched_tokens = [t for t in q_tokens if t in vocab]
    token_coverage = len(matched_tokens) / len(q_tokens) if q_tokens else 1.0

    # Filter out if:
    # a) Vector similarity is low AND token coverage of PMI vocabulary is low (< 0.50)
    # b) OR vector similarity is strictly below baseline (0.48)
    if (best_vector < 0.60 and token_coverage < 0.50) or (best_vector < 0.48):
        logger.info(
            "Guardrail filtered out-of-scope query '%s' (Best Vector: %.4f, Coverage: %.2f)",
            search_query, best_vector, token_coverage
        )
        return False, [], [], "rag_filtered_out_of_scope"


    # 4. Reciprocal Rank Fusion (RRF)
    RRF_K = 60
    WEIGHT_VECTOR = 0.55
    WEIGHT_BM25 = 0.45

    rrf_map: Dict[int, float] = {}

    for rank, (idx, _sim) in enumerate(vector_scores[:30], start=1):
        rrf_map[idx] = rrf_map.get(idx, 0.0) + (WEIGHT_VECTOR / (RRF_K + rank))

    for rank, (idx, _score) in enumerate(bm25_scores[:30], start=1):
        rrf_map[idx] = rrf_map.get(idx, 0.0) + (WEIGHT_BM25 / (RRF_K + rank))

    top_candidates = sorted(rrf_map.items(), key=lambda x: x[1], reverse=True)[:top_k]

    if not top_candidates:
        return False, [], [], "rag_no_match"

    vector_sim_dict = dict(vector_scores[:50])
    context_blocks = []
    sources = []

    for idx, _rrf in top_candidates:
        item = kb[idx]
        sim = vector_sim_dict.get(idx, best_vector * 0.85)
        context_blocks.append(
            f"[{item.get('doc_title', 'Modul')} - {item.get('section_title', '')}]\n{item.get('content', '')}"
        )
        sources.append({
            "doc_title": item.get("doc_title"),
            "section_title": item.get("section_title"),
            "similarity": round(sim, 4),
        })

    return True, context_blocks, sources, "rag_verified_module"


def query_rag(
    query: str,
    history: List[Dict[str, Any]] | None = None,
    top_k: int = 4,
    threshold: float = 0.50,
) -> Dict[str, Any]:
    """
    Multi-Turn Conversational Hybrid RAG pipeline:
    1. Condense ambiguous follow-up query using conversation history
    2. Embed standalone query via gemini-embedding-001 (768-dim)
    3. Hybrid retrieval (BM25 + Vector Search with Reciprocal Rank Fusion)
    4. Guardrail threshold check
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

    # 3. Hybrid Retrieval (BM25 + Dense Vector Search + RRF)
    is_ok, context_blocks, sources, mode = hybrid_retrieve(
        search_query, q_emb, kb, top_k=top_k, threshold=threshold
    )

    if not is_ok:
        if mode == "rag_filtered_out_of_scope":
            return {
                "reply": "Maaf, pertanyaan Anda di luar konteks materi kurikulum kepalangmerahan kami. Saya hanya dapat menjawab pertanyaan seputar materi resmi PMR/PMI (Pertolongan Pertama, Kesiapsiagaan Bencana, 7 Prinsip Palang Merah & Gerakan PMI, Donor Darah Sukarela, Kepemimpinan, Sanitasi/WASH, dan Kesehatan Remaja Sebaya).",
                "sources": [],
                "mode": mode,
            }
        return {
            "reply": "Maaf, materi terkait belum tersedia di kurikulum kami.",
            "sources": [],
            "mode": mode,
        }

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

    # 3. Hybrid Retrieval (BM25 + Dense Vector Search + RRF)
    is_ok, context_blocks, sources, mode = hybrid_retrieve(
        search_query, q_emb, kb, top_k=top_k, threshold=threshold
    )

    if not is_ok:
        blocked_msg = (
            "Maaf, pertanyaan Anda di luar konteks materi kurikulum kepalangmerahan kami. "
            "Saya hanya dapat menjawab pertanyaan seputar materi resmi PMR/PMI (Pertolongan Pertama, "
            "Kesiapsiagaan Bencana, 7 Prinsip Palang Merah & Gerakan PMI, Donor Darah Sukarela, "
            "Kepemimpinan, Sanitasi/WASH, dan Kesehatan Remaja Sebaya)."
            if mode == "rag_filtered_out_of_scope"
            else "Maaf, materi terkait belum tersedia di kurikulum kami."
        )
        yield _format_sse({"type": "meta", "mode": mode, "sources": [], "search_query": search_query})
        yield _format_sse({"type": "delta", "text": blocked_msg})
        yield _format_sse({"type": "done"})
        return

    # Send meta event IMMEDIATELY before streaming text!
    yield _format_sse({"type": "meta", "mode": mode, "sources": sources, "search_query": search_query})

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



