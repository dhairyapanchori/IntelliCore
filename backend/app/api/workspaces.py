from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.core import User, OrganizationUser, Workspace
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
    """Get all workspaces for an organization."""
    check_org_access(db, current_user.id, organization_id)
    workspaces = db.query(Workspace).filter(Workspace.organization_id == organization_id).all()
    return workspaces

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
        organization_id=workspace_in.organization_id
    )
    db.add(workspace)
    db.commit()
    db.refresh(workspace)
    return workspace
