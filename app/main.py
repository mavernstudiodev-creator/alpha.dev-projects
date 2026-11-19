"""
CiteVerify FastAPI Application Entrypoint
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.database import engine, Base
from app.api.v1 import api_router
from research_engine import __version__ as engine_version


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB schemas on startup
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Scientific Claim and Citation Verification Engine (Hackathon Edition)",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routes
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "CiteVerify Backend API",
        "research_engine_version": engine_version,
        "academic_integrations": [
            "Crossref REST API",
            "OpenAlex API",
            "Semantic Scholar API",
            "Europe PMC API",
            "arXiv API"
        ],
        "verification_taxonomy": [
            "supported",
            "partially_supported",
            "unsupported",
            "contradictory",
            "possibly_outdated",
            "insufficient_evidence"
        ]
    }
