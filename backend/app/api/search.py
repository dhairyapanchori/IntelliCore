from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import List, Optional, Any
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
import logging

from app.core.database import get_db
from app.models.core import User, Document, Collection, DocumentChunk, Department, Workspace, OrganizationUser
from app.api.deps import get_current_active_user

router = APIRouter()
logger = logging.getLogger(__name__)

try:
    model = SentenceTransformer('all-MiniLM-L6-v2')
except Exception as e:
    model = None

class AdvancedSearchRequest(BaseModel):
    query: str
    search_type: str = "hybrid" # "semantic", "keyword", "hybrid"
    workspace_id: Optional[int] = None
    department_id: Optional[int] = None
    collection_id: Optional[int] = None
    document_type: Optional[str] = None
    limit: int = 10

class SearchResultItem(BaseModel):
    document_id: int
    title: str
    chunk_text: str
    similarity: float

@router.post("/", response_model=List[SearchResultItem])
def advanced_search(
    request: AdvancedSearchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Advanced Enterprise Search.
    Filters across workspaces, departments, collections, and document types.
    """
    # 1. Base security filter
    accessible_orgs = db.query(OrganizationUser.organization_id).filter(OrganizationUser.user_id == current_user.id).all()
    org_ids = [o[0] for o in accessible_orgs]
    
    base_query = db.query(DocumentChunk, Document).join(Document, DocumentChunk.document_id == Document.id) \
                   .join(Collection, Document.collection_id == Collection.id) \
                   .join(Department, Collection.department_id == Department.id) \
                   .join(Workspace, Department.workspace_id == Workspace.id) \
                   .filter(Workspace.organization_id.in_(org_ids), Document.status == "completed")

    # 2. Apply explicit filters
    if request.workspace_id:
        base_query = base_query.filter(Workspace.id == request.workspace_id)
    if request.department_id:
        base_query = base_query.filter(Department.id == request.department_id)
    if request.collection_id:
        base_query = base_query.filter(Collection.id == request.collection_id)
    if request.document_type:
        base_query = base_query.filter(Document.file_type == request.document_type)

    results = []

    # 3. Perform search
    if request.search_type in ["keyword", "hybrid"]:
        # Keyword search simulation using ILIKE
        keyword_query = base_query.filter(
            or_(
                Document.title.ilike(f"%{request.query}%"),
                DocumentChunk.text_content.ilike(f"%{request.query}%")
            )
        ).limit(request.limit).all()
        
        for chunk, doc in keyword_query:
            results.append({
                "document_id": doc.id,
                "title": doc.title,
                "chunk_text": chunk.text_content,
                "similarity": 1.0 # Exact match representation
            })

    if request.search_type in ["semantic", "hybrid"] and model:
        query_embedding = model.encode(request.query).tolist()
        distance = DocumentChunk.embedding.cosine_distance(query_embedding).label('distance')
        
        semantic_query = base_query.add_columns(distance).order_by(distance).limit(request.limit).all()
        
        for chunk, doc, dist in semantic_query:
            # Avoid duplicates in hybrid
            if not any(r["document_id"] == doc.id and r["chunk_text"] == chunk.text_content for r in results):
                results.append({
                    "document_id": doc.id,
                    "title": doc.title,
                    "chunk_text": chunk.text_content,
                    "similarity": max(0.0, 1.0 - float(dist))
                })

    # Sort hybrid results by similarity
    results.sort(key=lambda x: x["similarity"], reverse=True)
    return results[:request.limit]
