"""
OpenAlex API Integration Client
Retrieves publication metadata, open-access status, direct PDF locations, and reconstructed abstracts.
"""

import logging
from typing import Optional, Dict, Any, List
import httpx
from research_engine.core.models import AcademicWork

logger = logging.getLogger(__name__)

OPENALEX_BASE_URL = "https://api.openalex.org/works"
USER_AGENT = "CiteVerify/1.0 (mailto:team-alphadev@hackathon.local)"


class OpenAlexClient:
    """Client for querying the OpenAlex API."""

    def __init__(self, timeout: float = 10.0):
        self.timeout = timeout
        self.headers = {
            "User-Agent": USER_AGENT,
            "Accept": "application/json",
        }

    async def get_by_doi(self, doi: str) -> Optional[AcademicWork]:
        """Fetch metadata by exact DOI."""
        clean_doi = doi.strip().replace("https://doi.org/", "").replace("http://dx.doi.org/", "")
        url = f"{OPENALEX_BASE_URL}/https://doi.org/{clean_doi}"
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url, headers=self.headers)
                if response.status_code == 200:
                    data = response.json()
                    return self._parse_work(data)
                elif response.status_code == 404:
                    logger.info("DOI not found in OpenAlex: %s", clean_doi)
        except Exception as e:
            logger.error("Error querying OpenAlex by DOI %s: %s", clean_doi, e)
        return None

    async def search_by_title(self, title: str, year: Optional[int] = None) -> List[AcademicWork]:
        """Search OpenAlex by title query."""
        params: Dict[str, Any] = {
            "search": title,
            "per_page": 3,
        }
        if year:
            params["filter"] = f"publication_year:{year}"

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(OPENALEX_BASE_URL, headers=self.headers, params=params)
                if response.status_code == 200:
                    results = response.json().get("results", [])
                    return [self._parse_work(r) for r in results if r]
        except Exception as e:
            logger.error("Error querying OpenAlex for title '%s': %s", title, e)
        return []

    def _reconstruct_abstract(self, inverted_index: Optional[Dict[str, List[int]]]) -> Optional[str]:
        """Reconstruct full text abstract from OpenAlex inverted index."""
        if not inverted_index:
            return None
        position_word_map = {}
        for word, positions in inverted_index.items():
            for pos in positions:
                position_word_map[pos] = word

        sorted_positions = sorted(position_word_map.keys())
        words = [position_word_map[pos] for pos in sorted_positions]
        return " ".join(words) if words else None

    def _parse_work(self, item: Dict[str, Any]) -> AcademicWork:
        title = item.get("title") or "Untitled Publication"

        # Authors
        authors = []
        for authorship in (item.get("authorships") or []):
            author_obj = authorship.get("author") or {}
            name = author_obj.get("display_name")
            if name:
                authors.append(name)

        year = item.get("publication_year")

        # Safely extract primary location and venue
        primary_loc = item.get("primary_location") or {}
        source = primary_loc.get("source") or {}
        venue = source.get("display_name")
        citation_count = item.get("cited_by_count")

        # Open Access info
        oa_info = item.get("open_access") or {}
        is_oa = oa_info.get("is_oa", False)
        oa_url = oa_info.get("oa_url")

        # PDF URL
        best_oa = item.get("best_oa_location") or {}
        pdf_url = best_oa.get("pdf_url")
        if not oa_url:
            oa_url = best_oa.get("landing_page_url")

        # Abstract
        abstract = self._reconstruct_abstract(item.get("abstract_inverted_index"))

        doi = item.get("doi")
        if doi and "doi.org/" in doi:
            doi = doi.split("doi.org/")[-1]

        return AcademicWork(
            source_database="openalex",
            external_id=item.get("id"),
            doi=doi,
            title=title,
            authors=authors,
            year=year,
            venue=venue,
            citation_count=citation_count,
            is_open_access=is_oa,
            oa_url=oa_url or (f"https://doi.org/{doi}" if doi else None),
            pdf_url=pdf_url,
            abstract=abstract,
            has_full_text=False,
            raw_metadata=item,
        )
