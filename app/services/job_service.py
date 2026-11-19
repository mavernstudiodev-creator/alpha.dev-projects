"""
Asynchronous Background Job Processing Service for CiteVerify
Tracks durable job progress in SQLite/PostgreSQL, offloads pipeline execution,
and records comprehensive audit events.
"""

import os
import time
import json
import uuid
import logging
from datetime import datetime
from typing import Optional
import httpx
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.db_models import DocumentDB, ProcessingJobDB, AuditEventDB
from research_engine.pipeline import VerificationPipeline, DocumentVerificationReport

logger = logging.getLogger(__name__)


class JobService:
    """Manages document processing jobs, durable status persistence, and background execution."""

    @staticmethod
    def create_job(db: Session, document_id: str) -> ProcessingJobDB:
        """Create a new pending processing job."""
        job_id = f"JOB-{uuid.uuid4().hex[:8].upper()}"
        job = ProcessingJobDB(
            id=job_id,
            document_id=document_id,
            status="pending",
            stage="init",
            progress_percent=0,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(job)

        audit = AuditEventDB(
            id=f"AUD-{uuid.uuid4().hex[:8].upper()}",
            entity_type="document",
            entity_id=document_id,
            action="verify_start",
            actor="system",
            details_json=json.dumps({"job_id": job_id, "status": "pending"}),
            created_at=datetime.utcnow(),
        )
        db.add(audit)
        db.commit()
        db.refresh(job)
        return job

    @staticmethod
    def get_job(db: Session, job_id: str) -> Optional[ProcessingJobDB]:
        """Fetch processing job by ID."""
        return db.query(ProcessingJobDB).filter(ProcessingJobDB.id == job_id).first()

    @staticmethod
    def get_job_by_document(db: Session, doc_id: str) -> Optional[ProcessingJobDB]:
        """Fetch the latest processing job for a document."""
        return (
            db.query(ProcessingJobDB)
            .filter(ProcessingJobDB.document_id == doc_id)
            .order_by(ProcessingJobDB.created_at.desc())
            .first()
        )

    @staticmethod
    async def execute_verification_job(
        job_id: str,
        document_id: str,
        file_path: str,
        pipeline: VerificationPipeline,
        http_client: Optional[httpx.AsyncClient] = None,
        session_factory=None,
    ):
        """
        Background task execution.
        Safely opens independent DB session, tracks progress across all stages,
        stores the verified report or records error state, and logs audit events.
        """
        make_session = session_factory or SessionLocal
        db = make_session()
        try:
            job = db.query(ProcessingJobDB).filter(ProcessingJobDB.id == job_id).first()
            doc = db.query(DocumentDB).filter(DocumentDB.id == document_id).first()

            if not job or not doc:
                logger.error("Job %s or Document %s not found in DB", job_id, document_id)
                return

            job.status = "processing"
            job.stage = "init"
            job.progress_percent = 5
            job.updated_at = datetime.utcnow()
            doc.status = "processing"
            db.commit()

            # Progress callback for pipeline stages
            def _on_progress(stage: str, percent: int, msg: str):
                try:
                    with make_session() as sub_db:
                        j = sub_db.query(ProcessingJobDB).filter(ProcessingJobDB.id == job_id).first()
                        if j:
                            j.stage = stage
                            j.progress_percent = percent
                            j.updated_at = datetime.utcnow()
                            sub_db.commit()
                except Exception as ex:
                    logger.debug("Failed updating progress in callback: %s", ex)

            # Execute pipeline
            report: DocumentVerificationReport = await pipeline.process_pdf(
                file_path=file_path,
                document_id=document_id,
                http_client=http_client,
                progress_callback=_on_progress,
            )

            # Store completed verification report
            doc.total_pages = report.total_pages
            doc.status = "completed"
            doc.error_message = None
            doc.report_json = report.model_dump_json()

            job.status = "completed"
            job.stage = "completed"
            job.progress_percent = 100
            job.completed_at = datetime.utcnow()
            job.updated_at = datetime.utcnow()

            audit = AuditEventDB(
                id=f"AUD-{uuid.uuid4().hex[:8].upper()}",
                entity_type="document",
                entity_id=document_id,
                action="verify_complete",
                actor="system",
                details_json=json.dumps({
                    "job_id": job_id,
                    "total_claims": report.summary.total_claims,
                    "supported": report.summary.supported,
                    "partially_supported": report.summary.partially_supported,
                    "unsupported": report.summary.unsupported,
                    "contradictory": report.summary.contradictory,
                    "possibly_outdated": report.summary.possibly_outdated,
                    "insufficient_evidence": report.summary.insufficient_evidence,
                    "processing_time_seconds": report.summary.processing_time_seconds,
                }),
                created_at=datetime.utcnow(),
            )
            db.add(audit)
            db.commit()
            logger.info("[%s] Verification job %s finished successfully", document_id, job_id)

        except Exception as e:
            logger.exception("[%s] Verification job %s failed: %s", document_id, job_id, e)
            try:
                job = db.query(ProcessingJobDB).filter(ProcessingJobDB.id == job_id).first()
                doc = db.query(DocumentDB).filter(DocumentDB.id == document_id).first()
                if job:
                    job.status = "failed"
                    job.stage = "failed"
                    job.error_message = str(e)
                    job.completed_at = datetime.utcnow()
                    job.updated_at = datetime.utcnow()
                if doc:
                    doc.status = "failed"
                    doc.error_message = str(e)

                audit = AuditEventDB(
                    id=f"AUD-{uuid.uuid4().hex[:8].upper()}",
                    entity_type="document",
                    entity_id=document_id,
                    action="verify_fail",
                    actor="system",
                    details_json=json.dumps({"job_id": job_id, "error": str(e)}),
                    created_at=datetime.utcnow(),
                )
                db.add(audit)
                db.commit()
            except Exception as inner_e:
                logger.error("Failed saving job error state: %s", inner_e)
        finally:
            db.close()
