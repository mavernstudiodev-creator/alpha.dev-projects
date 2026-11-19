"""
CiteVerify HTTP Client Configuration and Lifecycle Utilities
Provides connection pooling limits and pooled client creation.
"""

from typing import Optional
import httpx
from app.core.config import settings

DEFAULT_LIMITS = httpx.Limits(
    max_connections=settings.HTTP_MAX_CONNECTIONS,
    max_keepalive_connections=settings.HTTP_MAX_KEEPALIVE_CONNECTIONS,
    keepalive_expiry=settings.HTTP_KEEPALIVE_EXPIRY,
)


def create_pooled_http_client(
    timeout: float = 12.0,
    limits: Optional[httpx.Limits] = None,
    follow_redirects: bool = True,
) -> httpx.AsyncClient:
    """Instantiate a pooled httpx.AsyncClient with standard CiteVerify limits."""
    return httpx.AsyncClient(
        limits=limits or DEFAULT_LIMITS,
        timeout=httpx.Timeout(timeout, connect=8.0),
        follow_redirects=follow_redirects,
    )
