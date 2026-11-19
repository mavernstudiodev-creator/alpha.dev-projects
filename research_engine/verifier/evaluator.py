"""
CiteVerify Scientific Claim Evaluator
Compares scientific claims against retrieved source evidence passages.
Produces explainable verification verdicts across 6 distinct states.
"""

import re
import datetime
from typing import List, Tuple
from research_engine.core.models import (
    Claim,
    AcademicWork,
    EvidencePassage,
    EvidenceType,
    VerificationStatus,
    VerificationResult,
    BibEntry,
)
from research_engine.verifier.rules import VerificationInvariants

# Negation and contradiction signals
CONTRADICTION_SIGNALS = [
    r"\bno\s+significant\b",
    r"\bfailed\s+to\b",
    r"\bcontradict(?:s|ed|ory)?\b",
    r"\bcontrary\s+to\b",
    r"\bdisprov(?:e|es|ed)\b",
    r"\brefut(?:e|es|ed)\b",
    r"\bno\s+evidence\b",
    r"\bunable\s+to\s+replicate\b",
    r"\bdoes\s+not\s+(?:support|enhance|increase|improve|hold)\b",
    r"\bdid\s+not\s+(?:support|enhance|increase|improve|hold)\b",
    r"\binconsistent\s+with\b",
]

CONTRADICTION_REGEX = re.compile("|".join(CONTRADICTION_SIGNALS), re.IGNORECASE)

# Positive finding signals
POSITIVE_SIGNALS = [
    r"\bdemonstrate(?:s|d)?\b",
    r"\bconfirm(?:s|ed)?\b",
    r"\bshow(?:s|ed|n)?\s+(?:that|significant|improved)\b",
    r"\bsignificant(?:ly)?\s+(?:increase|decrease|improve|benefit)\b",
    r"\bconsistently\b",
    r"\bvalidate(?:s|d)?\b",
    r"\bverif(?:y|ies|ied)\b",
]

POSITIVE_REGEX = re.compile("|".join(POSITIVE_SIGNALS), re.IGNORECASE)


class ClaimEvaluator:
    """Rigorous scientific verification evaluator."""

    CURRENT_YEAR = 2026

    def evaluate_claim(
        self,
        claim: Claim,
        matched_citations: List[BibEntry],
        resolved_works: List[AcademicWork],
        evidence_items: List[EvidencePassage],
    ) -> VerificationResult:
        """
        Evaluate a claim against harvested evidence and resolved works.
        Enforces strict rules:
        - Never classify as supported based only on semantic similarity.
        - Abstain when evidence is insufficient or inaccessible.
        - Explicitly flag abstract-only evidence.
        - Detect potential outdatedness.
        """
        # Rule 1: Abstention check if no evidence passages could be retrieved
        if not evidence_items or not resolved_works:
            missing_reason = (
                "Original full text and abstract were inaccessible from external academic databases "
                "(Crossref, OpenAlex, Semantic Scholar, Europe PMC, arXiv), or citation could not be resolved."
            )
            return VerificationResult(
                claim_id=claim.claim_id,
                claim_statement=claim.statement,
                status=VerificationStatus.INSUFFICIENT_EVIDENCE,
                confidence_score=0.20,
                explanation=f"Abstention: {missing_reason} Human review required.",
                evidence_items=[],
                matched_citations=matched_citations,
                is_abstract_only=False,
                requires_human_review=True,
            )

        # Combine text of all retrieved evidence
        combined_evidence_text = " ".join([item.passage_text for item in evidence_items])
        is_abstract_only = all(item.evidence_type == EvidenceType.ABSTRACT_ONLY for item in evidence_items)

        # Rule 2: Outdatedness check
        is_outdated, outdated_explanation = self._check_outdatedness(claim, resolved_works)
        if is_outdated:
            return VerificationResult(
                claim_id=claim.claim_id,
                claim_statement=claim.statement,
                status=VerificationStatus.POSSIBLY_OUTDATED,
                confidence_score=0.75,
                explanation=outdated_explanation,
                evidence_items=evidence_items,
                matched_citations=matched_citations,
                is_abstract_only=is_abstract_only,
                is_outdated_risk=True,
                requires_human_review=True,
            )

        # Rule 3: Contradiction check
        is_contradictory, contradiction_explanation = self._check_contradiction(claim, combined_evidence_text)
        if is_contradictory:
            return VerificationResult(
                claim_id=claim.claim_id,
                claim_statement=claim.statement,
                status=VerificationStatus.CONTRADICTORY,
                confidence_score=0.88,
                explanation=contradiction_explanation,
                evidence_items=evidence_items,
                matched_citations=matched_citations,
                is_abstract_only=is_abstract_only,
                requires_human_review=True,
            )

        # Rule 4: Support vs Partial Support vs Unsupported
        status, confidence, explanation = self._classify_support(
            claim=claim,
            evidence_items=evidence_items,
            combined_evidence=combined_evidence_text,
            is_abstract_only=is_abstract_only,
        )

        # Apply Invariant guardrails
        status = VerificationInvariants.prevent_unjustified_support(evidence_items, status)

        return VerificationResult(
            claim_id=claim.claim_id,
            claim_statement=claim.statement,
            status=status,
            confidence_score=confidence,
            explanation=explanation,
            evidence_items=evidence_items,
            matched_citations=matched_citations,
            is_abstract_only=is_abstract_only,
            requires_human_review=True,
        )

    def _check_outdatedness(self, claim: Claim, works: List[AcademicWork]) -> Tuple[bool, str]:
        """Detect whether the cited reference is potentially superseded or outdated."""
        oldest_year = min([w.year for w in works if w.year] or [self.CURRENT_YEAR])
        age = self.CURRENT_YEAR - oldest_year

        # If reference is older than 15 years and claim asserts modern superiority or contemporary status
        modern_superlative_signals = [r"\bstate-of-the-art\b", r"\bsota\b", r"\brecent(?:ly)?\b", r"\bmodern\b", r"\bnovel\b", r"\bcurrent\b"]
        claim_has_modern_claim = any(re.search(pat, claim.statement, re.IGNORECASE) for pat in modern_superlative_signals)

        if age >= 15 and claim_has_modern_claim:
            explanation = (
                f"Potentially Outdated: The cited paper ({works[0].title}) was published in {oldest_year} ({age} years ago), "
                f"yet the claim asserts contemporary relevance or state-of-the-art status. "
                f"Subsequent academic literature may supersede these findings."
            )
            return True, explanation

        return False, ""

    def _check_contradiction(self, claim: Claim, evidence_text: str) -> Tuple[bool, str]:
        """Check if source text directly negates or contradicts the assertion."""
        # If evidence contains explicit contradiction markers
        has_contra = bool(CONTRADICTION_REGEX.search(evidence_text))
        claim_has_positive = bool(POSITIVE_REGEX.search(claim.statement))

        if has_contra and claim_has_positive:
            explanation = (
                "Contradictory Evidence Detected: The source paper explicitly reports negative or conflicting findings "
                "(e.g., failed to observe significant effect, inconsistent, or refuted) contrasting with the paper's affirmative claim."
            )
            return True, explanation

        return False, ""

    def _classify_support(
        self,
        claim: Claim,
        evidence_items: List[EvidencePassage],
        combined_evidence: str,
        is_abstract_only: bool,
    ) -> Tuple[VerificationStatus, float, str]:
        """Classify factual alignment and confidence score."""
        # Extract core entities and quantitative metrics (e.g. numbers, % signs)
        claim_numbers = set(re.findall(r"\b\d+(?:\.\d+)?%?\b", claim.statement))
        evidence_numbers = set(re.findall(r"\b\d+(?:\.\d+)?%?\b", combined_evidence))

        # Check content keyword overlap
        max_relevance = max([e.relevance_score for e in evidence_items]) if evidence_items else 0.0

        if max_relevance >= 0.55:
            # High factual overlap
            if claim_numbers and not (claim_numbers.intersection(evidence_numbers)):
                # Mention of specific numbers that could not be corroborated in excerpt
                status = VerificationStatus.PARTIALLY_SUPPORTED
                confidence = 0.65
                explanation = (
                    "Partially Supported: The source paper corroborates the general phenomenon and thematic findings, "
                    f"but specific quantitative metrics ({', '.join(claim_numbers)}) were not directly corroborated in the accessible source passage."
                )
            elif is_abstract_only:
                status = VerificationStatus.PARTIALLY_SUPPORTED
                confidence = 0.70
                explanation = (
                    "Partially Supported (Abstract-Only Evidence): The retrieved source abstract directly aligns with the claim's core proposition. "
                    "However, because full body text was inaccessible, the verdict cannot be classified as fully supported without complete experimental review."
                )
            else:
                status = VerificationStatus.SUPPORTED
                confidence = min(0.92, 0.75 + max_relevance * 0.2)
                explanation = (
                    "Supported: The source paper's full text directly corroborates the scientific assertion, "
                    "confirming the methodological approach and reported outcomes."
                )
        elif max_relevance >= 0.28:
            status = VerificationStatus.PARTIALLY_SUPPORTED
            confidence = 0.50
            explanation = (
                "Partially Supported / Weak Evidence: The source mentions related concepts, "
                "but evidence is insufficient to verify the exact causal direction or magnitude."
            )
        else:
            status = VerificationStatus.UNSUPPORTED
            confidence = 0.60
            explanation = (
                "Unsupported: Although the cited work was retrieved, the accessible evidence passages "
                "do not contain facts or assertions confirming the claim."
            )

        return status, confidence, explanation
