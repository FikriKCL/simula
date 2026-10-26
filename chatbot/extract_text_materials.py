import os
import re
import sys
import pymupdf

# Set stdout encoding to utf-8 for Windows PowerShell
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
PROCESSED_DIR = os.path.join(os.path.dirname(__file__), "processed")
os.makedirs(PROCESSED_DIR, exist_ok=True)

# List of all digital text documents to extract
DOCUMENTS = [
    {
        "pdf": "DOKUMEN TEXT (ISI).pdf",
        "output": "01_kesehatan_remaja_sebaya.md",
        "title": "MODUL PELATIHAN REMAJA SEBAYA (KESEHATAN & KESEJAHTERAAN REMAJA PMI)",
        "min_chars": 40,
    },
    {
        "pdf": "2.1. PP PMR MULA.pdf",
        "output": "02_pertolongan_pertama_mula.md",
        "title": "BUKU PANDUAN PERTOLONGAN PERTAMA (PMR MULA)",
        "min_chars": 20,
    },
    {
        "pdf": "2.3. PP PMR WIRA.pdf",
        "output": "04_pertolongan_pertama_wira.md",
        "title": "BUKU PANDUAN PERTOLONGAN PERTAMA (PMR WIRA)",
        "min_chars": 30,
    },
    {
        "pdf": "3. KEPEMIMPINAN PMR (MULA-MADYA-WIRA).pdf",
        "output": "05_kepemimpinan_pmr.md",
        "title": "BUKU KEPEMIMPINAN PMR (MULA, MADYA, WIRA)",
        "min_chars": 30,
    },
    {
        "pdf": "4. DONOR DARAH PMR (MULA-MADYA-WIRA).pdf",
        "output": "06_donor_darah_pmr.md",
        "title": "BUKU DONOR DARAH SUKARELA PMR (MULA, MADYA, WIRA)",
        "min_chars": 30,
    },
    {
        "pdf": "Buku PMI - Panduan Fasilitator PMR - Gerakan.pdf",
        "output": "07_fasilitator_gerakan_palang_merah.md",
        "title": "BUKU PANDUAN FASILITATOR PMR: GERAKAN PALANG MERAH DAN BULAN SABIT MERAH",
        "min_chars": 30,
    },
    {
        "pdf": "Buku PMI - Panduan Fasilitator PMR - Pertolongan Pertama.pdf",
        "output": "08_fasilitator_pertolongan_pertama.md",
        "title": "BUKU PANDUAN FASILITATOR PMR: PERTOLONGAN PERTAMA",
        "min_chars": 30,
    },
    {
        "pdf": "Buku PMI - Panduan Fasilitator PMR - Kepemimpinan.pdf",
        "output": "09_fasilitator_kepemimpinan.md",
        "title": "BUKU PANDUAN FASILITATOR PMR: KEPEMIMPINAN",
        "min_chars": 30,
    },
    {
        "pdf": "Buku PMI - Panduan Fasilitator PMR - Donor Darah.pdf",
        "output": "10_fasilitator_donor_darah.md",
        "title": "BUKU PANDUAN FASILITATOR PMR: DONOR DARAH SUKARELA",
        "min_chars": 30,
    },
    {
        "pdf": "Buku PMI - Panduan Fasilitator PMR - Kesehatan Remaja.pdf",
        "output": "11_fasilitator_kesehatan_remaja.md",
        "title": "BUKU PANDUAN FASILITATOR PMR: PENDIDIKAN REMAJA SEBAYA & KESEHATAN REMAJA",
        "min_chars": 30,
    },
    {
        "pdf": "Buku PMI - Panduan Fasilitator PMR - Remaja Sehat Peduli Sesama.pdf",
        "output": "12_fasilitator_remaja_sehat_wash.md",
        "title": "BUKU PANDUAN FASILITATOR PMR: REMAJA SEHAT PEDULI SESAMA (SANITASI & KESEHATAN)",
        "min_chars": 30,
    },
    {
        "pdf": "Buku PMI - Manajemen PMR.pdf",
        "output": "13_manajemen_pmr.md",
        "title": "BUKU MANAJEMEN PEMBINAAN DAN PENGEMBANGAN PMR PMI",
        "min_chars": 30,
    },
]

def clean_text(text: str) -> str:
    # Clean private-use unicode icons (often bullet graphics in PDFs)
    text = re.sub(r"[\uf000-\uf8ff]", "", text)
    
    lines = text.split("\n")
    cleaned_lines = []
    for line in lines:
        stripped = line.strip()
        # Filter typical header/footer artifacts
        if re.match(r"^Pelatihan Remaja Sebaya.*", stripped, re.IGNORECASE):
            continue
        if re.match(r"^Buku Panduan Fasilitator.*", stripped, re.IGNORECASE):
            continue
        if re.match(r"^Palang Merah Remaja.*", stripped, re.IGNORECASE):
            continue
        if re.match(r"^[ivxlcdm]+$", stripped, re.IGNORECASE):  # roman page numbers
            continue
        if re.match(r"^\d+$", stripped):  # standalone numeric page numbers
            continue
        cleaned_lines.append(line)
        
    result = "\n".join(cleaned_lines)
    result = re.sub(r"\n{3,}", "\n\n", result)
    return result.strip()

def extract_all():
    print(f"=== Memulai Ekstraksi {len(DOCUMENTS)} Dokumen Digital PMI ===")
    
    for doc_info in DOCUMENTS:
        pdf_path = os.path.join(DATA_DIR, doc_info["pdf"])
        out_path = os.path.join(PROCESSED_DIR, doc_info["output"])
        
        if not os.path.exists(pdf_path):
            print(f"Melewatkan {doc_info['pdf']}: file tidak ditemukan.")
            continue
            
        print(f"Mengekstrak: {doc_info['pdf']} -> {doc_info['output']}...")
        doc = pymupdf.open(pdf_path)
        content_parts = [f"# {doc_info['title']}\n"]
        total_pages = len(doc)
        extracted_pages = 0
        
        for page_idx in range(total_pages):
            page_num = page_idx + 1
            raw_text = doc[page_idx].get_text()
            cleaned = clean_text(raw_text)
            
            if len(cleaned) >= doc_info.get("min_chars", 30):
                content_parts.append(f"\n\n<!-- Halaman {page_num} -->\n{cleaned}")
                extracted_pages += 1
                
        with open(out_path, "w", encoding="utf-8") as f:
            f.write("\n".join(content_parts))
            
        file_size_kb = os.path.getsize(out_path) / 1024
        print(f"Selesai: {doc_info['output']} ({extracted_pages}/{total_pages} hlm, {file_size_kb:.1f} KB)")

if __name__ == "__main__":
    extract_all()
    print("\nSeluruh materi teks digital berhasil diekstrak ke folder processed/!")

