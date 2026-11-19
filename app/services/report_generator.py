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
            f"- **Distinct in-text citation keys detected:** {report.summary.total_citations_found}",
            f"- **Bibliographic references parsed:** {len(report.bibliography)}",
            f"- **Citation references resolved in academic databases:** {report.summary.total_citations_resolved}",
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
        """Create a paginated, readable PDF with wrapped claim and evidence text."""
        doc = fitz.open()
        margin = 46
        blue = (0.12, 0.27, 0.52)
        muted = (0.32, 0.36, 0.42)
        bottom = 786

        def safe_text(value: Any) -> str:
            text = str(value or "")
            return text.translate(str.maketrans({
                "“": '"', "”": '"', "‘": "'", "’": "'",
                "–": "-", "—": "-", "•": "-", "…": "...",
            }))

        def new_page():
            page = doc.new_page()
            width = page.rect.width
            page.draw_rect(
                fitz.Rect(margin, 28, width - margin, 74),
                color=blue,
                fill=(0.93, 0.96, 1.0),
                width=1.2,
            )
            page.insert_text(
                fitz.Point(margin + 14, 55),
                "CiteVerify Scientific Audit Report",
                fontsize=15,
                fontname="hebo",
                color=blue,
            )
            return page, 91

        page, y = new_page()

        def wrapped_lines(value: Any, fontsize: float, fontname: str, max_width: float):
            font = fitz.Font(fontname=fontname)
            output = []
            for paragraph in safe_text(value).splitlines() or [""]:
                words = paragraph.split()
                if not words:
                    output.append("")
                    continue
                line = ""
                for word in words:
                    candidate = f"{line} {word}".strip()
                    if font.text_length(candidate, fontsize=fontsize) <= max_width:
                        line = candidate
                        continue
                    if line:
                        output.append(line)
                        line = ""
                    if font.text_length(word, fontsize=fontsize) <= max_width:
                        line = word
                        continue
                    fragment = ""
                    for character in word:
                        if fragment and font.text_length(fragment + character, fontsize=fontsize) > max_width:
                            output.append(fragment)
                            fragment = character
                        else:
                            fragment += character
                    line = fragment
                if line:
                    output.append(line)
            return output

        def write(value: Any, fontsize: float = 9, color=muted, bold: bool = False, indent: float = 0, gap: float = 3):
            nonlocal page, y
            fontname = "hebo" if bold else "helv"
            line_height = fontsize * 1.38
            max_width = page.rect.width - (margin * 2) - indent
            for line in wrapped_lines(value, fontsize, fontname, max_width):
                if y + line_height > bottom:
                    page, y = new_page()
                    max_width = page.rect.width - (margin * 2) - indent
                if line:
                    page.insert_text(
                        fitz.Point(margin + indent, y + fontsize),
                        line,
                        fontsize=fontsize,
                        fontname=fontname,
                        color=color,
                    )
                y += line_height
            y += gap

        def heading(value: str):
            nonlocal page, y
            if y + 26 > bottom:
                page, y = new_page()
            y += 5
            write(value, fontsize=12, color=blue, bold=True, gap=7)

        write(report.filename, fontsize=17, color=blue, bold=True, gap=5)
        write(f"Document ID: {report.document_id} | Pages: {report.total_pages}", fontsize=9, color=muted)
        write(f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')} | Processing time: {report.summary.processing_time_seconds:.2f} seconds", fontsize=9, color=muted, gap=8)

        heading("Verification summary")
        summary_rows = [
            f"Claims evaluated: {report.summary.total_claims}",
            f"Supported: {report.summary.supported} | Partially supported: {report.summary.partially_supported} | Unsupported: {report.summary.unsupported}",
            f"Contradictory: {report.summary.contradictory} | Possibly outdated: {report.summary.possibly_outdated} | Insufficient evidence: {report.summary.insufficient_evidence}",
            f"Distinct in-text citation keys: {report.summary.total_citations_found}",
            f"Bibliographic references parsed: {len(report.bibliography)} | References resolved: {report.summary.total_citations_resolved}",
        ]
        for row in summary_rows:
            write(row, fontsize=9, color=(0.12, 0.18, 0.25), gap=2)

        heading("Claim verification and evidence")
        if not report.results:
            write(
                "No eligible scientific claims with citation evidence were extracted. "
                "No claim verdicts have been inferred for this document.",
                fontsize=10,
                color=muted,
                gap=8,
            )

        for index, result in enumerate(report.results, 1):
            if y + 36 > bottom:
                page, y = new_page()
            page.draw_line(
                fitz.Point(margin, y + 3),
                fitz.Point(page.rect.width - margin, y + 3),
                color=(0.78, 0.82, 0.88),
                width=0.7,
            )
            y += 8
            status = result.status.value.replace("_", " ").upper()
            status_color = {
                "SUPPORTED": (0.12, 0.48, 0.24),
                "PARTIALLY SUPPORTED": (0.66, 0.39, 0.08),
                "UNSUPPORTED": (0.68, 0.16, 0.16),
                "CONTRADICTORY": (0.57, 0.10, 0.24),
                "POSSIBLY OUTDATED": (0.50, 0.39, 0.10),
                "INSUFFICIENT EVIDENCE": muted,
            }.get(status, blue)
            write(
                f"{index}. {result.claim_id} | {status} | Confidence {result.confidence_score * 100:.1f}%",
                fontsize=10,
                color=status_color,
                bold=True,
                gap=3,
            )
            write("Claim statement", fontsize=8, color=blue, bold=True, gap=1)
            write(result.claim_statement, fontsize=9, color=(0.12, 0.15, 0.19), indent=8, gap=3)
            write("System explanation", fontsize=8, color=blue, bold=True, gap=1)
            write(result.explanation, fontsize=9, color=muted, indent=8, gap=3)

            if result.review_status.value != "pending":
                review_text = f"Human review: {result.review_status.value.upper()} by {result.reviewed_by or 'Reviewer'}"
                if result.human_notes:
                    review_text += f" | Notes: {result.human_notes}"
                write(review_text, fontsize=8, color=blue, indent=8, gap=3)

            if result.matched_citations:
                write("Matched references", fontsize=8, color=blue, bold=True, gap=1)
                for reference in result.matched_citations:
                    write(f"[{reference.key}] {reference.raw_text}", fontsize=8, color=muted, indent=8, gap=1)
                    if reference.doi:
                        write(f"DOI: https://doi.org/{reference.doi}", fontsize=8, color=muted, indent=16, gap=1)

            if result.evidence_items:
                write("Retrieved evidence", fontsize=8, color=blue, bold=True, gap=1)
                for evidence in result.evidence_items:
                    source_line = f"{evidence.source_work_title} | {evidence.source_database} | {evidence.evidence_type.value}"
                    if evidence.page_number:
                        source_line += f" | source page {evidence.page_number}"
                    if evidence.relevance_score is not None:
                        source_line += f" | relevance {evidence.relevance_score * 100:.1f}%"
                    write(source_line, fontsize=8, color=(0.12, 0.18, 0.25), indent=8, gap=1)
                    if evidence.source_doi:
                        write(f"DOI: https://doi.org/{evidence.source_doi}", fontsize=8, color=muted, indent=16, gap=1)
                    if evidence.source_url:
                        write(f"Source URL: {evidence.source_url}", fontsize=8, color=muted, indent=16, gap=1)
                    write(f"Passage: {evidence.passage_text}", fontsize=8, color=muted, indent=16, gap=3)
            else:
                write("No direct evidence passage was retrieved for this claim.", fontsize=8, color=muted, indent=8, gap=5)

        if report.bibliography:
            heading("Bibliography parsed from the uploaded document")
            for reference in report.bibliography:
                write(f"[{reference.key}] {reference.raw_text}", fontsize=8, color=(0.12, 0.15, 0.19), indent=4, gap=1)
                if reference.doi:
                    write(f"DOI: https://doi.org/{reference.doi}", fontsize=8, color=muted, indent=12, gap=2)

        write(
            "Automated evidence classifications require human review. The report distinguishes stored verification records from unavailable or unverified source material.",
            fontsize=8,
            color=muted,
            gap=0,
        )

        page_count = len(doc)
        for index in range(page_count):
            current_page = doc[index]
            current_page.insert_text(
                fitz.Point(margin, current_page.rect.height - 24),
                f"CiteVerify | Page {index + 1} of {page_count}",
                fontsize=8,
                fontname="helv",
                color=muted,
            )

        pdf_bytes = doc.write()
        doc.close()
        return pdf_bytes
