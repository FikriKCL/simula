from io import BytesIO
from uuid import uuid4
from xml.sax.saxutils import escape

from sqlalchemy import select

from app.models import Certificate, Module

from .common import add, records, require


def issue(db, attempt, quiz, learner):
    existing = db.scalar(
        select(Certificate).where(
            Certificate.user_id == learner.id, Certificate.quiz_id == quiz.id
        )
    )
    if existing:
        return existing
    module = require(db.get(Module, quiz.module_id))
    return add(
        db,
        Certificate(
            user_id=learner.id,
            quiz_id=quiz.id,
            attempt_id=attempt.id,
            code="SIMULA-" + uuid4().hex.upper(),
            display_name=learner.display_name,
            module_title=module.title,
            quiz_title=quiz.title,
            score=attempt.score,
        ),
    )


def certificates(user, db):
    return records(
        db.scalars(
            select(Certificate)
            .where(Certificate.user_id == user["id"])
            .order_by(Certificate.issued_at.desc())
        )
    )


def owned(cid, user, db):
    return require(
        db.scalar(
            select(Certificate).where(
                Certificate.id == cid, Certificate.user_id == user["id"]
            )
        ),
        "Sertifikat tidak ditemukan",
    )


def pdf_bytes(certificate):
    from pathlib import Path

    import reportlab
    from reportlab.lib.colors import HexColor
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    from reportlab.pdfgen import canvas
    from reportlab.platypus import KeepInFrame, Paragraph, Spacer

    fontdir = Path(reportlab.__file__).parent / "fonts"
    if "SimulaRegular" not in pdfmetrics.getRegisteredFontNames():
        pdfmetrics.registerFont(TTFont("SimulaRegular", str(fontdir / "Vera.ttf")))
        pdfmetrics.registerFont(TTFont("SimulaBold", str(fontdir / "VeraBd.ttf")))
    out = BytesIO()
    width, height = landscape(A4)
    c = canvas.Canvas(out, pagesize=(width, height))
    c.setTitle("Sertifikat Pembelajaran SIMULA")
    c.setAuthor("SIMULA")
    c.setFillColor(HexColor("#f5faff"))
    c.rect(0, 0, width, height, fill=1, stroke=0)
    c.setStrokeColor(HexColor("#369df5"))
    c.setLineWidth(3)
    c.roundRect(24, 24, width - 48, height - 48, 12, stroke=1, fill=0)

    def paragraph(value, size=16, bold=False, color="#15334a"):
        style = ParagraphStyle(
            "center",
            fontName="SimulaBold" if bold else "SimulaRegular",
            fontSize=size,
            leading=size * 1.3,
            textColor=HexColor(color),
            alignment=1,
        )
        return Paragraph(escape(str(value)), style)

    def fixed(value, y, size, bold=False, color="#15334a"):
        p = paragraph(value, size, bold, color)
        w, h = p.wrap(width - 120, 90)
        p.drawOn(c, 60, y - h)

    fixed("SIMULA", height - 55, 24, True, "#ee3537")
    fixed("SERTIFIKAT PEMBELAJARAN", height - 105, 30, True)
    story = [
        paragraph("Diberikan kepada", 14),
        Spacer(1, 12),
        paragraph(certificate.display_name, 24, True),
        Spacer(1, 18),
        paragraph("Telah menyelesaikan dan lulus post-test", 14),
        Spacer(1, 12),
        paragraph(certificate.module_title, 20, True),
        Spacer(1, 8),
        paragraph(certificate.quiz_title, 14),
        Spacer(1, 16),
        paragraph(f"Nilai: {certificate.score}/100", 16, True),
        Spacer(1, 12),
        paragraph("Diterbitkan: " + certificate.issued_at.strftime("%d-%m-%Y"), 12),
    ]
    content = KeepInFrame(width - 120, height - 285, story, mode="shrink")
    content.wrapOn(c, width - 120, height - 285)
    content.drawOn(c, 60, 110)
    fixed(certificate.code, 85, 9)
    fixed(
        "Dokumen penyelesaian pembelajaran SIMULA; bukan sertifikasi kompetensi profesi.",
        62,
        9,
    )
    c.showPage()
    c.save()
    return out.getvalue()
