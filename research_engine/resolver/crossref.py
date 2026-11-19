"""
Crossref REST API Integration Client
Retrieves authoritative publication metadata, DOIs, licensing and publishers.
Supports connection-pooled reusable HTTP clients.
"""

import logging
from typing import Optional, Dict, Any, List
import httpx
from research_engine.core.models import AcademicWork

logger = logging.getLogger(__name__)

CROSSREF_BASE_URL = "https://api.crossref.org/works"
USER_AGENT = "CiteVerify/1.0 (mailto:team-alphadev@hackathon.local; scientific-citation-verifier)"


class CrossrefClient:
    """Client for querying the Crossref REST API."""

    def __init__(self, timeout: float = 10.0):
        self.timeout = timeout
        self.headers = {
            "User-Agent": USER_AGENT,
            "Accept": "application/json",
        }

    async def get_by_doi(self, doi: str, client: Optional[httpx.AsyncClient] = None) -> Optional[AcademicWork]:
        """Fetch metadata by exact DOI."""
        clean_doi = doi.strip().replace("https://doi.org/", "").replace("http://dx.doi.org/", "")
        url = f"{CROSSREF_BASE_URL}/{clean_doi}"

        async def _execute(http_c: httpx.AsyncClient):
            response = await http_c.get(url, headers=self.headers)
            if response.status_code == 200:
                data = response.json().get("message", {})
                return self._parse_item(data)
            elif response.status_code == 404:
                logger.info("DOI not found in Crossref: %s", clean_doi)
            else:
                logger.warning("Crossref returned status %s for DOI %s", response.status_code, clean_doi)
            return None

        try:
            if client is not None:
                return await _execute(client)
            else:
                async with httpx.AsyncClient(timeout=self.timeout) as local_c:
                    return await _execute(local_c)
        except Exception as e:
            logger.error("Error querying Crossref by DOI %s: %s", clean_doi, e)
        return None

    async def search_bibliographic(
        self,
        title: str,
        author: Optional[str] = None,
        year: Optional[int] = None,
        client: Optional[httpx.AsyncClient] = None,
    ) -> List[AcademicWork]:
        """Search Crossref using title and author."""
        query_parts = [title]
        if author:
            query_parts.append(author)
        query = " ".join(query_parts)

        params: Dict[str, Any] = {
            "query.bibliographic": query,
            "rows": 3,
            "sort": "relevance",
        }
        if year:
            params["filter"] = f"from-pub-date:{year-1},until-pub-date:{year+1}"

        async def _execute(http_c: httpx.AsyncClient):
            response = await http_c.get(CROSSREF_BASE_URL, headers=self.headers, params=params)
            if response.status_code == 200:
                items = response.json().get("message", {}).get("items", [])
                return [self._parse_item(item) for item in items if item]
            return []

        try:
            if client is not None:
                return await _execute(client)
            else:
                async with httpx.AsyncClient(timeout=self.timeout) as local_c:
                    return await _execute(local_c)
        except Exception as e:
            logger.error("Error querying Crossref bibliographic search '%s': %s", query, e)
        return []

    def _parse_item(self, item: Dict[str, Any]) -> AcademicWork:
        titles = item.get("title", [])
        title = titles[0] if titles else "Untitled Publication"

        # Authors
        authors = []
        for a in item.get("author", []):
            given = a.get("given", "")
            family = a.get("family", "")
            name = f"{given} {family}".strip()
            if name:
                authors.append(name)

        # Publication Year
        year = None
        created = item.get("published-print") or item.get("published-online") or item.get("created")
        if created and "date-parts" in created and created["date-parts"]:
            parts = created["date-parts"][0]
            if parts:
                year = parts[0]

        # Venue
        venues = item.get("container-title", [])
        venue = venues[0] if venues else item.get("publisher", None)

        # DOI & links
        doi = item.get("DOI")
        oa_url = None
        pdf_url = None
        is_oa = False

        # Check links
        for link in item.get("link", []):
            content_type = link.get("content-type", "")
            if "pdf" in content_type:
                pdf_url = link.get("URL")
                is_oa = True
                break

        if not oa_url and item.get("resource", {}).get("primary", {}).get("URL"):
            oa_url = item["resource"]["primary"]["URL"]

        # Abstract if present in Crossref XML/text
        abstract = item.get("abstract")

        return AcademicWork(
            source_database="crossref",
            external_id=doi,
            doi=doi,
            title=title,
            authors=authors,
            year=year,
            venue=venue,
            is_open_access=is_oa,
            oa_url=oa_url or (f"https://doi.org/{doi}" if doi else None),
            pdf_url=pdf_url,
            abstract=abstract,
            has_full_text=False,
            raw_metadata=item,
        )
