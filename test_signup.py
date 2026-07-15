import sys
import os

# Add backend to path
sys.path.insert(0, os.path.abspath('backend'))

from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.core import User, Organization, OrganizationUser, Workspace, Department
from app.core import security

def test_signup():
    db = SessionLocal()
    try:
        email = "test@example.com"
        user = db.query(User).filter(User.email == email).first()
        if user:
            print("User already exists, deleting for test...")
            db.delete(user)
            db.commit()

        user = User(
            email=email,
            hashed_password=security.get_password_hash("password123"),
            full_name="Test User",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        print("User created. Creating org...")

        # Auto-provision hierarchy
        org = Organization(name="My Organization")
        db.add(org)
        db.commit()
        db.refresh(org)

        print("Org created. Creating org_user...")

        org_user = OrganizationUser(
            organization_id=org.id,
            user_id=user.id,
            role="owner"
        )
        db.add(org_user)
        db.commit()

        print("Org user created. Creating workspace...")

        workspace = Workspace(
            name="Global Workspace",
            description="Default workspace for all your documents.",
            organization_id=org.id,
            owner_id=user.id,
            type="Private"
        )
        db.add(workspace)
        db.commit()
        db.refresh(workspace)

        print("Workspace created. Creating department...")

        department = Department(
            name="General",
            description="General department.",
            workspace_id=workspace.id,
            head_id=user.id
        )
        db.add(department)
        db.commit()

        print("Success!")
    except Exception as e:
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_signup()
