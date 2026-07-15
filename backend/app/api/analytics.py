from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Dict, Any, List
from datetime import datetime, timedelta

from app.core.database import get_db
from app.models.core import User, Document, Collection, ActivityLog, ChatSession, ChatMessage, DataSource, Department, Workspace, OrganizationUser
from app.api.deps import get_current_active_user
from app.services.analytics_service import AnalyticsService

router = APIRouter()

@router.get("/dashboard", response_model=Dict[str, Any])
def get_analytics_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = AnalyticsService(db, current_user)
    return service.get_analytics_page_metrics()

@router.get("/overview", response_model=Dict[str, Any])
def get_dashboard_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = AnalyticsService(db, current_user)
    return service.get_dashboard_metrics()

@router.get("/recent-activity")
def get_recent_activity(
    limit: int = 5,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    activities = db.query(ActivityLog).filter(ActivityLog.user_id == current_user.id)\
                   .order_by(ActivityLog.created_at.desc()).limit(limit).all()
    return [{"action": a.action, "details": a.details, "created_at": a.created_at} for a in activities]

@router.get("/top-collections")
def get_top_collections(
    limit: int = 5,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    accessible_orgs = db.query(OrganizationUser.organization_id).filter(OrganizationUser.user_id == current_user.id).all()
    org_ids = [o[0] for o in accessible_orgs]
    
    top_cols = db.query(Collection.id, Collection.name, func.count(Document.id).label('document_count'))\
        .join(Department, Collection.department_id == Department.id)\
        .join(Workspace, Department.workspace_id == Workspace.id)\
        .outerjoin(Document, Collection.id == Document.collection_id)\
        .filter(Workspace.organization_id.in_(org_ids))\
        .group_by(Collection.id, Collection.name).order_by(func.count(Document.id).desc()).limit(limit).all()
        
    return [{"id": c.id, "name": c.name, "document_count": c.document_count} for c in top_cols]

@router.get("/popular-queries")
def get_popular_queries(
    limit: int = 5,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    queries = db.query(ChatMessage.content, func.count(ChatMessage.id).label('count'))\
        .join(ChatSession, ChatMessage.session_id == ChatSession.id)\
        .filter(ChatSession.user_id == current_user.id, ChatMessage.role == "user")\
        .group_by(ChatMessage.content).order_by(func.count(ChatMessage.id).desc()).limit(limit).all()
        
    return [{"query": q.content, "count": q.count} for q in queries]

@router.get("/graph")
def get_knowledge_graph(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    accessible_orgs = db.query(OrganizationUser.organization_id).filter(OrganizationUser.user_id == current_user.id).all()
    org_ids = [o[0] for o in accessible_orgs]
    
    collections = db.query(Collection.id, Collection.name)\
        .join(Department, Collection.department_id == Department.id)\
        .join(Workspace, Department.workspace_id == Workspace.id)\
        .filter(Workspace.organization_id.in_(org_ids)).all()
        
    nodes = [{"id": f"col_{c.id}", "name": c.name, "group": 1} for c in collections]
    
    col_ids = [c.id for c in collections]
    if not col_ids:
        return {"nodes": nodes, "links": []}
        
    documents = db.query(Document.id, Document.title, Document.collection_id)\
        .filter(Document.collection_id.in_(col_ids)).all()
        
    nodes.extend([{"id": f"doc_{d.id}", "name": d.title, "group": 2} for d in documents])
    links = [{"source": f"col_{d.collection_id}", "target": f"doc_{d.id}"} for d in documents]
    
    return {"nodes": nodes, "links": links}

@router.get("/collections")
def get_collections_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    accessible_orgs = db.query(OrganizationUser.organization_id).filter(OrganizationUser.user_id == current_user.id).all()
    org_ids = [o[0] for o in accessible_orgs]
    
    collections = db.query(Collection)\
        .outerjoin(Department, Collection.department_id == Department.id)\
        .outerjoin(Workspace, Department.workspace_id == Workspace.id)\
        .filter(Workspace.organization_id.in_(org_ids)).all()

    result = []
    for col in collections:
        docs = db.query(Document).filter(Document.collection_id == col.id).all()
        doc_count = len(docs)
        total_size = sum(d.file_size for d in docs)
        last_updated = max((d.created_at for d in docs), default=col.created_at)
        
        processing = sum(1 for d in docs if d.status == "processing")
        pending = sum(1 for d in docs if d.status == "pending")
        completed = sum(1 for d in docs if d.status == "completed")
        error = sum(1 for d in docs if d.status == "error")
        
        result.append({
            "id": col.id,
            "name": col.name,
            "document_count": doc_count,
            "total_size": total_size,
            "last_updated": last_updated,
            "status_breakdown": {
                "processing": processing,
                "pending": pending,
                "completed": completed,
                "error": error
            }
        })
        
    return result
