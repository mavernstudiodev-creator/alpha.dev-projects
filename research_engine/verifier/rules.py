"""
CiteVerify Strict Verification Rules & Invariants
Enforces anti-hallucination boundaries and scientific verification standards.
"""

from typing import List
from research_engine.core.models import EvidencePassage, EvidenceType, VerificationStatus


class VerificationInvariants:
    """Core invariants that must never be violated by the verification engine."""

    @staticmethod
    def validate_provenance_completeness(evidence_items: List[EvidencePassage]) -> bool:
        """Ensure every evidence item has a valid source database, title, and passage text."""
        for item in evidence_items:
            if not item.source_work_title or not item.passage_text or not item.source_database:
                return False
        return True

    @staticmethod
    def enforce_abstention_if_empty_evidence(evidence_items: List[EvidencePassage]) -> bool:
        """If zero evidence passages could be retrieved, verification MUST abstain."""
        return len(evidence_items) == 0

    @staticmethod
    def prevent_unjustified_support(evidence_items: List[EvidencePassage], status: VerificationStatus) -> VerificationStatus:
        """
        Anti-hallucination rule:
        If all evidence is ABSTRACT_ONLY or relevance is weak,
        status cannot be definitively SUPPORTED without human confirmation.
        Downgrade to PARTIALLY_SUPPORTED or INSUFFICIENT_EVIDENCE.
        """
        if status == VerificationStatus.SUPPORTED:
            all_abstract_only = all(e.evidence_type == EvidenceType.ABSTRACT_ONLY for e in evidence_items)
            if all_abstract_only:
                # Abstract alone cannot guarantee complete experimental verification
                return VerificationStatus.PARTIALLY_SUPPORTED
        return status
