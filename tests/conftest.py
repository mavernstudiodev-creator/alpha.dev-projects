"""
Pytest configuration and shared fixtures for CiteVerify tests.
Ensures full test isolation:
- Temporary isolated SQLite database per test
- Isolated temporary upload directory
- Safe cleanup of test files and database records
"""

import os
import sys
import pytest
import httpx
import pymupdf as fitz
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Ensure project root is in sys.path
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from app.main import app
from app.core.database import Base, get_db
from app.core.config import settings


def generate_sample_academic_pdf(file_path: str) -> str:
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
    return file_path


@pytest.fixture
def sample_pdf_path(tmp_path) -> str:
    """Generate a sample academic PDF in a temporary folder and ensure cleanup."""
    pdf_path = str(tmp_path / "test_academic_sample.pdf")
    generate_sample_academic_pdf(pdf_path)
    yield pdf_path
    if os.path.exists(pdf_path):
        try:
            os.remove(pdf_path)
        except Exception:
            pass


@pytest.fixture
def test_db_session(tmp_path, monkeypatch):
    """
    Creates an isolated SQLite database and redirects uploads to a temporary directory.
    Guarantees production database is never modified.
    """
    test_db_file = tmp_path / "test_isolated.db"
    test_db_url = f"sqlite:///{test_db_file}"

    test_engine = create_engine(
        test_db_url,
        connect_args={"check_same_thread": False},
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

    # Create tables in the isolated test DB
    Base.metadata.create_all(bind=test_engine)

    # Redirect upload directory to temporary test folder
    test_uploads = tmp_path / "test_uploads"
    test_uploads.mkdir(parents=True, exist_ok=True)
    monkeypatch.setattr(settings, "UPLOAD_DIR", str(test_uploads))

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        app.dependency_overrides.pop(get_db, None)
        Base.metadata.drop_all(bind=test_engine)
        test_engine.dispose()


@pytest.fixture
async def async_client(test_db_session):
    """Provides an isolated AsyncClient connected to the FastAPI app."""
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
