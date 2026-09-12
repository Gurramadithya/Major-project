from __future__ import annotations

import base64
import io
from datetime import datetime
from typing import Any

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Image, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


def _safe_text(value: Any) -> str:
    if value is None:
        return ""
    return str(value)


def generate_report_pdf(payload: dict[str, Any]) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=0.75 * inch, leftMargin=0.75 * inch, topMargin=0.75 * inch, bottomMargin=0.75 * inch)

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("TitleStyle", parent=styles["Heading1"], fontName="Helvetica-Bold", fontSize=16, leading=22, textColor=colors.HexColor("#0f766e"))
    heading_style = ParagraphStyle("HeadingStyle", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=11, leading=14, textColor=colors.HexColor("#1e293b"))
    body_style = ParagraphStyle("BodyStyle", parent=styles["BodyText"], fontName="Helvetica", fontSize=9.5, leading=13, textColor=colors.HexColor("#334155"))
    small_style = ParagraphStyle("SmallStyle", parent=styles["BodyText"], fontName="Helvetica", fontSize=8.2, leading=10.5, textColor=colors.HexColor("#64748b"))

    hospital_title = _safe_text(payload.get("hospital_name") or payload.get("project_title") or "Medical AI Report")
    generated_at = _safe_text(payload.get("generated_at") or datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"))
    detection_name = _safe_text(payload.get("disease_prediction") or payload.get("prediction") or "Pending")
    findings = payload.get("findings") or []
    recommendations = payload.get("recommendations") or []
    if isinstance(recommendations, str):
        recommendations = [recommendations]
    if not recommendations:
        recommendations = ["No recommendations were provided."]
    next_steps = payload.get("next_steps") or recommendations[:3] or ["Follow up as clinically indicated."]
    if isinstance(next_steps, str):
        next_steps = [next_steps]
    rag_context = payload.get("rag_context") or payload.get("rag_medical_knowledge") or "No retrieval context was attached."
    assistant_response = payload.get("assistant_response") or "No assistant response was attached."

    story = []
    story.append(Paragraph(hospital_title, title_style))
    story.append(Paragraph("AI-assisted medical case report", small_style))
    story.append(Spacer(1, 0.12 * inch))
    story.append(Paragraph(f"Generated: {generated_at}", small_style))
    story.append(Spacer(1, 0.2 * inch))

    table_data = [
        ["Field", "Value"],
        ["Project title", _safe_text(payload.get("project_title") or hospital_title)],
        ["Detection result", detection_name],
        ["Confidence", f"{float(payload.get('confidence', 0.0) or 0.0):.2%}"],
        ["Severity", _safe_text(payload.get("severity") or "Unknown")],
        ["Affected region", _safe_text(payload.get("affected_region") or "Unknown")],
        ["Processing time", _safe_text(payload.get("processing_time") or "N/A")],
        ["Suggested specialist", _safe_text(payload.get("suggested_specialist") or "Consult the referring clinician")],
    ]
    table = Table(table_data, colWidths=[2.2 * inch, 4.2 * inch])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f766e")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#f8fafc")),
            ]
        )
    )
    story.append(Paragraph("Case Summary", heading_style))
    story.append(table)
    story.append(Spacer(1, 0.18 * inch))

    story.append(Paragraph("Uploaded Image & Validation", heading_style))
    story.append(Paragraph(
        f"Filename: {_safe_text(payload.get('filename') or 'N/A')}<br/>"
        f"Validation: {_safe_text(payload.get('validation_result') or 'N/A')}<br/>"
        f"Image date/time: {_safe_text(payload.get('analysis_date') or generated_at)}",
        body_style,
    ))
    story.append(Spacer(1, 0.12 * inch))

    story.append(Paragraph("Overall Summary", heading_style))
    story.append(Paragraph(_safe_text(payload.get("overall_summary") or f"{detection_name} result generated on {generated_at}."), body_style))
    story.append(Spacer(1, 0.12 * inch))

    story.append(Paragraph("Detection Findings", heading_style))
    for item in findings:
        story.append(Paragraph(f"• {_safe_text(item)}", body_style))
    story.append(Spacer(1, 0.12 * inch))

    story.append(Paragraph("AI Explanation", heading_style))
    story.append(Paragraph(_safe_text(payload.get("ai_explanation") or "No explanation was provided."), body_style))
    story.append(Spacer(1, 0.12 * inch))

    story.append(Paragraph("Clinical Recommendations", heading_style))
    for item in recommendations:
        story.append(Paragraph(f"• {_safe_text(item)}", body_style))
    story.append(Spacer(1, 0.12 * inch))

    story.append(Paragraph("Suggested Next Steps", heading_style))
    for item in next_steps:
        story.append(Paragraph(f"• {_safe_text(item)}", body_style))
    story.append(Spacer(1, 0.12 * inch))

    story.append(Paragraph("RAG Medical Knowledge", heading_style))
    story.append(Paragraph(_safe_text(rag_context), body_style))
    story.append(Spacer(1, 0.12 * inch))

    story.append(Paragraph("AI Assistant Summary", heading_style))
    story.append(Paragraph(_safe_text(assistant_response), body_style))
    story.append(Spacer(1, 0.12 * inch))

    story.append(Paragraph("3D Anatomy Information", heading_style))
    visualization_note = "Illustrative demo mapping; not a medical localization." if payload.get("visualization_mode") == "illustrative" else "Current model-based region display when available."
    story.append(Paragraph(f"Affected region: {_safe_text(payload.get('affected_region') or 'Unknown')}<br/>Highlight description: {visualization_note}", body_style))

    image_b64 = payload.get("image_base64")
    if image_b64:
        story.append(Spacer(1, 0.18 * inch))
        story.append(Paragraph("Uploaded Image", heading_style))
        try:
            image_data = base64.b64decode(image_b64.split(",", 1)[-1])
            image_stream = io.BytesIO(image_data)
            image = Image(image_stream, width=3.5 * inch, height=2.7 * inch)
            story.append(image)
        except Exception:
            story.append(Paragraph("The uploaded image could not be embedded.", small_style))

    story.append(Spacer(1, 0.3 * inch))
    story.append(Paragraph(_safe_text(payload.get("medical_disclaimer") or "This is an AI-assisted academic/demo report and is not a substitute for professional medical diagnosis or treatment."), small_style))

    doc.build(story)
    return buffer.getvalue()
