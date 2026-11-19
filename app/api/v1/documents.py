"""
Document Upload, Retrieval, Inspection, and Export Endpoints
Supports synchronous and background verification, file validation,
claims/citations/evidence extraction, and Markdown & PDF exports.
"""

import os
import json
import uuid
import time
import hashlib
import logging
import aiofiles
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Request, Query, BackgroundTasks, status
from fastapi.responses import FileResponse, PlainTextResponse, Response, JSONResponse
from sqlalchemy.orm import Session

from app.core.database import get_db, SessionLocal
from app.core.config import settings
from app.models.db_models import DocumentDB, ProcessingJobDB, AuditEventDB
from research_engine.pipeline import VerificationPipeline, DocumentVerificationReport
from research_engine.extractor.pdf_extractor import PDFExtractionError, ScannedPDFError
from app.services.report_generator import ReportGenerator
from app.services.job_service import JobService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/documents", tags=["documents"])
pipeline = VerificationPipeline(pdf_cache_size=settings.PDF_CACHE_MAX_ENTRIES)


@router.post("/upload")
async def upload_document(
    request: Request,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    background: bool = Query(False, description="When true, enqueues verification as background job returning HTTP 202"),
    db: Session = Depends(get_db)
):
    """
    Upload an academic research PDF, validate integrity, and verify claims.
    Supports immediate synchronous verification or durable background execution.
    """
    upload_start = time.perf_counter()

    # 1. Validate file extension
    filename = file.filename or "unknown.pdf"
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are supported. Please upload a valid .pdf document.",
        )

    # 2. Stream and validate file size & magic bytes
    doc_id = f"DOC-{uuid.uuid4().hex[:8].upper()}"
    dest_path = os.path.join(settings.UPLOAD_DIR, f"{doc_id}_{filename}")
    hasher = hashlib.sha256()
    total_bytes = 0
    first_chunk = True

    try:
        async with aiofiles.open(dest_path, "wb") as buffer:
            while chunk := await file.read(1024 * 1024):  # 1MB chunks
                if first_chunk:
                    # Validate PDF magic header '%PDF-'
                    if len(chunk) < 5 or not chunk.startswith(b"%PDF-"):
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Invalid PDF format: file header does not match PDF signature.",
                        )
                    first_chunk = False

                total_bytes += len(chunk)
                if total_bytes > settings.MAX_UPLOAD_SIZE_BYTES:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_BYTES // (1024 * 1024)} MB.",
                    )

                hasher.update(chunk)
                await buffer.write(chunk)

        if total_bytes == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is completely empty (0 bytes).",
            )

    except HTTPException:
        # Clean up partial upload
        if os.path.exists(dest_path):
            os.remove(dest_path)
        raise
    except Exception as e:
        if os.path.exists(dest_path):
            os.remove(dest_path)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to save file: {str(e)}")

    file_hash = hasher.hexdigest()

    # Check for existing completed document with identical SHA-256 hash
    existing_doc = (
        db.query(DocumentDB)
        .filter(DocumentDB.file_hash == file_hash, DocumentDB.status == "completed")
        .order_by(DocumentDB.uploaded_at.desc())
        .first()
    )
    if existing_doc and existing_doc.report_json:
        logger.info("Deduplication: Reusing completed verification for %s (hash: %s)", existing_doc.id, file_hash)
        if os.path.exists(dest_path):
            try:
                os.remove(dest_path)
            except Exception:
                pass

        audit_dedup = AuditEventDB(
            id=f"AUD-{uuid.uuid4().hex[:8].upper()}",
            entity_type="document",
            entity_id=existing_doc.id,
            action="upload_deduplicated",
            actor="system",
            details_json=json.dumps({"reused_document_id": existing_doc.id, "filename": filename, "file_hash": file_hash}),
        )
        db.add(audit_dedup)
        db.commit()

        if background:
            return JSONResponse(
                status_code=status.HTTP_200_OK,
                content={
                    "job_id": f"DEDUP-{existing_doc.id}",
                    "document_id": existing_doc.id,
                    "filename": existing_doc.filename,
                    "status": "completed",
                    "message": "Document already processed and verified.",
                },
            )
        else:
            report_dict = json.loads(existing_doc.report_json)
            report_dict["filename"] = filename or existing_doc.filename
            return DocumentVerificationReport(**report_dict)

    # 3. Create initial Document record
    doc_record = DocumentDB(
        id=doc_id,
        filename=filename,
        file_path=dest_path,
        file_hash=file_hash,
        file_size_bytes=total_bytes,
        total_pages=0,
        status="pending" if background else "processing",
        report_json=None,
    )
    db.add(doc_record)

    audit_entry = AuditEventDB(
        id=f"AUD-{uuid.uuid4().hex[:8].upper()}",
        entity_type="document",
        entity_id=doc_id,
        action="upload",
        actor="system",
        details_json=json.dumps({"filename": filename, "file_size": total_bytes, "file_hash": file_hash}),
    )
    db.add(audit_entry)
    db.commit()

    shared_client = getattr(request.app.state, "http_client", None)

    # 4. Asynchronous Background Execution Branch
    if background:
        job = JobService.create_job(db, document_id=doc_id)
        session_factory = request.app.dependency_overrides.get(get_db, SessionLocal)
        background_tasks.add_task(
            JobService.execute_verification_job,
            job_id=job.id,
            document_id=doc_id,
            file_path=dest_path,
            pipeline=pipeline,
            http_client=shared_client,
            session_factory=session_factory,
        )
        return JSONResponse(
            status_code=status.HTTP_202_ACCEPTED,
            content={
                "job_id": job.id,
                "document_id": doc_id,
                "filename": filename,
                "status": "pending",
                "message": "Document verification queued for asynchronous background processing.",
            },
        )

    # 5. Synchronous Execution Branch (Backwards Compatible with existing test suite)
    try:
        report = await pipeline.process_pdf(
            dest_path,
            document_id=doc_id,
            original_filename=filename,
            http_client=shared_client,
        )

        doc_record.total_pages = report.total_pages
        doc_record.status = "completed"
        doc_record.error_message = None
        doc_record.report_json = report.model_dump_json()

        audit_complete = AuditEventDB(
            id=f"AUD-{uuid.uuid4().hex[:8].upper()}",
            entity_type="document",
            entity_id=doc_id,
            action="verify_complete",
            actor="system",
            details_json=json.dumps({
                "total_claims": report.summary.total_claims,
                "supported": report.summary.supported,
                "processing_time": report.summary.processing_time_seconds,
            }),
        )
        db.add(audit_complete)
        db.commit()

        upload_duration = time.perf_counter() - upload_start
        logger.info("[%s] Total upload request processed in %.2f s", doc_id, upload_duration)
        return report

    except ScannedPDFError as se:
        doc_record.status = "failed"
        doc_record.error_message = str(se)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(se),
        )
    except PDFExtractionError as pe:
        doc_record.status = "failed"
        doc_record.error_message = str(pe)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(pe),
        )
    except Exception as e:
        doc_record.status = "failed"
        doc_record.error_message = str(e)
        db.commit()
        logger.exception("[%s] Verification pipeline failed: %s", doc_id, e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Verification pipeline failed: {str(e)}",
        )


@router.post("/upload-async", status_code=status.HTTP_202_ACCEPTED)
async def upload_document_async(
    request: Request,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Explicit endpoint for non-blocking asynchronous PDF upload and verification."""
    return await upload_document(
        request=request,
        background_tasks=background_tasks,
        file=file,
        background=True,
        db=db,
    )


@router.get("", response_model=List[Dict[str, Any]])
def list_documents(db: Session = Depends(get_db)):
    """List all analyzed research papers with summary metrics."""
    docs = db.query(DocumentDB).order_by(DocumentDB.uploaded_at.desc()).all()
    results = []
    for d in docs:
        try:
            report_data = json.loads(d.report_json) if d.report_json else {}
            summary = report_data.get("summary", {})
        except Exception:
            summary = {}
        results.append({
            "id": d.id,
            "filename": d.filename,
            "total_pages": d.total_pages,
            "uploaded_at": d.uploaded_at.isoformat() if d.uploaded_at else None,
            "status": d.status,
            "error_message": d.error_message,
            "summary": summary,
        })
    return results


@router.get("/{doc_id}")
def get_document_report(doc_id: str, db: Session = Depends(get_db)):
    """Fetch complete verification report for a document."""
    doc = db.query(DocumentDB).filter(DocumentDB.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    if doc.status == "processing" or doc.status == "pending":
        return JSONResponse(
            status_code=status.HTTP_202_ACCEPTED,
            content={
                "document_id": doc.id,
                "status": doc.status,
                "message": "Document is currently being processed by the research pipeline.",
            },
        )

    if doc.status == "failed":
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Document verification failed: {doc.error_message}",
        )

    if not doc.report_json:
        raise HTTPException(status_code=404, detail="Document report data is not available.")

    data = json.loads(doc.report_json)
    return DocumentVerificationReport(**data)


@router.get("/{doc_id}/status")
def get_document_status(doc_id: str, db: Session = Depends(get_db)):
    """Retrieve document processing status, progress percentage, and error details."""
    doc = db.query(DocumentDB).filter(DocumentDB.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    latest_job = JobService.get_job_by_document(db, doc_id)

    return {
        "document_id": doc.id,
        "filename": doc.filename,
        "status": doc.status,
        "total_pages": doc.total_pages,
        "uploaded_at": doc.uploaded_at.isoformat() if doc.uploaded_at else None,
        "error_message": doc.error_message,
        "job": {
            "id": latest_job.id if latest_job else None,
            "status": latest_job.status if latest_job else doc.status,
            "stage": latest_job.stage if latest_job else ("completed" if doc.status == "completed" else "init"),
            "progress_percent": latest_job.progress_percent if latest_job else (100 if doc.status == "completed" else 0),
            "updated_at": latest_job.updated_at.isoformat() if latest_job and latest_job.updated_at else None,
        } if latest_job else None,
    }


@router.get("/{doc_id}/claims")
def get_document_claims(doc_id: str, db: Session = Depends(get_db)):
    """Retrieve extracted scientific claims, linked citations, and verification statuses."""
    doc = db.query(DocumentDB).filter(DocumentDB.id == doc_id).first()
    if not doc or not doc.report_json:
        raise HTTPException(status_code=404, detail="Document or verification data not found.")

    report_data = json.loads(doc.report_json)
    return {
        "document_id": doc.id,
        "total_claims": len(report_data.get("claims", [])),
        "claims": report_data.get("claims", []),
        "results": report_data.get("results", []),
    }


@router.get("/{doc_id}/citations")
def get_document_citations(doc_id: str, db: Session = Depends(get_db)):
    """Retrieve extracted bibliography entries and academic resolution metadata."""
    doc = db.query(DocumentDB).filter(DocumentDB.id == doc_id).first()
    if not doc or not doc.report_json:
        raise HTTPException(status_code=404, detail="Document or verification data not found.")

    report_data = json.loads(doc.report_json)
    return {
        "document_id": doc.id,
        "total_citations": len(report_data.get("bibliography", [])),
        "bibliography": report_data.get("bibliography", []),
    }


@router.get("/{doc_id}/evidence")
def get_document_evidence(doc_id: str, db: Session = Depends(get_db)):
    """Retrieve all harvested research evidence passages grouped by claim."""
    doc = db.query(DocumentDB).filter(DocumentDB.id == doc_id).first()
    if not doc or not doc.report_json:
        raise HTTPException(status_code=404, detail="Document or verification data not found.")

    report_data = json.loads(doc.report_json)
    results = report_data.get("results", [])

    evidence_by_claim = []
    total_passages = 0
    for r in results:
        items = r.get("evidence_items", [])
        total_passages += len(items)
        evidence_by_claim.append({
            "claim_id": r.get("claim_id"),
            "claim_statement": r.get("claim_statement"),
            "status": r.get("status"),
            "confidence_score": r.get("confidence_score"),
            "evidence_items": items,
        })

    return {
        "document_id": doc.id,
        "total_evidence_passages": total_passages,
        "claims_with_evidence": evidence_by_claim,
    }


@router.get("/{doc_id}/pdf")
def get_document_pdf(doc_id: str, db: Session = Depends(get_db)):
    """Serve the raw PDF file for rendering in the interactive frontend viewer."""
    doc = db.query(DocumentDB).filter(DocumentDB.id == doc_id).first()
    if not doc or not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="PDF file not found.")

    # This endpoint is embedded by PdfViewer's <object>. Keep it inline so the
    # browser renders the manuscript instead of treating every view request as
    # a fresh download. The explicit UI download link still downloads on click.
    return FileResponse(
        doc.file_path,
        media_type="application/pdf",
        filename=doc.filename,
        content_disposition_type="inline",
    )


@router.get("/{doc_id}/export")
def export_verification_report(
    doc_id: str,
    format: str = Query("markdown", pattern="^(markdown|pdf)$", description="Report format: markdown or pdf"),
    db: Session = Depends(get_db)
):
    """Export complete verification audit report as Markdown or PDF."""
    doc = db.query(DocumentDB).filter(DocumentDB.id == doc_id).first()
    if not doc or not doc.report_json:
        raise HTTPException(status_code=404, detail="Document not found or verification incomplete.")

    report = DocumentVerificationReport(**json.loads(doc.report_json))

    audit = AuditEventDB(
        id=f"AUD-{uuid.uuid4().hex[:8].upper()}",
        entity_type="document",
        entity_id=doc_id,
        action=f"export_{format}",
        actor="user",
        details_json=json.dumps({"format": format}),
    )
    db.add(audit)
    db.commit()

    if format == "pdf":
        pdf_bytes = ReportGenerator.generate_pdf(report)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"inline; filename=CiteVerify_Audit_{doc_id}.pdf"},
        )
    else:
        md_text = ReportGenerator.generate_markdown(report)
        return PlainTextResponse(md_text, media_type="text/markdown")


@router.get("/{doc_id}/export/markdown")
def export_verification_markdown(doc_id: str, db: Session = Depends(get_db)):
    """Explicit endpoint for exporting Markdown audit report."""
    return export_verification_report(doc_id=doc_id, format="markdown", db=db)


@router.get("/{doc_id}/export/pdf")
def export_verification_pdf(doc_id: str, db: Session = Depends(get_db)):
    """Explicit endpoint for exporting formatted PDF audit report."""
    return export_verification_report(doc_id=doc_id, format="pdf", db=db)
