import sys
import os

# Add backend to path
sys.path.insert(0, os.path.abspath('backend'))

from sqlalchemy import text
from app.core.database import SessionLocal

def fix_db():
    db = SessionLocal()
    try:
        db.execute(text('ALTER TABLE organization_users ADD COLUMN department_id INTEGER REFERENCES departments(id);'))
        db.commit()
        print("Successfully added department_id to organization_users!")
    except Exception as e:
        print("Error (might already exist):", e)
    finally:
        db.close()

if __name__ == "__main__":
    fix_db()
