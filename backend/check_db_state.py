import sys
sys.path.append('.')
from app.core.database import SessionLocal
from app.models.core import User, Workspace, Organization, OrganizationUser

db = SessionLocal()

print("Users:")
for u in db.query(User).all():
    print(f"User {u.id}: {u.email}")

print("\nOrganizations:")
for o in db.query(Organization).all():
    print(f"Org {o.id}: {o.name}")

print("\nOrganizationUsers:")
for ou in db.query(OrganizationUser).all():
    print(f"OrgUser - Org {ou.organization_id} - User {ou.user_id} - Role {ou.role}")

print("\nWorkspaces:")
for w in db.query(Workspace).all():
    print(f"Workspace {w.id}: {w.name} - Org {w.organization_id} - Owner {w.owner_id}")
