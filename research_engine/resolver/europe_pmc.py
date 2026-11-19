"""
Europe PMC REST API Integration Client
Retrieves biomedical research articles, open-access full text links, and abstracts.
"""

import logging
from typing import Optional, Dict, Any, List
import httpx
from research_engine.core.models import AcademicWork

logger = logging.getLogger(__name__)

EUROPE_PMC_BASE_URL = "https://www.ebi.ac.uk/europepmc/webservices/rest/search"
USER_AGENT = "CiteVerify/1.0 (team-alphadev; research-claim-verifier)"


class EuropePMCClient:
    """Client for querying the Europe PMC API."""

    def __init__(self, timeout: float = 10.0):
        self.timeout = timeout
        self.headers = {
            "User-Agent": USER_AGENT,
            "Accept": "application/json",
        }

    async def get_by_doi(self, doi: str) -> Optional[AcademicWork]:
        """Fetch publication by DOI."""
        clean_doi = doi.strip().replace("https://doi.org/", "").replace("http://dx.doi.org/", "")
        query = f'DOI:"{clean_doi}"'
        params = {
            "query": query,
            "format": "json",
            "resultType": "core",
            "pageSize": 1,
        }
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(EUROPE_PMC_BASE_URL, headers=self.headers, params=params)
                if response.status_code == 200:
                    results = response.json().get("resultList", {}).get("result", [])
                    if results:
                        return self._parse_result(results[0], fallback_doi=clean_doi)
        except Exception as e:
            logger.error("Error querying Europe PMC for DOI %s: %s", clean_doi, e)
        return None

    async def search_by_title(self, title: str) -> List[AcademicWork]:
        """Search Europe PMC by title."""
        query = f'TITLE:"{title}"'
        params = {
            "query": query,
            "format": "json",
            "resultType": "core",
            "pageSize": 3,
        }
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(EUROPE_PMC_BASE_URL, headers=self.headers, params=params)
                if response.status_code == 200:
                    results = response.json().get("resultList", {}).get("result", [])
                    return [self._parse_result(r) for r in results if r]
        except Exception as e:
            logger.error("Error querying Europe PMC search for '%s': %s", title, e)
        return []

    def _parse_result(self, item: Dict[str, Any], fallback_doi: Optional[str] = None) -> AcademicWork:
        title = item.get("title") or "Untitled Publication"
        author_str = item.get("authorString", "")
        authors = [a.strip() for a in author_str.split(",") if a.strip()]

        year = None
        pub_year = item.get("pubYear")
        if pub_year and pub_year.isdigit():
            year = int(pub_year)

        venue = item.get("journalTitle")
        citation_count = item.get("citedByCount")
        abstract = item.get("abstractText")

        # Open Access checking
        is_oa = item.get("isOpenAccess") == "Y"
        doi = item.get("doi") or fallback_doi

        # Links
        pdf_url = None
        oa_url = None
        for url_info in item.get("fullTextUrlList", {}).get("fullTextUrl", []):
            doc_style = url_info.get("documentStyle", "")
            if doc_style == "pdf" and not pdf_url:
                pdf_url = url_info.get("url")
            elif not oa_url:
                oa_url = url_info.get("url")

        return AcademicWork(
            source_database="europe_pmc",
            external_id=item.get("id"),
            doi=doi,
            title=title,
            authors=authors,
            year=year,
            venue=venue,
            citation_count=citation_count,
            is_open_access=is_oa or bool(pdf_url),
            oa_url=oa_url or (f"https://doi.org/{doi}" if doi else None),
            pdf_url=pdf_url,
            abstract=abstract,
            has_full_text=False,
            raw_metadata=item,
        )
