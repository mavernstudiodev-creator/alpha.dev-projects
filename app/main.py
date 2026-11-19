"""
CiteVerify FastAPI Application Entrypoint
Full-Stack Scientific Claim and Citation Verification Engine with NVIDIA AI Research Assistant.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import httpx

from app.core.config import settings
from app.core.database import engine, Base, run_schema_migrations
from app.api.v1 import api_router
from research_engine import __version__ as engine_version


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Run safe schema migrations for existing tables
    run_schema_migrations(engine)

    # Initialize all DB schemas and models on startup
    Base.metadata.create_all(bind=engine)

    # Initialize shared connection pool for the backend service
    limits = httpx.Limits(
        max_connections=settings.HTTP_MAX_CONNECTIONS,
        max_keepalive_connections=settings.HTTP_MAX_KEEPALIVE_CONNECTIONS,
        keepalive_expiry=settings.HTTP_KEEPALIVE_EXPIRY,
    )
    shared_client = httpx.AsyncClient(
        limits=limits,
        timeout=settings.HTTP_DEFAULT_TIMEOUT,
        follow_redirects=True,
    )
    app.state.http_client = shared_client

    yield

    # Clean up pooled HTTP connections on shutdown
    await shared_client.aclose()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Scientific Claim & Citation Verification Engine with NVIDIA Nemotron AI Research Assistant",
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
        ],
        "ai_assistant": {
            "provider": "NVIDIA NIM / Nemotron",
            "model": settings.NVIDIA_MODEL,
            "status": "active" if settings.NVIDIA_API_KEY else "local_grounded_mode",
        },
        "background_processing": {
            "durable_jobs_enabled": True,
            "pdf_cache_enabled": True,
        },
    }
