from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

# --- Organization ---
class OrganizationBase(BaseModel):
    name: str
    description: Optional[str] = None

class OrganizationCreate(OrganizationBase):
    pass

class OrganizationUpdate(OrganizationBase):
    name: Optional[str] = None

class OrganizationResponse(OrganizationBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# --- Workspace ---
class WorkspaceBase(BaseModel):
    name: str
    description: Optional[str] = None

class WorkspaceCreate(WorkspaceBase):
    organization_id: int

class WorkspaceUpdate(WorkspaceBase):
    name: Optional[str] = None

class WorkspaceResponse(WorkspaceBase):
    id: int
    organization_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# --- Department ---
class DepartmentBase(BaseModel):
    name: str
    description: Optional[str] = None

class DepartmentCreate(DepartmentBase):
    workspace_id: int

class DepartmentUpdate(DepartmentBase):
    name: Optional[str] = None

class DepartmentResponse(DepartmentBase):
    id: int
    workspace_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# --- Collection ---
class CollectionBase(BaseModel):
    name: str
    description: Optional[str] = None

class CollectionCreate(CollectionBase):
    department_id: int

class CollectionUpdate(CollectionBase):
    name: Optional[str] = None

class CollectionResponse(CollectionBase):
    id: int
    department_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# --- Document ---
class DocumentBase(BaseModel):
    title: str
    original_filename: str
    file_type: str
    file_size: int

class DocumentCreate(DocumentBase):
    collection_id: int
    storage_path: str
    status: str = "pending"

class DocumentResponse(DocumentBase):
    id: int
    collection_id: int
    storage_path: str
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
