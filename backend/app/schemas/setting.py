from pydantic import BaseModel
from typing import Optional

class UserPreferenceBase(BaseModel):
    language: str
    theme: str
    timezone: str
    date_format: str
    email_notifications: bool
    push_notifications: bool
    compact_mode: bool
    auto_save: bool

class UserPreferenceUpdate(BaseModel):
    language: Optional[str] = None
    theme: Optional[str] = None
    timezone: Optional[str] = None
    date_format: Optional[str] = None
    email_notifications: Optional[bool] = None
    push_notifications: Optional[bool] = None
    compact_mode: Optional[bool] = None
    auto_save: Optional[bool] = None

class UserPreferenceResponse(UserPreferenceBase):
    id: int
    user_id: int
    
    class Config:
        from_attributes = True

class SystemSettingBase(BaseModel):
    two_factor_auth: bool
    default_workspace_id: Optional[int] = None

class SystemSettingUpdate(BaseModel):
    two_factor_auth: Optional[bool] = None
    default_workspace_id: Optional[int] = None

class SystemSettingResponse(SystemSettingBase):
    id: int
    organization_id: int
    
    class Config:
        from_attributes = True
