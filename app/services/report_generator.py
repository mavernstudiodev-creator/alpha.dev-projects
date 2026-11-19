"""
Report Generation Service for CiteVerify
Generates comprehensive audit reports in Markdown and PDF formats.
Uses PyMuPDF (fitz) for PDF generation with structured typography, badges, and layout.
"""

import json
from datetime import datetime
from typing import Dict, Any, Optional
import pymupdf as fitz

from research_engine.pipeline import DocumentVerificationReport


class ReportGenerator:
    """Generates Markdown and PDF audit reports from verified document reports."""

    @staticmethod
    def generate_markdown(report: DocumentVerificationReport) -> str:
        """Export verification report as structured Markdown."""
        lines = [
            f"# CiteVerify Audit Report: {report.filename}",
            f"**Filename:** `{report.filename}` | **Document ID:** `{report.document_id}` | **Pages:** {report.total_pages}",
            f"**Generated:** {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}",
            "",
            "## 1. Executive Verification Summary",
            f"- **Total Claims Evaluated:** {report.summary.total_claims}",
            f"- **Supported Claims:** {report.summary.supported}",
            f"- **Partially Supported Claims:** {report.summary.partially_supported}",
            f"- **Unsupported Claims:** {report.summary.unsupported}",
            f"- **Contradictory Claims:** {report.summary.contradictory}",
            f"- **Possibly Outdated Claims:** {report.summary.possibly_outdated}",
            f"- **Insufficient Evidence (Abstentions):** {report.summary.insufficient_evidence}",
            f"- **Citations Found in Document:** {report.summary.total_citations_found}",
            f"- **Citations Resolved in Academic Databases:** {report.summary.total_citations_resolved}",
            f"- **Processing Time:** {report.summary.processing_time_seconds:.2f} seconds",
            "",
            "---",
            "## 2. Scientific Claims & Evidence Audits",
        ]

        if not report.results:
            lines.append("\n*No scientific propositions extracted or evaluated for this document.*")

        for idx, r in enumerate(report.results, 1):
            status_upper = r.status.value.upper()
            lines.append(f"\n### {idx}. [{status_upper}] Claim `{r.claim_id}`")
            lines.append(f"> **Statement:** \"{r.claim_statement}\"")
            lines.append(f"- **Confidence Score:** {r.confidence_score * 100:.1f}%")
            lines.append(f"- **System Explanation:** {r.explanation}")

            if r.review_status.value != "pending":
                lines.append(f"- **Human Review:** `{r.review_status.value.upper()}` by {r.reviewed_by or 'Reviewer'}")
                if r.human_notes:
                    lines.append(f"  - **Reviewer Notes:** {r.human_notes}")

            if r.matched_citations:
                lines.append("\n**Matched Bibliographic References:**")
                for bib in r.matched_citations:
                    lines.append(f"- `[{bib.key}]` {bib.raw_text}")
                    if bib.doi:
                        lines.append(f"  - DOI: https://doi.org/{bib.doi}")

            if r.evidence_items:
                lines.append("\n**Harvested Academic Evidence:**")
                for ev in r.evidence_items:
                    lines.append(f"- **Paper:** *{ev.source_work_title}* (`{ev.source_database}`)")
                    if ev.source_doi:
                        lines.append(f"  - DOI: https://doi.org/{ev.source_doi}")
                    lines.append(f"  - Type: `{ev.evidence_type.value}` | Relevance: {ev.relevance_score * 100:.1f}%")
                    if ev.page_number:
                        lines.append(f"  - Source Page: {ev.page_number}")
                    lines.append(f"  - Evidence Passage: \"{ev.passage_text}\"")
            else:
                lines.append("\n*No direct evidence passages retrieved from accessible open-access sources.*")

        lines.extend([
            "",
            "---",
            "## 3. Human Review & Verification Provenance Notice",
            "CiteVerify assists researchers by surfacing retrieved evidence from Crossref, OpenAlex, Semantic Scholar, Europe PMC, and arXiv. "
            "Automated classifications must not replace expert peer review.",
        ])

        return "\n".join(lines)

    @staticmethod
    def generate_pdf(report: DocumentVerificationReport) -> bytes:
        """Generate a professional PDF verification report using PyMuPDF (fitz)."""
        doc = fitz.open()

        # Page 1: Header, Summary, and Metadata
        page = doc.new_page()
        width = page.rect.width
        margin = 45

        # Header Box
        header_rect = fitz.Rect(margin, 35, width - margin, 90)
        page.draw_rect(header_rect, color=(0.1, 0.25, 0.5), fill=(0.93, 0.96, 1.0), width=1.5)
        page.insert_text(fitz.Point(margin + 15, 60), "CiteVerify Scientific Audit Report", fontsize=16, fontname="helv", color=(0.1, 0.25, 0.5))
        page.insert_text(fitz.Point(margin + 15, 78), f"Automated Claim & Citation Verification Engine", fontsize=10, fontname="helv", color=(0.3, 0.3, 0.3))

        # Metadata Section
        y = 115
        page.insert_text(fitz.Point(margin, y), f"Document ID: {report.document_id}", fontsize=10, fontname="helv")
        y += 18
        page.insert_text(fitz.Point(margin, y), f"Filename: {report.filename} ({report.total_pages} pages)", fontsize=10, fontname="helv")
        y += 18
        page.insert_text(fitz.Point(margin, y), f"Audit Date: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}", fontsize=10, fontname="helv")
        y += 18
        page.insert_text(fitz.Point(margin, y), f"Processing Duration: {report.summary.processing_time_seconds:.2f}s", fontsize=10, fontname="helv")

        # Summary Metrics Box
        y += 28
        summary_rect = fitz.Rect(margin, y, width - margin, y + 105)
        page.draw_rect(summary_rect, color=(0.7, 0.7, 0.7), fill=(0.98, 0.98, 0.98), width=1.0)
        page.insert_text(fitz.Point(margin + 10, y + 20), "Executive Verification Summary", fontsize=12, fontname="helv", color=(0.1, 0.2, 0.4))
        
        col1_x = margin + 15
        col2_x = margin + 260
        sy = y + 42
        page.insert_text(fitz.Point(col1_x, sy), f"- Total Claims Evaluated: {report.summary.total_claims}", fontsize=9, fontname="helv")
        page.insert_text(fitz.Point(col2_x, sy), f"- Citations Found: {report.summary.total_citations_found}", fontsize=9, fontname="helv")
        sy += 16
        page.insert_text(fitz.Point(col1_x, sy), f"- Supported: {report.summary.supported}", fontsize=9, fontname="helv", color=(0.1, 0.5, 0.1))
        page.insert_text(fitz.Point(col2_x, sy), f"- Resolved Citations: {report.summary.total_citations_resolved}", fontsize=9, fontname="helv")
        sy += 16
        page.insert_text(fitz.Point(col1_x, sy), f"- Partially Supported: {report.summary.partially_supported}", fontsize=9, fontname="helv", color=(0.7, 0.4, 0.0))
        page.insert_text(fitz.Point(col2_x, sy), f"- Unsupported: {report.summary.unsupported}", fontsize=9, fontname="helv", color=(0.8, 0.1, 0.1))
        sy += 16
        page.insert_text(fitz.Point(col1_x, sy), f"- Contradictory: {report.summary.contradictory}", fontsize=9, fontname="helv", color=(0.6, 0.0, 0.2))
        page.insert_text(fitz.Point(col2_x, sy), f"- Insufficient Evidence: {report.summary.insufficient_evidence}", fontsize=9, fontname="helv", color=(0.4, 0.4, 0.4))

        # Claims & Evidence Listing
        y += 125
        page.insert_text(fitz.Point(margin, y), "Evaluated Scientific Claims & Evidence Audits", fontsize=12, fontname="helv", color=(0.1, 0.25, 0.5))
        y += 15

        for idx, r in enumerate(report.results, 1):
            # Check page overflow
            if y > 700:
                page = doc.new_page()
                y = 50

            status_colors = {
                "supported": ((0.1, 0.5, 0.1), (0.9, 0.98, 0.9)),
                "partially_supported": ((0.7, 0.4, 0.0), (1.0, 0.96, 0.9)),
                "unsupported": ((0.8, 0.1, 0.1), (1.0, 0.92, 0.92)),
                "contradictory": ((0.6, 0.0, 0.2), (0.98, 0.9, 0.94)),
                "possibly_outdated": ((0.5, 0.4, 0.1), (0.98, 0.96, 0.88)),
                "insufficient_evidence": ((0.4, 0.4, 0.4), (0.95, 0.95, 0.95)),
            }
            border_c, fill_c = status_colors.get(r.status.value, ((0.3, 0.3, 0.3), (0.95, 0.95, 0.95)))

            # Claim Card Rect
            card_h = 100 + (len(r.evidence_items) * 45)
            card_rect = fitz.Rect(margin, y, width - margin, y + min(card_h, 240))
            page.draw_rect(card_rect, color=border_c, fill=fill_c, width=1.0)

            # Claim Header & Status
            page.insert_text(fitz.Point(margin + 10, y + 18), f"{idx}. Claim {r.claim_id}  [{r.status.value.upper()}]", fontsize=10, fontname="helv", color=border_c)
            page.insert_text(fitz.Point(width - margin - 120, y + 18), f"Confidence: {r.confidence_score*100:.1f}%", fontsize=9, fontname="helv", color=(0.2, 0.2, 0.2))

            # Statement
            statement_rect = fitz.Rect(margin + 10, y + 25, width - margin - 10, y + 55)
            page.insert_textbox(statement_rect, f"\"{r.claim_statement}\"", fontsize=8, fontname="helv", color=(0.1, 0.1, 0.1))

            # Explanation
            exp_rect = fitz.Rect(margin + 10, y + 58, width - margin - 10, y + 80)
            page.insert_textbox(exp_rect, f"Verdict Reason: {r.explanation}", fontsize=8, fontname="helv", color=(0.3, 0.3, 0.3))

            # Human review status if applicable
            ey = y + 85
            if r.review_status.value != "pending":
                page.insert_text(fitz.Point(margin + 10, ey), f"Human Review: {r.review_status.value.upper()} by {r.reviewed_by or 'Reviewer'}", fontsize=8, fontname="helv", color=(0.1, 0.2, 0.6))
                ey += 12

            # Evidence passages summary
            if r.evidence_items:
                page.insert_text(fitz.Point(margin + 10, ey), f"Source Evidence ({len(r.evidence_items)} passages retrieved):", fontsize=8, fontname="helv", color=(0.2, 0.2, 0.2))
                ey += 12
                for ev in r.evidence_items[:2]:  # show up to 2 key passages
                    ev_text = f"• [{ev.source_database.upper()}] {ev.source_work_title[:60]}...: \"{ev.passage_text[:110]}...\""
                    ev_rect = fitz.Rect(margin + 15, ey, width - margin - 10, ey + 24)
                    page.insert_textbox(ev_rect, ev_text, fontsize=7, fontname="helv", color=(0.25, 0.25, 0.25))
                    ey += 26

            y += min(card_h, 240) + 12

        # Final Provenance Notice on last page
        if y > 720:
            page = doc.new_page()
            y = 50
        footer_rect = fitz.Rect(margin, y, width - margin, y + 40)
        page.draw_rect(footer_rect, color=(0.8, 0.8, 0.8), fill=(0.96, 0.96, 0.96), width=0.5)
        page.insert_text(fitz.Point(margin + 10, y + 16), "Verification Provenance & Integrity Guarantee", fontsize=8, fontname="helv", color=(0.2, 0.2, 0.2))
        page.insert_text(fitz.Point(margin + 10, y + 28), "CiteVerify strictly queries public academic repositories. All classifications require human expert validation.", fontsize=7, fontname="helv", color=(0.4, 0.4, 0.4))

        pdf_bytes = doc.write()
        doc.close()
        return pdf_bytes
