"""
CiteVerify Core Models & Schemas
Independent data contracts for claims, citations, academic works, evidence, and verifications.
"""

from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class VerificationStatus(str, Enum):
    SUPPORTED = "supported"
    PARTIALLY_SUPPORTED = "partially_supported"
    UNSUPPORTED = "unsupported"
    CONTRADICTORY = "contradictory"
    POSSIBLY_OUTDATED = "possibly_outdated"
    INSUFFICIENT_EVIDENCE = "insufficient_evidence"


class EvidenceType(str, Enum):
    FULL_TEXT = "full_text"
    ABSTRACT_ONLY = "abstract_only"
    METADATA_ONLY = "metadata_only"


class ReviewStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    OVERRIDDEN = "overridden"
    FLAGGED = "flagged"


class BibEntry(BaseModel):
    """Extracted bibliographic reference from document."""
    key: str = Field(..., description="Citation index or identifier e.g. '1', '2'")
    raw_text: str = Field(..., description="Raw text of the reference from the PDF")
    title: Optional[str] = None
    authors: List[str] = Field(default_factory=list)
    year: Optional[int] = None
    journal: Optional[str] = None
    doi: Optional[str] = None
    arxiv_id: Optional[str] = None
    resolved: bool = False
    source_url: Optional[str] = None
    aliases: List[str] = Field(default_factory=list, description="Alternative keys for author-year matching")


class AcademicWork(BaseModel):
    """Metadata retrieved from academic databases (Crossref, OpenAlex, Semantic Scholar, Europe PMC, arXiv)."""
    source_database: str = Field(..., description="Name of database: crossref, openalex, semantic_scholar, europe_pmc, arxiv")
    external_id: Optional[str] = None
    doi: Optional[str] = None
    title: str
    authors: List[str] = Field(default_factory=list)
    year: Optional[int] = None
    venue: Optional[str] = None
    citation_count: Optional[int] = None
    is_open_access: bool = False
    oa_url: Optional[str] = None
    pdf_url: Optional[str] = None
    abstract: Optional[str] = None
    has_full_text: bool = False
    full_text: Optional[str] = None
    raw_metadata: Dict[str, Any] = Field(default_factory=dict)


class EvidencePassage(BaseModel):
    """Ground-truth passage retrieved from original research paper."""
    passage_id: str
    source_work_title: str
    source_database: str
    source_doi: Optional[str] = None
    source_url: Optional[str] = None
    evidence_type: EvidenceType
    page_number: Optional[int] = None
    section: Optional[str] = None
    passage_text: str
    relevance_score: float = Field(default=0.0, ge=0.0, le=1.0)
    retrieved_at: Optional[str] = None


class CitationMarker(BaseModel):
    """Citation callout in the text such as [1], [2, 3], or [4-6]."""
    marker_text: str
    keys: List[str]
    page_number: int
    context_sentence: str


class Claim(BaseModel):
    """Extracted scientific proposition linked to citation markers."""
    claim_id: str
    statement: str
    page_number: int
    context_sentence: str
    citation_keys: List[str] = Field(default_factory=list)
    section_name: Optional[str] = None
    bounding_box: Optional[List[float]] = None


class VerificationResult(BaseModel):
    """Rigorous classification and provenance-backed explanation for a claim."""
    claim_id: str
    claim_statement: str
    status: VerificationStatus
    confidence_score: float = Field(..., ge=0.0, le=1.0)
    explanation: str
    evidence_items: List[EvidencePassage] = Field(default_factory=list)
    matched_citations: List[BibEntry] = Field(default_factory=list)
    is_abstract_only: bool = False
    is_outdated_risk: bool = False
    newer_work_details: Optional[str] = None
    requires_human_review: bool = True
    review_status: ReviewStatus = ReviewStatus.PENDING
    human_notes: Optional[str] = None
    reviewed_by: Optional[str] = None
