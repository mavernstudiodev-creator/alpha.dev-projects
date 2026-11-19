"""
End-to-End API Workflow Verification Test
Tests the full system lifecycle:
PDF Upload -> Extraction -> Discovery -> Verification -> Human Review -> Markdown Export
"""

import os
import sys
import asyncio
import httpx
import pymupdf as fitz

# Ensure backend directory is in sys.path when running script directly
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from app.core.database import Base, engine


def create_demo_paper_pdf(file_path: str):
    doc = fitz.open()

    page1 = doc.new_page()
    text1 = (
        "Transformer-Based Scientific Verification: A Benchmark Study\n"
        "AlphaDev AI Research, 2026\n\n"
        "Abstract\n"
        "We present an automated empirical audit of scientific claims against original source literature.\n\n"
        "1. Introduction\n"
        "The transformer architecture was originally proposed for sequence modeling tasks [1].\n"
        "Deep residual learning significantly mitigates vanishing gradients in very deep networks [2].\n"
        "Early empirical benchmarks [3] asserted that classical linear regressors outperform deep networks on complex image benchmarks.\n\n"
        "2. Experimental Findings\n"
        "Our experiments confirm that self-attention mechanisms achieve superior parallelization compared to recurrent models [1].\n"
    )
    page1.insert_textbox(fitz.Rect(50, 50, 540, 750), text1, fontsize=10)

    page2 = doc.new_page()
    text2 = (
        "References\n"
        "[1] Vaswani, A., Shazeer, N., Parmar, N., et al. Attention Is All You Need. NeurIPS, 2017. arXiv:1706.03762.\n"
        "[2] He, K., Zhang, X., Ren, S., Sun, J. Deep Residual Learning for Image Recognition. CVPR, 2016. 10.1109/CVPR.2016.90.\n"
        "[3] Obsolete, A. Classic linear methods for image recognition. Ancient Archive, 1995.\n"
    )
    page2.insert_textbox(fitz.Rect(50, 50, 540, 750), text2, fontsize=10)

    doc.save(file_path)
    doc.close()


async def run_e2e_test():
    test_pdf = os.path.abspath("test_e2e_demo.pdf")
    try:
        print("[Step 1] Initializing SQLite database...")
        Base.metadata.create_all(bind=engine)

        print("[Step 2] Generating realistic demo PDF with numeric citations...")
        create_demo_paper_pdf(test_pdf)

        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            print("[Step 3] Checking Health Endpoint...")
            health_res = await client.get("/api/health")
            assert health_res.status_code == 200
            health_data = health_res.json()
            assert len(health_data["academic_integrations"]) == 5
            print("Health check passed! 5 academic integrations active:", health_data["academic_integrations"])

            print("[Step 4] Uploading PDF to /api/v1/documents/upload...")
            with open(test_pdf, "rb") as f:
                upload_res = await client.post(
                    "/api/v1/documents/upload",
                    files={"file": ("test_e2e_demo.pdf", f, "application/pdf")},
                )
            assert upload_res.status_code == 200, f"Upload failed: {upload_res.text}"
            report = upload_res.json()
            doc_id = report["document_id"]
            print(f"Upload successful! Document ID: {doc_id}")
            print(f"Summary: {report['summary']}")
            assert len(report["claims"]) > 0
            assert len(report["results"]) > 0

            first_claim = report["results"][0]
            claim_id = first_claim["claim_id"]
            print(f"First Claim [{claim_id}]: {first_claim['claim_statement'][:60]}...")
            print(f"System Verdict: {first_claim['status'].upper()} (Confidence: {first_claim['confidence_score']})")

            print("[Step 5] Testing Human Review Endpoint...")
            review_payload = {
                "decision": "confirmed",
                "notes": "Verified by researcher: matches Vaswani et al. 2017 Transformer definition.",
                "reviewer_name": "Dr. Hackathon Judge"
            }
            review_res = await client.post(
                f"/api/v1/reviews/documents/{doc_id}/claims/{claim_id}",
                json=review_payload,
            )
            assert review_res.status_code == 200
            review_result = review_res.json()
            assert review_result["status"] == "success"
            print("Human review saved successfully! Review ID:", review_result["review_id"])

            print("[Step 6] Testing Document Fetch Endpoint...")
            fetch_res = await client.get(f"/api/v1/documents/{doc_id}")
            assert fetch_res.status_code == 200
            updated_doc = fetch_res.json()
            updated_claim = [r for r in updated_doc["results"] if r["claim_id"] == claim_id][0]
            assert updated_claim["review_status"] == "confirmed"
            assert "Vaswani" in updated_claim["human_notes"]
            print("Document state updated with human review audit trail!")

            print("[Step 7] Testing Markdown Export...")
            export_res = await client.get(f"/api/v1/documents/{doc_id}/export")
            assert export_res.status_code == 200
            assert "# CiteVerify Audit Report" in export_res.text
            print("Markdown export generated successfully! (Length:", len(export_res.text), "chars)")

            print("\n>>> ALL END-TO-END TESTS PASSED SUCCESSFULLY! <<<")

    finally:
        if os.path.exists(test_pdf):
            try:
                os.remove(test_pdf)
            except Exception:
                pass


if __name__ == "__main__":
    asyncio.run(run_e2e_test())
