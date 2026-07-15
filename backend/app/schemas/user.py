from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenPayload(BaseModel):
    sub: Optional[int] = None

class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserUpdate(UserBase):
    password: Optional[str] = None

class UserInvite(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    role: str = "Member"
    organization_id: int

class UserInDBBase(UserBase):
    id: int
    is_active: bool
    is_superuser: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class User(UserInDBBase):
    pass

class OrganizationUserResponse(BaseModel):
    id: int
    user_id: int
    organization_id: int
    full_name: Optional[str] = None
    email: str
    role: str
    department_id: Optional[int] = None
    department_name: Optional[str] = None
    workspaces_count: int = 0
    last_active: Optional[datetime] = None
    status: str = "Active"
    created_at: datetime
    
    class Config:
        from_attributes = True
