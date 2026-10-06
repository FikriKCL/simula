import json
import logging
import os
from pathlib import Path
from dotenv import load_dotenv

# Suppress SDK warning in terminal
logging.getLogger("google_genai").setLevel(logging.ERROR)

from google import genai
from google.genai import types

# Resolve directories dynamically
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
    raise ValueError("GEMINI_API_KEY tidak ditemukan di backend/.env!")

client = genai.Client(api_key=api_key)

KB_PATH = CURRENT_DIR / "processed" / "knowledge_base.json"
if not KB_PATH.exists():
    raise FileNotFoundError(f"File knowledge base tidak ditemukan di: {KB_PATH}")

with open(KB_PATH, "r", encoding="utf-8") as f:
    kb = json.load(f)

def cosine_sim(a, b):
    dot = sum(x * y for x, y in zip(a, b))
    na = sum(x * x for x in a) ** 0.5
    nb = sum(y * y for y in b) ** 0.5
    return dot / (na * nb) if na and nb else 0.0

def search(query, top_k=2):
    q_emb = client.models.embed_content(
        model="gemini-embedding-001",
        contents=query,
        config=types.EmbedContentConfig(output_dimensionality=768)
    ).embeddings[0].values

    scores = [(cosine_sim(q_emb, item["embedding"]), item) for item in kb]
    scores.sort(key=lambda x: x[0], reverse=True)
    return scores[:top_k]

def ask_bot(query):
    print(f"\n==========================================")
    print(f"USER: {query}")
    print(f"==========================================")
    top_results = search(query, top_k=3)
    best_score = top_results[0][0]
    print(f"Top similarity score: {best_score:.4f}")

    # GUARDRAIL 1: Threshold
    SIMILARITY_THRESHOLD = 0.50
    if best_score < SIMILARITY_THRESHOLD:
        print("BOT (Lapis 1 Guardrail): Maaf, pertanyaan Anda di luar konteks materi kepalangmerahan kami.")
        return

    # Build context
    context_parts = []
    for score, item in top_results:
        context_parts.append(f"[{item['doc_title']} - {item['section_title']}]\n{item['content']}")
    context_text = "\n\n---\n\n".join(context_parts)

    system_instruction = (
        "Anda adalah asisten virtual resmi materi Kepalangmerahan (SIMULA PMI). "
        "Tugas Anda HANYA menjawab pertanyaan berdasarkan potongan modul materi yang disediakan. "
        "Aturan Wajib:\n"
        "1. Jawab HANYA menggunakan informasi dari materi yang disediakan di bawah.\n"
        "2. Jika jawaban tidak tercantum dalam materi, katakan dengan sopan: "
        "'Maaf, informasi tersebut tidak ditemukan dalam modul pembelajaran kepalangmerahan kami.'\n"
        "3. JANGAN menjawab pertanyaan umum di luar materi kepalangmerahan/PMI.\n"
        "4. Sertakan referensi judul modul dan topik di akhir jawaban secara singkat."
    )

    prompt = f"Materi Pembelajaran:\n{context_text}\n\nPertanyaan: {query}\nJawaban:"

    response = client.models.generate_content(
        model="gemini-3.5-flash-lite",
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=system_instruction,
            temperature=0.2
        )
    )
    print("BOT RESPONSE:\n" + response.text.strip())

if __name__ == "__main__":
    ask_bot("Apa yang harus dilakukan saat terjadi gempa bumi?")
    ask_bot("Bagaimana cara menangani luka bakar?")
    ask_bot("Bagaimana resep membuat kue martabak manis?")
