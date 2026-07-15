from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.sql import func

from app.core.database import get_db
from app.models.core import User, OrganizationUser, Workspace, Department, Collection, Document
from app.schemas.core import DepartmentCreate, DepartmentUpdate, DepartmentResponse
from app.api.deps import get_current_active_user
from app.api.workspaces import check_org_access

router = APIRouter()

def check_workspace_access(db: Session, user_id: int, workspace_id: int):
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    check_org_access(db, user_id, workspace.organization_id)
    return workspace

@router.get("/", response_model=List[DepartmentResponse])
def get_departments(
    workspace_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get all departments for a workspace with analytics."""
    workspace = check_workspace_access(db, current_user.id, workspace_id)
    departments = db.query(Department).filter(Department.workspace_id == workspace_id).all()
    
    result = []
    
    # Get total members in the organization as a proxy for department members
    org_members_count = db.query(OrganizationUser).filter(OrganizationUser.organization_id == workspace.organization_id).count()
    
    for dept in departments:
        # Get collections for this department
        col_ids = [c.id for c in db.query(Collection.id).filter(Collection.department_id == dept.id).all()]
            
        # Get documents and storage for those collections
        doc_count = 0
        storage_used = 0
        if col_ids:
            stats = db.query(
                func.count(Document.id),
                func.sum(Document.file_size)
            ).filter(Document.collection_id.in_(col_ids)).first()
            
            doc_count = stats[0] or 0
            storage_used = stats[1] or 0
            
        dept_data = DepartmentResponse(
            id=dept.id,
            name=dept.name,
            description=dept.description,
            workspace_id=dept.workspace_id,
            status=dept.status,
            location=dept.location,
            head_id=dept.head_id,
            head_name=dept.head.full_name if dept.head else None,
            members_count=org_members_count,
            collections_count=len(col_ids),
            documents_count=doc_count,
            storage_used=storage_used,
            created_at=dept.created_at
        )
        result.append(dept_data)
        
    return result

@router.get("/all", response_model=List[DepartmentResponse])
def get_all_departments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get all departments across all workspaces accessible by the user with analytics."""
    accessible_orgs = db.query(OrganizationUser.organization_id).filter(OrganizationUser.user_id == current_user.id).all()
    org_ids = [o[0] for o in accessible_orgs]
    
    departments = db.query(Department)\
        .join(Workspace, Department.workspace_id == Workspace.id)\
        .filter(Workspace.organization_id.in_(org_ids)).all()
        
    result = []
    
    for dept in departments:
        workspace = db.query(Workspace).filter(Workspace.id == dept.workspace_id).first()
        org_members_count = db.query(OrganizationUser).filter(OrganizationUser.organization_id == workspace.organization_id).count() if workspace else 0
        
        col_ids = [c.id for c in db.query(Collection.id).filter(Collection.department_id == dept.id).all()]
        
        doc_count = 0
        storage_used = 0
        if col_ids:
            stats = db.query(
                func.count(Document.id),
                func.sum(Document.file_size)
            ).filter(Document.collection_id.in_(col_ids)).first()
            
            doc_count = stats[0] or 0
            storage_used = stats[1] or 0
            
        dept_data = DepartmentResponse(
            id=dept.id,
            name=dept.name,
            description=dept.description,
            workspace_id=dept.workspace_id,
            status=dept.status,
            location=dept.location,
            head_id=dept.head_id,
            head_name=dept.head.full_name if dept.head else None,
            members_count=org_members_count,
            collections_count=len(col_ids),
            documents_count=doc_count,
            storage_used=storage_used,
            created_at=dept.created_at
        )
        result.append(dept_data)
        
    return result

@router.post("/", response_model=DepartmentResponse, status_code=status.HTTP_201_CREATED)
def create_department(
    department_in: DepartmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new department within a workspace."""
    workspace = check_workspace_access(db, current_user.id, department_in.workspace_id)
    department = Department(
        name=department_in.name,
        description=department_in.description,
        workspace_id=department_in.workspace_id,
        head_id=current_user.id,
        status="Active",
        location="Headquarters"
    )
    db.add(department)
    db.commit()
    db.refresh(department)
    
    org_members_count = db.query(OrganizationUser).filter(OrganizationUser.organization_id == workspace.organization_id).count()
    return DepartmentResponse(
        id=department.id,
        name=department.name,
        description=department.description,
        workspace_id=department.workspace_id,
        status=department.status,
        location=department.location,
        head_id=department.head_id,
        head_name=current_user.full_name,
        members_count=org_members_count,
        collections_count=0,
        documents_count=0,
        storage_used=0,
        created_at=department.created_at
    )

@router.delete("/{department_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_department(
    department_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete a department."""
    department = db.query(Department).filter(Department.id == department_id).first()
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")
        
    # Check access by verifying workspace access
    check_workspace_access(db, current_user.id, department.workspace_id)
    
    # In a real app, we might need to handle related collections or documents,
    # but for now we rely on DB cascades or just delete the department
    db.delete(department)
    db.commit()
    return
