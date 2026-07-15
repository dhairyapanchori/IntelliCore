import sys
import os

# Add backend to path
sys.path.insert(0, os.path.abspath('backend'))

from sqlalchemy import text
from app.core.database import SessionLocal

def fix_db():
    db = SessionLocal()
    try:
        try:
            db.execute(text('ALTER TABLE workspaces ADD COLUMN description VARCHAR;'))
            print("Added description to workspaces")
        except Exception as e:
            print("workspaces description error:", e)
        
        try:
            db.execute(text('ALTER TABLE departments ADD COLUMN description VARCHAR;'))
            print("Added description to departments")
        except Exception as e:
            print("departments description error:", e)

        try:
            db.execute(text('ALTER TABLE collections ADD COLUMN description VARCHAR;'))
            print("Added description to collections")
        except Exception as e:
            print("collections description error:", e)
            
        try:
            db.execute(text('ALTER TABLE organizations ADD COLUMN description VARCHAR;'))
            print("Added description to organizations")
        except Exception as e:
            print("organizations description error:", e)

        db.commit()
        print("Success!")
    except Exception as e:
        print("Overall error:", e)
    finally:
        db.close()

if __name__ == "__main__":
    fix_db()
