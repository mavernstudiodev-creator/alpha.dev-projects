"""
NVIDIA AI Research Assistant API Router
Provides conversation management, grounded scientific Q&A (RAG),
SSE token streaming, verdict explanations, and multi-source academic search.
"""

import json
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, Request, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.config import settings
from app.models.db_models import AIConversationDB, AIMessageDB
from app.services.nvidia_assistant import NvidiaAssistantService
from research_engine.resolver.meta_resolver import MetaResolver

router = APIRouter(prefix="/assistant", tags=["assistant"])
assistant_service = NvidiaAssistantService()
meta_resolver = MetaResolver()


# -----------------------------------------------------------------
# Request / Response Schemas
# -----------------------------------------------------------------

class CreateConversationRequest(BaseModel):
    title: Optional[str] = Field(None, description="Custom conversation title")
    document_id: Optional[str] = Field(None, description="Optional associated research document ID")


class RenameConversationRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=255, description="New title")


class SendMessageRequest(BaseModel):
    query: str = Field(..., min_length=1, description="Question or research prompt")
    target_claim_id: Optional[str] = Field(None, description="Optional specific claim ID to focus context")


class ExplainClaimRequest(BaseModel):
    document_id: str = Field(..., description="Target document ID")
    claim_id: str = Field(..., description="Target claim ID to explain")


class AnalyzeEvidenceRequest(BaseModel):
    document_id: str = Field(..., description="Target document ID")
    claim_id: str = Field(..., description="Claim ID to analyze for evidence gaps")


class SearchResearchRequest(BaseModel):
    query: str = Field(..., min_length=2, description="Search terms, keywords, or paper title")
    limit: int = Field(5, ge=1, le=10, description="Max results per provider")


# -----------------------------------------------------------------
# Conversation Lifecycle Endpoints
# -----------------------------------------------------------------

@router.post("/conversations", status_code=status.HTTP_201_CREATED)
def create_conversation(req: CreateConversationRequest, db: Session = Depends(get_db)):
    """Create a new conversational research session linked to a paper."""
    conv = assistant_service.create_conversation(
        db=db,
        title=req.title,
        document_id=req.document_id,
    )
    return {
        "conversation_id": conv.id,
        "title": conv.title,
        "document_id": conv.document_id,
        "created_at": conv.created_at.isoformat(),
        "model": settings.NVIDIA_MODEL,
    }


@router.get("/conversations")
def list_conversations(
    document_id: Optional[str] = Query(None, description="Filter by document ID"),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """List research conversations."""
    conversations = assistant_service.list_conversations(db, document_id=document_id, limit=limit)
    return [
        {
            "id": c.id,
            "title": c.title,
            "document_id": c.document_id,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "updated_at": c.updated_at.isoformat() if c.updated_at else None,
        }
        for c in conversations
    ]


@router.get("/conversations/{conversation_id}")
def get_conversation(conversation_id: str, db: Session = Depends(get_db)):
    """Retrieve conversation details and chronological message history."""
    conv = assistant_service.get_conversation(db, conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")

    history = assistant_service.get_conversation_history(db, conversation_id)
    messages = []
    for m in history:
        sources = None
        if m.context_sources_json:
            try:
                sources = json.loads(m.context_sources_json)
            except Exception:
                sources = []
        messages.append({
            "id": m.id,
            "role": m.role,
            "content": m.content,
            "sources": sources,
            "created_at": m.created_at.isoformat() if m.created_at else None,
        })

    return {
        "id": conv.id,
        "title": conv.title,
        "document_id": conv.document_id,
        "model": settings.NVIDIA_MODEL,
        "created_at": conv.created_at.isoformat() if conv.created_at else None,
        "updated_at": conv.updated_at.isoformat() if conv.updated_at else None,
        "messages": messages,
    }


@router.patch("/conversations/{conversation_id}")
def rename_conversation(
    conversation_id: str,
    req: RenameConversationRequest,
    db: Session = Depends(get_db)
):
    """Rename a conversation title."""
    conv = assistant_service.rename_conversation(db, conversation_id, req.title)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    return {
        "id": conv.id,
        "title": conv.title,
        "updated_at": conv.updated_at.isoformat() if conv.updated_at else None,
    }


@router.delete("/conversations/{conversation_id}")
def delete_conversation(conversation_id: str, db: Session = Depends(get_db)):
    """Delete a conversation and its messages."""
    success = assistant_service.delete_conversation(db, conversation_id)
    if not success:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    return {"status": "success", "deleted_conversation_id": conversation_id}


# -----------------------------------------------------------------
# Chat & RAG Messaging Endpoints
# -----------------------------------------------------------------

@router.post("/conversations/{conversation_id}/messages")
async def send_message(
    conversation_id: str,
    req: SendMessageRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Send a question to the NVIDIA Research Assistant.
    Retrieves grounded evidence from the document and returns an evidence-backed answer.
    """
    shared_client = getattr(request.app.state, "http_client", None)
    try:
        response = await assistant_service.answer_question(
            db=db,
            conversation_id=conversation_id,
            user_query=req.query,
            target_claim_id=req.target_claim_id,
            http_client=shared_client,
        )
        return response
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Assistant failed: {str(e)}")


@router.post("/conversations/{conversation_id}/messages/stream")
async def stream_message(
    conversation_id: str,
    req: SendMessageRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Stream answer tokens from NVIDIA Nemotron formatted as Server-Sent Events (SSE).
    """
    shared_client = getattr(request.app.state, "http_client", None)
    generator = assistant_service.stream_answer(
        db=db,
        conversation_id=conversation_id,
        user_query=req.query,
        target_claim_id=req.target_claim_id,
        http_client=shared_client,
    )
    return StreamingResponse(
        generator,
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# -----------------------------------------------------------------
# Specialized Research Operations
# -----------------------------------------------------------------

@router.post("/explain-claim")
async def explain_claim(
    req: ExplainClaimRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """Explain why a specific claim received its system verification verdict."""
    shared_client = getattr(request.app.state, "http_client", None)
    try:
        return await assistant_service.explain_claim(
            db=db,
            document_id=req.document_id,
            claim_id=req.claim_id,
            http_client=shared_client,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze-evidence")
async def analyze_evidence(
    req: AnalyzeEvidenceRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """Analyze evidence gaps, access barriers, and research methodology for a claim."""
    shared_client = getattr(request.app.state, "http_client", None)
    try:
        return await assistant_service.analyze_evidence_gaps(
            db=db,
            document_id=req.document_id,
            claim_id=req.claim_id,
            http_client=shared_client,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/search-research")
async def search_academic_research(
    req: SearchResearchRequest,
    request: Request,
):
    """
    Search external academic research across Crossref, OpenAlex, Semantic Scholar,
    Europe PMC, and arXiv for research assistance.
    """
    shared_client = getattr(request.app.state, "http_client", None)
    try:
        # Search OpenAlex and Europe PMC as primary discovery engines
        works = await meta_resolver.search_all_providers(
            query=req.query,
            client=shared_client,
        )
        return {
            "query": req.query,
            "total_found": len(works),
            "results": [
                {
                    "source_database": w.source_database,
                    "external_id": w.external_id,
                    "doi": w.doi,
                    "title": w.title,
                    "authors": w.authors,
                    "year": w.year,
                    "venue": w.venue,
                    "is_open_access": w.is_open_access,
                    "oa_url": w.oa_url,
                    "pdf_url": w.pdf_url,
                    "has_abstract": bool(w.abstract),
                    "abstract_snippet": w.abstract[:300] + "..." if w.abstract else None,
                }
                for w in works[:req.limit * 2]
            ],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Academic search failed: {str(e)}")
