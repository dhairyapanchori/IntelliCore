from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.core import User, DataSource
from app.schemas.core import DataSourceCreate, DataSourceResponse
from app.api.deps import get_current_active_user
from app.api.workspaces import check_org_access

router = APIRouter()

@router.get("/", response_model=List[DataSourceResponse])
def get_data_sources(
    organization_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get all data sources for an organization."""
    check_org_access(db, current_user.id, organization_id)
    sources = db.query(DataSource).filter(DataSource.organization_id == organization_id).order_by(DataSource.created_at.desc()).all()
    return sources

@router.post("/", response_model=DataSourceResponse, status_code=status.HTTP_201_CREATED)
def create_data_source(
    source_in: DataSourceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new data source."""
    check_org_access(db, current_user.id, source_in.organization_id)
    source = DataSource(
        name=source_in.name,
        type=source_in.type,
        organization_id=source_in.organization_id
    )
    db.add(source)
    db.commit()
    db.refresh(source)
    return source

@router.delete("/{source_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_data_source(
    source_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete a data source."""
    source = db.query(DataSource).filter(DataSource.id == source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Data Source not found")
        
    check_org_access(db, current_user.id, source.organization_id)
    
    db.delete(source)
    db.commit()
    return
