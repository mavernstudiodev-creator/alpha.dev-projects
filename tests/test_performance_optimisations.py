"""
Unit and Integration Tests for CiteVerify Performance Optimisations (Batch 1: Phases 1, 2, 3)

Tests:
- Reusable pooled HTTP client creation and configuration limits.
- Single PDF download deduplication when multiple claims cite the same paper.
- Graceful handling and caching of failed PDF downloads.
- Strict preservation of evidence provenance, attribution, and independent passage IDs.
- High-precision stage-by-stage pipeline timing instrumentation.
"""

import logging
import pytest
import httpx
import pymupdf as fitz
from unittest.mock import AsyncMock

from research_engine.core.http_client import create_pooled_http_client
from research_engine.core.models import (
    AcademicWork,
    Claim,
    EvidenceType,
)
from research_engine.evidence.pdf_cache import ResearchPdfCache
from research_engine.evidence.harvester import EvidenceHarvester
from research_engine.pipeline import VerificationPipeline


def create_mock_pdf_bytes(content_text: str) -> bytes:
    """Helper to generate valid in-memory PDF bytes containing given text."""
    doc = fitz.open()
    page = doc.new_page()
    page.insert_textbox(fitz.Rect(50, 50, 500, 700), content_text, fontsize=10)
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


def test_pooled_http_client_creation_and_config():
    """Verify create_pooled_http_client configures connection pooling and limits correctly."""
    client = create_pooled_http_client()
    assert isinstance(client, httpx.AsyncClient)
    assert client.timeout.connect == 8.0
    assert client.follow_redirects is True


@pytest.mark.asyncio
async def test_same_paper_downloaded_only_once_for_multiple_claims():
    """
    Critical Phase 3 requirement:
    When multiple claims cite the same paper, its PDF must be downloaded and parsed
    EXACTLY ONCE, while returning independent, unshared evidence passages to each claim.
    """
    mock_pdf_content = (
        "Experimental Benchmarks of Deep Residual Learning.\n"
        "We evaluate residual networks across complex image datasets.\n"
        "Residual connections reduce optimization error by 42% on image recognition tasks.\n"
        "Furthermore, our experiments demonstrate that self-attention mechanisms achieve superior parallelization.\n"
    )
    pdf_bytes = create_mock_pdf_bytes(mock_pdf_content)

    work = AcademicWork(
        source_database="crossref",
        external_id="10.1109/CVPR.2016.90",
        doi="10.1109/CVPR.2016.90",
        title="Deep Residual Learning for Image Recognition",
        authors=["Kaiming He", "Xiangyu Zhang"],
        year=2016,
        is_open_access=True,
        pdf_url="https://example.org/papers/resnet.pdf",
    )

    claim1 = Claim(
        claim_id="CLM-1",
        statement="Residual connections reduce optimization error by 42% on image recognition tasks.",
        page_number=1,
        context_sentence="Residual connections reduce optimization error by 42% [2].",
        citation_keys=["2"],
    )

    claim2 = Claim(
        claim_id="CLM-2",
        statement="Self-attention mechanisms achieve superior parallelization across sequence modeling.",
        page_number=1,
        context_sentence="Self-attention mechanisms achieve superior parallelization [2].",
        citation_keys=["2"],
    )

    mock_client = AsyncMock()
    mock_response = httpx.Response(200, content=pdf_bytes, headers={"content-type": "application/pdf"})
    mock_client.get = AsyncMock(return_value=mock_response)

    harvester = EvidenceHarvester()
    job_cache = ResearchPdfCache(max_entries=10)

    # First claim triggers download
    passages1 = await harvester.harvest_evidence_for_claim(
        claim1, work, pdf_cache=job_cache, client=mock_client
    )
    assert len(passages1) > 0
    assert mock_client.get.call_count == 1

    # Second claim MUST hit cache, NOT download again
    passages2 = await harvester.harvest_evidence_for_claim(
        claim2, work, pdf_cache=job_cache, client=mock_client
    )
    assert len(passages2) > 0
    assert mock_client.get.call_count == 1, f"Expected 1 download, but paper was fetched {mock_client.get.call_count} times!"

    # Assert passages are independent objects with distinct unique IDs
    assert passages1[0].passage_id != passages2[0].passage_id
    assert "residual connections" in passages1[0].passage_text.lower()
    assert "self-attention" in passages2[0].passage_text.lower()


@pytest.mark.asyncio
async def test_failed_pdf_download_cached_safely():
    """Verify that failed downloads are cached to prevent repeated failing requests."""
    mock_client = AsyncMock()
    mock_response = httpx.Response(404, text="Not Found")
    mock_client.get = AsyncMock(return_value=mock_response)

    harvester = EvidenceHarvester()
    job_cache = ResearchPdfCache(max_entries=10)

    work = AcademicWork(
        source_database="crossref",
        external_id="10.9999/failed.doi",
        doi="10.9999/failed.doi",
        title="Unavailable Paper",
        authors=["Anon"],
        year=2020,
        pdf_url="https://example.org/broken.pdf",
        abstract="Fallback abstract that discusses benchmark metrics.",
    )

    claim1 = Claim(
        claim_id="CLM-F1",
        statement="Benchmark metrics demonstrate robust convergence.",
        page_number=1,
        context_sentence="Benchmark metrics demonstrate robust convergence [1].",
        citation_keys=["1"],
    )

    claim2 = Claim(
        claim_id="CLM-F2",
        statement="Benchmark metrics indicate rapid convergence rates.",
        page_number=1,
        context_sentence="Benchmark metrics indicate rapid convergence [1].",
        citation_keys=["1"],
    )

    # Claim 1 attempts download, fails, falls back to abstract
    p1 = await harvester.harvest_evidence_for_claim(
        claim1, work, pdf_cache=job_cache, client=mock_client
    )
    assert mock_client.get.call_count == 1
    assert len(p1) > 0
    assert p1[0].evidence_type == EvidenceType.ABSTRACT_ONLY

    # Claim 2 checks cache, sees failure, falls back to abstract WITHOUT re-attempting HTTP fetch
    p2 = await harvester.harvest_evidence_for_claim(
        claim2, work, pdf_cache=job_cache, client=mock_client
    )
    assert mock_client.get.call_count == 1, "Failed download was repeated instead of using cached failure status!"
    assert len(p2) > 0
    assert p2[0].evidence_type == EvidenceType.ABSTRACT_ONLY


@pytest.mark.asyncio
async def test_evidence_attribution_and_provenance_preserved():
    """Verify that harvested evidence passages retain full attribution and provenance."""
    pdf_bytes = create_mock_pdf_bytes(
        "Transformers for Machine Translation.\n"
        "The self-attention mechanism significantly improves translation quality across bilingual tasks.\n"
    )

    work = AcademicWork(
        source_database="arxiv",
        external_id="1706.03762",
        doi="10.48550/arXiv.1706.03762",
        title="Attention Is All You Need",
        authors=["Ashish Vaswani"],
        year=2017,
        is_open_access=True,
        oa_url="https://arxiv.org/abs/1706.03762",
        pdf_url="https://arxiv.org/pdf/1706.03762.pdf",
    )

    claim = Claim(
        claim_id="CLM-ATTR",
        statement="Self-attention mechanism significantly improves translation quality.",
        page_number=1,
        context_sentence="Self-attention mechanism significantly improves translation quality [1].",
        citation_keys=["1"],
    )

    mock_client = AsyncMock()
    mock_response = httpx.Response(200, content=pdf_bytes, headers={"content-type": "application/pdf"})
    mock_client.get = AsyncMock(return_value=mock_response)

    harvester = EvidenceHarvester()
    passages = await harvester.harvest_evidence_for_claim(claim, work, client=mock_client)
    assert len(passages) > 0
    p = passages[0]

    # Assert all provenance fields are strictly populated
    assert p.source_work_title == "Attention Is All You Need"
    assert p.source_database == "arxiv"
    assert p.source_doi == "10.48550/arXiv.1706.03762"
    assert p.source_url == "https://arxiv.org/abs/1706.03762"
    assert p.evidence_type == EvidenceType.FULL_TEXT
    assert p.page_number == 1
    assert p.relevance_score > 0.45
    assert "self-attention mechanism" in p.passage_text.lower()


@pytest.mark.asyncio
async def test_pipeline_timing_instrumentation(sample_pdf_path, caplog):
    """Verify that high-precision time.perf_counter() stage timings are captured and logged."""
    pipeline = VerificationPipeline()
    with caplog.at_level(logging.INFO):
        report = await pipeline.process_pdf(sample_pdf_path, document_id="DOC-PERFTEST")

    # Verify summary processing time is populated
    assert report.summary.processing_time_seconds > 0.0

    # Verify log output contains all stage timings with document ID
    log_text = caplog.text
    assert "[DOC-PERFTEST] PDF layout extracted" in log_text
    assert "[DOC-PERFTEST] Parsed" in log_text
    assert "[DOC-PERFTEST] Extracted" in log_text
    assert "[DOC-PERFTEST] Resolved" in log_text
    assert "[DOC-PERFTEST] Pipeline Timings Breakdown:" in log_text
    assert "PDF Extraction:" in log_text
    assert "Bib Parsing:" in log_text
    assert "Claim Mining:" in log_text
    assert "Citation Resolution:" in log_text
    assert "Evidence Harvesting:" in log_text
    assert "Verdict Evaluation:" in log_text
    assert "Total Pipeline:" in log_text
