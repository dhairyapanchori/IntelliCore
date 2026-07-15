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
    type: str = "Private"
    status: str = "Active"
    owner_id: Optional[int] = None
    owner_name: Optional[str] = None
    members_count: int = 0
    collections_count: int = 0
    documents_count: int = 0
    storage_used: int = 0
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# --- Department ---
class DepartmentBase(BaseModel):
    name: str
    description: Optional[str] = None

class DepartmentCreate(DepartmentBase):
    workspace_id: Optional[int] = None

class DepartmentUpdate(DepartmentBase):
    name: Optional[str] = None

class DepartmentResponse(DepartmentBase):
    id: int
    workspace_id: int
    status: str = "Active"
    location: Optional[str] = None
    head_id: Optional[int] = None
    head_name: Optional[str] = None
    members_count: int = 0
    collections_count: int = 0
    documents_count: int = 0
    storage_used: int = 0
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# --- Collection ---
class CollectionBase(BaseModel):
    name: str
    description: Optional[str] = None

class CollectionCreate(CollectionBase):
    department_id: Optional[int] = None

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
    collection_id: Optional[int] = None
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

# --- DataSource ---
class DataSourceBase(BaseModel):
    name: str
    type: str

class DataSourceCreate(DataSourceBase):
    organization_id: int

class DataSourceResponse(DataSourceBase):
    id: int
    organization_id: int
    status: str
    last_sync: Optional[datetime] = None
    document_count: int
    size_bytes: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
