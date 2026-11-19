"""
Pytest Suite for CiteVerify Research Engine
Tests CitationLinker, BibliographyParser, and the full VerificationPipeline.
"""

import pytest
from research_engine.pipeline import VerificationPipeline, DocumentVerificationReport, VerificationSummary
from app.services.report_generator import ReportGenerator
from research_engine.core.models import EvidencePassage, EvidenceType, VerificationResult
from research_engine.claims.citation_linker import CitationLinker
from research_engine.bibliography.parser import BibliographyParser
from research_engine.claims.claim_miner import ClaimMiner
from research_engine.extractor.pdf_extractor import ExtractedPage
from research_engine.core.models import VerificationStatus


def test_citation_linker_range_expansion():
    """Verify that CitationLinker correctly expands numeric citation ranges and single keys."""
    linker = CitationLinker()

    # Test complex mixed range
    expanded = linker.expand_citation_range("1, 2, 4-6")
    assert expanded == ["1", "2", "4", "5", "6"], f"Failed expanding '1, 2, 4-6', got: {expanded}"

    # Test single key
    single = linker.expand_citation_range("3")
    assert single == ["3"], f"Failed expanding '3', got: {single}"

    # Test unicode en-dash
    en_dash = linker.expand_citation_range("1–3")
    assert en_dash == ["1", "2", "3"], f"Failed expanding '1–3', got: {en_dash}"

    # Test empty or non-numeric
    empty = linker.expand_citation_range("")
    assert empty == [], f"Expected empty list for empty string, got: {empty}"


def test_citation_linker_in_text():
    """Verify CitationLinker detects bracketed citations in text with context."""
    linker = CitationLinker()
    sample_text = "Prior works [1] demonstrated strong gains, while newer approaches [2, 4-5] confirmed scalability."
    
    markers = linker.find_citations_in_text(sample_text, page_number=1)
    assert len(markers) == 2, f"Expected 2 citation markers, found {len(markers)}"

    assert markers[0].keys == ["1"], f"Expected ['1'], got {markers[0].keys}"
    assert markers[1].keys == ["2", "4", "5"], f"Expected ['2', '4', '5'], got {markers[1].keys}"
    assert markers[0].page_number == 1
    assert "Prior works" in markers[0].context_sentence


def test_claim_miner_rejects_citation_instructions_and_keeps_body_before_references():
    miner = ClaimMiner()
    instruction = ExtractedPage(
        page_num=1,
        text="CITATION DETECTION & MAPPING Find citations such as [1], (Author, Year) and the reference list.",
        blocks=[],
    )
    assert miner.extract_claims_from_pages([instruction]) == []

    mixed_page = ExtractedPage(
        page_num=1,
        text=(
            "The results demonstrate that the proposed method improves recognition accuracy by 12% [1].\n"
            "References\n[1] Example, A. A relevant source. 2024."
        ),
        blocks=[],
    )
    claims = miner.extract_claims_from_pages([mixed_page], bib_start_page=1)
    assert len(claims) == 1
    assert "improves recognition accuracy by 12%" in claims[0].statement
    assert claims[0].citation_keys == ["1"]


def test_bibliography_parser_metadata_extraction():
    """Verify BibliographyParser extracts DOIs, arXiv IDs, titles, and publication years."""
    parser = BibliographyParser()
    raw_bib = (
        "[1] Vaswani, A., Shazeer, N., Parmar, N., et al. Attention Is All You Need. Advances in NIPS, 2017. arXiv:1706.03762.\n"
        "[2] He, K., Zhang, X., Ren, S., Sun, J. Deep Residual Learning for Image Recognition. IEEE CVPR, 2016. 10.1109/CVPR.2016.90.\n"
        "[3] Simple, A. Baseline study for regression. Journal of Basic Stats, 2005."
    )

    entries = parser.parse_bibliography(raw_bib)
    assert len(entries) == 3, f"Expected 3 entries, parsed {len(entries)}"

    # Entry 1: arXiv ID
    assert entries[0].key == "1"
    assert entries[0].arxiv_id == "1706.03762", f"Expected arXiv ID '1706.03762', got {entries[0].arxiv_id}"
    assert entries[0].year == 2017, f"Expected year 2017, got {entries[0].year}"
    assert entries[0].resolved is True

    # Entry 2: DOI
    assert entries[1].key == "2"
    assert entries[1].doi == "10.1109/CVPR.2016.90", f"Expected DOI '10.1109/CVPR.2016.90', got {entries[1].doi}"
    assert entries[1].year == 2016, f"Expected year 2016, got {entries[1].year}"
    assert entries[1].resolved is True

    # Entry 3: Classical non-indexed entry
    assert entries[2].key == "3"
    assert entries[2].year == 2005


@pytest.mark.asyncio
async def test_verification_pipeline_process_pdf(sample_pdf_path):
    """Verify that the master VerificationPipeline extracts claims, citations, and evaluates evidence."""
    pipeline = VerificationPipeline()
    report = await pipeline.process_pdf(sample_pdf_path)

    # Document-level checks
    assert report.total_pages == 2, f"Expected 2 pages, got {report.total_pages}"
    assert report.summary.total_claims > 0, "No scientific claims were mined"
    assert report.summary.total_citations_found > 0, "No bibliography citations found"
    assert len(report.results) == report.summary.total_claims, "Mismatch between results and total claims"

    # Claim evaluation checks
    valid_statuses = set(VerificationStatus)
    for res in report.results:
        assert res.claim_id.startswith("CLM-"), f"Invalid claim ID format: {res.claim_id}"
        assert len(res.claim_statement) > 10, f"Claim statement too short: {res.claim_statement}"
        assert res.status in valid_statuses, f"Unknown status: {res.status}"
        assert 0.0 <= res.confidence_score <= 1.0, f"Confidence out of range: {res.confidence_score}"
        assert len(res.explanation) > 0, "Explanation must not be empty"

        # Provenance integrity checks
        for ev in res.evidence_items:
            assert ev.source_work_title, "Evidence passage missing source title"
            assert ev.source_database, "Evidence passage missing source database"
            assert ev.passage_text, "Evidence passage text is empty"
            assert ev.evidence_type in ["full_text", "abstract_only", "metadata_only"]


def test_pdf_report_wraps_long_claims_and_evidence_across_pages():
    long_claim = ("The evaluated study reports a measurable improvement in the tested method. " * 24).strip()
    long_explanation = ("No accessible source directly confirms every detail in this result. " * 18).strip()
    evidence_text = ("This evidence passage is retained in the report with its source provenance. " * 300) + "EVIDENCE-END-MARKER-123"
    report = DocumentVerificationReport(
        document_id="DOC-REPORT-TEST",
        filename="long-evidence-study.pdf",
        total_pages=4,
        summary=VerificationSummary(
            total_claims=1,
            insufficient_evidence=1,
            total_citations_found=1,
            total_citations_resolved=1,
        ),
        results=[
            VerificationResult(
                claim_id="CLM-1-TEST",
                claim_statement=long_claim,
                status=VerificationStatus.INSUFFICIENT_EVIDENCE,
                confidence_score=0.2,
                explanation=long_explanation,
                evidence_items=[
                    EvidencePassage(
                        passage_id="PASS-REPORT-TEST",
                        source_work_title="Evidence provenance test source",
                        source_database="openalex",
                        source_doi="10.1234/report-test",
                        source_url="https://example.org/source",
                        evidence_type=EvidenceType.FULL_TEXT,
                        page_number=3,
                        passage_text=evidence_text,
                        relevance_score=0.4,
                    )
                ],
            )
        ],
    )

    pdf_bytes = ReportGenerator.generate_pdf(report)
    pdf = fitz.open(stream=pdf_bytes, filetype="pdf")
    extracted_text = "\n".join(page.get_text("text") for page in pdf)
    assert len(pdf) > 1
    assert "Claim verification and evidence" in extracted_text
    assert "Evidence provenance test source" in extracted_text
    assert "EVIDENCE-END-MARKER-123" in extracted_text
