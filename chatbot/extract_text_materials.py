import os
import re
import pymupdf

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
PROCESSED_DIR = os.path.join(os.path.dirname(__file__), "processed")
os.makedirs(PROCESSED_DIR, exist_ok=True)

def clean_text(text: str) -> str:
    # Remove repetitive page headers/footers
    lines = text.split("\n")
    cleaned_lines = []
    for line in lines:
        stripped = line.strip()
        # Filter typical header/footer artifacts
        if re.match(r"^Pelatihan Remaja Sebaya.*", stripped, re.IGNORECASE):
            continue
        if re.match(r"^[ivxlcdm]+$", stripped, re.IGNORECASE): # roman page numbers
            continue
        if re.match(r"^\d+$", stripped): # numeric page numbers
            continue
        cleaned_lines.append(line)
    result = "\n".join(cleaned_lines)
    result = re.sub(r"\n{3,}", "\n\n", result)
    return result.strip()

def extract_remaja_sebaya():
    pdf_path = os.path.join(DATA_DIR, "DOKUMEN TEXT (ISI).pdf")
    out_path = os.path.join(PROCESSED_DIR, "01_kesehatan_remaja_sebaya.md")
    print(f"Extracting {pdf_path}...")
    doc = pymupdf.open(pdf_path)
    content_parts = ["# MODUL PELATIHAN REMAJA SEBAYA (KESEHATAN & KESEJAHTERAAN REMAJA PMI)\n"]
    
    for page_idx in range(len(doc)):
        page_num = page_idx + 1
        # Skip preliminary pages before actual table of contents / chapter 1 (pages 1 to 10 are mostly foreword/credits)
        raw_text = doc[page_idx].get_text()
        cleaned = clean_text(raw_text)
        if len(cleaned) > 40:
            content_parts.append(f"\n\n<!-- Halaman {page_num} -->\n{cleaned}")
            
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(content_parts))
    print(f"Saved: {out_path} ({len(content_parts)} sections)")

def extract_pertolongan_pertama():
    pdf_path = os.path.join(DATA_DIR, "2.1. PP PMR MULA.pdf")
    out_path = os.path.join(PROCESSED_DIR, "02_pertolongan_pertama_mula.md")
    print(f"Extracting {pdf_path}...")
    doc = pymupdf.open(pdf_path)
    content_parts = ["# BUKU PANDUAN PERTOLONGAN PERTAMA (PMR MULA)\n"]
    
    for page_idx in range(len(doc)):
        page_num = page_idx + 1
        raw_text = doc[page_idx].get_text()
        cleaned = clean_text(raw_text)
        if len(cleaned) > 20:
            content_parts.append(f"\n\n<!-- Halaman {page_num} -->\n{cleaned}")
            
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(content_parts))
    print(f"Saved: {out_path} ({len(content_parts)} sections)")

if __name__ == "__main__":
    extract_remaja_sebaya()
    extract_pertolongan_pertama()
    print("Done extracting digital PDFs!")
