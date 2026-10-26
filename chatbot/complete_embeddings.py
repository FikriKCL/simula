import os
import json
import time
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv("backend/.env")
api_key = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=api_key)

PROCESSED_DIR = os.path.join(os.path.dirname(__file__), "processed")
OUTPUT_JSON = os.path.join(PROCESSED_DIR, "knowledge_base.json")

def complete_missing_embeddings():
    if not os.path.exists(OUTPUT_JSON):
        print("knowledge_base.json does not exist!")
        return

    with open(OUTPUT_JSON, "r", encoding="utf-8") as f:
        all_items = json.load(f)

    missing_indices = [i for i, item in enumerate(all_items) if "embedding" not in item]
    print(f"Total chunks: {len(all_items)}, Chunks needing embeddings: {len(missing_indices)}")

    if not missing_indices:
        print("All chunks already have embeddings!")
        return

    config = types.EmbedContentConfig(output_dimensionality=768)
    batch_size = 15

    for start in range(0, len(missing_indices), batch_size):
        batch_idx = missing_indices[start:start + batch_size]
        batch = [all_items[i] for i in batch_idx]
        texts = [f"{item['doc_title']} - {item['section_title']}\n{item['content']}" for item in batch]

        success = False
        for attempt in range(5):
            try:
                res = client.models.embed_content(
                    model="gemini-embedding-001",
                    contents=texts,
                    config=config
                )
                for item, emb in zip(batch, res.embeddings):
                    item["embedding"] = emb.values
                success = True
                print(f"Processed {start + len(batch)} / {len(missing_indices)} missing chunks")
                break
            except Exception as e:
                wait_time = 15 * (attempt + 1)
                print(f"Rate limited or error: {e}. Waiting {wait_time}s before retry...")
                time.sleep(wait_time)

        # Save progress after each batch
        with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
            json.dump(all_items, f, ensure_ascii=False, indent=2)

        time.sleep(2)

    # Final count
    with open(OUTPUT_JSON, "r", encoding="utf-8") as f:
        data = json.load(f)
    with_emb = [d for d in data if "embedding" in d]
    print(f"Finished! Successfully embedded {len(with_emb)} out of {len(data)} chunks.")

if __name__ == "__main__":
    complete_missing_embeddings()
