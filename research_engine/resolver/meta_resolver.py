"""
MetaResolver — Unified Academic Discovery Engine
Orchestrates queries across Crossref, OpenAlex, Semantic Scholar, Europe PMC, and arXiv.
Resolves missing metadata, locates Open-Access sources, and enforces anti-hallucination protocols.
"""

import logging
from typing import Optional, Dict, Any, List
from research_engine.core.models import BibEntry, AcademicWork
from research_engine.resolver.crossref import CrossrefClient
from research_engine.resolver.openalex import OpenAlexClient
from research_engine.resolver.semantic_scholar import SemanticScholarClient
from research_engine.resolver.europe_pmc import EuropePMCClient
from research_engine.resolver.arxiv import ArxivClient

logger = logging.getLogger(__name__)


class MetaResolver:
    """Unified discovery engine coordinating across 5 academic databases."""

    def __init__(self):
        self.crossref = CrossrefClient()
        self.openalex = OpenAlexClient()
        self.semantic_scholar = SemanticScholarClient()
        self.europe_pmc = EuropePMCClient()
        self.arxiv = ArxivClient()

        # In-memory session cache to respect rate limits and reduce latency
        self._doi_cache: Dict[str, AcademicWork] = {}
        self._query_cache: Dict[str, List[AcademicWork]] = {}

    async def resolve_bib_entry(self, entry: BibEntry) -> Optional[AcademicWork]:
        """
        Given a bibliographic entry, resolve it against academic databases in waterfall order.
        Strictly preserves provenance: original database, external ID, DOI, and landing URLs.
        """
        # 1. Direct DOI resolution if DOI is already extracted
        if entry.doi:
            resolved = await self.get_by_doi(entry.doi)
            if resolved:
                entry.resolved = True
                entry.title = resolved.title or entry.title
                entry.year = resolved.year or entry.year
                entry.source_url = resolved.oa_url or f"https://doi.org/{resolved.doi}"
                return resolved

        # 2. Direct arXiv resolution if arXiv ID is extracted
        if entry.arxiv_id:
            resolved = await self.arxiv.get_by_arxiv_id(entry.arxiv_id)
            if resolved:
                entry.resolved = True
                entry.title = resolved.title or entry.title
                entry.year = resolved.year or entry.year
                entry.source_url = resolved.oa_url
                entry.doi = resolved.doi or entry.doi
                return resolved

        # 3. Search by title if available
        if entry.title and len(entry.title.strip()) > 8:
            search_title = entry.title.strip()
            first_author = entry.authors[0] if entry.authors else None

            # First priority: OpenAlex (rich OA and citation data)
            openalex_results = await self.openalex.search_by_title(search_title, year=entry.year)
            if openalex_results and self._is_title_match(search_title, openalex_results[0].title):
                best = openalex_results[0]
                entry.resolved = True
                entry.doi = best.doi or entry.doi
                entry.source_url = best.oa_url or (f"https://doi.org/{best.doi}" if best.doi else None)
                return best

            # Second priority: Crossref (authoritative DOI registrar)
            crossref_results = await self.crossref.search_bibliographic(search_title, author=first_author, year=entry.year)
            if crossref_results and self._is_title_match(search_title, crossref_results[0].title):
                best = crossref_results[0]
                entry.resolved = True
                entry.doi = best.doi or entry.doi
                entry.source_url = best.oa_url or (f"https://doi.org/{best.doi}" if best.doi else None)
                return best

            # Third priority: Europe PMC (biomedical & life sciences)
            epmc_results = await self.europe_pmc.search_by_title(search_title)
            if epmc_results and self._is_title_match(search_title, epmc_results[0].title):
                best = epmc_results[0]
                entry.resolved = True
                entry.doi = best.doi or entry.doi
                entry.source_url = best.oa_url
                return best

            # Fourth priority: arXiv (physics, math, CS, quantitative biology)
            arxiv_results = await self.arxiv.search_by_title(search_title)
            if arxiv_results and self._is_title_match(search_title, arxiv_results[0].title):
                best = arxiv_results[0]
                entry.resolved = True
                entry.doi = best.doi or entry.doi
                entry.source_url = best.oa_url
                return best

            # Fifth priority: Semantic Scholar
            s2_results = await self.semantic_scholar.search_by_title(search_title)
            if s2_results and self._is_title_match(search_title, s2_results[0].title):
                best = s2_results[0]
                entry.resolved = True
                entry.doi = best.doi or entry.doi
                entry.source_url = best.oa_url
                return best

        return None

    async def get_by_doi(self, doi: str) -> Optional[AcademicWork]:
        """Fetch metadata by DOI querying Crossref, OpenAlex, and Semantic Scholar."""
        clean_doi = doi.strip().replace("https://doi.org/", "").replace("http://dx.doi.org/", "")
        if clean_doi in self._doi_cache:
            return self._doi_cache[clean_doi]

        # 1. Try Crossref
        work = await self.crossref.get_by_doi(clean_doi)

        # 2. Enrich with OpenAlex (to get Open Access status, abstract, direct PDF link)
        alex_work = await self.openalex.get_by_doi(clean_doi)
        if alex_work:
            if work:
                # Merge enriched data
                work.is_open_access = alex_work.is_open_access or work.is_open_access
                work.oa_url = alex_work.oa_url or work.oa_url
                work.pdf_url = alex_work.pdf_url or work.pdf_url
                work.abstract = alex_work.abstract or work.abstract
                work.citation_count = alex_work.citation_count
            else:
                work = alex_work

        # 3. If still no abstract/PDF, try Europe PMC
        if work and (not work.abstract or not work.pdf_url):
            epmc_work = await self.europe_pmc.get_by_doi(clean_doi)
            if epmc_work:
                work.abstract = work.abstract or epmc_work.abstract
                work.pdf_url = work.pdf_url or epmc_work.pdf_url
                work.is_open_access = work.is_open_access or epmc_work.is_open_access

        # 4. If still missing, try Semantic Scholar
        if not work or not work.abstract:
            s2_work = await self.semantic_scholar.get_by_doi(clean_doi)
            if s2_work:
                if work:
                    work.abstract = work.abstract or s2_work.abstract
                    work.pdf_url = work.pdf_url or s2_work.pdf_url
                    work.is_open_access = work.is_open_access or s2_work.is_open_access
                else:
                    work = s2_work

        if work:
            self._doi_cache[clean_doi] = work

        return work

    def _is_title_match(self, t1: str, t2: str, threshold: float = 0.70) -> bool:
        """
        Check if two titles match closely using normalized token overlap.
        Prevents hallucinated or spurious matches without relying on naive substring.
        """
        def clean_tokens(text: str) -> set:
            words = "".join(c.lower() if c.isalnum() else " " for c in text).split()
            stop = {"the", "a", "an", "and", "or", "of", "in", "on", "for", "with", "by", "to", "at", "from"}
            return {w for w in words if w not in stop and len(w) > 2}

        tok1 = clean_tokens(t1)
        tok2 = clean_tokens(t2)
        if not tok1 or not tok2:
            return False

        intersection = tok1.intersection(tok2)
        overlap = len(intersection) / min(len(tok1), len(tok2))
        return overlap >= threshold
