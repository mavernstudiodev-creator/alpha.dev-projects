"""
Document Upload and Retrieval Endpoints
"""

import os
import json
import uuid
import aiofiles
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from fastapi.responses import FileResponse, PlainTextResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.config import settings
from app.models.db_models import DocumentDB
from research_engine.pipeline import VerificationPipeline, DocumentVerificationReport

router = APIRouter(prefix="/documents", tags=["documents"])
pipeline = VerificationPipeline()


@router.post("/upload", response_model=DocumentVerificationReport)
async def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Upload an academic research PDF, extract claims & citations,
    resolve against academic databases, harvest evidence, and return verification report.
    """
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    doc_id = f"DOC-{uuid.uuid4().hex[:8].upper()}"
    filename = file.filename
    dest_path = os.path.join(settings.UPLOAD_DIR, f"{doc_id}_{filename}")

    try:
        async with aiofiles.open(dest_path, "wb") as buffer:
            while content := await file.read(1024 * 1024):  # 1MB chunks
                await buffer.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save uploaded file: {str(e)}")

    try:
        # Run verification pipeline
        report = await pipeline.process_pdf(dest_path, document_id=doc_id)

        # Store in database
        doc_record = DocumentDB(
            id=doc_id,
            filename=filename,
            file_path=dest_path,
            total_pages=report.total_pages,
            status="completed",
            report_json=report.model_dump_json(),
        )
        db.add(doc_record)
        db.commit()

        return report

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Verification pipeline failed: {str(e)}")


@router.get("/{doc_id}", response_model=DocumentVerificationReport)
def get_document_report(doc_id: str, db: Session = Depends(get_db)):
    """Fetch complete verification report for a document."""
    doc = db.query(DocumentDB).filter(DocumentDB.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    data = json.loads(doc.report_json)
    return DocumentVerificationReport(**data)


@router.get("/{doc_id}/pdf")
def get_document_pdf(doc_id: str, db: Session = Depends(get_db)):
    """Serve the raw PDF file for rendering in the interactive frontend viewer."""
    doc = db.query(DocumentDB).filter(DocumentDB.id == doc_id).first()
    if not doc or not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="PDF file not found.")

    return FileResponse(doc.file_path, media_type="application/pdf", filename=doc.filename)


@router.get("", response_model=List[Dict[str, Any]])
def list_documents(db: Session = Depends(get_db)):
    """List all analyzed research papers with summary metrics."""
    docs = db.query(DocumentDB).order_by(DocumentDB.uploaded_at.desc()).all()
    results = []
    for d in docs:
        try:
            report_data = json.loads(d.report_json)
            summary = report_data.get("summary", {})
        except Exception:
            summary = {}
        results.append({
            "id": d.id,
            "filename": d.filename,
            "total_pages": d.total_pages,
            "uploaded_at": d.uploaded_at.isoformat() if d.uploaded_at else None,
            "status": d.status,
            "summary": summary,
        })
    return results


@router.get("/{doc_id}/export")
def export_verification_markdown(doc_id: str, db: Session = Depends(get_db)):
    """Export verification report as clean Markdown."""
    doc = db.query(DocumentDB).filter(DocumentDB.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    report = DocumentVerificationReport(**json.loads(doc.report_json))

    md = [
        f"# CiteVerify Audit Report: {report.filename}",
        f"**Document ID:** `{report.document_id}` | **Pages:** {report.total_pages}",
        "",
        "## Verification Summary",
        f"- **Total Claims Evaluated:** {report.summary.total_claims}",
        f"- **Supported:** {report.summary.supported}",
        f"- **Partially Supported:** {report.summary.partially_supported}",
        f"- **Unsupported:** {report.summary.unsupported}",
        f"- **Contradictory:** {report.summary.contradictory}",
        f"- **Possibly Outdated:** {report.summary.possibly_outdated}",
        f"- **Insufficient Evidence (Abstention):** {report.summary.insufficient_evidence}",
        "",
        "---",
        "## Scientific Claims & Evidence Audits",
    ]

    for idx, r in enumerate(report.results, 1):
        md.append(f"\n### {idx}. [{r.status.value.upper()}] Claim {r.claim_id}")
        md.append(f"> **Statement:** \"{r.claim_statement}\"")
        md.append(f"\n- **Confidence:** {r.confidence_score * 100:.1f}%")
        md.append(f"- **Explanation:** {r.explanation}")
        if r.evidence_items:
            md.append("\n**Retrieved Source Evidence:**")
            for ev in r.evidence_items:
                md.append(f"- **Source:** *{ev.source_work_title}* (`{ev.source_database}`)")
                if ev.source_doi:
                    md.append(f"  - DOI: https://doi.org/{ev.source_doi}")
                md.append(f"  - Type: `{ev.evidence_type.value}` | Relevance: {ev.relevance_score * 100:.1f}%")
                md.append(f"  - Excerpt: \"{ev.passage_text}\"")

    return PlainTextResponse("\n".join(md), media_type="text/markdown")
