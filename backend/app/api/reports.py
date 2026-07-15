from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
import io
import csv

from app.core.database import get_db
from app.models.core import User, Report, ActivityLog, Document
from app.schemas.report import ReportCreate, ReportResponse
from app.api.deps import get_current_active_user
from app.api.workspaces import check_org_access

router = APIRouter()

@router.get("/", response_model=List[ReportResponse])
def get_reports(
    organization_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    check_org_access(db, current_user.id, organization_id)
    
    reports = db.query(Report).filter(Report.organization_id == organization_id).order_by(Report.created_at.desc()).all()
    
    result = []
    for r in reports:
        owner = db.query(User).filter(User.id == r.owner_id).first()
        result.append(ReportResponse(
            id=r.id,
            organization_id=r.organization_id,
            owner_id=r.owner_id,
            owner_name=owner.full_name if owner else "System",
            name=r.name,
            type=r.type,
            status=r.status,
            frequency=r.frequency,
            downloads=r.downloads,
            last_run=r.last_run,
            created_at=r.created_at,
            updated_at=r.updated_at
        ))
    return result

@router.get("/analytics", response_model=Dict[str, Any])
def get_report_analytics(
    organization_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    check_org_access(db, current_user.id, organization_id)
    
    total = db.query(func.count(Report.id)).filter(Report.organization_id == organization_id).scalar() or 0
    completed = db.query(func.count(Report.id)).filter(Report.organization_id == organization_id, Report.status == "Completed").scalar() or 0
    scheduled = db.query(func.count(Report.id)).filter(Report.organization_id == organization_id, Report.status == "Scheduled").scalar() or 0
    drafts = db.query(func.count(Report.id)).filter(Report.organization_id == organization_id, Report.status == "Draft").scalar() or 0
    
    total_downloads = db.query(func.sum(Report.downloads)).filter(Report.organization_id == organization_id).scalar() or 0
    
    type_counts = db.query(Report.type, func.count(Report.id)).filter(Report.organization_id == organization_id).group_by(Report.type).all()
    
    return {
        "kpis": {
            "total_reports": total,
            "completed": completed,
            "scheduled": scheduled,
            "drafts": drafts
        },
        "downloads": total_downloads,
        "reports_by_type": [{"name": t, "value": c} for t, c in type_counts]
    }

@router.post("/", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
def create_report(
    organization_id: int,
    report_in: ReportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    check_org_access(db, current_user.id, organization_id)
    
    report = Report(
        organization_id=organization_id,
        owner_id=current_user.id,
        name=report_in.name,
        type=report_in.type,
        status=report_in.status,
        frequency=report_in.frequency,
        last_run=datetime.utcnow() if report_in.status == "Completed" else None
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    
    return ReportResponse(
        id=report.id,
        organization_id=report.organization_id,
        owner_id=report.owner_id,
        owner_name=current_user.full_name,
        name=report.name,
        type=report.type,
        status=report.status,
        frequency=report.frequency,
        downloads=report.downloads,
        last_run=report.last_run,
        created_at=report.created_at
    )

@router.get("/{report_id}/export")
def export_report_csv(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Exports report data as a CSV file.
    """
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    check_org_access(db, current_user.id, report.organization_id)
    
    # Increment downloads
    report.downloads += 1
    db.commit()
    
    # Generate CSV based on type
    output = io.StringIO()
    writer = csv.writer(output)
    
    if report.type == "Usage":
        writer.writerow(["Action", "Target Type", "Details", "Timestamp"])
        logs = db.query(ActivityLog).limit(100).all()
        for log in logs:
            writer.writerow([log.action, log.target_type, log.details, log.created_at])
    elif report.type == "Data":
        writer.writerow(["Document ID", "Title", "Type", "Size", "Status", "Timestamp"])
        docs = db.query(Document).limit(100).all()
        for doc in docs:
            writer.writerow([doc.id, doc.title, doc.file_type, doc.file_size, doc.status, doc.created_at])
    else:
        writer.writerow(["Sample Data", "Value"])
        writer.writerow(["Placeholder for", report.type])
        
    csv_content = output.getvalue()
    output.close()
    
    filename = f"{report.name.replace(' ', '_')}_{datetime.now().strftime('%Y%m%d')}.csv"
    
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
