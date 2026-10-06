import os
import time
import pymupdf
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv("backend/.env")
api_key = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=api_key)

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
PROCESSED_DIR = os.path.join(os.path.dirname(__file__), "processed")
os.makedirs(PROCESSED_DIR, exist_ok=True)

def extract_siaga_bencana():
    pdf_path = os.path.join(DATA_DIR, "7.1. Ayo Siaga Mula.pdf")
    out_path = os.path.join(PROCESSED_DIR, "03_ayo_siaga_bencana_mula.md")
    print(f"Opening {pdf_path}...")
    doc = pymupdf.open(pdf_path)
    
    # We will process pages from page 5 up to page 42
    # Skip completely blank pages
    results = ["# BUKU PANDUAN AYO SIAGA BENCANA (PMR MULA PMI)\n"]
    
    start_page = 4  # 0-indexed -> Page 5
    end_page = min(42, len(doc))
    
    for page_idx in range(start_page, end_page):
        page_num = page_idx + 1
        page = doc[page_idx]
        pix = page.get_pixmap(dpi=120)
        img_bytes = pix.tobytes("png")
        
        # Check if page is empty image
        if len(img_bytes) < 5000:
            print(f"Skipping blank page {page_num}")
            continue
            
        print(f"Processing Page {page_num}/{end_page} via Vision...")
        prompt = (
            "Ekstrak seluruh teks materi, definisi, dialog edukasi, langkah siaga bencana, "
            "dan poin penting dari halaman buku PMR Mula PMI ini ke dalam format Markdown rapi. "
            "Fokus pada substansi materi edukasi (misal: apa itu bencana, jenis bencana, gempa bumi, banjir, longsor, kesiapsiagaan, evakuasi, tas siaga bencana). "
            "Jika hanya ilustrasi tanpa teks berbobot, rangkum pesan edukasinya dalam 1-2 kalimat."
        )
        
        # Try generating with retries
        success = False
        for attempt in range(3):
            try:
                response = client.models.generate_content(
                    model="gemini-3.5-flash-lite",
                    contents=[
                        types.Part.from_bytes(data=img_bytes, mime_type="image/png"),
                        prompt
                    ]
                )
                txt = response.text.strip()
                if txt:
                    results.append(f"\n\n## Halaman {page_num}\n{txt}")
                success = True
                break
            except Exception as e:
                print(f"Page {page_num} attempt {attempt+1} failed: {e}. Retrying in 2s...")
                time.sleep(2)
                
        if not success:
            print(f"Failed to process page {page_num}")
            
        # Polite delay to respect rate limit
        time.sleep(1)
        
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(results))
    print(f"Successfully saved {out_path} ({len(results)} pages extracted)!")

if __name__ == "__main__":
    extract_siaga_bencana()
