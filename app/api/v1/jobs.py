"""
Asynchronous Processing Job Endpoints
Enables clients to poll durable job progress, stage breakdowns, and completion status.
"""

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.db_models import ProcessingJobDB
from app.services.job_service import JobService

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("/{job_id}")
def get_job_status(job_id: str, db: Session = Depends(get_db)):
    """Retrieve durable background processing status for a job."""
    job = JobService.get_job(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    return {
        "job_id": job.id,
        "document_id": job.document_id,
        "status": job.status,
        "stage": job.stage,
        "progress_percent": job.progress_percent,
        "error_message": job.error_message,
        "created_at": job.created_at.isoformat() if job.created_at else None,
        "updated_at": job.updated_at.isoformat() if job.updated_at else None,
        "completed_at": job.completed_at.isoformat() if job.completed_at else None,
    }


@router.get("", response_model=List[Dict[str, Any]])
def list_jobs(limit: int = 50, db: Session = Depends(get_db)):
    """List recent verification jobs."""
    jobs = (
        db.query(ProcessingJobDB)
        .order_by(ProcessingJobDB.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "job_id": j.id,
            "document_id": j.document_id,
            "status": j.status,
            "stage": j.stage,
            "progress_percent": j.progress_percent,
            "error_message": j.error_message,
            "created_at": j.created_at.isoformat() if j.created_at else None,
            "completed_at": j.completed_at.isoformat() if j.completed_at else None,
        }
        for j in jobs
    ]
