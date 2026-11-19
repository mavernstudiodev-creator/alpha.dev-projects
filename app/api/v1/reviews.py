"""
Human Review & Audit Trail Endpoints
"""

import json
import uuid
from typing import Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.db_models import DocumentDB, HumanReviewDB
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
    """Submit a human-in-the-loop review decision for an extracted claim."""
    doc = db.query(DocumentDB).filter(DocumentDB.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    # Save to review audit log
    review_record = HumanReviewDB(
        id=f"REV-{uuid.uuid4().hex[:8].upper()}",
        document_id=doc_id,
        claim_id=claim_id,
        decision=review.decision.value,
        overridden_status=review.overridden_status.value if review.overridden_status else None,
        notes=review.notes,
        reviewer_name=review.reviewer_name or "Anonymous Reviewer",
    )
    db.add(review_record)

    # Update document report JSON in-place
    report_dict = json.loads(doc.report_json)
    claim_found = False

    for result in report_dict.get("results", []):
        if result.get("claim_id") == claim_id:
            claim_found = True
            result["review_status"] = review.decision.value
            result["human_notes"] = review.notes
            result["reviewed_by"] = review.reviewer_name
            if review.decision == ReviewStatus.OVERRIDDEN and review.overridden_status:
                result["status"] = review.overridden_status.value
            break

    if not claim_found:
        raise HTTPException(status_code=404, detail="Claim not found in document.")

    doc.report_json = json.dumps(report_dict)
    db.commit()

    return {
        "status": "success",
        "review_id": review_record.id,
        "claim_id": claim_id,
        "decision": review.decision.value,
        "updated_verdict": review.overridden_status.value if review.overridden_status else None,
    }
