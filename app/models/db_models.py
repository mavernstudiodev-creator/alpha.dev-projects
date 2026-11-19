"""
SQLAlchemy Database Models for CiteVerify
"""

import json
from datetime import datetime
from sqlalchemy import Column, String, Integer, Text, DateTime, Float
from app.core.database import Base


class DocumentDB(Base):
    __tablename__ = "documents"

    id = Column(String(64), primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    total_pages = Column(Integer, default=0)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String(32), default="completed")
    
    # Store complete verified report payload as JSON
    report_json = Column(Text, nullable=False)


class HumanReviewDB(Base):
    __tablename__ = "human_reviews"

    id = Column(String(64), primary_key=True, index=True)
    document_id = Column(String(64), nullable=False, index=True)
    claim_id = Column(String(64), nullable=False, index=True)
    decision = Column(String(32), nullable=False)  # confirmed, overridden, flagged
    overridden_status = Column(String(32), nullable=True)
    notes = Column(Text, nullable=True)
    reviewed_at = Column(DateTime, default=datetime.utcnow)
    reviewer_name = Column(String(128), default="Anonymous Reviewer")
