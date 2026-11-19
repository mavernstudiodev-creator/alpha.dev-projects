"""
Evidence Harvester
Retrieves accessible source text (Open Access full text or abstracts)
and extracts grounded evidence passages with strict provenance preservation.

Features:
- Reusable connection pooling via shared httpx.AsyncClient.
- Cached parsed research PDFs via ResearchPdfCache to eliminate redundant downloads.
- Preserves unique evidence passages and independent relevance scores per claim.
- Explicit labeling of ABSTRACT_ONLY vs FULL_TEXT evidence.
"""

import io
import re
import uuid
import logging
from typing import List, Optional, Set
import httpx
import pymupdf as fitz
from research_engine.core.models import AcademicWork, EvidencePassage, EvidenceType, Claim
from research_engine.evidence.pdf_cache import ResearchPdfCache, CachedPaperDocument, ParsedSentence

logger = logging.getLogger(__name__)


class EvidenceHarvester:
    """Retrieves source paper evidence and extracts relevant passages."""

    def __init__(self, timeout: float = 15.0, cache_size: int = 50):
        self.timeout = timeout
        self.headers = {
            "User-Agent": "CiteVerify/1.0 (team-alphadev; research-claim-verifier)",
        }
        self._default_pdf_cache = ResearchPdfCache(max_entries=cache_size)

    async def harvest_evidence_for_claim(
        self,
        claim: Claim,
        work: AcademicWork,
        pdf_cache: Optional[ResearchPdfCache] = None,
        client: Optional[httpx.AsyncClient] = None,
    ) -> List[EvidencePassage]:
        """
        Attempts to harvest evidence from the original academic work.
        Follows legal open-access paths:
        1. If PDF URL is present and open access, fetch and extract text (reusing cached PDF if available).
        2. Otherwise, falls back strictly to the abstract, labeled as ABSTRACT_ONLY.
        3. Never invents quotes or evidence.
        """
        passages: List[EvidencePassage] = []
        cache = pdf_cache if pdf_cache is not None else self._default_pdf_cache

        # Attempt 1: Fetch or reuse Open Access PDF
        full_text_passages = await self._try_get_full_text_passages(claim, work, cache, client=client)
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

    async def _try_get_full_text_passages(
        self,
        claim: Claim,
        work: AcademicWork,
        cache: ResearchPdfCache,
        client: Optional[httpx.AsyncClient] = None,
    ) -> List[EvidencePassage]:
        """Fetch (or retrieve from cache) the open-access PDF and search for claim-relevant passages."""
        if not work.pdf_url:
            return []

        canonical_id = cache.get_canonical_id(work)
        cached_doc = cache.get(canonical_id)

        if cached_doc is None:
            # Download and parse PDF once
            cached_doc = await self._fetch_and_parse_pdf(work, canonical_id, client=client)
            cache.put(cached_doc)

        if cached_doc.fetch_failed:
            return []

        # Extract claim-specific passages from cached sentences
        passages = self._extract_passages_from_cached_doc(claim, work, cached_doc)
        if passages:
            work.has_full_text = True
        return passages

    async def _fetch_and_parse_pdf(
        self,
        work: AcademicWork,
        canonical_id: str,
        client: Optional[httpx.AsyncClient] = None,
    ) -> CachedPaperDocument:
        """Download remote PDF and extract parsed candidate sentences with precomputed keywords."""
        if not work.pdf_url:
            return CachedPaperDocument(
                canonical_id=canonical_id,
                source_title=work.title,
                source_database=work.source_database,
                source_doi=work.doi,
                source_url=work.oa_url or work.pdf_url,
                pdf_url=work.pdf_url,
                fetch_failed=True,
                failure_reason="No PDF URL available",
            )

        async def _execute(http_c: httpx.AsyncClient) -> CachedPaperDocument:
            response = await http_c.get(work.pdf_url, headers=self.headers)
            content_type = response.headers.get("content-type", "").lower()
            is_pdf = ("application/pdf" in content_type) or (response.content[:4] == b"%PDF")

            if response.status_code == 200 and is_pdf:
                pdf_bytes = io.BytesIO(response.content)
                doc = fitz.open(stream=pdf_bytes, filetype="pdf")

                parsed_sentences: List[ParsedSentence] = []
                for page_idx in range(len(doc)):
                    page = doc[page_idx]
                    page_num = page_idx + 1
                    text = page.get_text("text")

                    raw_sentences = [s.strip() for s in text.replace("\n", " ").split(".") if len(s.strip()) > 30]
                    for sentence in raw_sentences:
                        clean_sentence = sentence.strip() + "."
                        keywords = self._extract_keywords(clean_sentence)
                        parsed_sentences.append(ParsedSentence(
                            page_number=page_num,
                            text=clean_sentence,
                            keywords=keywords,
                        ))

                doc.close()
                logger.info("Successfully fetched and cached PDF for paper: %s (%d sentences)", canonical_id, len(parsed_sentences))

                return CachedPaperDocument(
                    canonical_id=canonical_id,
                    source_title=work.title,
                    source_database=work.source_database,
                    source_doi=work.doi,
                    source_url=work.oa_url or work.pdf_url,
                    pdf_url=work.pdf_url,
                    sentences=parsed_sentences,
                    fetch_failed=False,
                    has_full_text=True,
                )
            else:
                logger.info("Remote URL %s returned status %d or non-PDF content (%s)", work.pdf_url, response.status_code, content_type)
                return CachedPaperDocument(
                    canonical_id=canonical_id,
                    source_title=work.title,
                    source_database=work.source_database,
                    source_doi=work.doi,
                    source_url=work.oa_url or work.pdf_url,
                    pdf_url=work.pdf_url,
                    fetch_failed=True,
                    failure_reason=f"Status: {response.status_code}, content-type: {content_type}",
                )

        try:
            if client is not None:
                return await _execute(client)
            else:
                async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=True) as local_c:
                    return await _execute(local_c)
        except Exception as e:
            logger.info("Could not fetch or parse PDF from %s: %s", work.pdf_url, e)
            return CachedPaperDocument(
                canonical_id=canonical_id,
                source_title=work.title,
                source_database=work.source_database,
                source_doi=work.doi,
                source_url=work.oa_url or work.pdf_url,
                pdf_url=work.pdf_url,
                fetch_failed=True,
                failure_reason=str(e),
            )

    def _extract_passages_from_cached_doc(
        self,
        claim: Claim,
        work: AcademicWork,
        cached_doc: CachedPaperDocument,
    ) -> List[EvidencePassage]:
        """Match claim keywords against cached paper sentences, returning independent EvidencePassages."""
        claim_keywords = self._extract_keywords(claim.statement)
        if not claim_keywords:
            return []

        matched_passages: List[EvidencePassage] = []
        for candidate in cached_doc.sentences:
            score = self._compute_keyword_overlap_from_set(candidate.keywords, claim_keywords)
            if score >= 0.45:
                passage_id = f"EV-FT-{uuid.uuid4().hex[:6].upper()}"
                matched_passages.append(EvidencePassage(
                    passage_id=passage_id,
                    source_work_title=work.title,
                    source_database=work.source_database,
                    source_doi=work.doi,
                    source_url=work.oa_url or work.pdf_url,
                    evidence_type=EvidenceType.FULL_TEXT,
                    page_number=candidate.page_number,
                    section=None,
                    passage_text=candidate.text,
                    relevance_score=score,
                ))
                if len(matched_passages) >= 2:
                    break

        return matched_passages

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

    def _extract_keywords(self, text: str) -> Set[str]:
        """Extract content keywords, excluding stop words and citation artifacts."""
        stop_words = {
            "the", "a", "an", "and", "or", "in", "on", "at", "to", "for", "of", "with",
            "by", "from", "up", "about", "into", "over", "after", "is", "are", "was",
            "were", "be", "been", "being", "have", "has", "had", "do", "does", "did",
            "this", "that", "these", "those", "it", "its", "we", "our", "their", "they"
        }
        words = re.findall(r"\b[A-Za-z0-9_-]{3,}\b", text.lower())
        return {w for w in words if w not in stop_words}

    def _compute_keyword_overlap(self, passage: str, claim_keywords: Set[str]) -> float:
        """Compute Jaccard-like overlap of content keywords from raw text."""
        if not claim_keywords:
            return 0.0
        passage_words = set(re.findall(r"\b[A-Za-z0-9_-]{3,}\b", passage.lower()))
        common = claim_keywords.intersection(passage_words)
        return len(common) / len(claim_keywords)

    @staticmethod
    def _compute_keyword_overlap_from_set(passage_keywords: Set[str], claim_keywords: Set[str]) -> float:
        """Compute keyword overlap using precomputed candidate word sets."""
        if not claim_keywords:
            return 0.0
        common = claim_keywords.intersection(passage_keywords)
        return len(common) / len(claim_keywords)
