import os
import shutil
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.core import User, Collection, Document
from app.schemas.core import DocumentResponse
from app.api.deps import get_current_active_user
from app.api.collections import check_department_access

router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt"}
MAX_FILE_SIZE = 50 * 1024 * 1024 # 50 MB

def check_collection_access(db: Session, user_id: int, collection_id: int):
    collection = db.query(Collection).filter(Collection.id == collection_id).first()
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    check_department_access(db, user_id, collection.department_id)
    return collection

@router.get("/", response_model=List[DocumentResponse])
def get_documents(
    collection_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get all documents for a collection."""
    check_collection_access(db, current_user.id, collection_id)
    documents = db.query(Document).filter(Document.collection_id == collection_id).order_by(Document.created_at.desc()).all()
    return documents

@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    collection_id: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Upload a new document to a collection."""
    check_collection_access(db, current_user.id, collection_id)
    
    # Validation
    ext = os.path.splitext(file.filename)[1].lower() if file.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"File extension {ext} not allowed.")
    
    file.file.seek(0, os.SEEK_END)
    file_size = file.file.tell()
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Max size is 50MB.")
    file.file.seek(0)
    
    # Save to disk
    unique_filename = f"{uuid.uuid4()}{ext}"
    storage_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    with open(storage_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Create DB record
    document = Document(
        collection_id=collection_id,
        title=file.filename,
        original_filename=file.filename,
        file_type=ext.lstrip('.'),
        file_size=file_size,
        storage_path=storage_path,
        status="pending"
    )
    db.add(document)
    db.commit()
    db.refresh(document)
    
    # Dispatch AI processing task
    from app.worker.tasks import process_document_task
    process_document_task.delay(document.id)
    
    return document

@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete a document."""
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    check_collection_access(db, current_user.id, document.collection_id)
    
    if os.path.exists(document.storage_path):
        try:
            os.remove(document.storage_path)
        except OSError:
            pass
            
    db.delete(document)
    db.commit()
    return
