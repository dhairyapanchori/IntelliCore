from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.core import User, OrganizationUser, Workspace, Department
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
    """Get all departments for a workspace."""
    check_workspace_access(db, current_user.id, workspace_id)
    departments = db.query(Department).filter(Department.workspace_id == workspace_id).all()
    return departments

@router.post("/", response_model=DepartmentResponse, status_code=status.HTTP_201_CREATED)
def create_department(
    department_in: DepartmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new department within a workspace."""
    check_workspace_access(db, current_user.id, department_in.workspace_id)
    department = Department(
        name=department_in.name, 
        workspace_id=department_in.workspace_id
    )
    db.add(department)
    db.commit()
    db.refresh(department)
    return department
