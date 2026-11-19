"""
SQLAlchemy Database Models for CiteVerify
Comprehensive models for documents, processing jobs, human reviews, audit logs, and AI conversations.
"""

from datetime import datetime
from sqlalchemy import Column, String, Integer, Text, DateTime, Float, ForeignKey
from app.core.database import Base


class DocumentDB(Base):
    __tablename__ = "documents"

    id = Column(String(64), primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    file_hash = Column(String(64), nullable=True, index=True)
    file_size_bytes = Column(Integer, nullable=True, default=0)
    total_pages = Column(Integer, default=0)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String(32), default="completed")  # pending, processing, completed, failed
    error_message = Column(Text, nullable=True)
    
    # Store complete verified report payload as JSON
    report_json = Column(Text, nullable=True)


class ProcessingJobDB(Base):
    __tablename__ = "processing_jobs"

    id = Column(String(64), primary_key=True, index=True)
    document_id = Column(String(64), nullable=False, index=True)
    status = Column(String(32), default="pending")  # pending, processing, completed, failed
    stage = Column(String(64), default="init")  # init, pdf_extraction, bib_parsing, claim_mining, citation_resolving, evidence_harvesting, verdict_evaluation, completed, failed
    progress_percent = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)


class HumanReviewDB(Base):
    __tablename__ = "human_reviews"

    id = Column(String(64), primary_key=True, index=True)
    document_id = Column(String(64), nullable=False, index=True)
    claim_id = Column(String(64), nullable=False, index=True)
    original_verdict = Column(String(32), nullable=True)
    decision = Column(String(32), nullable=False)  # confirmed, overridden, flagged
    overridden_status = Column(String(32), nullable=True)
    notes = Column(Text, nullable=True)
    reviewed_at = Column(DateTime, default=datetime.utcnow)
    reviewer_name = Column(String(128), default="Anonymous Reviewer")


class AuditEventDB(Base):
    __tablename__ = "audit_events"

    id = Column(String(64), primary_key=True, index=True)
    entity_type = Column(String(32), nullable=False, index=True)  # document, claim, review, assistant
    entity_id = Column(String(64), nullable=False, index=True)
    action = Column(String(64), nullable=False, index=True)  # upload, verify_start, verify_complete, verify_fail, review_submit, verdict_override, export_markdown, export_pdf, conv_create, conv_message
    actor = Column(String(128), default="system")
    details_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class AIConversationDB(Base):
    __tablename__ = "ai_conversations"

    id = Column(String(64), primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    document_id = Column(String(64), nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class AIMessageDB(Base):
    __tablename__ = "ai_messages"

    id = Column(String(64), primary_key=True, index=True)
    conversation_id = Column(String(64), nullable=False, index=True)
    role = Column(String(32), nullable=False)  # system, user, assistant
    content = Column(Text, nullable=False)
    context_sources_json = Column(Text, nullable=True)  # citations, passages, claims referenced
    created_at = Column(DateTime, default=datetime.utcnow)
