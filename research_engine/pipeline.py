"""
CiteVerify Master Verification Pipeline
End-to-end orchestration: PDF extraction -> Bibliography parsing -> Claim mining ->
Multi-API academic discovery -> Evidence harvesting -> Rigorous claim evaluation.

Optimized with:
- High-precision time.perf_counter() stage-by-stage instrumentation.
- Connection-pooled reusable HTTP client across all academic APIs and evidence harvesting.
- Per-verification job research PDF caching for deduplicated downloads.
- Bounded concurrency for parallel reference resolution.
- Multi-key bibliography lookup for both numeric ([1]) and author-year ((Conneau et al., 2020)) citations.
- Asynchronous offload for blocking PDF extraction.
- Optional progress callback hook for background job tracking.
"""

import time
import re
import asyncio
import logging
from typing import List, Dict, Optional, Callable, Any, Set
import httpx
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
from research_engine.evidence.pdf_cache import ResearchPdfCache
from research_engine.verifier.evaluator import ClaimEvaluator
from app.core.config import settings

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

    def __init__(self, pdf_cache_size: int = 50):
        self.extractor = PDFExtractor()
        self.bib_parser = BibliographyParser()
        self.claim_miner = ClaimMiner()
        self.resolver = MetaResolver()
        self.harvester = EvidenceHarvester(cache_size=pdf_cache_size)
        self.evaluator = ClaimEvaluator()

    async def aclose(self):
        """Clean up resources if needed."""
        pass

    async def process_pdf(
        self,
        file_path: str,
        document_id: Optional[str] = None,
        original_filename: Optional[str] = None,
        http_client: Optional[httpx.AsyncClient] = None,
        progress_callback: Optional[Callable[[str, int, str], Any]] = None,
    ) -> DocumentVerificationReport:
        """Run the complete end-to-end verification workflow on an uploaded PDF with stage instrumentation."""
        pipeline_start = time.perf_counter()
        doc_id = document_id or f"DOC-{int(time.time())}"

        logger.info("[%s] Starting CiteVerify verification pipeline for: %s", doc_id, file_path)

        async def _notify(stage: str, percent: int, msg: str):
            if progress_callback:
                try:
                    res = progress_callback(stage, percent, msg)
                    if asyncio.iscoroutine(res):
                        await res
                except Exception as e:
                    logger.debug("[%s] Progress callback exception: %s", doc_id, e)

        # Stage 1: Extract PDF layout and text (offloaded to thread to avoid blocking event loop)
        await _notify("pdf_extraction", 15, "Extracting PDF text and document structure")
        t0 = time.perf_counter()
        doc_struct: PDFDocumentStructure = await asyncio.to_thread(self.extractor.extract_pdf, file_path)
        t_pdf_extract = time.perf_counter() - t0
        logger.info("[%s] PDF layout extracted (%d pages) in %.2f ms", doc_id, doc_struct.total_pages, t_pdf_extract * 1000)

        # Stage 2: Parse Bibliography
        await _notify("bibliography_parsing", 30, "Parsing bibliographic entries")
        t0 = time.perf_counter()
        bib_entries: List[BibEntry] = []
        if doc_struct.bibliography_text:
            bib_entries = self.bib_parser.parse_bibliography(doc_struct.bibliography_text)
        t_bib_parse = time.perf_counter() - t0
        logger.info("[%s] Parsed %d bibliography entries in %.2f ms", doc_id, len(bib_entries), t_bib_parse * 1000)

        # Stage 3: Mine scientific claims
        await _notify("claim_mining", 45, "Mining scientific propositions and citation callouts")
        t0 = time.perf_counter()
        bib_start_page = doc_struct.bibliography_start_page or (doc_struct.total_pages + 1)
        claims: List[Claim] = self.claim_miner.extract_claims_from_pages(doc_struct.pages, bib_start_page)
        t_claim_mine = time.perf_counter() - t0
        logger.info("[%s] Extracted %d scientific claims in %.2f ms", doc_id, len(claims), t_claim_mine * 1000)

        # Execute network stages using pooled HTTP client
        if http_client is not None:
            return await self._execute_verification_workflow(
                doc_id=doc_id,
                doc_struct=doc_struct,
                original_filename=original_filename,
                bib_entries=bib_entries,
                claims=claims,
                http_client=http_client,
                pipeline_start=pipeline_start,
                t_pdf_extract=t_pdf_extract,
                t_bib_parse=t_bib_parse,
                t_claim_mine=t_claim_mine,
                progress_notify=_notify,
            )
        else:
            limits = httpx.Limits(
                max_connections=settings.HTTP_MAX_CONNECTIONS,
                max_keepalive_connections=settings.HTTP_MAX_KEEPALIVE_CONNECTIONS,
                keepalive_expiry=settings.HTTP_KEEPALIVE_EXPIRY,
            )
            async with httpx.AsyncClient(limits=limits, timeout=15.0, follow_redirects=True) as session_client:
                return await self._execute_verification_workflow(
                    doc_id=doc_id,
                    doc_struct=doc_struct,
                    original_filename=original_filename,
                    bib_entries=bib_entries,
                    claims=claims,
                    http_client=session_client,
                    pipeline_start=pipeline_start,
                    t_pdf_extract=t_pdf_extract,
                    t_bib_parse=t_bib_parse,
                    t_claim_mine=t_claim_mine,
                    progress_notify=_notify,
                )

    async def _execute_verification_workflow(
        self,
        doc_id: str,
        doc_struct: PDFDocumentStructure,
        original_filename: Optional[str],
        bib_entries: List[BibEntry],
        claims: List[Claim],
        http_client: httpx.AsyncClient,
        pipeline_start: float,
        t_pdf_extract: float,
        t_bib_parse: float,
        t_claim_mine: float,
        progress_notify: Optional[Callable[[str, int, str], Any]] = None,
    ) -> DocumentVerificationReport:
        """Internal execution helper sharing the pooled HTTP client and dedicated PDF cache."""
        async def _notify(stage: str, percent: int, msg: str):
            if progress_notify:
                await progress_notify(stage, percent, msg)

        # Build multi-key flexible index for bibliography entries
        bib_lookup: Dict[str, BibEntry] = {}
        for b in bib_entries:
            bib_lookup[b.key] = b
            bib_lookup[b.key.lower()] = b
            norm = " ".join(re.sub(r"[^a-zA-Z0-9\s]", "", b.key.lower()).split())
            if norm:
                bib_lookup[norm] = b
            for a in getattr(b, "aliases", []):
                bib_lookup[a] = b
                bib_lookup[a.lower()] = b
                norm_a = " ".join(re.sub(r"[^a-zA-Z0-9\s]", "", a.lower()).split())
                if norm_a:
                    bib_lookup[norm_a] = b

        def _find_bib(k: str) -> Optional[BibEntry]:
            if k in bib_lookup:
                return bib_lookup[k]
            k_low = k.lower()
            if k_low in bib_lookup:
                return bib_lookup[k_low]
            norm = " ".join(re.sub(r"[^a-zA-Z0-9\s]", "", k_low).split())
            if norm in bib_lookup:
                return bib_lookup[norm]
            return None

        # Stage 4: Resolve cited references against Academic APIs with bounded concurrency
        await _notify("citation_resolution", 65, "Resolving cited papers across Crossref, OpenAlex, Semantic Scholar, Europe PMC, and arXiv")
        t0 = time.perf_counter()
        referenced_keys: Set[str] = set()
        for c in claims:
            referenced_keys.update(c.citation_keys)

        # Map each referenced key to distinct BibEntry records
        distinct_entries_to_resolve: Dict[str, BibEntry] = {}
        for k in referenced_keys:
            entry = _find_bib(k)
            if entry and entry.key not in distinct_entries_to_resolve:
                distinct_entries_to_resolve[entry.key] = entry

        resolved_works_map: Dict[str, AcademicWork] = {}
        sem = asyncio.Semaphore(5)

        async def _resolve_one(entry: BibEntry):
            async with sem:
                try:
                    resolved = await self.resolver.resolve_bib_entry(entry, client=http_client)
                    return entry.key, resolved
                except Exception as e:
                    logger.warning("[%s] Failed resolving citation [%s]: %s", doc_id, entry.key, e)
                    return entry.key, None

        tasks = [_resolve_one(e) for e in distinct_entries_to_resolve.values()]
        if tasks:
            results_pairs = await asyncio.gather(*tasks, return_exceptions=True)
            for pair in results_pairs:
                if isinstance(pair, tuple) and pair[1] is not None:
                    resolved_works_map[pair[0]] = pair[1]

        t_citation_resolve = time.perf_counter() - t0
        logger.info(
            "[%s] Resolved %d / %d cited references in %.2f ms",
            doc_id,
            len(resolved_works_map),
            len(distinct_entries_to_resolve),
            t_citation_resolve * 1000,
        )

        # Stage 5: Harvest Evidence and Evaluate Claims
        await _notify("evidence_harvesting", 80, "Harvesting evidence passages and matching source texts")
        job_pdf_cache = ResearchPdfCache(max_entries=50)

        results: List[VerificationResult] = []
        summary = VerificationSummary(
            total_claims=len(claims),
            total_citations_found=len(bib_entries),
            total_citations_resolved=len(resolved_works_map),
        )

        t_evidence_harvest = 0.0
        t_verdict_eval = 0.0

        for claim in claims:
            # Find matching citations for this claim
            matched_bibs: List[BibEntry] = []
            matched_works: List[AcademicWork] = []

            for k in claim.citation_keys:
                entry = _find_bib(k)
                if entry:
                    if entry not in matched_bibs:
                        matched_bibs.append(entry)
                    if entry.key in resolved_works_map and resolved_works_map[entry.key] not in matched_works:
                        matched_works.append(resolved_works_map[entry.key])

            # Harvest evidence
            evidence_items = []
            for work in matched_works:
                th0 = time.perf_counter()
                passages = await self.harvester.harvest_evidence_for_claim(
                    claim, work, pdf_cache=job_pdf_cache, client=http_client
                )
                t_evidence_harvest += (time.perf_counter() - th0)
                evidence_items.extend(passages)

            # Evaluate claim
            te0 = time.perf_counter()
            result = self.evaluator.evaluate_claim(
                claim=claim,
                matched_citations=matched_bibs,
                resolved_works=matched_works,
                evidence_items=evidence_items,
            )
            t_verdict_eval += (time.perf_counter() - te0)
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

        await _notify("verdict_evaluation", 95, "Synthesizing claim verdicts and evidence provenance")
        t_pipeline_total = time.perf_counter() - pipeline_start
        summary.processing_time_seconds = round(t_pipeline_total, 2)

        logger.info(
            "[%s] Pipeline Timings Breakdown: "
            "PDF Extraction: %.2f ms | "
            "Bib Parsing: %.2f ms | "
            "Claim Mining: %.2f ms | "
            "Citation Resolution: %.2f ms (%.2f s) | "
            "Evidence Harvesting: %.2f ms (%.2f s) | "
            "Verdict Evaluation: %.2f ms | "
            "Total Pipeline: %.2f s",
            doc_id,
            t_pdf_extract * 1000,
            t_bib_parse * 1000,
            t_claim_mine * 1000,
            t_citation_resolve * 1000,
            t_citation_resolve,
            t_evidence_harvest * 1000,
            t_evidence_harvest,
            t_verdict_eval * 1000,
            t_pipeline_total,
        )

        await _notify("completed", 100, "Verification pipeline successfully completed")

        return DocumentVerificationReport(
            document_id=doc_id,
            filename=original_filename or doc_struct.filename,
            total_pages=doc_struct.total_pages,
            summary=summary,
            bibliography=bib_entries,
            claims=claims,
            results=results,
        )
