"""
PDF Extractor using PyMuPDF (fitz)
Extracts page-by-page structured text, bounding boxes, and section boundaries.
Safely detects empty, corrupt, and scanned (image-only) PDFs.
Supports layout-aware author-year and numeric bibliography extraction.
"""

import os
import re
import logging
from typing import Dict, Any, List, Optional, Tuple
import pymupdf as fitz

logger = logging.getLogger(__name__)


class PDFExtractionError(Exception):
    """Raised when PDF extraction fails due to corruption, invalid format, or empty file."""
    pass


class ScannedPDFError(PDFExtractionError):
    """Raised when a PDF contains no extractable text (e.g. scanned image-only document)."""
    pass


class ExtractedPage:
    def __init__(self, page_num: int, text: str, blocks: List[Dict[str, Any]]):
        self.page_num = page_num
        self.text = text
        self.blocks = blocks


class PDFDocumentStructure:
    def __init__(self, filename: str, total_pages: int, pages: List[ExtractedPage], full_text: str, is_scanned: bool = False):
        self.filename = filename
        self.total_pages = total_pages
        self.pages = pages
        self.full_text = full_text
        self.is_scanned = is_scanned
        self.bibliography_text: Optional[str] = None
        self.bibliography_start_page: Optional[int] = None


class PDFExtractor:
    """Extracts text, structural sections, and layout data from PDF documents using PyMuPDF."""

    # Matches References/Bibliography header either as full block or line header
    BIB_HEADER_LINE_REGEX = re.compile(
        r"(?:^|\n)\s*(?:[0-9\.\s]*)(?:references|bibliography|works\s+cited|literature\s+cited)\s*(?:\n|$)",
        re.IGNORECASE,
    )

    def extract_pdf(self, file_path: str) -> PDFDocumentStructure:
        """Parse a local PDF file and extract pages and sections. Safely validates PDF integrity."""
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"PDF file not found: {file_path}")

        file_size = os.path.getsize(file_path)
        if file_size == 0:
            raise PDFExtractionError(f"PDF file is completely empty (0 bytes): {os.path.basename(file_path)}")

        try:
            doc = fitz.open(file_path)
        except Exception as e:
            raise PDFExtractionError(f"Failed opening PDF document '{os.path.basename(file_path)}': {str(e)}")

        pages: List[ExtractedPage] = []
        full_text_parts: List[str] = []
        total_pages = len(doc)
        structured_bib_text = None

        try:
            if total_pages == 0:
                raise PDFExtractionError(f"PDF document contains 0 pages: {os.path.basename(file_path)}")

            bib_start_page = None
            bib_text_lines: List[str] = []
            in_bibliography = False

            for page_idx in range(total_pages):
                page = doc[page_idx]
                page_num = page_idx + 1
                raw_page_text = page.get_text("text") or ""
                # Strip running conference headers/footers from page text
                clean_page_text = self._strip_running_headers_footers(raw_page_text)
                full_text_parts.append(clean_page_text)

                blocks = page.get_text("blocks") or []
                block_dicts = []
                for b in blocks:
                    b_text = b[4].strip() if len(b) > 4 else ""
                    block_dicts.append({
                        "bbox": [b[0], b[1], b[2], b[3]],
                        "text": b_text,
                        "type": b[6] if len(b) > 6 else 0,
                    })

                    if not in_bibliography:
                        match = self.BIB_HEADER_LINE_REGEX.search(b_text)
                        if match:
                            in_bibliography = True
                            bib_start_page = page_num
                            after_header = b_text[match.end():].strip()
                            if after_header:
                                bib_text_lines.append(after_header)
                    elif in_bibliography:
                        bib_text_lines.append(b_text)

                pages.append(ExtractedPage(page_num=page_num, text=clean_page_text, blocks=block_dicts))

            # If bibliography was located, check if it requires layout-aware author-year segmentation
            if in_bibliography and bib_start_page:
                raw_bib_combined = "\n".join(bib_text_lines)
                is_numbered = self._is_numbered_bib_text(raw_bib_combined)
                if not is_numbered:
                    structured_bib_text = self._extract_author_year_bib_layout(doc, bib_start_page)

        finally:
            doc.close()

        full_text = "\n\n".join(full_text_parts).strip()

        # Check for scanned (image-only) document where text extraction yields no readable text
        alphanumeric_count = sum(1 for c in full_text if c.isalnum())
        if alphanumeric_count < 30:
            raise ScannedPDFError(
                f"Document '{os.path.basename(file_path)}' appears to be a scanned image or contains no extractable text. "
                "Optical Character Recognition (OCR) is required to verify scanned PDFs."
            )

        doc_structure = PDFDocumentStructure(
            filename=os.path.basename(file_path),
            total_pages=total_pages,
            pages=pages,
            full_text=full_text,
            is_scanned=False,
        )

        if structured_bib_text:
            doc_structure.bibliography_text = structured_bib_text
            doc_structure.bibliography_start_page = bib_start_page
        elif in_bibliography and bib_text_lines:
            doc_structure.bibliography_text = "\n".join(bib_text_lines)
            doc_structure.bibliography_start_page = bib_start_page
        else:
            doc_structure.bibliography_text, doc_structure.bibliography_start_page = self._find_bibliography_fallback(pages)

        return doc_structure

    def _strip_running_headers_footers(self, text: str) -> str:
        """Strip conference headers, footers, and isolated page numbers from body text."""
        cleaned = re.sub(r"(?:^|\n)\s*Proceedings\s+of\s+the[^\n]+\n*", "\n", text, flags=re.IGNORECASE)
        cleaned = re.sub(r"(?:^|\n)\s*\d+\s*(?:\n|$)", "\n", cleaned)
        return cleaned

    def _is_numbered_bib_text(self, text: str) -> bool:
        """Check if bibliography text contains sequentially numbered items starting near 1."""
        matches = list(re.finditer(r"(?:^|\n)\s*(?:\[(\d+)\]|(\d+)\.)\s*", text))
        if not matches:
            return False
        keys = [m.group(1) or m.group(2) for m in matches[:5]]
        try:
            first_num = int(keys[0])
            return first_num <= 5
        except (ValueError, IndexError):
            return False

    def _extract_author_year_bib_layout(self, doc: fitz.Document, bib_start_page: int) -> str:
        """
        Extract non-numbered author-year bibliography entries using physical layout coordinates
        and column-aware hanging indents.
        """
        all_lines: List[Tuple[float, float, str]] = []
        in_bib_section = False

        for pno in range(bib_start_page - 1, len(doc)):
            page = doc[pno]
            page_height = page.rect.height
            blocks = page.get_text("dict").get("blocks", [])

            page_lines: List[Tuple[float, float, str]] = []
            for b in blocks:
                if "lines" not in b:
                    continue
                for l in b["lines"]:
                    t = " ".join(s["text"] for s in l["spans"]).strip()
                    if not t:
                        continue
                    y0 = round(l["bbox"][1], 1)
                    # Skip header / footer margin
                    if y0 < 45 or y0 > page_height - 40:
                        continue
                    if re.search(r"proceedings\s+of\s+the", t, re.IGNORECASE) or t in ["43", "44", "45", "46", "47"]:
                        continue
                    x0 = round(l["bbox"][0], 1)
                    page_lines.append((x0, y0, t))

            # Multi-column sort: column 1 (x0 < 300) then column 2 (x0 >= 300)
            col1 = [item for item in page_lines if item[0] < 300]
            col2 = [item for item in page_lines if item[0] >= 300]
            col1.sort(key=lambda x: x[1])
            col2.sort(key=lambda x: x[1])
            all_lines.extend(col1 + col2)

        # Filter out lines before the References header
        filtered_lines: List[Tuple[float, float, str]] = []
        for x0, y0, t in all_lines:
            if not in_bib_section:
                if re.match(r"^(?:[0-9\.\s]*)(?:references|bibliography)\b", t, re.IGNORECASE):
                    in_bib_section = True
                    continue
            if in_bib_section:
                filtered_lines.append((x0, y0, t))

        if not filtered_lines:
            filtered_lines = all_lines

        # Group lines into individual entries by detecting hanging indent
        col1_min = min((x[0] for x in filtered_lines if x[0] < 300), default=70.9)
        col2_min = min((x[0] for x in filtered_lines if x[0] >= 300), default=306.1)

        entries: List[str] = []
        cur_entry_lines: List[str] = []

        for x0, y0, t in filtered_lines:
            is_flush = (abs(x0 - col1_min) < 5) or (abs(x0 - col2_min) < 5)
            if is_flush:
                if cur_entry_lines:
                    entries.append(" ".join(cur_entry_lines))
                    cur_entry_lines = []
            cur_entry_lines.append(t)

        if cur_entry_lines:
            entries.append(" ".join(cur_entry_lines))

        return "\n\n".join(entries)

    def _find_bibliography_fallback(self, pages: List[ExtractedPage]) -> Tuple[Optional[str], Optional[int]]:
        """Fallback detection across all page text."""
        for p in reversed(pages):
            match = self.BIB_HEADER_LINE_REGEX.search(p.text)
            if match:
                start_pos = match.end()
                bib_text = p.text[start_pos:]
                later_pages = [page.text for page in pages if page.page_num > p.page_num]
                if later_pages:
                    bib_text += "\n" + "\n".join(later_pages)
                return bib_text.strip(), p.page_num
        return None, None
