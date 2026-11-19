"""
Claim Miner
Extracts scientific claims from academic text and correlates them with citation markers.
Supports both numeric bracket citations ([1]) and author-year citations ((Conneau et al., 2020)).
"""

import re
import uuid
from typing import List, Any
from research_engine.core.models import Claim
from research_engine.claims.citation_linker import CitationLinker

CLAIM_SIGNAL_KEYWORDS = [
    r"\bdemonstrate(?:s|d)?\b",
    r"\bshow(?:s|ed|n)?\b",
    r"\bpropose(?:s|d)?\b",
    r"\bfind(?:s)?\b|\bfound\b",
    r"\breport(?:s|ed)?\b",
    r"\bconfirm(?:s|ed)?\b",
    r"\bconclude(?:s|d)?\b",
    r"\bobserved?\b",
    r"\bachieve(?:s|d)?\b",
    r"\boutperform(?:s|ed)?\b",
    r"\bsignificantly\b",
    r"\bincrease(?:s|d)?\b",
    r"\bdecrease(?:s|d)?\b",
    r"\breduce(?:s|d)?\b",
    r"\benhance(?:s|d)?\b",
    r"\bcorrelat(?:es?|ed|ion)\b",
    r"\bindicate(?:s|d)?\b",
    r"\bsuggest(?:s|ed)?\b",
    r"\bregulat(?:es?|ed|ion)\b",
    r"\bidentif(?:y|ies|ied)\b",
    r"\bconduct(?:ed)?\b",
    r"\btrain(?:ed)?\b",
    r"\bdevelop(?:ed)?\b",
    r"\b%|\bpercent\b|\bp\s*<\s*0\.\d+",
]

CLAIM_SIGNAL_REGEX = re.compile("|".join(CLAIM_SIGNAL_KEYWORDS), re.IGNORECASE)

# Keep bibliography content and imperative citation-checking instructions out of claim mining.
BIBLIOGRAPHY_HEADER_REGEX = re.compile(
    r"(?im)^\\s*(?:\\d+(?:\\.\\d+)*\\.?\\s+)?(?:references|bibliography|works\\s+cited|literature\\s+cited)\\s*$"
)
INSTRUCTIONAL_SENTENCE_REGEX = re.compile(
    r"\\b(?:find|detect|identify|extract|map|search for|look for|list|provide|write|enter|add|upload|select|click|complete|check|verify)\\s+(?:the\\s+)?(?:citations?|references?|bibliography|claim list|reference list)\\b|"
    r"\\b(?:citation detection|citation mapping|citation extraction|reference list)\\b[^.!?]{0,120}\\b(?:such as|e\\.g\\.)\\b",
    re.IGNORECASE,
)

# Strips leading section titles like "1. Introduction", "2. Methodology", "Abstract"
SECTION_PREFIX_REGEX = re.compile(
    r"^(?:(?:\d+\.?\s*)?(?:abstract|introduction|background|methodology|methods|experiments|results|discussion|related\s+work|conclusion)\s+)+",
    re.IGNORECASE,
)


class ClaimMiner:
    """Extracts scientific claims and pairs them with citation keys."""

    def __init__(self):
        self.citation_linker = CitationLinker()

    def extract_claims_from_pages(self, pages: List[Any], bib_start_page: int = 9999) -> List[Claim]:
        """
        Scan document pages up to the bibliography section and extract scientific claims
        that cite bibliographic references.
        """
        claims: List[Claim] = []
        seen_claims = set()

        for page in pages:
            if page.page_num > bib_start_page:
                continue

            text = page.text
            if page.page_num == bib_start_page:
                bibliography_heading = BIBLIOGRAPHY_HEADER_REGEX.search(text)
                if not bibliography_heading:
                    continue
                text = text[:bibliography_heading.start()]

            sentences = self._split_into_sentences(text)

            for sentence in sentences:
                clean_s = " ".join(sentence.split())
                if len(clean_s) < 25:
                    continue

                markers = self.citation_linker.find_citations_in_text(clean_s, page_number=page.page_num)
                if not markers:
                    continue

                all_keys: List[str] = []
                for m in markers:
                    all_keys.extend(m.keys)
                unique_keys = sorted(
                    set(all_keys),
                    key=lambda value: (0, int(value)) if value.isdigit() else (1, value.casefold()),
                )

                if not unique_keys:
                    continue

                # Citation examples and user instructions are not scientific propositions.
                if not CLAIM_SIGNAL_REGEX.search(clean_s) or INSTRUCTIONAL_SENTENCE_REGEX.search(clean_s):
                    continue

                normalized = re.sub(r"\\W+", " ", clean_s.casefold()).strip()
                deduplication_key = (page.page_num, normalized, tuple(unique_keys))
                if deduplication_key in seen_claims:
                    continue
                seen_claims.add(deduplication_key)

                claim_id = f"CLM-{page.page_num}-{uuid.uuid4().hex[:6].upper()}"
                    statement = self._clean_statement(clean_s)

                    claims.append(Claim(
                        claim_id=claim_id,
                        statement=statement,
                        page_number=page.page_num,
                        context_sentence=clean_s,
                        citation_keys=unique_keys,
                    ))

        return claims

    def _split_into_sentences(self, text: str) -> List[str]:
        """Split text into sentences while respecting abbreviations, initials, and citation brackets."""
        # 1. Join hyphenated words split across line breaks (e.g. "semi-\ncharacter" -> "semicharacter")
        cleaned = re.sub(r"(\b\w+)-\n\s*(\w+\b)", r"\1\2", text)

        # 2. Protect author abbreviations like "et al." and initials like "J." or "A."
        cleaned = re.sub(r"\bet\s+al\.", "et al<DOT>", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\b([A-Z])\.", r"\1<DOT>", cleaned)
        cleaned = re.sub(r"\b(?:e\.g\.|i\.e\.|cf\.|vs\.)", lambda m: m.group(0).replace(".", "<DOT>"), cleaned, flags=re.IGNORECASE)

        # 3. Clean linebreaks inside paragraphs
        cleaned = re.sub(r"\n(?=[a-z])", " ", cleaned)
        cleaned = re.sub(r"\s+", " ", cleaned)

        # 4. Split sentences at punctuation boundaries
        raw_sentences = re.split(r"(?<=[.!?])\s+(?=[A-Z\[\"])", cleaned)
        return [s.replace("<DOT>", ".").strip() for s in raw_sentences if s.strip()]

    def _clean_statement(self, sentence: str) -> str:
        """Standardize the proposition statement and strip leading section prefixes."""
        cleaned = SECTION_PREFIX_REGEX.sub("", sentence.strip())
        return cleaned.strip()
