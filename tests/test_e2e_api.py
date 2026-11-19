"""
Pytest Suite for CiteVerify End-to-End API Workflows
Tests:
- API Health Check
- PDF Upload and Verification
- Human-in-the-Loop Review & Audit Trail
- Human Review Verdict Override
- Document Fetching & PDF Streaming
- Markdown Audit Export
- Invalid File Upload Handling
"""

import pytest


@pytest.fixture
async def uploaded_document(async_client, sample_pdf_path):
    """Fixture that uploads a sample academic PDF once for downstream read and review tests."""
    with open(sample_pdf_path, "rb") as f:
        response = await async_client.post(
            "/api/v1/documents/upload",
            files={"file": ("test_paper.pdf", f, "application/pdf")},
        )
    assert response.status_code == 200, f"Upload fixture failed: {response.text}"
    return response.json()


@pytest.mark.asyncio
async def test_api_health_endpoint(async_client):
    """Verify system health endpoint and active integrations."""
    response = await async_client.get("/api/health")
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"

    data = response.json()
    assert data["status"] == "healthy", f"Expected status 'healthy', got: {data.get('status')}"
    assert data["service"] == "CiteVerify Backend API"
    assert len(data["academic_integrations"]) == 5, f"Expected 5 integrations, got: {data['academic_integrations']}"
    assert len(data["verification_taxonomy"]) == 6, f"Expected 6 taxonomy states, got: {data['verification_taxonomy']}"


@pytest.mark.asyncio
async def test_pdf_upload_and_verification(async_client, sample_pdf_path):
    """Verify document upload triggers full extraction and returns complete verification report."""
    with open(sample_pdf_path, "rb") as f:
        response = await async_client.post(
            "/api/v1/documents/upload",
            files={"file": ("test_paper.pdf", f, "application/pdf")},
        )

    assert response.status_code == 200, f"Upload failed: {response.text}"
    report = response.json()

    assert "document_id" in report, "Missing document_id in response"
    assert "test_paper.pdf" in report["filename"], f"Expected filename to contain 'test_paper.pdf', got: {report['filename']}"
    assert report["total_pages"] == 2
    assert len(report["claims"]) > 0, "No claims extracted from PDF"
    assert len(report["results"]) > 0, "No verification results generated"
    assert len(report["bibliography"]) > 0, "No references parsed"
    assert report["summary"]["total_claims"] == len(report["results"])


@pytest.mark.asyncio
async def test_human_review_workflow(async_client, uploaded_document):
    """Verify human reviewer can submit audit approval and persist notes into the audit trail."""
    doc_id = uploaded_document["document_id"]
    claim_id = uploaded_document["results"][0]["claim_id"]

    # Submit human review
    review_payload = {
        "decision": "confirmed",
        "notes": "Verified by researcher: matches Transformer architecture definition.",
        "reviewer_name": "Dr. Peer Reviewer",
    }
    review_res = await async_client.post(
        f"/api/v1/reviews/documents/{doc_id}/claims/{claim_id}",
        json=review_payload,
    )
    assert review_res.status_code == 200, f"Review submission failed: {review_res.text}"
    review_data = review_res.json()
    assert review_data["status"] == "success"
    assert review_data["decision"] == "confirmed"

    # Fetch document and confirm audit log is updated
    fetch_res = await async_client.get(f"/api/v1/documents/{doc_id}")
    assert fetch_res.status_code == 200
    fetched_doc = fetch_res.json()

    target_claim = next((r for r in fetched_doc["results"] if r["claim_id"] == claim_id), None)
    assert target_claim is not None, "Claim not found in fetched report"
    assert target_claim["review_status"] == "confirmed"
    assert "Transformer architecture" in target_claim["human_notes"]
    assert target_claim["reviewed_by"] == "Dr. Peer Reviewer"


@pytest.mark.asyncio
async def test_human_review_verdict_override(async_client, uploaded_document):
    """Verify human reviewer can override the automated verification status."""
    doc_id = uploaded_document["document_id"]
    # Pick a claim to override
    claim_id = uploaded_document["results"][-1]["claim_id"]

    # Submit override
    override_payload = {
        "decision": "overridden",
        "overridden_status": "supported",
        "notes": "Manual expert validation corroborates full methodology.",
        "reviewer_name": "Domain Expert",
    }
    review_res = await async_client.post(
        f"/api/v1/reviews/documents/{doc_id}/claims/{claim_id}",
        json=override_payload,
    )
    assert review_res.status_code == 200
    assert review_res.json()["updated_verdict"] == "supported"

    # Fetch document and verify updated status
    fetch_res = await async_client.get(f"/api/v1/documents/{doc_id}")
    assert fetch_res.status_code == 200
    target_claim = next((r for r in fetch_res.json()["results"] if r["claim_id"] == claim_id), None)
    assert target_claim["status"] == "supported"
    assert target_claim["review_status"] == "overridden"


@pytest.mark.asyncio
async def test_document_markdown_export(async_client, uploaded_document):
    """Verify Markdown audit export generation."""
    doc_id = uploaded_document["document_id"]

    export_res = await async_client.get(f"/api/v1/documents/{doc_id}/export")
    assert export_res.status_code == 200
    assert "text/markdown" in export_res.headers.get("content-type", "")
    assert "# CiteVerify Audit Report" in export_res.text
    assert "Verification Summary" in export_res.text
    assert "Scientific Claims & Evidence Audits" in export_res.text


@pytest.mark.asyncio
async def test_document_pdf_stream(async_client, uploaded_document):
    """Verify raw PDF endpoint serves the uploaded file."""
    doc_id = uploaded_document["document_id"]

    pdf_res = await async_client.get(f"/api/v1/documents/{doc_id}/pdf")
    assert pdf_res.status_code == 200
    assert "application/pdf" in pdf_res.headers.get("content-type", "")
    assert len(pdf_res.content) > 0


@pytest.mark.asyncio
async def test_list_documents(async_client, uploaded_document):
    """Verify document list endpoint lists uploaded research documents."""
    doc_id = uploaded_document["document_id"]

    list_res = await async_client.get("/api/v1/documents")
    assert list_res.status_code == 200
    docs = list_res.json()
    assert isinstance(docs, list)
    assert any(d["id"] == doc_id for d in docs), f"Document {doc_id} not found in listed documents"


@pytest.mark.asyncio
async def test_upload_invalid_file_rejected(async_client, tmp_path):
    """Verify that non-PDF uploads are rejected with HTTP 400."""
    txt_file = tmp_path / "test.txt"
    txt_file.write_text("Not a PDF file", encoding="utf-8")

    with open(txt_file, "rb") as f:
        response = await async_client.post(
            "/api/v1/documents/upload",
            files={"file": ("test.txt", f, "text/plain")},
        )

    assert response.status_code == 400
    assert "Only PDF files are supported" in response.json()["detail"]
