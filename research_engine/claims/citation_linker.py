"""
Citation Linker
Detects numeric citation markers (e.g. [1], [2, 3], [4-6]) and author-year citations
(e.g. (Conneau et al., 2020), Sakaguchi et al. (2017)) in scientific text
and expands them into individual citation keys.
"""

import re
from typing import List, Tuple, Set
from research_engine.core.models import CitationMarker

# Pattern matching numeric citation markers in brackets e.g. [1], [1, 2], [3-5], [2, 4–6]
CITATION_BRACKET_REGEX = re.compile(r"\[([0-9\s,\-–—]+)\]")

# Pattern matching narrative author-year citations: Author et al. (2020) or Author and Author (2019) or Author (2018)
NARRATIVE_AUTHOR_YEAR_REGEX = re.compile(
    r"\b([A-Z][a-zA-Z\u00C0-\u024F\-\']+(?:\s+and\s+[A-Z][a-zA-Z\u00C0-\u024F\-\']+|\s+et\s+al\.?))\s*\(((?:19\d\d|20\d\d)[a-z]?)\)"
)

# Pattern matching parenthetical citations containing a 4-digit year: (Author et al., 2020) or (Author, 2019; Other, 2018)
PAREN_AUTHOR_YEAR_REGEX = re.compile(
    r"\(([^)]*?\b(?:19\d\d|20\d\d)[a-z]?[^)]*?)\)"
)

# Non-citation false positives to reject inside parentheses
NON_CITATION_TERMS = {
    "table", "figure", "fig", "appendix", "section", "sec", "equation", "eq",
    "workshop", "proceedings", "conference", "symposium", "nlp4call", "acm", "ieee",
    "dataset", "corpus", "version", "task"
}


class CitationLinker:
    """Detects and expands numeric and author-year citation markers."""

    def find_citations_in_text(self, text: str, page_number: int = 1) -> List[CitationMarker]:
        """Find all citation markers in the given page text and return structured markers."""
        markers: List[CitationMarker] = []
        narrative_spans: Set[Tuple[int, int]] = set()

        # 1. Detect numeric citations in brackets: [1], [2, 3], [4-6]
        for match in CITATION_BRACKET_REGEX.finditer(text):
            raw_inside = match.group(1).strip()
            keys = self.expand_citation_range(raw_inside)
            if keys:
                snippet = self._get_context_snippet(text, match.start(), match.end())
                markers.append(CitationMarker(
                    marker_text=match.group(0),
                    keys=keys,
                    page_number=page_number,
                    context_sentence=snippet,
                ))

        # 2. Detect narrative author-year citations: Sakaguchi et al. (2017)
        for match in NARRATIVE_AUTHOR_YEAR_REGEX.finditer(text):
            author = match.group(1).strip()
            year = match.group(2).strip()
            canonical_key = f"{author}, {year}"
            narrative_spans.add((match.start(), match.end()))
            snippet = self._get_context_snippet(text, match.start(), match.end())
            markers.append(CitationMarker(
                marker_text=match.group(0),
                keys=[canonical_key],
                page_number=page_number,
                context_sentence=snippet,
            ))

        # 3. Detect parenthetical author-year citations: (Rei and Yannakoudakis, 2016; Conneau et al., 2020)
        for match in PAREN_AUTHOR_YEAR_REGEX.finditer(text):
            # If this paren is part of an already matched narrative citation, skip
            if any(start <= match.start() and match.end() <= end for start, end in narrative_spans):
                continue

            raw_inside = match.group(1).strip()

            # Skip standalone year inside paren if preceded immediately by author (already handled in narrative)
            if re.match(r"^(?:19\d\d|20\d\d)[a-z]?$", raw_inside):
                prefix = text[:match.start()].rstrip()
                if re.search(r"\b[A-Z][a-zA-Z\u00C0-\u024F\-\']+(?:\s+and\s+[A-Z][a-zA-Z\u00C0-\u024F\-\']+|\s+et\s+al\.?)$", prefix):
                    continue

            # Split multiple citations separated by semicolons
            parts = [p.strip() for p in raw_inside.split(";") if p.strip()]
            extracted_keys: List[str] = []

            for part in parts:
                clean_part = re.sub(r"^(?:e\.g\.?,?|cf\.?,?|see|also)\s+", "", part, flags=re.I).strip()
                # Check for false positive markers like "(Table 1, 2020)" or "(NLP4CALL 2023)"
                tokens = [t.lower().strip(".,;:()") for t in clean_part.split()]
                if any(t in NON_CITATION_TERMS for t in tokens):
                    continue

                ay_match = re.search(
                    r"([A-Z][a-zA-Z\u00C0-\u024F\-\']+(?:\s+and\s+[A-Z][a-zA-Z\u00C0-\u024F\-\']+|\s+et\s+al\.?)?),?\s*\b(19\d\d|20\d\d)[a-z]?\b",
                    clean_part,
                )
                if ay_match and ay_match.group(1):
                    author = ay_match.group(1).strip()
                    year = ay_match.group(2).strip()
                    extracted_keys.append(f"{author}, {year}")

            if extracted_keys:
                snippet = self._get_context_snippet(text, match.start(), match.end())
                markers.append(CitationMarker(
                    marker_text=match.group(0),
                    keys=extracted_keys,
                    page_number=page_number,
                    context_sentence=snippet,
                ))

        return markers

    def _get_context_snippet(self, text: str, start: int, end: int) -> str:
        """Extract a clean 300-char context window around the matched marker."""
        start_idx = max(0, start - 150)
        end_idx = min(len(text), end + 150)
        return text[start_idx:end_idx].replace("\n", " ").strip()

    def expand_citation_range(self, content: str) -> List[str]:
        """
        Expands citation strings like '1, 2' or '3-5' or '1, 4-6' into ['1', '2', '3', ...].
        """
        keys: List[str] = []
        # Replace unicode dashes with standard hyphen
        normalized = content.replace("–", "-").replace("—", "-")
        parts = [p.strip() for p in normalized.split(",") if p.strip()]

        for part in parts:
            if "-" in part:
                range_bounds = part.split("-")
                if len(range_bounds) == 2 and range_bounds[0].strip().isdigit() and range_bounds[1].strip().isdigit():
                    low = int(range_bounds[0].strip())
                    high = int(range_bounds[1].strip())
                    if 0 < low <= high and (high - low) <= 30:  # reasonable upper bound
                        for num in range(low, high + 1):
                            keys.append(str(num))
                        continue
            elif part.isdigit():
                keys.append(part)

        return sorted(set(keys), key=lambda value: (0, int(value)) if value.isdigit() else (1, value.casefold()))
