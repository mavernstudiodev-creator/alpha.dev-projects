"""
Semantic Scholar Graph API Integration Client
Retrieves academic publications, open access PDFs, citations, and abstracts.
"""

import logging
from typing import Optional, Dict, Any, List
import httpx
from research_engine.core.models import AcademicWork

logger = logging.getLogger(__name__)

SEMANTIC_SCHOLAR_BASE_URL = "https://api.semanticscholar.org/graph/v1"
USER_AGENT = "CiteVerify/1.0 (team-alphadev; research-claim-verifier)"
FIELDS = "title,authors,year,venue,citationCount,isOpenAccess,openAccessPdf,abstract,externalIds"


class SemanticScholarClient:
    """Client for querying the Semantic Scholar Graph API."""

    def __init__(self, api_key: Optional[str] = None, timeout: float = 10.0):
        self.timeout = timeout
        self.headers = {
            "User-Agent": USER_AGENT,
            "Accept": "application/json",
        }
        if api_key:
            self.headers["x-api-key"] = api_key

    async def get_by_doi(self, doi: str) -> Optional[AcademicWork]:
        """Fetch metadata by DOI using Semantic Scholar."""
        clean_doi = doi.strip().replace("https://doi.org/", "").replace("http://dx.doi.org/", "")
        paper_id = f"DOI:{clean_doi}"
        url = f"{SEMANTIC_SCHOLAR_BASE_URL}/paper/{paper_id}"
        params = {"fields": FIELDS}
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url, headers=self.headers, params=params)
                if response.status_code == 200:
                    data = response.json()
                    return self._parse_paper(data, fallback_doi=clean_doi)
                elif response.status_code == 404:
                    logger.info("Paper not found in Semantic Scholar: %s", paper_id)
        except Exception as e:
            logger.error("Error querying Semantic Scholar by DOI %s: %s", clean_doi, e)
        return None

    async def search_by_title(self, title: str) -> List[AcademicWork]:
        """Search Semantic Scholar by paper title."""
        url = f"{SEMANTIC_SCHOLAR_BASE_URL}/paper/search"
        params = {
            "query": title,
            "limit": 3,
            "fields": FIELDS,
        }
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url, headers=self.headers, params=params)
                if response.status_code == 200:
                    data = response.json().get("data", [])
                    return [self._parse_paper(item) for item in data if item]
        except Exception as e:
            logger.error("Error querying Semantic Scholar search for '%s': %s", title, e)
        return []

    def _parse_paper(self, item: Dict[str, Any], fallback_doi: Optional[str] = None) -> AcademicWork:
        title = item.get("title") or "Untitled Publication"
        authors = [a.get("name", "") for a in item.get("authors", []) if a.get("name")]
        year = item.get("year")
        venue = item.get("venue")
        citation_count = item.get("citationCount")
        abstract = item.get("abstract")

        # Open Access info
        is_oa = item.get("isOpenAccess", False)
        oa_pdf = item.get("openAccessPdf") or {}
        pdf_url = oa_pdf.get("url")

        external_ids = item.get("externalIds") or {}
        doi = external_ids.get("DOI") or fallback_doi
        arxiv_id = external_ids.get("ArXiv")

        oa_url = pdf_url or (f"https://doi.org/{doi}" if doi else None)

        return AcademicWork(
            source_database="semantic_scholar",
            external_id=item.get("paperId"),
            doi=doi,
            title=title,
            authors=authors,
            year=year,
            venue=venue,
            citation_count=citation_count,
            is_open_access=is_oa or bool(pdf_url),
            oa_url=oa_url,
            pdf_url=pdf_url,
            abstract=abstract,
            has_full_text=False,
            raw_metadata=item,
        )
