from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
import logging
import json

from app.core.database import get_db
from app.models.core import User, DocumentChunk, Document, Collection, OrganizationUser, ChatSession, ChatMessage, ActivityLog
from app.api.deps import get_current_active_user
from app.api.collections import check_department_access
from app.core.config import settings

try:
    from groq import Groq
except ImportError:
    Groq = None

router = APIRouter()
logger = logging.getLogger(__name__)

logger.info("Loading SentenceTransformer model for semantic search...")
try:
    model = SentenceTransformer('all-MiniLM-L6-v2')
except Exception as e:
    logger.error(f"Failed to load embedding model: {e}")
    model = None

class SearchRequest(BaseModel):
    query: str
    collection_id: Optional[int] = None
    session_id: Optional[int] = None

class SearchResult(BaseModel):
    chunk_id: int
    document_id: int
    document_title: str
    text_content: str
    similarity: float

class SearchResponse(BaseModel):
    answer: str
    citations: List[SearchResult]
    session_id: Optional[int] = None

class ChatSessionCreate(BaseModel):
    title: str = "New Chat"

class ChatSessionUpdate(BaseModel):
    title: Optional[str] = None
    is_pinned: Optional[bool] = None

@router.get("/sessions")
def get_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    sessions = db.query(ChatSession).filter(ChatSession.user_id == current_user.id).order_by(ChatSession.updated_at.desc()).all()
    return sessions

@router.post("/sessions")
def create_session(
    data: ChatSessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    session = ChatSession(user_id=current_user.id, title=data.title)
    db.add(session)
    db.commit()
    db.refresh(session)
    
    # Log activity
    db.add(ActivityLog(user_id=current_user.id, action="chat_started", target_type="chat_session", target_id=session.id, details=f"Started chat '{session.title}'"))
    db.commit()
    return session

@router.patch("/sessions/{session_id}")
def update_session(
    session_id: int,
    data: ChatSessionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    session = db.query(ChatSession).filter(ChatSession.id == session_id, ChatSession.user_id == current_user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if data.title is not None:
        session.title = data.title
    if data.is_pinned is not None:
        session.is_pinned = data.is_pinned
        
    db.commit()
    db.refresh(session)
    return session

@router.delete("/sessions/{session_id}")
def delete_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    session = db.query(ChatSession).filter(ChatSession.id == session_id, ChatSession.user_id == current_user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    db.delete(session)
    db.commit()
    return {"status": "ok"}

@router.get("/sessions/{session_id}/messages")
def get_session_messages(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    session = db.query(ChatSession).filter(ChatSession.id == session_id, ChatSession.user_id == current_user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return db.query(ChatMessage).filter(ChatMessage.session_id == session_id).order_by(ChatMessage.created_at.asc()).all()

@router.post("/query", response_model=SearchResponse)
def semantic_search(
    request: SearchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Perform semantic search over document chunks and answer via AI.
    Saves history if session_id is provided or created.
    """
    if model is None:
        raise HTTPException(status_code=500, detail="AI Model not loaded on the backend")
        
    session_id = request.session_id
    if not session_id:
        # Create a new session automatically
        new_sess = ChatSession(user_id=current_user.id, title=request.query[:30] + "...")
        db.add(new_sess)
        db.commit()
        db.refresh(new_sess)
        session_id = new_sess.id
        
        # Log activity for first query
        db.add(ActivityLog(user_id=current_user.id, action="chat_started", target_type="chat_session", target_id=session_id, details=f"Asked: '{request.query[:50]}'"))
        db.commit()
        
    # Save user message
    user_msg = ChatMessage(session_id=session_id, role="user", content=request.query)
    db.add(user_msg)
    db.commit()

    query_embedding = model.encode(request.query).tolist()
    
    distance = DocumentChunk.embedding.cosine_distance(query_embedding).label('distance')
    base_query = db.query(DocumentChunk, Document, distance).join(Document, DocumentChunk.document_id == Document.id)
    
    if request.collection_id:
        collection = db.query(Collection).filter(Collection.id == request.collection_id).first()
        if not collection:
            raise HTTPException(status_code=404, detail="Collection not found")
        check_department_access(db, current_user.id, collection.department_id)
        
        base_query = base_query.filter(Document.collection_id == request.collection_id)
    else:
        # User can search across all collections they have access to.
        accessible_orgs = db.query(OrganizationUser.organization_id).filter(OrganizationUser.user_id == current_user.id).all()
        org_ids = [o[0] for o in accessible_orgs]
        
        from app.models.core import Department, Workspace
        base_query = base_query.join(Collection, Document.collection_id == Collection.id) \
                               .join(Department, Collection.department_id == Department.id) \
                               .join(Workspace, Department.workspace_id == Workspace.id) \
                               .filter(Workspace.organization_id.in_(org_ids))
        
    base_query = base_query.filter(Document.status == "completed")
    
    results = base_query.order_by(distance).limit(5).all()
    
    search_results = []
    for chunk, doc, dist in results:
        search_results.append(SearchResult(
            chunk_id=chunk.id,
            document_id=doc.id,
            document_title=doc.title,
            text_content=chunk.text_content,
            similarity=max(0.0, 1.0 - float(dist))
        ))
        
    groq_client = Groq(api_key=settings.GROQ_API_KEY) if Groq and settings.GROQ_API_KEY else None
    
    if groq_client:
        # Fetch conversation history for context
        history = db.query(ChatMessage).filter(ChatMessage.session_id == session_id).order_by(ChatMessage.created_at.desc()).limit(10).all()
        history.reverse()
        
        messages = [{"role": "system", "content": "You are IntelliChat, an enterprise AI assistant. Answer the user's query based ONLY on the provided document excerpts. Be conversational but concise. If the answer is not in the excerpts, say you don't know based on the provided documents."}]
        
        for msg in history[:-1]: # exclude the current one we just added
            messages.append({"role": msg.role, "content": msg.content})
            
        context_text = "\\n\\n".join([f"Document: {r.document_title}\\nExcerpt: {r.text_content}" for r in search_results])
        user_prompt = f"Context from documents:\\n{context_text}\\n\\nUser Query: {request.query}"
        
        messages.append({"role": "user", "content": user_prompt})
        
        try:
            chat_completion = groq_client.chat.completions.create(
                messages=messages,
                model="llama-3.3-70b-versatile",
            )
            ai_answer = chat_completion.choices[0].message.content
        except Exception as e:
            logger.error(f"Groq API error: {e}")
            ai_answer = "Sorry, I encountered an error while generating a conversational response."
    else:
        if len(search_results) == 0:
            ai_answer = "I couldn't find any relevant information in your accessible documents for that query."
        else:
            ai_answer = "Here are the most relevant excerpts I found from your documents:"
            
    # Save AI message
    ai_msg = ChatMessage(session_id=session_id, role="ai", content=ai_answer, citations=[r.model_dump() for r in search_results])
    db.add(ai_msg)
    
    # Update session updated_at
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    session.updated_at = ai_msg.created_at
    
    db.commit()
        
    return SearchResponse(answer=ai_answer, citations=search_results, session_id=session_id)
