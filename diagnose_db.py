import sys
import os
sys.path.insert(0, os.path.abspath('backend'))

from sqlalchemy import text
from app.core.database import SessionLocal

def check_and_fix():
    db = SessionLocal()
    try:
        # Check all users
        users = db.execute(text("SELECT id, email, full_name FROM users ORDER BY id")).fetchall()
        print("=== USERS ===")
        for u in users:
            print(f"  id={u[0]} email={u[1]} name={u[2]}")

        # Check all organizations
        orgs = db.execute(text("SELECT id, name FROM organizations ORDER BY id")).fetchall()
        print("\n=== ORGANIZATIONS ===")
        for o in orgs:
            print(f"  id={o[0]} name={o[1]}")

        # Check org-user links
        links = db.execute(text("SELECT user_id, organization_id, role FROM organization_users ORDER BY id")).fetchall()
        print("\n=== ORG-USER LINKS ===")
        for l in links:
            print(f"  user_id={l[0]} org_id={l[1]} role={l[2]}")
        
        # Check workspaces
        workspaces = db.execute(text("SELECT id, name, organization_id FROM workspaces ORDER BY id")).fetchall()
        print("\n=== WORKSPACES ===")
        for w in workspaces:
            print(f"  id={w[0]} name={w[1]} org_id={w[2]}")

    except Exception as e:
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    check_and_fix()
