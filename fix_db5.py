import sys
import os
sys.path.insert(0, os.path.abspath('backend'))

from sqlalchemy import text
from app.core.database import SessionLocal

def fix_db():
    db = SessionLocal()
    
    columns = [
        ("workspaces", "updated_at TIMESTAMP WITH TIME ZONE"),
        ("departments", "updated_at TIMESTAMP WITH TIME ZONE"),
        ("organizations", "updated_at TIMESTAMP WITH TIME ZONE"),
        ("collections", "updated_at TIMESTAMP WITH TIME ZONE"),
    ]
    
    for table, col_def in columns:
        try:
            db.execute(text(f'ALTER TABLE {table} ADD COLUMN {col_def};'))
            db.commit()
            print(f"Added {col_def} to {table}")
        except Exception as e:
            db.rollback()
            print(f"Skipping {table}: already exists or error - {str(e)[:60]}")

    db.close()
    print("Done!")

if __name__ == "__main__":
    fix_db()
