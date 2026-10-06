import json
import os
import re
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit
import psycopg
from dotenv import load_dotenv

load_dotenv("backend/.env")

raw_url = os.getenv("DATABASE_URL", "postgresql://simula:simula_dev_password@localhost:5432/simula")
parts = urlsplit(raw_url)
query = dict(parse_qsl(parts.query))
query.pop("schema", None)
db_url = urlunsplit(parts._replace(query=urlencode(query)))

KB_PATH = os.path.join(os.path.dirname(__file__), "processed", "knowledge_base.json")


def seed():
    if not os.path.exists(KB_PATH):
        print("knowledge_base.json not found!")
        return

    print("Connecting to PostgreSQL...")
    try:
        with psycopg.connect(db_url) as conn:
            with conn.cursor() as cur:
                print("Enabling pgvector extension...")
                cur.execute("CREATE EXTENSION IF NOT EXISTS vector;")

                print("Creating document_chunk table...")
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS document_chunks (
                        id SERIAL PRIMARY KEY,
                        doc_title TEXT NOT NULL,
                        section_title TEXT NOT NULL,
                        content TEXT NOT NULL,
                        embedding vector(768)
                    );
                """)

                print("Reading knowledge_base.json...")
                with open(KB_PATH, "r", encoding="utf-8") as f:
                    chunks = json.load(f)

                cur.execute("TRUNCATE TABLE document_chunks;")
                print(f"Inserting {len(chunks)} chunks into PostgreSQL...")

                for c in chunks:
                    emb = c.get("embedding")
                    emb_str = f"[{','.join(str(x) for x in emb)}]" if emb else None
                    cur.execute(
                        """
                        INSERT INTO document_chunks (doc_title, section_title, content, embedding)
                        VALUES (%s, %s, %s, %s::vector);
                    """,
                        (c["doc_title"], c["section_title"], c["content"], emb_str),
                    )

                conn.commit()
                print("Successfully seeded all chunks into PostgreSQL document_chunks table!")
    except Exception as e:
        print(f"Database seeding failed (make sure Docker PostgreSQL is running): {e}")


if __name__ == "__main__":
    seed()
