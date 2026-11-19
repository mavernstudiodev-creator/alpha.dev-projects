"""
CiteVerify Master Verification Pipeline
End-to-end orchestration: PDF extraction -> Bibliography parsing -> Claim mining ->
Multi-API academic discovery -> Evidence harvesting -> Rigorous claim evaluation.
"""

import time
import logging
from typing import List, Dict, Optional
from pydantic import BaseModel, Field

from research_engine.core.models import (
    BibEntry,
    Claim,
    AcademicWork,
    VerificationResult,
    VerificationStatus,
)
from research_engine.extractor.pdf_extractor import PDFExtractor, PDFDocumentStructure
from research_engine.bibliography.parser import BibliographyParser
from research_engine.claims.claim_miner import ClaimMiner
from research_engine.resolver.meta_resolver import MetaResolver
from research_engine.evidence.harvester import EvidenceHarvester
from research_engine.verifier.evaluator import ClaimEvaluator

logger = logging.getLogger(__name__)


class VerificationSummary(BaseModel):
    total_claims: int = 0
    supported: int = 0
    partially_supported: int = 0
    unsupported: int = 0
    contradictory: int = 0
    possibly_outdated: int = 0
    insufficient_evidence: int = 0
    total_citations_found: int = 0
    total_citations_resolved: int = 0
    processing_time_seconds: float = 0.0


class DocumentVerificationReport(BaseModel):
    document_id: str
    filename: str
    total_pages: int
    summary: VerificationSummary
    bibliography: List[BibEntry] = Field(default_factory=list)
    claims: List[Claim] = Field(default_factory=list)
    results: List[VerificationResult] = Field(default_factory=list)


class VerificationPipeline:
    """Master orchestrator for the CiteVerify platform."""

    def __init__(self):
        self.extractor = PDFExtractor()
        self.bib_parser = BibliographyParser()
        self.claim_miner = ClaimMiner()
        self.resolver = MetaResolver()
        self.harvester = EvidenceHarvester()
        self.evaluator = ClaimEvaluator()

    async def process_pdf(self, file_path: str, document_id: Optional[str] = None) -> DocumentVerificationReport:
        """Run the complete end-to-end verification workflow on an uploaded PDF."""
        start_time = time.time()
        doc_id = document_id or f"DOC-{int(time.time())}"

        logger.info("Starting CiteVerify processing for: %s (ID: %s)", file_path, doc_id)

        # 1. Extract PDF layout and text
        doc_struct: PDFDocumentStructure = self.extractor.extract_pdf(file_path)

        # 2. Parse Bibliography
        bib_entries: List[BibEntry] = []
        if doc_struct.bibliography_text:
            bib_entries = self.bib_parser.parse_bibliography(doc_struct.bibliography_text)
            logger.info("Parsed %d bibliography entries", len(bib_entries))

        bib_map: Dict[str, BibEntry] = {b.key: b for b in bib_entries}

        # 3. Mine scientific claims
        bib_start_page = doc_struct.bibliography_start_page or (doc_struct.total_pages + 1)
        claims: List[Claim] = self.claim_miner.extract_claims_from_pages(doc_struct.pages, bib_start_page)
        logger.info("Extracted %d scientific claims with citation links", len(claims))

        # 4. Resolve cited references against Academic APIs (Crossref, OpenAlex, Semantic Scholar, Europe PMC, arXiv)
        # Collect unique citation keys referenced in claims
        referenced_keys = set()
        for c in claims:
            referenced_keys.update(c.citation_keys)

        resolved_works_map: Dict[str, AcademicWork] = {}
        for key in referenced_keys:
            if key in bib_map:
                entry = bib_map[key]
                resolved = await self.resolver.resolve_bib_entry(entry)
                if resolved:
                    resolved_works_map[key] = resolved

        logger.info("Resolved %d / %d cited academic references", len(resolved_works_map), len(referenced_keys))

        # 5. Harvest Evidence and Evaluate Claims
        results: List[VerificationResult] = []
        summary = VerificationSummary(
            total_claims=len(claims),
            total_citations_found=len(bib_entries),
            total_citations_resolved=len(resolved_works_map),
        )

        for claim in claims:
            # Find matching citations for this claim
            matched_bibs = [bib_map[k] for k in claim.citation_keys if k in bib_map]
            matched_works = [resolved_works_map[k] for k in claim.citation_keys if k in resolved_works_map]

            # Harvest evidence
            evidence_items = []
            for work in matched_works:
                passages = await self.harvester.harvest_evidence_for_claim(claim, work)
                evidence_items.extend(passages)

            # Evaluate claim
            result = self.evaluator.evaluate_claim(
                claim=claim,
                matched_citations=matched_bibs,
                resolved_works=matched_works,
                evidence_items=evidence_items,
            )
            results.append(result)

            # Update stats
            if result.status == VerificationStatus.SUPPORTED:
                summary.supported += 1
            elif result.status == VerificationStatus.PARTIALLY_SUPPORTED:
                summary.partially_supported += 1
            elif result.status == VerificationStatus.UNSUPPORTED:
                summary.unsupported += 1
            elif result.status == VerificationStatus.CONTRADICTORY:
                summary.contradictory += 1
            elif result.status == VerificationStatus.POSSIBLY_OUTDATED:
                summary.possibly_outdated += 1
            elif result.status == VerificationStatus.INSUFFICIENT_EVIDENCE:
                summary.insufficient_evidence += 1

        summary.processing_time_seconds = round(time.time() - start_time, 2)
        logger.info("Finished verification in %.2f seconds", summary.processing_time_seconds)

        return DocumentVerificationReport(
            document_id=doc_id,
            filename=doc_struct.filename,
            total_pages=doc_struct.total_pages,
            summary=summary,
            bibliography=bib_entries,
            claims=claims,
            results=results,
        )
