"""
PDF Extractor using PyMuPDF (fitz)
Extracts page-by-page structured text, bounding boxes, and section boundaries.
Safely detects empty, corrupt, and scanned (image-only) PDFs.
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
            raise PDFExtractionError(f"Failed to open corrupted or invalid PDF file: {str(e)}")

        try:
            total_pages = len(doc)
            if total_pages == 0:
                raise PDFExtractionError(f"PDF document contains 0 pages: {os.path.basename(file_path)}")

            pages: List[ExtractedPage] = []
            full_text_parts: List[str] = []

            bib_start_page = None
            bib_text_lines: List[str] = []
            in_bibliography = False

            for page_idx in range(total_pages):
                page = doc[page_idx]
                page_num = page_idx + 1
                page_text = page.get_text("text") or ""
                full_text_parts.append(page_text)

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
                            # Content after header in the same block is bibliography
                            after_header = b_text[match.end():].strip()
                            if after_header:
                                bib_text_lines.append(after_header)
                    elif in_bibliography:
                        bib_text_lines.append(b_text)

                pages.append(ExtractedPage(page_num=page_num, text=page_text, blocks=block_dicts))

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

        if in_bibliography and bib_text_lines:
            doc_structure.bibliography_text = "\n".join(bib_text_lines)
            doc_structure.bibliography_start_page = bib_start_page
        else:
            doc_structure.bibliography_text, doc_structure.bibliography_start_page = self._find_bibliography_fallback(pages)

        return doc_structure

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
