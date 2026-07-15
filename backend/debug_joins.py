import sys
sys.path.append('.')
from app.core.database import SessionLocal
from app.models.core import User, Document, Collection, Department, Workspace, OrganizationUser

db = SessionLocal()
user = db.query(User).first()
accessible_orgs = db.query(OrganizationUser.organization_id).filter(OrganizationUser.user_id == user.id).all()
org_ids = [o[0] for o in accessible_orgs]

print("Org IDs:", org_ids)
for doc in db.query(Document).all():
    print(f"Doc {doc.id} - Collection: {doc.collection_id}")

for col in db.query(Collection).all():
    print(f"Collection {col.id} - Department: {col.department_id}")

for dep in db.query(Department).all():
    print(f"Department {dep.id} - Workspace: {dep.workspace_id}")

for ws in db.query(Workspace).all():
    print(f"Workspace {ws.id} - Org: {ws.organization_id}")

# Create data_sources table if missing
from app.models.core import Base, DataSource
from app.core.database import engine
Base.metadata.create_all(bind=engine, tables=[DataSource.__table__])
print("Created data_sources table.")
