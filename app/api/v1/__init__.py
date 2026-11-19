from fastapi import APIRouter
from app.api.v1.documents import router as documents_router
from app.api.v1.reviews import router as reviews_router
from app.api.v1.jobs import router as jobs_router
from app.api.v1.audit import router as audit_router
from app.api.v1.assistant import router as assistant_router

api_router = APIRouter()
api_router.include_router(documents_router)
api_router.include_router(reviews_router)
api_router.include_router(jobs_router)
api_router.include_router(audit_router)
api_router.include_router(assistant_router)
