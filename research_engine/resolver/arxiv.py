"""
arXiv API Integration Client
Retrieves preprints, open-access PDFs, abstracts and metadata from arXiv.
"""

import logging
import xml.etree.ElementTree as ET
from typing import Optional, List
import httpx
from research_engine.core.models import AcademicWork

logger = logging.getLogger(__name__)

ARXIV_BASE_URL = "https://export.arxiv.org/api/query"
USER_AGENT = "CiteVerify/1.0 (team-alphadev; research-claim-verifier)"
ATOM_NS = {"atom": "http://www.w3.org/2005/Atom", "arxiv": "http://arxiv.org/schemas/atom"}


class ArxivClient:
    """Client for querying the arXiv API."""

    def __init__(self, timeout: float = 12.0):
        self.timeout = timeout
        self.headers = {
            "User-Agent": USER_AGENT,
        }

    async def get_by_arxiv_id(self, arxiv_id: str) -> Optional[AcademicWork]:
        """Fetch metadata by clean arXiv ID (e.g. 1706.03762)."""
        clean_id = arxiv_id.strip().lower().replace("arxiv:", "").replace("abs/", "").replace("pdf/", "").replace(".pdf", "")
        params = {"id_list": clean_id, "max_results": 1}
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(ARXIV_BASE_URL, headers=self.headers, params=params)
                if response.status_code == 200:
                    works = self._parse_feed(response.text)
                    if works:
                        return works[0]
        except Exception as e:
            logger.error("Error querying arXiv for ID %s: %s", clean_id, e)
        return None

    async def search_by_title(self, title: str) -> List[AcademicWork]:
        """Search arXiv by paper title."""
        clean_title = "".join(c for c in title if c.isalnum() or c.isspace()).strip()
        params = {
            "search_query": f'ti:"{clean_title}"',
            "max_results": 3,
            "sortBy": "relevance",
        }
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(ARXIV_BASE_URL, headers=self.headers, params=params)
                if response.status_code == 200:
                    return self._parse_feed(response.text)
        except Exception as e:
            logger.error("Error querying arXiv search for title '%s': %s", title, e)
        return []

    def _parse_feed(self, xml_text: str) -> List[AcademicWork]:
        works = []
        try:
            root = ET.fromstring(xml_text)
            entries = root.findall("atom:entry", ATOM_NS)
            for entry in entries:
                id_elem = entry.find("atom:id", ATOM_NS)
                if id_elem is None or not id_elem.text:
                    continue
                arxiv_url = id_elem.text.strip()
                arxiv_id = arxiv_url.split("/abs/")[-1] if "/abs/" in arxiv_url else arxiv_url

                title_elem = entry.find("atom:title", ATOM_NS)
                title = " ".join(title_elem.text.split()) if title_elem is not None and title_elem.text else "Untitled"

                summary_elem = entry.find("atom:summary", ATOM_NS)
                abstract = " ".join(summary_elem.text.split()) if summary_elem is not None and summary_elem.text else None

                published_elem = entry.find("atom:published", ATOM_NS)
                year = int(published_elem.text[:4]) if published_elem is not None and published_elem.text else None

                authors = []
                for author_elem in entry.findall("atom:author", ATOM_NS):
                    name_elem = author_elem.find("atom:name", ATOM_NS)
                    if name_elem is not None and name_elem.text:
                        authors.append(name_elem.text.strip())

                # PDF link
                pdf_url = f"https://arxiv.org/pdf/{arxiv_id}.pdf"
                for link in entry.findall("atom:link", ATOM_NS):
                    if link.get("title") == "pdf" or link.get("type") == "application/pdf":
                        pdf_url = link.get("href")
                        break

                # DOI if cross-referenced
                doi_elem = entry.find("arxiv:doi", ATOM_NS)
                doi = doi_elem.text.strip() if doi_elem is not None and doi_elem.text else None

                works.append(AcademicWork(
                    source_database="arxiv",
                    external_id=arxiv_id,
                    doi=doi,
                    title=title,
                    authors=authors,
                    year=year,
                    venue="arXiv",
                    is_open_access=True,  # arXiv is open access
                    oa_url=arxiv_url,
                    pdf_url=pdf_url,
                    abstract=abstract,
                    has_full_text=False,
                    raw_metadata={"arxiv_id": arxiv_id, "url": arxiv_url},
                ))
        except Exception as e:
            logger.error("Error parsing arXiv XML: %s", e)
        return works
