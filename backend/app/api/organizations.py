from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.core import User, Organization, OrganizationUser
from app.schemas.core import OrganizationCreate, OrganizationUpdate, OrganizationResponse
from app.api.deps import get_current_active_user

router = APIRouter()

@router.get("/", response_model=List[OrganizationResponse])
def get_organizations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get all organizations the current user belongs to."""
    orgs = (
        db.query(Organization)
        .join(OrganizationUser)
        .filter(OrganizationUser.user_id == current_user.id)
        .all()
    )
    return orgs

@router.post("/", response_model=OrganizationResponse, status_code=status.HTTP_201_CREATED)
def create_organization(
    org_in: OrganizationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new organization and assign the current user as owner."""
    org = Organization(name=org_in.name)
    db.add(org)
    db.commit()
    db.refresh(org)

    org_user = OrganizationUser(
        organization_id=org.id,
        user_id=current_user.id,
        role="owner"
    )
    db.add(org_user)
    db.commit()
    
    return org

@router.get("/{org_id}", response_model=OrganizationResponse)
def get_organization(
    org_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get a specific organization by ID."""
    # Ensure user has access
    access = db.query(OrganizationUser).filter(
        OrganizationUser.organization_id == org_id,
        OrganizationUser.user_id == current_user.id
    ).first()
    if not access:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return org

@router.get("/{org_id}/users")
def get_organization_users(
    org_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get all users for a specific organization."""
    access = db.query(OrganizationUser).filter(
        OrganizationUser.organization_id == org_id,
        OrganizationUser.user_id == current_user.id
    ).first()
    if not access:
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    org_users = db.query(OrganizationUser, User)\
        .join(User, OrganizationUser.user_id == User.id)\
        .filter(OrganizationUser.organization_id == org_id)\
        .all()
        
    result = []
    for org_user, user in org_users:
        result.append({
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "is_active": user.is_active,
            "role": org_user.role
        })
    return result
