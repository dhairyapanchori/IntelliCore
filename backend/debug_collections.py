import sys
sys.path.append('.')
from app.core.database import SessionLocal
from app.models.core import User, Document, Collection, Department, Workspace, OrganizationUser

db = SessionLocal()
current_user = db.query(User).first()
accessible_orgs = db.query(OrganizationUser.organization_id).filter(OrganizationUser.user_id == current_user.id).all()
org_ids = [o[0] for o in accessible_orgs]

collections = db.query(Collection)\
    .outerjoin(Department, Collection.department_id == Department.id)\
    .outerjoin(Workspace, Department.workspace_id == Workspace.id)\
    .filter(Workspace.organization_id.in_(org_ids)).all()

result = []
for col in collections:
    docs = db.query(Document).filter(Document.collection_id == col.id).all()
    doc_count = len(docs)
    total_size = sum(d.file_size for d in docs)
    last_updated = max((d.created_at for d in docs), default=col.created_at)
    
    print({
        "id": col.id,
        "name": col.name,
        "document_count": doc_count,
        "total_size": total_size,
        "last_updated": last_updated,
    })
