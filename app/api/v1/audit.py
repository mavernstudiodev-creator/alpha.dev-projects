"""
System Audit Trail Endpoints
Inspect immutable historical logs of document processing, claim overrides,
and verification milestones.
"""

import json
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.db_models import AuditEventDB

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("", response_model=List[Dict[str, Any]])
def list_audit_events(
    entity_type: Optional[str] = Query(None, description="Filter by entity type (document, claim, review, assistant)"),
    entity_id: Optional[str] = Query(None, description="Filter by specific entity ID"),
    action: Optional[str] = Query(None, description="Filter by action name"),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    """Query system-wide audit event trail."""
    query = db.query(AuditEventDB)
    if entity_type:
        query = query.filter(AuditEventDB.entity_type == entity_type)
    if entity_id:
        query = query.filter(AuditEventDB.entity_id == entity_id)
    if action:
        query = query.filter(AuditEventDB.action == action)

    events = query.order_by(AuditEventDB.created_at.desc()).limit(limit).all()
    results = []
    for e in events:
        try:
            details = json.loads(e.details_json) if e.details_json else {}
        except Exception:
            details = {"raw": e.details_json}

        results.append({
            "id": e.id,
            "entity_type": e.entity_type,
            "entity_id": e.entity_id,
            "action": e.action,
            "actor": e.actor,
            "details": details,
            "created_at": e.created_at.isoformat() if e.created_at else None,
        })
    return results


@router.get("/documents/{doc_id}")
def get_document_audit_trail(doc_id: str, db: Session = Depends(get_db)):
    """Retrieve complete chronological audit log for a specific document."""
    events = (
        db.query(AuditEventDB)
        .filter(
            (AuditEventDB.entity_id == doc_id) |
            (AuditEventDB.details_json.like(f"%{doc_id}%"))
        )
        .order_by(AuditEventDB.created_at.asc())
        .all()
    )

    trail = []
    for e in events:
        try:
            details = json.loads(e.details_json) if e.details_json else {}
        except Exception:
            details = {"raw": e.details_json}
        trail.append({
            "id": e.id,
            "action": e.action,
            "entity_type": e.entity_type,
            "entity_id": e.entity_id,
            "actor": e.actor,
            "details": details,
            "timestamp": e.created_at.isoformat() if e.created_at else None,
        })

    return {
        "document_id": doc_id,
        "total_events": len(trail),
        "events": trail,
    }
