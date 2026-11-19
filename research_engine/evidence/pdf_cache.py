"""
CiteVerify Research PDF & Document Passage Cache
Prevents repeated network downloads and PyMuPDF parsing when multiple claims cite the same paper.
Enforces per-job or bounded LRU memory retention.
"""

from dataclasses import dataclass, field
from typing import List, Optional, Set
from collections import OrderedDict
from research_engine.core.models import AcademicWork


@dataclass
class ParsedSentence:
    """Pre-parsed candidate sentence from a research PDF with precomputed content keywords."""
    page_number: int
    text: str
    keywords: Set[str]


@dataclass
class CachedPaperDocument:
    """Cached content representation of a retrieved academic work."""
    canonical_id: str
    source_title: str
    source_database: str
    source_doi: Optional[str]
    source_url: Optional[str]
    pdf_url: Optional[str]
    sentences: List[ParsedSentence] = field(default_factory=list)
    fetch_failed: bool = False
    failure_reason: Optional[str] = None
    has_full_text: bool = False


class ResearchPdfCache:
    """
    Per-pipeline / bounded LRU cache for downloaded and parsed research PDFs.
    Avoids unbounded memory growth by evicting oldest entries when capacity is reached.
    """

    def __init__(self, max_entries: int = 50):
        self.max_entries = max_entries
        self._cache: OrderedDict[str, CachedPaperDocument] = OrderedDict()

    @staticmethod
    def get_canonical_id(work: AcademicWork) -> str:
        """Derive a stable, canonical identifier for an academic work."""
        if work.doi:
            clean_doi = work.doi.strip().lower().replace("https://doi.org/", "").replace("http://dx.doi.org/", "")
            return f"doi:{clean_doi}"
        if work.external_id:
            return f"{work.source_database}:{work.external_id.strip().lower()}"
        if work.pdf_url:
            return f"url:{work.pdf_url.strip()}"
        return f"title:{work.title.strip().lower()}"

    def get(self, canonical_id: str) -> Optional[CachedPaperDocument]:
        """Retrieve cached paper document if present, refreshing LRU position."""
        if canonical_id in self._cache:
            self._cache.move_to_end(canonical_id)
            return self._cache[canonical_id]
        return None

    def put(self, doc: CachedPaperDocument):
        """Insert or update a cached paper document, evicting oldest if max_entries is exceeded."""
        if doc.canonical_id in self._cache:
            self._cache.move_to_end(doc.canonical_id)
        self._cache[doc.canonical_id] = doc
        if len(self._cache) > self.max_entries:
            self._cache.popitem(last=False)

    def clear(self):
        """Flush the cache."""
        self._cache.clear()

    def __len__(self) -> int:
        return len(self._cache)
