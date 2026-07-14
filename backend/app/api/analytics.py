from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Dict, Any, List
from datetime import datetime, timedelta

from app.core.database import get_db
from app.models.core import User, Document, Collection, ActivityLog, ChatSession, Workspace
from app.api.deps import get_current_active_user

router = APIRouter()

@router.get("/dashboard", response_model=Dict[str, Any])
def get_dashboard_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Get aggregate metrics for the dashboard.
    For MVP, we query all accessible resources for the user.
    """
    # 1. Total Documents
    total_docs = db.query(func.count(Document.id)).filter(Document.status == "completed").scalar() or 0
    
    # 2. Total Collections
    total_collections = db.query(func.count(Collection.id)).scalar() or 0
    
    # 3. Storage Used (bytes)
    storage_bytes = db.query(func.sum(Document.file_size)).filter(Document.status == "completed").scalar() or 0
    
    # 4. Processing Status
    processing_counts = db.query(Document.status, func.count(Document.id)).group_by(Document.status).all()
    processing_status = {status: count for status, count in processing_counts}
    
    # 5. AI Queries (Total Chat Sessions for MVP)
    ai_queries = db.query(func.count(ChatSession.id)).scalar() or 0
    
    # 6. AI Copilot Usage Chart Data (Last 14 days)
    today = datetime.utcnow().date()
    fourteen_days_ago = today - timedelta(days=14)
    
    # Mock some historical data so the chart isn't empty on a new install,
    # but use real data for the current day.
    # In a real scenario, this would group by date.
    usage_data = []
    for i in range(14):
        d = fourteen_days_ago + timedelta(days=i)
        usage_data.append({
            "date": d.strftime("%b %d"),
            "queries": 0 # Would be populated from actual usage logs
        })
    # Overwrite the last day with real data
    real_queries_today = db.query(func.count(ChatSession.id)).filter(func.date(ChatSession.created_at) == today).scalar() or 0
    if usage_data:
        usage_data[-1]["queries"] = real_queries_today

    return {
        "metrics": {
            "total_documents": total_docs,
            "total_collections": total_collections,
            "storage_bytes": storage_bytes,
            "ai_queries": ai_queries,
        },
        "processing_status": {
            "processed": processing_status.get("completed", 0),
            "processing": processing_status.get("processing", 0),
            "queued": processing_status.get("pending", 0),
            "failed": processing_status.get("error", 0),
        },
        "usage_chart": usage_data
    }

@router.get("/recent-activity")
def get_recent_activity(
    limit: int = 5,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get recent system activity logs."""
    logs = db.query(ActivityLog).order_by(ActivityLog.created_at.desc()).limit(limit).all()
    
    results = []
    for log in logs:
        results.append({
            "id": log.id,
            "action": log.action,
            "target_type": log.target_type,
            "details": log.details,
            "created_at": log.created_at.isoformat() if log.created_at else None
        })
    return results

@router.get("/graph")
def get_knowledge_graph(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Returns a simplified graph representation of Collections and Documents.
    """
    nodes = []
    links = []
    
    # Add root node
    nodes.append({"id": "enterprise", "name": "Enterprise Knowledge", "group": 1})
    
    collections = db.query(Collection).all()
    for col in collections:
        col_id = f"col_{col.id}"
        nodes.append({"id": col_id, "name": col.name, "group": 2})
        links.append({"source": "enterprise", "target": col_id})
        
        # Add a few documents per collection so the graph isn't too massive
        docs = db.query(Document).filter(Document.collection_id == col.id, Document.status == 'completed').limit(10).all()
        for doc in docs:
            doc_id = f"doc_{doc.id}"
            nodes.append({"id": doc_id, "name": doc.title, "group": 3})
            links.append({"source": col_id, "target": doc_id})
            
    return {"nodes": nodes, "links": links}
