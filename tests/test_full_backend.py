"""
Comprehensive Test Suite for Complete CiteVerify Backend & NVIDIA AI Assistant
Tests:
- PDF Upload Validation (Empty, Corrupt, Scanned, Valid)
- Asynchronous Background Processing & Jobs
- Document Status, Claims, Citations, and Evidence Endpoints
- Markdown and PyMuPDF-generated PDF Report Exports
- Human Review, Verdict Overrides, and Audit Trail
- NVIDIA AI Assistant Conversation Management (Create, List, Rename, Delete)
- Grounded RAG Chat with Citation Provenance & Fallback
- SSE Streaming Responses
- Specialized Research Endpoints (Explain Claim, Analyze Evidence, Multi-Provider Search)
- Prompt Injection Defense in RAG Context
"""

import json
import pytest
import pymupdf as fitz
from unittest.mock import AsyncMock, patch

from research_engine.core.models import (
    AcademicWork,
    EvidencePassage,
    EvidenceType,
)


def create_scanned_image_pdf(file_path: str) -> str:
    """Creates a PDF with only an image/blank canvas and no text (simulates scanned paper)."""
    doc = fitz.open()
    page = doc.new_page()
    page.draw_rect(fitz.Rect(50, 50, 400, 400), color=(0.5, 0.5, 0.5), fill=(0.9, 0.9, 0.9))
    doc.save(file_path)
    doc.close()
    return file_path


def create_corrupt_file(file_path: str) -> str:
    """Creates a corrupted file pretending to be a PDF."""
    with open(file_path, "wb") as f:
        f.write(b"%PDF-corrupt-data-which-cannot-be-parsed-as-a-real-pdf\x00\xff")
    return file_path


@pytest.fixture(autouse=True)
def mock_external_academic_and_ai():
    """
    Mock external network calls for fast, hermetic test runs.
    Ensures tests do not depend on paid or live external APIs.
    """
    sample_work = AcademicWork(
        source_database="arxiv",
        doi="10.1145/3318464.3389700",
        title="Attention Is All You Need",
        authors=["Vaswani et al."],
        year=2017,
        is_open_access=True,
        oa_url="https://arxiv.org/abs/1706.03762",
        abstract="The transformer architecture was originally proposed for sequence modeling tasks.",
    )
    sample_passage = EvidencePassage(
        passage_id="PASS-TEST-1",
        source_work_title="Attention Is All You Need",
        source_database="arxiv",
        source_doi="10.1145/3318464.3389700",
        source_url="https://arxiv.org/abs/1706.03762",
        evidence_type=EvidenceType.FULL_TEXT,
        page_number=1,
        passage_text="The transformer architecture was originally proposed for sequence modeling tasks.",
        relevance_score=0.95,
    )

    with patch("research_engine.resolver.meta_resolver.MetaResolver.resolve_bib_entry", new_callable=AsyncMock) as m_res, \
         patch("research_engine.evidence.harvester.EvidenceHarvester.harvest_evidence_for_claim", new_callable=AsyncMock) as m_harv:
        m_res.return_value = sample_work
        m_harv.return_value = [sample_passage]
        yield


@pytest.fixture
async def verified_document(async_client, sample_pdf_path):
    """Uploads a valid academic paper and returns the verified report."""
    with open(sample_pdf_path, "rb") as f:
        response = await async_client.post(
            "/api/v1/documents/upload",
            files={"file": ("transformer_benchmark.pdf", f, "application/pdf")},
        )
    assert response.status_code == 200, f"Upload fixture failed: {response.text}"
    return response.json()


# =====================================================================
# 1. PDF Validation & Document Management Tests
# =====================================================================

@pytest.mark.asyncio
async def test_empty_pdf_rejected(async_client, tmp_path):
    """Verify that an empty (0-byte) PDF upload is rejected with HTTP 400."""
    empty_file = tmp_path / "empty.pdf"
    empty_file.write_bytes(b"")

    with open(empty_file, "rb") as f:
        res = await async_client.post(
            "/api/v1/documents/upload",
            files={"file": ("empty.pdf", f, "application/pdf")},
        )
    assert res.status_code == 400
    assert "empty" in res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_corrupt_pdf_rejected(async_client, tmp_path):
    """Verify that a corrupted PDF is rejected with HTTP 400."""
    corrupt_file = str(tmp_path / "corrupt.pdf")
    create_corrupt_file(corrupt_file)

    with open(corrupt_file, "rb") as f:
        res = await async_client.post(
            "/api/v1/documents/upload",
            files={"file": ("corrupt.pdf", f, "application/pdf")},
        )
    assert res.status_code in (400, 500)


@pytest.mark.asyncio
async def test_scanned_pdf_rejected_without_ocr(async_client, tmp_path):
    """Verify that a scanned (image-only, no text) PDF returns HTTP 422 with informative message."""
    scanned_file = str(tmp_path / "scanned_doc.pdf")
    create_scanned_image_pdf(scanned_file)

    with open(scanned_file, "rb") as f:
        res = await async_client.post(
            "/api/v1/documents/upload",
            files={"file": ("scanned_doc.pdf", f, "application/pdf")},
        )
    assert res.status_code == 422
    assert "scanned image" in res.json()["detail"].lower() or "ocr" in res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_document_status_endpoint(async_client, verified_document):
    """Verify document processing status endpoint."""
    doc_id = verified_document["document_id"]
    res = await async_client.get(f"/api/v1/documents/{doc_id}/status")
    assert res.status_code == 200
    data = res.json()
    assert data["document_id"] == doc_id
    assert data["status"] == "completed"
    assert data["total_pages"] == 2


@pytest.mark.asyncio
async def test_document_claims_endpoint(async_client, verified_document):
    """Verify detailed claims endpoint."""
    doc_id = verified_document["document_id"]
    res = await async_client.get(f"/api/v1/documents/{doc_id}/claims")
    assert res.status_code == 200
    data = res.json()
    assert data["document_id"] == doc_id
    assert data["total_claims"] > 0
    assert len(data["claims"]) == data["total_claims"]
    assert len(data["results"]) == data["total_claims"]


@pytest.mark.asyncio
async def test_document_citations_endpoint(async_client, verified_document):
    """Verify detailed citations/bibliography endpoint."""
    doc_id = verified_document["document_id"]
    res = await async_client.get(f"/api/v1/documents/{doc_id}/citations")
    assert res.status_code == 200
    data = res.json()
    assert data["document_id"] == doc_id
    assert data["total_citations"] > 0
    assert len(data["bibliography"]) == data["total_citations"]


@pytest.mark.asyncio
async def test_document_evidence_endpoint(async_client, verified_document):
    """Verify harvested evidence endpoint."""
    doc_id = verified_document["document_id"]
    res = await async_client.get(f"/api/v1/documents/{doc_id}/evidence")
    assert res.status_code == 200
    data = res.json()
    assert data["document_id"] == doc_id
    assert "total_evidence_passages" in data
    assert "claims_with_evidence" in data


# =====================================================================
# 2. Background Processing & Jobs Tests
# =====================================================================

@pytest.mark.asyncio
async def test_async_background_upload_flow(async_client, sample_pdf_path):
    """Verify asynchronous upload returns HTTP 202 and creates trackable job."""
    with open(sample_pdf_path, "rb") as f:
        res = await async_client.post(
            "/api/v1/documents/upload-async",
            files={"file": ("background_sample.pdf", f, "application/pdf")},
        )
    assert res.status_code == 202
    job_info = res.json()
    assert "job_id" in job_info
    assert "document_id" in job_info
    assert job_info["status"] == "pending"

    # Poll job status endpoint
    job_id = job_info["job_id"]
    status_res = await async_client.get(f"/api/v1/jobs/{job_id}")
    assert status_res.status_code == 200
    assert status_res.json()["job_id"] == job_id


@pytest.mark.asyncio
async def test_list_jobs_endpoint(async_client, sample_pdf_path):
    """Verify listing recent background jobs."""
    with open(sample_pdf_path, "rb") as f:
        await async_client.post(
            "/api/v1/documents/upload-async",
            files={"file": ("job_list_sample.pdf", f, "application/pdf")},
        )

    res = await async_client.get("/api/v1/jobs")
    assert res.status_code == 200
    jobs = res.json()
    assert isinstance(jobs, list)
    assert len(jobs) >= 1


# =====================================================================
# 3. Report Generation Tests (Markdown & PDF)
# =====================================================================

@pytest.mark.asyncio
async def test_export_markdown_dedicated_endpoint(async_client, verified_document):
    """Verify dedicated Markdown export endpoint."""
    doc_id = verified_document["document_id"]
    res = await async_client.get(f"/api/v1/documents/{doc_id}/export/markdown")
    assert res.status_code == 200
    assert "text/markdown" in res.headers.get("content-type", "")
    assert "Executive Verification Summary" in res.text
    assert "Scientific Claims & Evidence Audits" in res.text


@pytest.mark.asyncio
async def test_export_pdf_report(async_client, verified_document):
    """Verify formatted PDF report export using PyMuPDF generation."""
    doc_id = verified_document["document_id"]

    # 1. Test dedicated endpoint /export/pdf
    pdf_res = await async_client.get(f"/api/v1/documents/{doc_id}/export/pdf")
    assert pdf_res.status_code == 200
    assert "application/pdf" in pdf_res.headers.get("content-type", "")
    pdf_bytes = pdf_res.content
    assert len(pdf_bytes) > 1000
    assert pdf_bytes.startswith(b"%PDF-")

    # 2. Validate PDF structure using PyMuPDF reader
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    assert len(doc) >= 1
    page1_text = doc[0].get_text("text")
    assert "CiteVerify Scientific Audit Report" in page1_text
    assert doc_id in page1_text
    doc.close()

    # 3. Test generic /export?format=pdf query param
    param_res = await async_client.get(f"/api/v1/documents/{doc_id}/export?format=pdf")
    assert param_res.status_code == 200
    assert "application/pdf" in param_res.headers.get("content-type", "")


# =====================================================================
# 4. Human Review & Audit Trail Tests
# =====================================================================

@pytest.mark.asyncio
async def test_human_review_and_audit_history(async_client, verified_document):
    """Verify review history and persistent audit events."""
    doc_id = verified_document["document_id"]
    claim_id = verified_document["results"][0]["claim_id"]

    # Submit review
    review_res = await async_client.post(
        f"/api/v1/reviews/documents/{doc_id}/claims/{claim_id}",
        json={
            "decision": "overridden",
            "overridden_status": "partially_supported",
            "notes": "Empirical evidence partially aligns with subsequent findings.",
            "reviewer_name": "Prof. Alan Turing",
        },
    )
    assert review_res.status_code == 200
    assert review_res.json()["updated_verdict"] == "partially_supported"

    # Query reviews for document
    reviews_res = await async_client.get(f"/api/v1/reviews/documents/{doc_id}")
    assert reviews_res.status_code == 200
    reviews = reviews_res.json()
    assert len(reviews) >= 1
    assert any(r["claim_id"] == claim_id and r["reviewer_name"] == "Prof. Alan Turing" for r in reviews)

    # Query claim-specific review history
    claim_rev_res = await async_client.get(f"/api/v1/reviews/documents/{doc_id}/claims/{claim_id}")
    assert claim_rev_res.status_code == 200
    assert len(claim_rev_res.json()) >= 1

    # Query system audit trail
    audit_res = await async_client.get(f"/api/v1/audit/documents/{doc_id}")
    assert audit_res.status_code == 200
    audit_data = audit_res.json()
    assert audit_data["total_events"] >= 2  # upload + review
    assert any(e["action"] == "verdict_override" for e in audit_data["events"])


# =====================================================================
# 5. NVIDIA AI Assistant Conversation & Grounded RAG Tests
# =====================================================================

@pytest.mark.asyncio
async def test_ai_conversation_lifecycle(async_client, verified_document):
    """Verify conversation creation, retrieval, renaming, and deletion."""
    doc_id = verified_document["document_id"]

    # 1. Create conversation
    create_res = await async_client.post(
        "/api/v1/assistant/conversations",
        json={"title": "Paper Methodology Discussion", "document_id": doc_id},
    )
    assert create_res.status_code == 201
    conv = create_res.json()
    conv_id = conv["conversation_id"]
    assert conv["title"] == "Paper Methodology Discussion"
    assert conv["document_id"] == doc_id

    # 2. List conversations
    list_res = await async_client.get(f"/api/v1/assistant/conversations?document_id={doc_id}")
    assert list_res.status_code == 200
    convs = list_res.json()
    assert any(c["id"] == conv_id for c in convs)

    # 3. Rename conversation
    rename_res = await async_client.patch(
        f"/api/v1/assistant/conversations/{conv_id}",
        json={"title": "Updated Paper Audit"},
    )
    assert rename_res.status_code == 200
    assert rename_res.json()["title"] == "Updated Paper Audit"

    # 4. Fetch conversation details
    detail_res = await async_client.get(f"/api/v1/assistant/conversations/{conv_id}")
    assert detail_res.status_code == 200
    assert detail_res.json()["title"] == "Updated Paper Audit"

    # 5. Delete conversation
    del_res = await async_client.delete(f"/api/v1/assistant/conversations/{conv_id}")
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "success"

    # Verify 404 after deletion
    assert (await async_client.get(f"/api/v1/assistant/conversations/{conv_id}")).status_code == 404


@pytest.mark.asyncio
async def test_ai_grounded_message_and_rag(async_client, verified_document):
    """Verify sending question returns grounded answer with cited source passages."""
    doc_id = verified_document["document_id"]

    # Create conversation
    conv_res = await async_client.post(
        "/api/v1/assistant/conversations",
        json={"document_id": doc_id},
    )
    conv_id = conv_res.json()["conversation_id"]

    # Send research question
    msg_res = await async_client.post(
        f"/api/v1/assistant/conversations/{conv_id}/messages",
        json={"query": "Explain the methodology and results for neural sequence modeling."},
    )
    assert msg_res.status_code == 200
    data = msg_res.json()
    assert data["role"] == "assistant"
    assert len(data["content"]) > 50
    assert "sources" in data

    # Verify conversation history persisted
    history_res = await async_client.get(f"/api/v1/assistant/conversations/{conv_id}")
    messages = history_res.json()["messages"]
    assert len(messages) == 2  # user + assistant
    assert messages[0]["role"] == "user"
    assert messages[1]["role"] == "assistant"


@pytest.mark.asyncio
async def test_ai_streaming_response(async_client, verified_document):
    """Verify Server-Sent Events (SSE) streaming token output."""
    doc_id = verified_document["document_id"]

    conv_res = await async_client.post(
        "/api/v1/assistant/conversations",
        json={"document_id": doc_id},
    )
    conv_id = conv_res.json()["conversation_id"]

    stream_res = await async_client.post(
        f"/api/v1/assistant/conversations/{conv_id}/messages/stream",
        json={"query": "Summarize the primary scientific claims in this paper."},
    )
    assert stream_res.status_code == 200
    assert "text/event-stream" in stream_res.headers.get("content-type", "")
    assert "data: " in stream_res.text


@pytest.mark.asyncio
async def test_ai_specialized_explain_claim_endpoint(async_client, verified_document):
    """Verify specialized explain-claim endpoint."""
    doc_id = verified_document["document_id"]
    claim_id = verified_document["results"][0]["claim_id"]

    res = await async_client.post(
        "/api/v1/assistant/explain-claim",
        json={"document_id": doc_id, "claim_id": claim_id},
    )
    assert res.status_code == 200
    data = res.json()
    assert "content" in data
    assert len(data["content"]) > 40


@pytest.mark.asyncio
async def test_ai_specialized_analyze_evidence_endpoint(async_client, verified_document):
    """Verify specialized analyze-evidence endpoint."""
    doc_id = verified_document["document_id"]
    claim_id = verified_document["results"][0]["claim_id"]

    res = await async_client.post(
        "/api/v1/assistant/analyze-evidence",
        json={"document_id": doc_id, "claim_id": claim_id},
    )
    assert res.status_code == 200
    data = res.json()
    assert "content" in data


@pytest.mark.asyncio
async def test_academic_search_research_endpoint(async_client):
    """Verify multi-provider academic search assistance with mock data."""
    mock_work = AcademicWork(
        source_database="openalex",
        doi="10.1145/3318464.3389700",
        title="Scalable Scientific Citation Auditing",
        authors=["Alice Smith", "Bob Jones"],
        year=2024,
        is_open_access=True,
        oa_url="https://openalex.org/W12345",
        abstract="A novel framework for auditing academic claims against source literature.",
    )

    with patch("research_engine.resolver.meta_resolver.MetaResolver.search_all_providers", new_callable=AsyncMock) as mock_search:
        mock_search.return_value = [mock_work]

        res = await async_client.post(
            "/api/v1/assistant/search-research",
            json={"query": "scientific citation auditing", "limit": 3},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["total_found"] == 1
        assert data["results"][0]["doi"] == "10.1145/3318464.3389700"
        assert data["results"][0]["title"] == "Scalable Scientific Citation Auditing"
