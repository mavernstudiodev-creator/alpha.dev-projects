"""
Evidence Harvester
Retrieves accessible source text (Open Access full text or abstracts)
and extracts grounded evidence passages with strict provenance preservation.

CRITICAL RULES ENFORCED:
1. Do not invent missing source text.
2. If only an abstract is available, explicitly label as ABSTRACT_ONLY.
3. If full text is inaccessible, report has_full_text=False.
4. Preserve exact source URL, DOI, and passage text.
"""

import io
import re
import uuid
import logging
from typing import List, Optional
import httpx
import pymupdf as fitz
from research_engine.core.models import AcademicWork, EvidencePassage, EvidenceType, Claim

logger = logging.getLogger(__name__)


class EvidenceHarvester:
    """Retrieves source paper evidence and extracts relevant passages."""

    def __init__(self, timeout: float = 15.0):
        self.timeout = timeout
        self.headers = {
            "User-Agent": "CiteVerify/1.0 (team-alphadev; research-claim-verifier)",
        }

    async def harvest_evidence_for_claim(self, claim: Claim, work: AcademicWork) -> List[EvidencePassage]:
        """
        Attempts to harvest evidence from the original academic work.
        Follows legal open-access paths:
        1. If PDF URL is present and open access, fetch and extract text.
        2. Otherwise, falls back strictly to the abstract, labeled as ABSTRACT_ONLY.
        3. Never invents quotes or evidence.
        """
        passages: List[EvidencePassage] = []

        # Attempt 1: Fetch Open Access PDF if available
        full_text_passages = await self._try_fetch_open_access_pdf(claim, work)
        if full_text_passages:
            return full_text_passages

        # Attempt 2: Use abstract if available
        if work.abstract and work.abstract.strip():
            abstract_passage = self._extract_relevant_abstract_passage(claim, work)
            if abstract_passage:
                passages.append(abstract_passage)
                return passages

        # If neither is available, return empty list (which triggers INSUFFICIENT_EVIDENCE)
        return []

    async def _try_fetch_open_access_pdf(self, claim: Claim, work: AcademicWork) -> List[EvidencePassage]:
        """Download open-access PDF and search for claim-relevant passages."""
        if not work.pdf_url:
            return []

        try:
            async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=True) as client:
                response = await client.get(work.pdf_url, headers=self.headers)
                if response.status_code == 200 and "application/pdf" in response.headers.get("content-type", "").lower() or response.content[:4] == b"%PDF":
                    pdf_bytes = io.BytesIO(response.content)
                    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
                    
                    matched_passages: List[EvidencePassage] = []
                    # Scan document pages for passages matching key concepts of the claim
                    claim_keywords = self._extract_keywords(claim.statement)

                    for page_idx in range(len(doc)):
                        page = doc[page_idx]
                        page_num = page_idx + 1
                        text = page.get_text("text")

                        sentences = [s.strip() for s in text.replace("\n", " ").split(".") if len(s.strip()) > 30]
                        for sentence in sentences:
                            score = self._compute_keyword_overlap(sentence, claim_keywords)
                            if score >= 0.45:  # Sufficient keyword grounding
                                passage_id = f"EV-FT-{uuid.uuid4().hex[:6].upper()}"
                                matched_passages.append(EvidencePassage(
                                    passage_id=passage_id,
                                    source_work_title=work.title,
                                    source_database=work.source_database,
                                    source_doi=work.doi,
                                    source_url=work.oa_url or work.pdf_url,
                                    evidence_type=EvidenceType.FULL_TEXT,
                                    page_number=page_num,
                                    section=None,
                                    passage_text=sentence.strip() + ".",
                                    relevance_score=score,
                                ))
                                if len(matched_passages) >= 2:
                                    break
                        if len(matched_passages) >= 2:
                            break

                    doc.close()
                    if matched_passages:
                        work.has_full_text = True
                        return matched_passages

        except Exception as e:
            logger.info("Could not fetch or parse PDF from %s: %s", work.pdf_url, e)

        return []

    def _extract_relevant_abstract_passage(self, claim: Claim, work: AcademicWork) -> Optional[EvidencePassage]:
        """Extract the most relevant sentence from the abstract, or the entire abstract if concise."""
        clean_abstract = " ".join(work.abstract.split())
        claim_keywords = self._extract_keywords(claim.statement)

        sentences = [s.strip() for s in clean_abstract.split(".") if len(s.strip()) > 20]
        best_sentence = clean_abstract
        best_score = 0.0

        for sentence in sentences:
            score = self._compute_keyword_overlap(sentence, claim_keywords)
            if score > best_score:
                best_score = score
                best_sentence = sentence.strip() + "."

        passage_id = f"EV-ABS-{uuid.uuid4().hex[:6].upper()}"
        return EvidencePassage(
            passage_id=passage_id,
            source_work_title=work.title,
            source_database=work.source_database,
            source_doi=work.doi,
            source_url=work.oa_url or (f"https://doi.org/{work.doi}" if work.doi else None),
            evidence_type=EvidenceType.ABSTRACT_ONLY,
            page_number=None,
            section="Abstract",
            passage_text=best_sentence,
            relevance_score=best_score if best_score > 0 else 0.3,
        )

    def _extract_keywords(self, text: str) -> set:
        """Extract content keywords, excluding stop words and citation artifacts."""
        stop_words = {
            "the", "a", "an", "and", "or", "in", "on", "at", "to", "for", "of", "with",
            "by", "from", "up", "about", "into", "over", "after", "is", "are", "was",
            "were", "be", "been", "being", "have", "has", "had", "do", "does", "did",
            "this", "that", "these", "those", "it", "its", "we", "our", "their", "they"
        }
        words = re.findall(r"\b[A-Za-z0-9_-]{3,}\b", text.lower())
        return {w for w in words if w not in stop_words}

    def _compute_keyword_overlap(self, passage: str, claim_keywords: set) -> float:
        """Compute Jaccard-like overlap of content keywords."""
        if not claim_keywords:
            return 0.0
        passage_words = set(re.findall(r"\b[A-Za-z0-9_-]{3,}\b", passage.lower()))
        common = claim_keywords.intersection(passage_words)
        return len(common) / len(claim_keywords)
