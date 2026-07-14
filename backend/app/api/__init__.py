from fastapi import APIRouter
from app.api.auth import router as auth_router
from app.api.organizations import router as org_router
from app.api.workspaces import router as workspace_router
from app.api.departments import router as dept_router
from app.api.collections import router as coll_router
from app.api.documents import router as doc_router
from app.api.chat import router as chat_router
from app.api.analytics import router as analytics_router
from app.api.search import router as search_router

api_router = APIRouter()
api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(org_router, prefix="/organizations", tags=["organizations"])
api_router.include_router(workspace_router, prefix="/workspaces", tags=["workspaces"])
api_router.include_router(dept_router, prefix="/departments", tags=["departments"])
api_router.include_router(coll_router, prefix="/collections", tags=["collections"])
api_router.include_router(doc_router, prefix="/documents", tags=["documents"])
api_router.include_router(chat_router, prefix="/chat", tags=["chat"])
api_router.include_router(analytics_router, prefix="/analytics", tags=["analytics"])
api_router.include_router(search_router, prefix="/search", tags=["search"])
