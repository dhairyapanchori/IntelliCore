from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.sql import func

from app.core.database import get_db
from app.models.core import User, OrganizationUser, Workspace, Department, Collection, Document
from app.schemas.core import WorkspaceCreate, WorkspaceUpdate, WorkspaceResponse
from app.api.deps import get_current_active_user

router = APIRouter()

def check_org_access(db: Session, user_id: int, org_id: int):
    access = db.query(OrganizationUser).filter(
        OrganizationUser.organization_id == org_id,
        OrganizationUser.user_id == user_id
    ).first()
    if not access:
        raise HTTPException(status_code=403, detail="Not enough permissions for this organization")

@router.get("/", response_model=List[WorkspaceResponse])
def get_workspaces(
    organization_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get all workspaces for an organization with analytics."""
    check_org_access(db, current_user.id, organization_id)
    workspaces = db.query(Workspace).filter(Workspace.organization_id == organization_id).all()
    
    result = []
    
    # Get total members in the organization as a proxy for workspace members
    # In a full RBAC system, this would join WorkspaceUser
    org_members_count = db.query(OrganizationUser).filter(OrganizationUser.organization_id == organization_id).count()
    
    for ws in workspaces:
        # Get departments for this workspace
        dept_ids = [d.id for d in db.query(Department.id).filter(Department.workspace_id == ws.id).all()]
        
        # Get collections for those departments
        col_ids = []
        if dept_ids:
            col_ids = [c.id for c in db.query(Collection.id).filter(Collection.department_id.in_(dept_ids)).all()]
            
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
            
        ws_data = WorkspaceResponse(
            id=ws.id,
            name=ws.name,
            description=getattr(ws, 'description', None),
            organization_id=ws.organization_id,
            type=getattr(ws, 'type', 'Private'),
            status=getattr(ws, 'status', 'Active'),
            owner_id=getattr(ws, 'owner_id', None),
            owner_name=ws.owner.full_name if ws.owner else None,
            members_count=org_members_count,
            collections_count=len(col_ids),
            documents_count=doc_count,
            storage_used=storage_used,
            created_at=ws.created_at,
            updated_at=getattr(ws, 'updated_at', None)
        )
        result.append(ws_data)
        
    return result

@router.post("/", response_model=WorkspaceResponse, status_code=status.HTTP_201_CREATED)
def create_workspace(
    workspace_in: WorkspaceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new workspace within an organization."""
    check_org_access(db, current_user.id, workspace_in.organization_id)
    workspace = Workspace(
        name=workspace_in.name,
        description=workspace_in.description,
        organization_id=workspace_in.organization_id,
        owner_id=current_user.id,
        type="Private",
        status="Active"
    )
    db.add(workspace)
    db.commit()
    db.refresh(workspace)
    
    # Return with empty analytics for a new workspace
    org_members_count = db.query(OrganizationUser).filter(OrganizationUser.organization_id == workspace.organization_id).count()
    return WorkspaceResponse(
        id=workspace.id,
        name=workspace.name,
        description=getattr(workspace, 'description', None),
        organization_id=workspace.organization_id,
        type=getattr(workspace, 'type', 'Private'),
        status=getattr(workspace, 'status', 'Active'),
        owner_id=getattr(workspace, 'owner_id', None),
        owner_name=current_user.full_name,
        members_count=org_members_count,
        collections_count=0,
        documents_count=0,
        storage_used=0,
        created_at=workspace.created_at
    )

@router.delete("/{workspace_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workspace(
    workspace_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete a workspace."""
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
        
    check_org_access(db, current_user.id, workspace.organization_id)
    
    # In a full RBAC, we'd also verify they have delete perms. Here org access is used.
    
    db.delete(workspace)
    db.commit()
    return None
