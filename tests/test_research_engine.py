"""
Unit & Integration Test for CiteVerify Research Engine
"""

import os
import sys
import asyncio
import pymupdf as fitz

# Ensure backend directory is in sys.path when running script directly
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from research_engine.pipeline import VerificationPipeline
from research_engine.claims.citation_linker import CitationLinker
from research_engine.bibliography.parser import BibliographyParser


def create_sample_academic_pdf(file_path: str):
    """Generate a realistic test academic PDF with citations and bibliography."""
    doc = fitz.open()

    # Page 1: Introduction and Claims
    page1 = doc.new_page()
    text1 = (
        "CiteVerify Experimental Benchmark Paper\n"
        "AlphaDev Research Group, 2026\n\n"
        "Abstract\n"
        "Scientific claims require empirical validation against original source evidence. This study evaluates claim verification accuracy.\n\n"
        "1. Introduction\n"
        "The transformer architecture was originally proposed for sequence modeling tasks [1].\n"
        "Later studies demonstrate that deep residual learning significantly improves gradient propagation in very deep neural networks [2].\n"
        "However, earlier classical methods [3] claimed that linear models consistently outperform deep architectures on structured tabular datasets.\n\n"
        "2. Methodology & Findings\n"
        "Recent experiments confirm that self-attention mechanisms achieve superior parallelization compared to recurrent models [1].\n"
        "Furthermore, our benchmarks indicate that residual connections reduce optimization error by 42% on image recognition tasks [2].\n"
    )
    page1.insert_textbox(fitz.Rect(50, 50, 540, 750), text1, fontsize=10)

    # Page 2: References section
    page2 = doc.new_page()
    text2 = (
        "References\n"
        "[1] Vaswani, A., Shazeer, N., Parmar, N., et al. Attention Is All You Need. Advances in Neural Information Processing Systems, 2017. arXiv:1706.03762.\n"
        "[2] He, K., Zhang, X., Ren, S., Sun, J. Deep Residual Learning for Image Recognition. IEEE CVPR, 2016. 10.1109/CVPR.2016.90.\n"
        "[3] Oldtimer, J. Linear models for tabular prediction. Journal of Archaic Computing, 1998.\n"
    )
    page2.insert_textbox(fitz.Rect(50, 50, 540, 750), text2, fontsize=10)

    doc.save(file_path)
    doc.close()


async def run_pipeline_test():
    test_pdf = os.path.abspath("test_academic_sample.pdf")
    try:
        print("[1] Generating sample PDF...")
        create_sample_academic_pdf(test_pdf)
        print(f"Sample PDF created at {test_pdf}")

        print("[2] Running CitationLinker tests...")
        linker = CitationLinker()
        expanded = linker.expand_citation_range("1, 2, 4-6")
        assert expanded == ["1", "2", "4", "5", "6"], f"Unexpected expansion: {expanded}"
        print("CitationLinker test passed!")

        print("[3] Running BibliographyParser tests...")
        parser = BibliographyParser()
        raw_bib = "[1] Vaswani et al. Attention Is All You Need. 2017. arXiv:1706.03762.\n[2] He et al. 2016. 10.1109/CVPR.2016.90"
        entries = parser.parse_bibliography(raw_bib)
        assert len(entries) == 2
        assert entries[0].arxiv_id == "1706.03762"
        assert entries[1].doi == "10.1109/CVPR.2016.90"
        print("BibliographyParser test passed!")

        print("[4] Initializing VerificationPipeline...")
        pipeline = VerificationPipeline()

        print("[5] Executing full pipeline on sample PDF...")
        report = await pipeline.process_pdf(test_pdf)

        print("\n=== VERIFICATION REPORT SUMMARY ===")
        print(f"Document: {report.filename} (Pages: {report.total_pages})")
        print(f"Total Claims Mined: {report.summary.total_claims}")
        print(f"Total Citations Found: {report.summary.total_citations_found}")
        print(f"Total Citations Resolved: {report.summary.total_citations_resolved}")
        print(f"Classification Breakdown:")
        print(f" - Supported: {report.summary.supported}")
        print(f" - Partially Supported: {report.summary.partially_supported}")
        print(f" - Unsupported: {report.summary.unsupported}")
        print(f" - Contradictory: {report.summary.contradictory}")
        print(f" - Possibly Outdated: {report.summary.possibly_outdated}")
        print(f" - Insufficient Evidence: {report.summary.insufficient_evidence}")
        print(f"Processing time: {report.summary.processing_time_seconds}s")

        for idx, res in enumerate(report.results, 1):
            print(f"\nClaim #{idx} [{res.claim_id}]: {res.claim_statement[:80]}...")
            print(f"Status: {res.status.value.upper()} (Confidence: {res.confidence_score:.2f})")
            print(f"Explanation: {res.explanation}")
            print(f"Evidence items count: {len(res.evidence_items)}")
            for ev in res.evidence_items:
                print(f"  * [{ev.evidence_type.value}] {ev.source_work_title} | Relevance: {ev.relevance_score:.2f}")
                print(f"    Excerpt: {ev.passage_text[:120]}...")

        print("\nFull pipeline verification test successfully completed!")

    finally:
        if os.path.exists(test_pdf):
            try:
                os.remove(test_pdf)
            except Exception:
                pass


if __name__ == "__main__":
    asyncio.run(run_pipeline_test())
