"""
Bibliography Parser
Parses reference lists, extracts citation keys, resolves DOIs, and structures bibliographic metadata.
"""

import re
import logging
from typing import List, Optional, Tuple
from research_engine.core.models import BibEntry

logger = logging.getLogger(__name__)

DOI_PATTERN = re.compile(r"10\.\d{4,9}/[-._;()/:A-Za-z0-9]+", re.IGNORECASE)
ARXIV_PATTERN = re.compile(r"(?:arXiv:\s*|arxiv\.org/(?:abs|pdf)/)([0-9]{4}\.[0-9]{4,5}(?:v[0-9]+)?)", re.IGNORECASE)
YEAR_PATTERN = re.compile(r"\b(19\d{2}|20\d{2})\b")


class BibliographyParser:
    """Parses raw reference text into structured BibEntry objects."""

    def parse_bibliography(self, raw_bib_text: str) -> List[BibEntry]:
        """
        Extract numbered references like [1], [2] or 1., 2. from raw text.
        """
        if not raw_bib_text or not raw_bib_text.strip():
            return []

        entries: List[BibEntry] = []
        pattern = re.compile(r"(?:^|\n)\s*(?:\[(\d+)\]|(\d+)\.)\s*", re.MULTILINE)
        matches = list(pattern.finditer(raw_bib_text))

        if not matches:
            lines = [line.strip() for line in raw_bib_text.split("\n") if line.strip() and len(line.strip()) > 20]
            for idx, line in enumerate(lines, 1):
                entries.append(self._parse_single_entry(str(idx), line))
            return entries

        for i, match in enumerate(matches):
            key = match.group(1) or match.group(2)
            start_pos = match.end()
            end_pos = matches[i + 1].start() if i + 1 < len(matches) else len(raw_bib_text)
            ref_body = raw_bib_text[start_pos:end_pos].strip()

            cleaned_body = " ".join(ref_body.split())
            if cleaned_body:
                entries.append(self._parse_single_entry(key, cleaned_body))

        return entries

    def _parse_single_entry(self, key: str, text: str) -> BibEntry:
        # Extract DOI
        doi_match = DOI_PATTERN.search(text)
        doi = None
        if doi_match:
            doi = doi_match.group(0).rstrip(".,;")

        # Extract arXiv ID
        arxiv_match = ARXIV_PATTERN.search(text)
        arxiv_id = arxiv_match.group(1) if arxiv_match else None

        # Extract Year
        year_match = YEAR_PATTERN.findall(text)
        year = None
        if year_match:
            year = int(year_match[-1])

        # Extract title and authors with robust initial handling
        title, authors, journal = self._extract_metadata(text, year)

        return BibEntry(
            key=key,
            raw_text=text,
            title=title,
            authors=authors,
            year=year,
            journal=journal,
            doi=doi,
            arxiv_id=arxiv_id,
            resolved=bool(doi or arxiv_id),
            source_url=f"https://doi.org/{doi}" if doi else (f"https://arxiv.org/abs/{arxiv_id}" if arxiv_id else None)
        )

    def _extract_metadata(self, text: str, year: Optional[int]) -> Tuple[Optional[str], List[str], Optional[str]]:
        """Extract title, authors, and journal without breaking on author initials."""
        clean = text

        # 1. Quoted title check: "Title" or “Title”
        quote_match = re.search(r'["“]([^"”]+)["”]', clean)
        if quote_match and len(quote_match.group(1).split()) >= 2:
            title = quote_match.group(1).strip()
            prefix = clean[:quote_match.start()].strip()
            authors = [a.strip() for a in prefix.split(",") if a.strip() and not any(char.isdigit() for char in a)]
            suffix = clean[quote_match.end():].strip()
            journal = suffix[:80].strip("., ") if suffix else None
            return title, authors, journal

        # 2. Smart sentence/token splitter that protects initials like "A.", "J.", "et al."
        # Replace initials temporarily
        protected = re.sub(r"\b([A-Z])\.", r"\1<DOT>", clean)
        protected = re.sub(r"\bet\s+al\.", r"et al<DOT>", protected, flags=re.IGNORECASE)

        parts = [p.replace("<DOT>", ".").strip() for p in protected.split(".") if p.strip()]

        if len(parts) >= 2:
            authors_part = parts[0]
            authors = [a.strip() for a in authors_part.split(",") if a.strip()]
            title_part = parts[1]
            journal_part = parts[2] if len(parts) > 2 else None
            return title_part, authors, journal_part

        return clean, [], None
