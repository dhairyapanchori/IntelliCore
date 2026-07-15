from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from datetime import datetime

from app.core.database import get_db
from app.models.core import User, OrganizationUser, Workspace, Department, ActivityLog
from app.schemas.user import OrganizationUserResponse, UserInvite
from app.api.deps import get_current_active_user
from app.api.workspaces import check_org_access
from app.core.security import get_password_hash

router = APIRouter()

@router.get("/", response_model=List[OrganizationUserResponse])
def get_organization_users(
    organization_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get all users for an organization with analytics."""
    check_org_access(db, current_user.id, organization_id)
    
    org_users = db.query(OrganizationUser).filter(
        OrganizationUser.organization_id == organization_id
    ).all()
    
    result = []
    
    # Calculate workspaces for the org
    org_workspaces_count = db.query(Workspace).filter(Workspace.organization_id == organization_id).count()
    
    for org_user in org_users:
        user_record = db.query(User).filter(User.id == org_user.user_id).first()
        if not user_record:
            continue
            
        dept = db.query(Department).filter(Department.id == org_user.department_id).first() if org_user.department_id else None
        
        last_activity = db.query(ActivityLog.created_at).filter(
            ActivityLog.user_id == user_record.id
        ).order_by(ActivityLog.created_at.desc()).first()
        
        last_active = last_activity[0] if last_activity else user_record.updated_at
        
        status_val = "Active" if user_record.is_active else "Pending"
        
        result.append(OrganizationUserResponse(
            id=org_user.id,
            user_id=user_record.id,
            organization_id=org_user.organization_id,
            full_name=user_record.full_name,
            email=user_record.email,
            role=org_user.role,
            department_id=dept.id if dept else None,
            department_name=dept.name if dept else "Unassigned",
            workspaces_count=org_workspaces_count, # Assuming users have access to all org workspaces in this basic RBAC
            last_active=last_active,
            status=status_val,
            created_at=user_record.created_at
        ))
        
    return result

@router.post("/invite", response_model=OrganizationUserResponse)
def invite_user(
    invite_in: UserInvite,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Invite a new user to the organization."""
    check_org_access(db, current_user.id, invite_in.organization_id)
    
    # Check if user exists
    user = db.query(User).filter(User.email == invite_in.email).first()
    
    if not user:
        # Create a new user with a default password
        user = User(
            email=invite_in.email,
            full_name=invite_in.full_name,
            hashed_password=get_password_hash("defaultpassword123"), # For demo purposes
            is_active=False # Pending status
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
    # Check if already in org
    org_user = db.query(OrganizationUser).filter(
        OrganizationUser.user_id == user.id,
        OrganizationUser.organization_id == invite_in.organization_id
    ).first()
    
    if org_user:
        raise HTTPException(status_code=400, detail="User is already in this organization")
        
    # Add to org
    org_user = OrganizationUser(
        user_id=user.id,
        organization_id=invite_in.organization_id,
        role=invite_in.role
    )
    db.add(org_user)
    db.commit()
    db.refresh(org_user)
    
    org_workspaces_count = db.query(Workspace).filter(Workspace.organization_id == invite_in.organization_id).count()
    status_val = "Active" if user.is_active else "Pending"
    
    return OrganizationUserResponse(
        id=org_user.id,
        user_id=user.id,
        organization_id=org_user.organization_id,
        full_name=user.full_name,
        email=user.email,
        role=org_user.role,
        department_id=None,
        department_name="Unassigned",
        workspaces_count=org_workspaces_count,
        last_active=None,
        status=status_val,
        created_at=user.created_at
    )
