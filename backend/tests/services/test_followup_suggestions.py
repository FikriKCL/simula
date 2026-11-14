"""Follow-up chips are built from knowledge base section titles; they must read naturally."""

import pytest

from app.services.rag_service import _section_to_question, generate_followup_suggestions

DOC = "Buku Panduan Pertolongan Pertama (PMR Mula)"


@pytest.mark.parametrize(
    ("title", "content", "expected"),
    [
        ("6.1. Jenis Kebakaran (Hal. 35)", "", "Apa saja jenis kebakaran?"),
        ("Mengenali Patah Tulang s.d. Jenis patah tulang (Hal. 21-23)", "", "Bagaimana cara mengenali patah tulang?"),
        ("Jenis patah tulang juga perlu kita ketahui (Hal. 23)", "", "Apa saja jenis patah tulang?"),
        ("Kesiapsiagaan Banjir (Hal. 19)", "", "Bagaimana kesiapsiagaan menghadapi banjir?"),
        ("Setelah Longsor Terjadi (Hal. 24)", "", "Apa yang harus dilakukan setelah longsor terjadi?"),
        ("2.3. Akibat Gempa Bumi (Hal. 16)", "", "Apa akibat gempa bumi?"),
        ("BAGAIMANA CARA MENCEGAH DAN MENGOBATI HEPATITIS-B? (Hal. 76)", "", "Bagaimana cara mencegah dan mengobati hepatitis-b?"),
        ("APAKAH TBC ITU? (Hal. 77)", "", "Apakah TBC itu?"),
        ("10. Abrasi (Hal. 34)", "Abrasi adalah pengikisan pantai oleh gelombang.", "Apa itu abrasi?"),
    ],
)
def test_titles_become_natural_questions(title, content, expected):
    assert _section_to_question(title, DOC, content) == expected


@pytest.mark.parametrize(
    "title",
    [
        "Tentang pembalut Luka... (Hal. 20)",  # topic not defined in its own text
        "INGAT! (Hal. 14)",
        "Tebak Nama (Hal. 33-34)",
        "H. Proses Pembelajaran (Hal. 54)",
        "KURIKULUM DONOR DARAH PMR MULA (Hal. 9-11)",
        "MODUL VIII (Hal. 106-107)",
        "Hal. 1",
        "MEMBANTU REMAJA SEBAYA LAIN AGAR TERHINDAR DARI BER (Hal. 30)",
        "B. Diskusi kelompok ataupun pleno untuk membahas (Hal. 9)",
        "11.2. Apakah Dampaknya Dalam Kehidupan Kita? (Hal. 49)",
        "BAGAIMANA KITA MENYIKAPI TUMBUH KEMBANG TERSEBUT? (Hal. 17)",
        "Kenalilah tanda-tanda terjadinya tsunami (Hal. 12)",
        "Apa yang bisa kamu lakukan? (Hal. 30)",
        "Advokasi & (Hal. 5)",
        "Bagaimana remaja dapat mencegah diri dari infeksi me (Hal. 40)",
    ],
)
def test_awkward_titles_are_skipped(title):
    assert _section_to_question(title, DOC, "Materi tanpa definisi.") is None


def test_suggestions_never_use_the_old_generic_template():
    items = [{"id": 1, "doc_title": DOC, "section_title": "Tentang pembalut Luka...", "category": "pertolongan_pertama"}]
    suggestions = generate_followup_suggestions("Cara pakai plester", items, [])
    assert suggestions
    assert not any("penjelasan tentang" in s for s in suggestions)
