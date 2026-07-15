from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.core import User, UserPreference, SystemSetting, OrganizationUser
from app.schemas.setting import UserPreferenceResponse, UserPreferenceUpdate, SystemSettingResponse, SystemSettingUpdate
from app.api.deps import get_current_active_user
from app.api.workspaces import check_org_access

router = APIRouter()

@router.get("/preferences", response_model=UserPreferenceResponse)
def get_user_preferences(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    pref = db.query(UserPreference).filter(UserPreference.user_id == current_user.id).first()
    if not pref:
        # Create default preferences
        pref = UserPreference(user_id=current_user.id)
        db.add(pref)
        db.commit()
        db.refresh(pref)
    return pref

@router.put("/preferences", response_model=UserPreferenceResponse)
def update_user_preferences(
    pref_in: UserPreferenceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    pref = db.query(UserPreference).filter(UserPreference.user_id == current_user.id).first()
    if not pref:
        pref = UserPreference(user_id=current_user.id)
        db.add(pref)
    
    update_data = pref_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(pref, field, value)
        
    db.commit()
    db.refresh(pref)
    return pref

@router.get("/system/{organization_id}", response_model=SystemSettingResponse)
def get_system_settings(
    organization_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    check_org_access(db, current_user.id, organization_id)
    
    sys_setting = db.query(SystemSetting).filter(SystemSetting.organization_id == organization_id).first()
    if not sys_setting:
        sys_setting = SystemSetting(organization_id=organization_id)
        db.add(sys_setting)
        db.commit()
        db.refresh(sys_setting)
    return sys_setting

@router.put("/system/{organization_id}", response_model=SystemSettingResponse)
def update_system_settings(
    organization_id: int,
    sys_in: SystemSettingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    check_org_access(db, current_user.id, organization_id)
    
    # Check if user is admin (simplified check for MVP)
    org_user = db.query(OrganizationUser).filter(
        OrganizationUser.organization_id == organization_id,
        OrganizationUser.user_id == current_user.id
    ).first()
    
    if org_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to change system settings")
        
    sys_setting = db.query(SystemSetting).filter(SystemSetting.organization_id == organization_id).first()
    if not sys_setting:
        sys_setting = SystemSetting(organization_id=organization_id)
        db.add(sys_setting)
        
    update_data = sys_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(sys_setting, field, value)
        
    db.commit()
    db.refresh(sys_setting)
    return sys_setting
