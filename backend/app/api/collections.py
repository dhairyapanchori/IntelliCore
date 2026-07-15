from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.core import User, Department, Collection, Workspace, OrganizationUser
from app.schemas.core import CollectionCreate, CollectionUpdate, CollectionResponse
from app.api.deps import get_current_active_user
from app.api.departments import check_workspace_access

router = APIRouter()

def check_department_access(db: Session, user_id: int, department_id: int):
    department = db.query(Department).filter(Department.id == department_id).first()
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")
    check_workspace_access(db, user_id, department.workspace_id)
    return department

@router.get("/", response_model=List[CollectionResponse])
def get_collections(
    department_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get all collections for a department."""
    check_department_access(db, current_user.id, department_id)
    collections = db.query(Collection).filter(Collection.department_id == department_id).all()
    return collections

@router.get("/all", response_model=List[CollectionResponse])
def get_all_collections(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get all collections across all departments accessible by the user."""
    accessible_orgs = db.query(OrganizationUser.organization_id).filter(OrganizationUser.user_id == current_user.id).all()
    org_ids = [o[0] for o in accessible_orgs]
    
    collections = db.query(Collection)\
        .join(Department, Collection.department_id == Department.id)\
        .join(Workspace, Department.workspace_id == Workspace.id)\
        .filter(Workspace.organization_id.in_(org_ids)).all()
        
    return collections

@router.post("/", response_model=CollectionResponse, status_code=status.HTTP_201_CREATED)
def create_collection(
    collection_in: CollectionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new collection within a department."""
    check_department_access(db, current_user.id, collection_in.department_id)
    collection = Collection(
        name=collection_in.name, 
        department_id=collection_in.department_id
    )
    db.add(collection)
    db.commit()
    db.refresh(collection)
    return collection
