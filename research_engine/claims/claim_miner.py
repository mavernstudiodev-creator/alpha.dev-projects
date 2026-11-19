"""
Claim Miner
Extracts scientific claims from academic text and correlates them with citation markers.
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
    r"\b%|\bpercent\b|\bp\s*<\s*0\.\d+",
]

CLAIM_SIGNAL_REGEX = re.compile("|".join(CLAIM_SIGNAL_KEYWORDS), re.IGNORECASE)

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

        for page in pages:
            if page.page_num >= bib_start_page:
                continue

            text = page.text
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
                unique_keys = sorted(list(set(all_keys)), key=lambda x: int(x) if x.isdigit() else x)

                if not unique_keys:
                    continue

                is_claim = bool(CLAIM_SIGNAL_REGEX.search(clean_s))
                if is_claim or len(clean_s) > 35:
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
        """Split text into sentences while respecting abbreviations and citation brackets."""
        cleaned = re.sub(r"\n(?=[a-z])", " ", text)
        cleaned = re.sub(r"\s+", " ", cleaned)
        raw_sentences = re.split(r"(?<=[.!?])\s+(?=[A-Z\[])", cleaned)
        return [s.strip() for s in raw_sentences if s.strip()]

    def _clean_statement(self, sentence: str) -> str:
        """Standardize the proposition statement and strip leading section prefixes."""
        cleaned = SECTION_PREFIX_REGEX.sub("", sentence.strip())
        return cleaned.strip()
