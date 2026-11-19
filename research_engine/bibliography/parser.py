"""
Bibliography Parser
Parses reference lists, extracts citation keys, resolves DOIs, and structures bibliographic metadata
for both numeric bracket reference styles ([1], 1.) and author-year reference styles
(e.g., Conneau et al., 2020; Sakaguchi et al., 2017).
"""

import re
import logging
from typing import List, Optional, Tuple, Dict, Any
from research_engine.core.models import BibEntry

logger = logging.getLogger(__name__)

DOI_PATTERN = re.compile(r"10\.\d{4,9}/[-._;()/:A-Za-z0-9]+", re.IGNORECASE)
ARXIV_PATTERN = re.compile(r"(?:arXiv:\s*|arxiv\.org/(?:abs|pdf)/)([0-9]{4}\.[0-9]{4,5}(?:v[0-9]+)?)", re.IGNORECASE)
YEAR_PATTERN = re.compile(r"\b(19\d{2}|20\d{2})\b")


class BibliographyParser:
    """Parses raw reference text into structured BibEntry objects."""

    def parse_bibliography(self, raw_bib_text: str) -> List[BibEntry]:
        """
        Extract references from raw text.
        Automatically detects whether the bibliography uses numeric ordering ([1], 1.)
        or author-year styling (e.g. Conneau et al., 2020).
        """
        if not raw_bib_text or not raw_bib_text.strip():
            return []

        # 1. Test for sequentially numbered references
        numbered_pattern = re.compile(r"(?:^|\n)\s*(?:\[(\d+)\]|(\d+)\.)\s*", re.MULTILINE)
        matches = list(numbered_pattern.finditer(raw_bib_text))

        if self._is_truly_numbered(matches):
            return self._parse_numbered_bibliography(raw_bib_text, matches)

        # 2. Otherwise parse as author-year bibliography
        return self._parse_author_year_bibliography(raw_bib_text)

    def _is_truly_numbered(self, matches) -> bool:
        """Check if regex matches represent a genuine sequentially numbered bibliography starting near 1."""
        if not matches or len(matches) < 2:
            return False

        keys = [m.group(1) or m.group(2) for m in matches]
        # First key must start near 1 (1, 2, or 01)
        try:
            first_num = int(keys[0])
            if first_num > 5:
                return False
        except ValueError:
            return False

        # Check that numbers are mostly sequentially increasing small integers (< 500)
        valid_seq = 0
        for i in range(min(10, len(keys))):
            try:
                num = int(keys[i])
                if 1 <= num <= 500:
                    valid_seq += 1
            except ValueError:
                pass

        return valid_seq >= 2

    def _parse_numbered_bibliography(self, raw_bib_text: str, matches) -> List[BibEntry]:
        """Parse sequentially numbered references ([1], [2], 1., 2.)."""
        entries: List[BibEntry] = []
        for i, match in enumerate(matches):
            key = match.group(1) or match.group(2)
            start_pos = match.end()
            end_pos = matches[i + 1].start() if i + 1 < len(matches) else len(raw_bib_text)
            ref_body = raw_bib_text[start_pos:end_pos].strip()

            cleaned_body = " ".join(ref_body.split())
            if cleaned_body:
                entries.append(self._parse_single_entry(key, cleaned_body))

        return entries

    def _parse_author_year_bibliography(self, raw_bib_text: str) -> List[BibEntry]:
        """
        Parse non-numbered author-year bibliography entries.
        Supports double-newline split entries as well as layout-segmented lines.
        """
        # Split by double newline if already segmented by PDFExtractor
        chunks = [c.strip() for c in re.split(r"\n\s*\n+", raw_bib_text) if c.strip()]

        if len(chunks) <= 1:
            # Fallback: segment text by detecting lines that start with author names followed by a 4-digit year
            lines = [l.strip() for l in raw_bib_text.split("\n") if l.strip()]
            chunks = self._segment_author_year_lines(lines)

        entries: List[BibEntry] = []
        for chunk in chunks:
            clean = " ".join(chunk.split())
            clean = re.sub(r"(\b\w+)-\s+(\w+\b)", r"\1\2", clean)  # de-hyphenate words
            if len(clean) < 15:
                continue

            entry = self._parse_single_author_year_entry(clean)
            if entry:
                entries.append(entry)

        return entries

    def _segment_author_year_lines(self, lines: List[str]) -> List[str]:
        """Fallback segmentation of raw bibliography lines into individual author-year entries."""
        non_authors = {
            "in", "proceedings", "pages", "volume", "computer", "speech", "journal",
            "advances", "arxiv", "doi", "report", "press", "for", "and", "with", "the"
        }
        chunks: List[str] = []
        cur_lines: List[str] = []

        for i, line in enumerate(lines):
            is_start = False
            first_word = re.split(r"[\s,\.\-]+", line)[0].lower() if line else ""

            if line and line[0].isupper() and first_word not in non_authors:
                # Lookahead for 4-digit year in next 4 lines
                lookahead = " ".join(lines[i:min(len(lines), i + 4)])
                year_match = re.search(r"\b(19\d\d|20\d\d)[a-z]?\b", lookahead)
                if year_match and year_match.start() < 250:
                    # Check that previous line didn't end with a hanging continuation indicator
                    if not cur_lines:
                        is_start = True
                    else:
                        prev = cur_lines[-1].rstrip()
                        if not (prev.endswith(",") or prev.endswith("-") or prev.endswith("and")):
                            is_start = True

            if is_start and cur_lines:
                chunks.append(" ".join(cur_lines))
                cur_lines = []

            cur_lines.append(line)

        if cur_lines:
            chunks.append(" ".join(cur_lines))

        return chunks

    def _parse_single_author_year_entry(self, text: str) -> Optional[BibEntry]:
        """Parse one author-year bibliographic entry into a structured BibEntry."""
        # 1. Extract DOI & arXiv ID
        doi_match = DOI_PATTERN.search(text)
        doi = doi_match.group(0).rstrip(".,;") if doi_match else None

        arxiv_match = ARXIV_PATTERN.search(text)
        arxiv_id = arxiv_match.group(1) if arxiv_match else None

        # 2. Extract Year
        year_match = YEAR_PATTERN.search(text)
        year = int(year_match.group(1)) if year_match else None

        # 3. Authors part (text before the first publication year)
        if year_match:
            authors_raw = text[:year_match.start()].strip("., ")
            after_year = text[year_match.end():].lstrip(". ")
        else:
            authors_raw = text[:60]
            after_year = text

        author_tokens = re.split(r",\s*|\s+\band\b\s*|\s+&\s*", authors_raw)
        authors = [re.sub(r"^(?:and|&)\s+", "", a).strip() for a in author_tokens if a.strip()]

        def get_surname(name_str: str) -> str:
            cleaned = re.sub(r"\b[A-Z]\.", "", name_str).strip()
            tokens = cleaned.split()
            return tokens[-1] if tokens else name_str

        surnames = [get_surname(a) for a in authors if get_surname(a)]

        # 4. Form canonical key and aliases
        if len(surnames) == 1:
            canonical_key = f"{surnames[0]}, {year}" if year else surnames[0]
        elif len(surnames) == 2:
            canonical_key = f"{surnames[0]} and {surnames[1]}, {year}" if year else f"{surnames[0]} and {surnames[1]}"
        elif len(surnames) > 2:
            canonical_key = f"{surnames[0]} et al., {year}" if year else f"{surnames[0]} et al."
        else:
            canonical_key = f"Ref-{year}" if year else "Ref"

        aliases = []
        if year and surnames:
            aliases.append(f"{surnames[0].lower()} {year}")
            aliases.append(f"{surnames[0].lower()} et al {year}")
            if len(surnames) == 2:
                aliases.append(f"{surnames[0].lower()} and {surnames[1].lower()} {year}")
                aliases.append(f"{surnames[0].lower()} {surnames[1].lower()} {year}")

        # 5. Extract Title
        title_match = re.search(r"^(.*?)(?:\.\s+|\s+In\s+Proceedings|\s+In\s+Advances|\s+In\s+ACL|\s+Computer\s+Speech)", after_year)
        if title_match and len(title_match.group(1).strip()) > 5:
            title = title_match.group(1).strip()
        else:
            parts = after_year.split(".")
            title = parts[0].strip() if parts else after_year[:80]

        return BibEntry(
            key=canonical_key,
            raw_text=text,
            title=title,
            authors=authors,
            year=year,
            journal=None,
            doi=doi,
            arxiv_id=arxiv_id,
            resolved=bool(doi or arxiv_id),
            source_url=f"https://doi.org/{doi}" if doi else (f"https://arxiv.org/abs/{arxiv_id}" if arxiv_id else None),
            aliases=aliases,
        )

    def _parse_single_entry(self, key: str, text: str) -> BibEntry:
        """Parse one sequentially numbered bibliographic entry."""
        doi_match = DOI_PATTERN.search(text)
        doi = doi_match.group(0).rstrip(".,;") if doi_match else None

        arxiv_match = ARXIV_PATTERN.search(text)
        arxiv_id = arxiv_match.group(1) if arxiv_match else None

        year_match = YEAR_PATTERN.findall(text)
        year = int(year_match[-1]) if year_match else None

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
            source_url=f"https://doi.org/{doi}" if doi else (f"https://arxiv.org/abs/{arxiv_id}" if arxiv_id else None),
            aliases=[f"[{key}]", key],
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
