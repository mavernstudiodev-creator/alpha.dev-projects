"""
Human Review & Audit Trail Endpoints
Supports expert review confirmation, verdict override, reviewer notes,
audit logging, and full review history inspection.
"""

import json
import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.db_models import DocumentDB, HumanReviewDB, AuditEventDB
from research_engine.core.models import ReviewStatus, VerificationStatus

router = APIRouter(prefix="/reviews", tags=["reviews"])


class ReviewSubmission(BaseModel):
    decision: ReviewStatus = Field(..., description="confirmed, overridden, or flagged")
    overridden_status: Optional[VerificationStatus] = None
    notes: Optional[str] = None
    reviewer_name: Optional[str] = "Researcher / Hackathon Judge"


@router.post("/documents/{doc_id}/claims/{claim_id}")
def submit_human_review(
    doc_id: str,
    claim_id: str,
    review: ReviewSubmission,
    db: Session = Depends(get_db)
):
    """
    Submit a human-in-the-loop review decision for an extracted claim.
    Preserves original system assessment while updating active status.
    """
    doc = db.query(DocumentDB).filter(DocumentDB.id == doc_id).first()
    if not doc or not doc.report_json:
        raise HTTPException(status_code=404, detail="Document not found.")

    report_dict = json.loads(doc.report_json)
    claim_found = False
    original_verdict = None

    for result in report_dict.get("results", []):
        if result.get("claim_id") == claim_id:
            claim_found = True
            original_verdict = result.get("status")
            result["review_status"] = review.decision.value
            result["human_notes"] = review.notes
            result["reviewed_by"] = review.reviewer_name
            if review.decision == ReviewStatus.OVERRIDDEN and review.overridden_status:
                result["status"] = review.overridden_status.value
            break

    if not claim_found:
        raise HTTPException(status_code=404, detail="Claim not found in document.")

    # Save to review audit log
    review_record = HumanReviewDB(
        id=f"REV-{uuid.uuid4().hex[:8].upper()}",
        document_id=doc_id,
        claim_id=claim_id,
        original_verdict=original_verdict,
        decision=review.decision.value,
        overridden_status=review.overridden_status.value if review.overridden_status else None,
        notes=review.notes,
        reviewed_at=datetime.utcnow(),
        reviewer_name=review.reviewer_name or "Anonymous Reviewer",
    )
    db.add(review_record)

    # Record persistent audit event
    audit_action = "verdict_override" if review.decision == ReviewStatus.OVERRIDDEN else "review_submit"
    audit_record = AuditEventDB(
        id=f"AUD-{uuid.uuid4().hex[:8].upper()}",
        entity_type="claim",
        entity_id=claim_id,
        action=audit_action,
        actor=review.reviewer_name or "Anonymous Reviewer",
        details_json=json.dumps({
            "document_id": doc_id,
            "claim_id": claim_id,
            "decision": review.decision.value,
            "original_verdict": original_verdict,
            "overridden_status": review.overridden_status.value if review.overridden_status else None,
            "notes": review.notes,
        }),
        created_at=datetime.utcnow(),
    )
    db.add(audit_record)

    doc.report_json = json.dumps(report_dict)
    db.commit()

    return {
        "status": "success",
        "review_id": review_record.id,
        "document_id": doc_id,
        "claim_id": claim_id,
        "original_verdict": original_verdict,
        "decision": review.decision.value,
        "updated_verdict": review.overridden_status.value if review.overridden_status else original_verdict,
    }


@router.get("/documents/{doc_id}")
def get_document_reviews(doc_id: str, db: Session = Depends(get_db)):
    """Retrieve all human review decisions recorded for a document."""
    reviews = (
        db.query(HumanReviewDB)
        .filter(HumanReviewDB.document_id == doc_id)
        .order_by(HumanReviewDB.reviewed_at.desc())
        .all()
    )
    return [
        {
            "id": r.id,
            "document_id": r.document_id,
            "claim_id": r.claim_id,
            "original_verdict": r.original_verdict,
            "decision": r.decision,
            "overridden_status": r.overridden_status,
            "notes": r.notes,
            "reviewed_at": r.reviewed_at.isoformat() if r.reviewed_at else None,
            "reviewer_name": r.reviewer_name,
        }
        for r in reviews
    ]


@router.get("/documents/{doc_id}/claims/{claim_id}")
def get_claim_review_history(doc_id: str, claim_id: str, db: Session = Depends(get_db)):
    """Retrieve full chronological human review history for a specific claim."""
    reviews = (
        db.query(HumanReviewDB)
        .filter(HumanReviewDB.document_id == doc_id, HumanReviewDB.claim_id == claim_id)
        .order_by(HumanReviewDB.reviewed_at.asc())
        .all()
    )
    return [
        {
            "id": r.id,
            "original_verdict": r.original_verdict,
            "decision": r.decision,
            "overridden_status": r.overridden_status,
            "notes": r.notes,
            "reviewed_at": r.reviewed_at.isoformat() if r.reviewed_at else None,
            "reviewer_name": r.reviewer_name,
        }
        for r in reviews
    ]
