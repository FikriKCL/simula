import json
import logging
import math
import os
import re
from collections import Counter, OrderedDict
from functools import lru_cache
from typing import Any, Dict, List, Tuple

try:
    from dotenv import load_dotenv
except ImportError:
    def load_dotenv(*_args, **_kwargs):
        return False

logger = logging.getLogger(__name__)
logging.getLogger("google_genai").setLevel(logging.ERROR)

# Locate knowledge base JSON
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
CANDIDATE_PATHS = [
    os.path.join(CURRENT_DIR, "..", "..", "..", "chatbot", "processed", "knowledge_base.json"),
    os.path.join(CURRENT_DIR, "..", "..", "chatbot", "processed", "knowledge_base.json"),
    os.path.join(os.getcwd(), "chatbot", "processed", "knowledge_base.json"),
    os.path.join(os.getcwd(), "simula", "chatbot", "processed", "knowledge_base.json"),
]
KB_PATH = next((p for p in CANDIDATE_PATHS if os.path.exists(p)), CANDIDATE_PATHS[0])

_cached_kb: List[Dict[str, Any]] | None = None
_cached_kb_mtime: float = 0.0

# In-memory LRU caches (Zero-Token Repeat Optimization)
_embedding_cache: "OrderedDict[str, List[float]]" = OrderedDict()
_EMBEDDING_CACHE_MAX = 256

_response_cache: "OrderedDict[str, Dict[str, Any]]" = OrderedDict()
_RESPONSE_CACHE_MAX = 128


def _normalize_vec(v: List[float]) -> List[float]:
    norm = sum(x * x for x in v) ** 0.5
    if not norm:
        return v
    return [x / norm for x in v]


def load_knowledge_base() -> List[Dict[str, Any]]:
    global _cached_kb, _cached_kb_mtime
    for path in CANDIDATE_PATHS:
        if os.path.exists(path):
            try:
                mtime = os.path.getmtime(path)
                if _cached_kb is not None and mtime == _cached_kb_mtime:
                    return _cached_kb
                with open(path, "r", encoding="utf-8") as f:
                    raw_kb = json.load(f)
                # Pre-normalize vectors once at load time for fast dot-product cosine similarity
                for item in raw_kb:
                    emb = item.get("embedding")
                    if emb and "_norm_emb" not in item:
                        item["_norm_emb"] = _normalize_vec(emb)
                _cached_kb = raw_kb
                _cached_kb_mtime = mtime
                logger.info("Loaded %d knowledge base chunks from %s", len(_cached_kb), path)
                return _cached_kb
            except Exception as e:
                logger.error("Failed to load knowledge base from %s: %s", path, e)
    return _cached_kb or []


@lru_cache(maxsize=1)
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


def fast_dot(a_norm: List[float], b_norm: List[float]) -> float:
    return sum(x * y for x, y in zip(a_norm, b_norm))


INDONESIAN_STOPWORDS = {
    "yang", "dan", "di", "ke", "dari", "ini", "itu", "untuk", "pada", "adalah",
    "sebagai", "dengan", "atau", "juga", "karena", "oleh", "dalam", "bisa", "dapat",
    "ada", "tidak", "akan", "sudah", "saya", "kamu", "dia", "mereka", "kita", "kami",
    "apa", "bagaimana", "mengapa", "kenapa", "kapan", "siapa", "mana", "cara",
    "apakah", "tersebut", "tentang", "mengenai", "agar", "supaya", "jika", "bila",
    "saat", "ketika", "kalau", "lalu", "terus", "gimana", "sih", "dong", "ya", "kah",
    "tolong", "jelaskan", "sebutkan", "berikan", "langkah", "hal", "harus", "dilakukan",
    "saja", "aja", "macam", "jenis",
}

# Domain synonym & morphological root normalization (0-token accuracy boost)
DOMAIN_ROOT_MAP = {
    "pendarahan": "darah",
    "perdarahan": "darah",
    "berdarah": "darah",
    "pendonor": "donor",
    "mendonorkan": "donor",
    "didonorkan": "donor",
    "pertolongan": "tolong",
    "menolong": "tolong",
    "penolong": "tolong",
    "ditolong": "tolong",
    "kesiapsiagaan": "siaga",
    "bersiaga": "siaga",
    "kepalangmerahan": "palang",
    " kepemimpinan": "pimpin",
    "pemimpin": "pimpin",
    "memimpin": "pimpin",
    "terkilir": "keseleo",
    "keseleo": "keseleo",
    "pingsan": "pingsan",
    "sadarkan": "sadar",
    "kesadaran": "sadar",
    "membalut": "balut",
    "pembalut": "balut",
    "pembalutan": "balut",
    "membidai": "bidai",
    "pembidaian": "bidai",
    "terbakar": "bakar",
    "kebakaran": "bakar",
    "melepuh": "lepuh",
    "keracunan": "racun",
    "beracun": "racun",
    "mengungsi": "ungsi",
    "pengungsian": "ungsi",
    "pengungsi": "ungsi",
    "mengevakuasi": "evakuasi",
}

# colloquial -> formal query expansion terms for BM25
SYNONYM_EXPANSIONS = {
    "mimisan": ["hidung", "darah"],
    "pingsan": ["sadar", "syok"],
    "keseleo": ["sendi", "otot", "terkilir"],
    "terkilir": ["sendi", "otot", "keseleo"],
    "knalpot": ["luka", "bakar"],
    "air": ["banjir", "wash", "bersih"],
    "7": ["tujuh", "prinsip"],
    "tujuh": ["prinsip", "dasar"],
    "dds": ["donor", "darah", "sukarela"],
    "prs": ["pendidikan", "remaja", "sebaya"],
    "apd": ["alat", "perlindungan", "diri"],
    "pp": ["pertolongan", "pertama"],
    "asb": ["ayo", "siaga", "bencana"],
}


def stem_id(word: str) -> str:
    if word in DOMAIN_ROOT_MAP:
        return DOMAIN_ROOT_MAP[word]
    if len(word) <= 4:
        return word
    w = word
    # Strip possessive/particle suffixes
    for suf in ("lah", "kah", "nya"):
        if w.endswith(suf) and len(w) - len(suf) >= 4:
            w = w[: -len(suf)]
            break
    if w in DOMAIN_ROOT_MAP:
        return DOMAIN_ROOT_MAP[w]
    # Strip derivational suffixes
    for suf in ("kan", "an", "i"):
        if w.endswith(suf) and len(w) - len(suf) >= 4:
            w = w[: -len(suf)]
            break
    # Strip basic prefixes if root remains >= 4 chars
    for pref in ("meng", "meny", "men", "mem", "me", "peng", "peny", "pen", "pem", "per", "pe", "ber", "ter", "di", "ke", "se"):
        if w.startswith(pref) and len(w) - len(pref) >= 4:
            w = w[len(pref) :]
            break
    return DOMAIN_ROOT_MAP.get(w, w)


def tokenize_id(text: str, expand_synonyms: bool = False) -> List[str]:
    words = re.findall(r"\w+", text.lower())
    tokens: List[str] = []
    for w in words:
        if w in INDONESIAN_STOPWORDS or len(w) <= 1:
            continue
        tokens.append(w)
        stemmed = stem_id(w)
        if stemmed != w and len(stemmed) > 2:
            tokens.append(stemmed)
        if expand_synonyms and w in SYNONYM_EXPANSIONS:
            tokens.extend(SYNONYM_EXPANSIONS[w])
    return tokens


# Zero-Token Fast-Path Intent Router (Greetings, Thanks, Meta Help)
GREETING_PATTERNS = re.compile(
    r"^(halo+|hai+|hi+|hello+|selamat\s+(pagi|siang|sore|malam)|assalamu'?alaikum|permisi|p|tes|test|ping)\b[\s!.?]*$",
    re.IGNORECASE,
)
THANKS_PATTERNS = re.compile(
    r"^(terima\s*kasih|makasih|thanks|thank\s*you|mantap|oke\s*(makasih|terima\s*kasih|siap)?|sip\s*(makasih)?)[\s!.?]*$",
    re.IGNORECASE,
)
META_HELP_PATTERNS = re.compile(
    r"^(kamu\s+siapa|siapa\s+kamu|apa\s+itu\s+simula(\s+ai)?|bisa\s+bantu\s+apa(\s+saja|\s+aja)?|materi\s+apa\s+(saja|aja)\s+yang\s+ada|topik\s+apa\s+saja|bantuan|help)[\s!.?]*$",
    re.IGNORECASE,
)

DEFAULT_SUGGESTIONS = [
    "Bagaimana langkah pertolongan pertama pada luka bakar melepuh?",
    "Sebutkan dan jelaskan 7 Prinsip Dasar Gerakan Palang Merah!",
    "Apa yang harus dilakukan saat terjadi gempa bumi di dalam gedung?",
]

CATEGORY_SUGGESTIONS: Dict[str, List[str]] = {
    "pertolongan_pertama": [
        "Apa saja Alat Perlindungan Diri (APD) yang wajib disiapkan penolong pertama?",
        "Bagaimana cara menghentikan perdarahan luar menggunakan pembalut dan penutup luka?",
        "Apa saja gejala, tanda, dan cara penanganan patah tulang (pembidaian)?",
        "Bagaimana langkah memeriksa kesadaran korban dan melakukan resusitasi jantung paru (RJP)?",
        "Bagaimana cara menolong korban yang mengalami syok atau pingsan?",
    ],
    "kesiapsiagaan_bencana": [
        "Apa saja barang penting yang harus disiapkan di dalam Tas Siaga Bencana?",
        "Apa tanda-tanda akan terjadinya tsunami dan bagaimana langkah evakuasinya?",
        "Apa yang harus dilakukan sebelum, saat, dan sesudah terjadi banjir?",
        "Bagaimana cara mencegah dan menyelamatkan diri dari bahaya tanah longsor?",
        "Apa saja langkah kesiapsiagaan menghadapi letusan gunung api dan angin topan?",
    ],
    "gerakan_pmi": [
        "Sebutkan dan jelaskan 7 Prinsip Dasar Gerakan Palang Merah dan Bulan Sabit Merah!",
        "Bagaimana sejarah berdirinya Gerakan Palang Merah Internasional (Henry Dunant)?",
        "Apa fungsi dan aturan penggunaan Lambang Palang Merah yang benar?",
        "Apa saja kegiatan Tri Bakti PMR dalam kehidupan sehari-hari?",
    ],
    "donor_darah": [
        "Apa saja syarat-syarat kesehatan dan usia untuk menjadi pendonor darah sukarela?",
        "Apa manfaat mendonorkan darah secara rutin bagi kesehatan tubuh?",
        "Apa saja jenis golongan darah (A, B, AB, O dan Rhesus) serta fungsinya?",
        "Bagaimana peran anggota PMR Mula, Madya, dan Wira dalam program Donor Darah Siswa?",
    ],
    "kepemimpinan": [
        "Apa perbedaan antara pemimpin, kepemimpinan, dan kerja sama tim di PMR?",
        "Bagaimana cara berkomunikasi efektif dan menjadi pendidik sebaya (peer educator)?",
        "Apa saja faktor pendorong dan penghambat dinamika kelompok dalam organisasi PMR?",
    ],
    "kesehatan_remaja": [
        "Bagaimana cara menjaga kesehatan reproduksi dan tumbuh kembang pada masa remaja?",
        "Bagaimana cara penularan dan pencegahan HIV & AIDS menurut modul PRS PMI?",
        "Mengapa bahaya penyalahgunaan NAPZA dan rokok harus dihindari oleh remaja?",
    ],
    "sanitasi_kesehatan": [
        "Bagaimana langkah mencuci tangan pakai sabun (CTPS) yang baik dan benar?",
        "Bagaimana cara menjaga kebersihan air, sanitasi lingkungan (WASH), dan mencegah diare?",
        "Apa saja ciri-ciri makanan bergizi seimbang untuk menjaga kebugaran remaja?",
    ],
    "manajemen_pmr": [
        "Bagaimana alur perekrutan, pelatihan, dan pelantikan anggota PMR di sekolah?",
        "Apa saja hak, kewajiban, dan tingkatan anggota PMR (Mula, Madya, Wira)?",
    ],
}

EMERGENCY_KEYWORDS = re.compile(
    r"\b(pingsan|tidak\s+sadar|henti\s+jantung|tidak\s+bernapas|sesak\s+napas|pendarahan\s+hebat|perdarahan\s+hebat|luka\s+bakar|patah\s+tulang|keracunan|tersedak|syok|kejang|tenggelam|kecelakaan)\b",
    re.IGNORECASE,
)


def detect_emergency(query: str) -> bool:
    return bool(EMERGENCY_KEYWORDS.search(query))


def check_fast_intent(query: str) -> Dict[str, Any] | None:
    """
    Zero-Token Fast-Path for greetings, gratitude, and meta capability questions.
    Responds in <1ms without calling Embedding or Generation APIs.
    """
    q_clean = query.strip()
    if GREETING_PATTERNS.match(q_clean):
        return {
            "reply": (
                "Halo Sahabat PMR! 👋 Saya **SIMULA AI**, asisten virtual edukasi Kepalangmerahan resmi Anda.\n\n"
                "Saya siap membantu menjawab pertanyaan Anda berdasarkan **13 Modul Resmi PMI**, meliputi:\n"
                "- **Pertolongan Pertama (PP)** *(Luka, Perdarahan, Patah Tulang, Luka Bakar, RJP, Syok)*\n"
                "- **Ayo Siaga Bencana (ASB)** *(Gempa Bumi, Banjir, Tsunami, Longsor, Tas Siaga Bencana)*\n"
                "- **Gerakan Kepalangmerahan** *(Sejarah, 7 Prinsip Dasar, Lambang, Tri Bakti PMR)*\n"
                "- **Donor Darah Sukarela (DDS)**, **Kepemimpinan**, **Sanitasi (WASH)**, & **Kesehatan Remaja (PRS)**\n\n"
                "Silakan ketik pertanyaan Anda atau pilih salah satu topik rekomendasi di bawah ini!"
            ),
            "sources": [],
            "mode": "conversational_assistant",
            "suggestions": DEFAULT_SUGGESTIONS,
            "is_emergency": False,
            "search_query": q_clean,
        }

    if THANKS_PATTERNS.match(q_clean):
        return {
            "reply": (
                "Sama-sama Sahabat PMR! 😊 Senang bisa membantu proses belajar kepalangmerahanmu.\n\n"
                "Tetap semangat mengamalkan **Tri Bakti PMR**! Jika masih ada materi Pertolongan Pertama, "
                "Kesiapsiagaan Bencana, atau Gerakan PMI yang ingin ditanyakan, silakan tanyakan kapan saja."
            ),
            "sources": [],
            "mode": "conversational_assistant",
            "suggestions": DEFAULT_SUGGESTIONS,
            "is_emergency": False,
            "search_query": q_clean,
        }

    if META_HELP_PATTERNS.match(q_clean):
        return {
            "reply": (
                "Saya adalah **SIMULA AI**, sistem asisten pembelajaran cerdas berbasis **Hybrid RAG (BM25 + Vector Search)** "
                "yang dirancang khusus untuk anggota Palang Merah Remaja (PMR) dan relawan PMI.\n\n"
                "### Materi yang Dapat Anda Tanyakan:\n"
                "1. **Pertolongan Pertama (Mula & Wira):** APD, anatomi dasar, penanganan luka & perdarahan, luka bakar, patah tulang/pembidaian, keracunan, hingga pingsan.\n"
                "2. **Kesiapsiagaan Bencana:** Langkah mitigasi gempa bumi, tsunami, banjir, tanah longsor, kebakaran, gunung api, dan pembuatan Tas Siaga Bencana.\n"
                "3. **Gerakan Palang Merah:** Sejarah Palang Merah/PMI, 7 Prinsip Dasar, Hukum Perikemanusiaan Internasional, dan Lambang.\n"
                "4. **Donor Darah, Kepemimpinan, & Kesehatan Remaja (PRS & WASH):** Syarat donor darah, komunikasi sebaya, kebersihan lingkungan, kesehatan reproduksi, dan pencegahan HIV/AIDS."
            ),
            "sources": [],
            "mode": "conversational_assistant",
            "suggestions": DEFAULT_SUGGESTIONS,
            "is_emergency": False,
            "search_query": q_clean,
        }

    return None


FOLLOWUP_PRONOUN_PATTERN = re.compile(
    r"\b(itu|ini|tersebut|tadi|di\s+atas|lanjutannya|selanjutnya|sebelumnya|lainnya|contohnya|syaratnya|gejalanya|tandanya|caranya|penanganannya|menanganinya|mengobatinya|mencegahnya|dampaknya|penyebabnya|jenisnya|macamnya|alatnya|fungsinya|tujuannya)\b",
    re.IGNORECASE,
)

SHORT_FOLLOWUP_STARTERS = re.compile(
    r"^(lalu|terus|kemudian|kalau|jika|bila|bagaimana\s+(jika|kalau|bila|cara|dengan)|apa\s+(saja|lagi|bedanya|perbedaannya)|kenapa|mengapa|berapa|kapan)\b",
    re.IGNORECASE,
)


def resolve_conversational_query(query: str, history: List[Dict[str, Any]] | None) -> str:
    """
    Zero-Token Local Conversational Query Resolution!
    Replaces the expensive synchronous LLM call (`condense_query`) with fast (<0.2ms)
    deterministic topic extraction from recent conversation history.
    """
    if not history:
        return query

    clean_history = [
        h for h in history
        if h.get("text")
        and not h.get("text", "").startswith("Halo! Saya **Asisten")
        and not h.get("text", "").startswith("Halo Sahabat PMR!")
        and not h.get("text", "").startswith("Percakapan telah direset")
    ]
    if not clean_history:
        return query

    q_strip = query.strip()
    content_tokens = [w for w in re.findall(r"\w+", q_strip.lower()) if w not in INDONESIAN_STOPWORDS and len(w) > 2]

    has_pronoun = bool(FOLLOWUP_PRONOUN_PATTERN.search(q_strip))
    has_followup_starter = bool(SHORT_FOLLOWUP_STARTERS.search(q_strip))
    is_short_query = len(content_tokens) <= 2

    # If the query is already self-contained and has no anaphora/pronouns, do not modify it!
    if not has_pronoun and not is_short_query and not (has_followup_starter and len(content_tokens) <= 3):
        return query

    # Extract anchor topic terms from the most recent user message(s) in history
    user_turns = [h.get("text", "") for h in reversed(clean_history) if h.get("sender") == "user"]
    if not user_turns:
        return query

    anchor_tokens: List[str] = []
    seen = set(content_tokens)
    for ut in user_turns[:2]:
        for w in re.findall(r"\w+", ut.lower()):
            if (
                len(w) > 2
                and w not in INDONESIAN_STOPWORDS
                and not FOLLOWUP_PRONOUN_PATTERN.match(w)
                and w not in seen
            ):
                anchor_tokens.append(w)
                seen.add(w)
            if len(anchor_tokens) >= 5:
                break
        if len(anchor_tokens) >= 3:
            break

    if not anchor_tokens:
        return query

    expanded = f"{q_strip} ({' '.join(anchor_tokens)})"
    logger.info("Zero-token query resolved: '%s' -> '%s'", query, expanded)
    return expanded


def generate_followup_suggestions(
    query: str,
    retrieved_items: List[Dict[str, Any]],
    history: List[Dict[str, Any]] | None = None,
    max_suggestions: int = 3,
) -> List[str]:
    """
    Zero-Token Deterministic Follow-Up Suggestion Generator.
    Selects 3 contextually relevant follow-up questions based on retrieved categories and sections,
    excluding questions already asked in the conversation.
    """
    asked_lower = {query.strip().lower()}
    if history:
        for h in history:
            if h.get("sender") == "user" and h.get("text"):
                asked_lower.add(h["text"].strip().lower())

    q_words = set(tokenize_id(query))
    candidates: List[str] = []

    # 1. Gather candidates from the matched categories
    seen_cats = []
    for item in retrieved_items:
        cat = item.get("category", "")
        if cat and cat not in seen_cats:
            seen_cats.append(cat)

    for cat in seen_cats:
        for cand in CATEGORY_SUGGESTIONS.get(cat, []):
            cand_low = cand.lower()
            if cand_low in asked_lower:
                continue
            # Avoid suggesting a question with >65% token overlap with the current query
            cand_words = set(tokenize_id(cand))
            overlap = len(q_words & cand_words) / max(len(cand_words), 1)
            if overlap < 0.60 and cand not in candidates:
                candidates.append(cand)

    # 2. Fill remaining slots from default suggestions if needed
    for d in DEFAULT_SUGGESTIONS:
        if len(candidates) >= max_suggestions:
            break
        if d.lower() not in asked_lower and d not in candidates:
            candidates.append(d)

    return candidates[:max_suggestions]


class _PureBM25Okapi:
    def __init__(self, corpus: List[List[str]], k1: float = 1.5, b: float = 0.75):
        self.k1 = k1
        self.b = b
        self.corpus_size = len(corpus)
        self.doc_len = [len(doc) for doc in corpus]
        self.avgdl = sum(self.doc_len) / self.corpus_size if self.corpus_size else 1.0
        self.doc_freqs = [Counter(doc) for doc in corpus]
        df: Dict[str, int] = {}
        for tf in self.doc_freqs:
            for word in tf:
                df[word] = df.get(word, 0) + 1
        self.idf = {
            word: math.log(1.0 + (self.corpus_size - freq + 0.5) / (freq + 0.5))
            for word, freq in df.items()
        }

    def get_scores(self, query: List[str]) -> List[float]:
        scores = [0.0] * self.corpus_size
        for q in query:
            q_idf = self.idf.get(q)
            if not q_idf:
                continue
            for idx, tf_map in enumerate(self.doc_freqs):
                freq = tf_map.get(q, 0)
                if freq:
                    dl = self.doc_len[idx]
                    denom = freq + self.k1 * (1.0 - self.b + self.b * dl / self.avgdl)
                    scores[idx] += q_idf * (freq * (self.k1 + 1.0)) / denom
        return scores


_cached_bm25 = None
_cached_bm25_mtime: float = 0.0


def get_bm25_index(kb: List[Dict[str, Any]], mtime: float):
    global _cached_bm25, _cached_bm25_mtime
    if _cached_bm25 is not None and mtime == _cached_bm25_mtime:
        return _cached_bm25
    try:
        from rank_bm25 import BM25Okapi
    except ImportError:
        BM25Okapi = _PureBM25Okapi

    # Repeat doc_title and section_title twice to give heading matches higher lexical weight
    corpus = [
        tokenize_id(
            f"{item.get('doc_title', '')} {item.get('section_title', '')} "
            f"{item.get('section_title', '')} {item.get('content', '')}"
        )
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


def get_query_embedding(search_query: str, client) -> List[float]:
    """
    Embeds the search query with LRU caching so repeated queries consume 0 API tokens.
    Uses task_type='RETRIEVAL_QUERY' for optimal asymmetric retrieval accuracy.
    """
    cache_key = re.sub(r"\s+", " ", search_query.strip().lower())
    if cache_key in _embedding_cache:
        _embedding_cache.move_to_end(cache_key)
        return _embedding_cache[cache_key]

    from google.genai import types

    config = types.EmbedContentConfig(
        output_dimensionality=768,
        task_type="RETRIEVAL_QUERY",
    )
    emb_res = client.models.embed_content(
        model="gemini-embedding-001",
        contents=search_query,
        config=config,
    )
    q_emb = emb_res.embeddings[0].values
    _embedding_cache[cache_key] = q_emb
    if len(_embedding_cache) > _EMBEDDING_CACHE_MAX:
        _embedding_cache.popitem(last=False)
    return q_emb


def hybrid_retrieve(
    search_query: str,
    q_emb: List[float],
    kb: List[Dict[str, Any]],
    top_k: int = 4,
    threshold: float = 0.50,
) -> Tuple[bool, List[str], List[Dict[str, Any]], str, List[Dict[str, Any]]]:
    """
    Hybrid Search combining:
    1. Pre-normalized Dense Vector Search (Gemini Embedding 768-dim)
    2. Stemmed + Synonym-Expanded BM25 Lexical Search
    3. Reciprocal Rank Fusion (RRF) + Dynamic Tail Pruning (saves LLM input tokens)
    """
    if not kb:
        return False, [], [], "rag_no_match", []

    q_norm = _normalize_vec(q_emb)

    # 1. Fast Dense Vector Scoring
    vector_scores: List[Tuple[int, float]] = []
    full_vector_sim: Dict[int, float] = {}
    for idx, item in enumerate(kb):
        norm_emb = item.get("_norm_emb")
        if norm_emb:
            sim = fast_dot(q_norm, norm_emb)
            vector_scores.append((idx, sim))
            full_vector_sim[idx] = sim
        elif "embedding" in item and item["embedding"]:
            sim = cosine_sim(q_emb, item["embedding"])
            vector_scores.append((idx, sim))
            full_vector_sim[idx] = sim

    vector_scores.sort(key=lambda x: x[1], reverse=True)
    best_vector = vector_scores[0][1] if vector_scores else 0.0

    # 2. Sparse BM25 Scoring (with Indonesian stemming + synonym expansion)
    bm25 = get_bm25_index(kb, _cached_kb_mtime)
    q_tokens = tokenize_id(search_query, expand_synonyms=True)
    bm25_scores: List[Tuple[int, float]] = []
    bm25_rank_map: Dict[int, int] = {}
    if q_tokens:
        raw_bm25 = bm25.get_scores(q_tokens)
        for idx, score in enumerate(raw_bm25):
            if score > 0.0:
                bm25_scores.append((idx, float(score)))
        bm25_scores.sort(key=lambda x: x[1], reverse=True)
        for r, (idx, _) in enumerate(bm25_scores[:30], start=1):
            bm25_rank_map[idx] = r

    # 3. Hybrid Vocabulary & Semantic Guardrail Check
    vocab = get_corpus_vocab(kb, _cached_kb_mtime)
    base_tokens = tokenize_id(search_query, expand_synonyms=False)
    matched_tokens = [t for t in base_tokens if t in vocab]
    token_coverage = len(matched_tokens) / len(base_tokens) if base_tokens else 1.0

    if (best_vector < 0.58 and token_coverage < 0.45) or (best_vector < 0.46):
        logger.info(
            "Guardrail filtered out-of-scope query '%s' (Best Vector: %.4f, Coverage: %.2f)",
            search_query,
            best_vector,
            token_coverage,
        )
        return False, [], [], "rag_filtered_out_of_scope", []

    # 4. Reciprocal Rank Fusion (RRF)
    RRF_K = 60
    WEIGHT_VECTOR = 0.55
    WEIGHT_BM25 = 0.45

    rrf_map: Dict[int, float] = {}

    for rank, (idx, _sim) in enumerate(vector_scores[:35], start=1):
        rrf_map[idx] = rrf_map.get(idx, 0.0) + (WEIGHT_VECTOR / (RRF_K + rank))

    for rank, (idx, _score) in enumerate(bm25_scores[:35], start=1):
        rrf_map[idx] = rrf_map.get(idx, 0.0) + (WEIGHT_BM25 / (RRF_K + rank))

    ranked_candidates = sorted(rrf_map.items(), key=lambda x: x[1], reverse=True)
    if not ranked_candidates:
        return False, [], [], "rag_no_match", []

    # 5. Dynamic Context Pruning & Deduplication (reduces prompt tokens while maximizing precision)
    context_blocks: List[str] = []
    sources: List[Dict[str, Any]] = []
    selected_items: List[Dict[str, Any]] = []
    seen_prefixes: set[str] = set()

    for idx, _rrf in ranked_candidates:
        if len(selected_items) >= top_k:
            break
        item = kb[idx]
        sim = full_vector_sim.get(idx, 0.0)
        b_rank = bm25_rank_map.get(idx, 999)

        # After picking the top 2 chunks, prune weak tail chunks to save LLM input tokens
        if len(selected_items) >= 2 and sim < max(threshold, best_vector - 0.12) and b_rank > 5:
            continue

        # Deduplicate near-identical content snippets
        content_str = item.get("content", "").strip()
        prefix_sig = re.sub(r"\W+", "", content_str[:160].lower())
        if prefix_sig in seen_prefixes:
            continue
        seen_prefixes.add(prefix_sig)

        selected_items.append(item)
        context_blocks.append(
            f"[{item.get('doc_title', 'Modul')} | {item.get('section_title', 'Materi')}]\n{content_str}"
        )
        sources.append({
            "doc_title": item.get("doc_title"),
            "section_title": item.get("section_title"),
            "similarity": round(sim, 4),
        })

    if not selected_items:
        return False, [], [], "rag_no_match", []

    return True, context_blocks, sources, "rag_verified_module", selected_items


def _build_grounded_prompt(
    query: str,
    context_blocks: List[str],
    history: List[Dict[str, Any]] | None = None,
) -> Tuple[str, str]:
    context_str = "\n\n---\n\n".join(context_blocks)

    history_str = ""
    if history:
        clean_history = [
            h for h in history
            if h.get("text")
            and not h.get("text", "").startswith("Halo! Saya **Asisten")
            and not h.get("text", "").startswith("Halo Sahabat PMR!")
            and not h.get("text", "").startswith("Percakapan telah direset")
        ]
        if clean_history:
            history_lines = []
            for item in clean_history[-4:]:
                role = "Pengguna" if item.get("sender") == "user" else "Asisten"
                snippet = item.get("text", "").strip()[:280]
                history_lines.append(f"{role}: {snippet}")
            history_str = "Riwayat Dialog:\n" + "\n".join(history_lines) + "\n\n"

    system_instruction = (
        "Anda adalah asisten virtual resmi edukasi Kepalangmerahan (SIMULA PMI). "
        "Jawablah secara ramah, jelas, terstruktur, dan edukatif HANYA berdasarkan materi modul resmi PMI di bawah.\n"
        "Aturan:\n"
        "1. Gunakan HANYA informasi dari materi modul yang disediakan. Jika tidak tercantum, katakan: "
        "'Maaf, informasi tersebut tidak ditemukan dalam modul kepalangmerahan kami.'\n"
        "2. Jika pertanyaan merupakan lanjutan dari Riwayat Dialog, jawab secara berkesinambungan.\n"
        "3. Gunakan format terstruktur (poin/nomor untuk langkah-langkah, **teks tebal** untuk istilah penting).\n"
        "4. Cantumkan rujukan singkat judul modul & bab/halaman di akhir jawaban."
    )

    prompt = (
        f"{history_str}"
        f"Materi Modul Resmi PMI:\n{context_str}\n\n"
        f"Pertanyaan: {query}\n"
        f"Jawaban:"
    )
    return system_instruction, prompt


def query_rag(
    query: str,
    history: List[Dict[str, Any]] | None = None,
    top_k: int = 4,
    threshold: float = 0.50,
) -> Dict[str, Any]:
    """
    Zero-Extra-Token Multi-Turn Conversational Hybrid RAG pipeline:
    1. Fast-Path Intent Check for greetings/thanks/meta (0 tokens, <1ms)
    2. Local Deterministic Conversational Query Resolution (0 tokens, <0.2ms)
    3. Cached Query Embedding (`RETRIEVAL_QUERY`, 768-dim)
    4. Hybrid Retrieval (Pre-normalized Vector + Stemmed BM25 + RRF + Dynamic Pruning)
    5. Grounded Generation + Deterministic Follow-up Suggestions (0 extra tokens)
    """
    # 1. Fast-Path Intent Router (0 tokens)
    fast_reply = check_fast_intent(query)
    if fast_reply is not None:
        return fast_reply

    client = get_gemini_client()
    kb = load_knowledge_base()

    if not client or not kb:
        return {
            "reply": "Sistem AI sedang dalam konfigurasi. Silakan periksa GEMINI_API_KEY atau basis materi.",
            "sources": [],
            "mode": "rag_unavailable",
            "suggestions": DEFAULT_SUGGESTIONS,
            "is_emergency": False,
        }

    # 2. Zero-token local conversational query expansion
    search_query = resolve_conversational_query(query, history)
    is_emergency = detect_emergency(search_query)

    # Check response cache for identical resolved queries
    cache_key = re.sub(r"\s+", " ", search_query.strip().lower())
    if not history and cache_key in _response_cache:
        _response_cache.move_to_end(cache_key)
        cached = dict(_response_cache[cache_key])
        cached["suggestions"] = generate_followup_suggestions(query, cached.get("_items", []), history)
        cached.pop("_items", None)
        return cached

    # 3. Embed standalone search query (with LRU cache)
    try:
        q_emb = get_query_embedding(search_query, client)
    except Exception as e:
        logger.error("Error generating query embedding: %s", e)
        return {
            "reply": "Maaf, terjadi gangguan saat memproses pencarian materi.",
            "sources": [],
            "mode": "rag_error",
            "suggestions": DEFAULT_SUGGESTIONS,
            "is_emergency": is_emergency,
        }

    # 4. Hybrid Retrieval (BM25 + Dense Vector Search + RRF + Pruning)
    result_tuple = hybrid_retrieve(
        search_query, q_emb, kb, top_k=top_k, threshold=threshold
    )
    is_ok, context_blocks, sources, mode = result_tuple[0], result_tuple[1], result_tuple[2], result_tuple[3]
    selected_items = result_tuple[4] if len(result_tuple) > 4 else []

    if not is_ok:
        reply_msg = (
            "Maaf, pertanyaan Anda di luar konteks materi kurikulum kepalangmerahan kami. "
            "Saya hanya dapat menjawab pertanyaan seputar materi resmi PMR/PMI (Pertolongan Pertama, "
            "Kesiapsiagaan Bencana, 7 Prinsip Palang Merah & Gerakan PMI, Donor Darah Sukarela, "
            "Kepemimpinan, Sanitasi/WASH, dan Kesehatan Remaja Sebaya)."
            if mode == "rag_filtered_out_of_scope"
            else "Maaf, materi terkait belum tersedia di kurikulum kami."
        )
        return {
            "reply": reply_msg,
            "sources": [],
            "mode": mode,
            "suggestions": DEFAULT_SUGGESTIONS,
            "is_emergency": False,
            "search_query": search_query,
        }

    suggestions = generate_followup_suggestions(query, selected_items, history)
    system_instruction, prompt = _build_grounded_prompt(query, context_blocks, history)

    # 5. Generate contextual response via Gemini
    from google.genai import types

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

    result = {
        "reply": reply_text,
        "sources": sources,
        "mode": "rag_verified_module",
        "search_query": search_query,
        "suggestions": suggestions,
        "is_emergency": is_emergency,
    }

    if not history and reply_text and not reply_text.startswith("Maaf, terjadi kendala"):
        _response_cache[cache_key] = {**result, "_items": selected_items}
        if len(_response_cache) > _RESPONSE_CACHE_MAX:
            _response_cache.popitem(last=False)

    return result


def _format_sse(data: Dict[str, Any]) -> str:
    return f"data: {json.dumps(data)}\n\n"


def query_rag_stream(
    query: str,
    history: List[Dict[str, Any]] | None = None,
    top_k: int = 4,
    threshold: float = 0.50,
):
    """
    Yields Server-Sent Events (SSE) with zero extra token overhead:
    data: {"type": "meta", "mode": ..., "sources": [...], "suggestions": [...], "is_emergency": ...}\n\n
    data: {"type": "delta", "text": "..."}\n\n
    data: {"type": "done"}\n\n
    """
    # 1. Fast-Path Intent Router (0 tokens, instant stream)
    fast_reply = check_fast_intent(query)
    if fast_reply is not None:
        yield _format_sse({
            "type": "meta",
            "mode": fast_reply["mode"],
            "sources": [],
            "suggestions": fast_reply["suggestions"],
            "is_emergency": False,
            "search_query": fast_reply["search_query"],
        })
        yield _format_sse({"type": "delta", "text": fast_reply["reply"]})
        yield _format_sse({"type": "done"})
        return

    client = get_gemini_client()
    kb = load_knowledge_base()

    if not client or not kb:
        err_msg = "Sistem AI sedang dalam konfigurasi. Silakan periksa GEMINI_API_KEY atau basis materi."
        yield _format_sse({
            "type": "meta",
            "mode": "rag_unavailable",
            "sources": [],
            "suggestions": DEFAULT_SUGGESTIONS,
            "is_emergency": False,
        })
        yield _format_sse({"type": "delta", "text": err_msg})
        yield _format_sse({"type": "done"})
        return

    # 2. Zero-token local conversational query expansion
    search_query = resolve_conversational_query(query, history)
    is_emergency = detect_emergency(search_query)

    # Check in-memory response cache for standalone queries (0 tokens!)
    cache_key = re.sub(r"\s+", " ", search_query.strip().lower())
    if not history and cache_key in _response_cache:
        _response_cache.move_to_end(cache_key)
        cached = _response_cache[cache_key]
        suggestions = generate_followup_suggestions(query, cached.get("_items", []), history)
        yield _format_sse({
            "type": "meta",
            "mode": cached["mode"],
            "sources": cached["sources"],
            "suggestions": suggestions,
            "is_emergency": cached.get("is_emergency", False),
            "search_query": search_query,
        })
        yield _format_sse({"type": "delta", "text": cached["reply"]})
        yield _format_sse({"type": "done"})
        return

    # 3. Embed standalone search query (with LRU cache)
    try:
        q_emb = get_query_embedding(search_query, client)
    except Exception as e:
        logger.error("Error generating query embedding: %s", e)
        yield _format_sse({
            "type": "meta",
            "mode": "rag_error",
            "sources": [],
            "suggestions": DEFAULT_SUGGESTIONS,
            "is_emergency": is_emergency,
        })
        yield _format_sse({"type": "delta", "text": "Maaf, terjadi gangguan saat memproses pencarian materi."})
        yield _format_sse({"type": "done"})
        return

    # 4. Hybrid Retrieval (BM25 + Dense Vector Search + RRF + Dynamic Pruning)
    result_tuple = hybrid_retrieve(
        search_query, q_emb, kb, top_k=top_k, threshold=threshold
    )
    is_ok, context_blocks, sources, mode = result_tuple[0], result_tuple[1], result_tuple[2], result_tuple[3]
    selected_items = result_tuple[4] if len(result_tuple) > 4 else []

    if not is_ok:
        blocked_msg = (
            "Maaf, pertanyaan Anda di luar konteks materi kurikulum kepalangmerahan kami. "
            "Saya hanya dapat menjawab pertanyaan seputar materi resmi PMR/PMI (Pertolongan Pertama, "
            "Kesiapsiagaan Bencana, 7 Prinsip Palang Merah & Gerakan PMI, Donor Darah Sukarela, "
            "Kepemimpinan, Sanitasi/WASH, dan Kesehatan Remaja Sebaya)."
            if mode == "rag_filtered_out_of_scope"
            else "Maaf, materi terkait belum tersedia di kurikulum kami."
        )
        yield _format_sse({
            "type": "meta",
            "mode": mode,
            "sources": [],
            "suggestions": DEFAULT_SUGGESTIONS,
            "is_emergency": False,
            "search_query": search_query,
        })
        yield _format_sse({"type": "delta", "text": blocked_msg})
        yield _format_sse({"type": "done"})
        return

    suggestions = generate_followup_suggestions(query, selected_items, history)

    # Send meta event IMMEDIATELY before streaming text!
    yield _format_sse({
        "type": "meta",
        "mode": mode,
        "sources": sources,
        "suggestions": suggestions,
        "is_emergency": is_emergency,
        "search_query": search_query,
    })

    system_instruction, prompt = _build_grounded_prompt(query, context_blocks, history)

    # 5. Generate stream from Gemini
    from google.genai import types

    collected_chunks: List[str] = []
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
                collected_chunks.append(chunk.text)
                yield _format_sse({"type": "delta", "text": chunk.text})
    except Exception as e:
        logger.error("Error in streaming Gemini reply: %s", e)
        yield _format_sse({"type": "delta", "text": "\n\n*(Terjadi kendala saat streaming respon)*"})

    full_reply = "".join(collected_chunks).strip()
    if not history and full_reply and "*(Terjadi kendala" not in full_reply:
        _response_cache[cache_key] = {
            "reply": full_reply,
            "sources": sources,
            "mode": mode,
            "is_emergency": is_emergency,
            "_items": selected_items,
        }
        if len(_response_cache) > _RESPONSE_CACHE_MAX:
            _response_cache.popitem(last=False)

    yield _format_sse({"type": "done"})
