"""
Citation Linker
Detects numeric citation markers (e.g. [1], [2, 3], [4-6]) in scientific text
and expands them into individual citation keys.
"""

import re
from typing import List, Tuple
from research_engine.core.models import CitationMarker

# Pattern matching numeric citation markers in brackets e.g. [1], [1, 2], [3-5], [2, 4–6]
CITATION_BRACKET_REGEX = re.compile(r"\[([0-9\s,\-–—]+)\]")


class CitationLinker:
    """Detects and expands numeric citation markers."""

    def find_citations_in_text(self, text: str, page_number: int = 1) -> List[CitationMarker]:
        """Find all citation markers in the given page text and return structured markers."""
        markers: List[CitationMarker] = []
        for match in CITATION_BRACKET_REGEX.finditer(text):
            raw_inside = match.group(1).strip()
            keys = self.expand_citation_range(raw_inside)
            if keys:
                # Find context sentence
                start_idx = max(0, match.start() - 150)
                end_idx = min(len(text), match.end() + 150)
                snippet = text[start_idx:end_idx].replace("\n", " ")

                markers.append(CitationMarker(
                    marker_text=match.group(0),
                    keys=keys,
                    page_number=page_number,
                    context_sentence=snippet.strip()
                ))
        return markers

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

        return sorted(list(set(keys)), key=lambda x: int(x) if x.isdigit() else x)
