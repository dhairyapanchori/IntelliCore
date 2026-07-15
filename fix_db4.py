import sys
import os

# Add backend to path
sys.path.insert(0, os.path.abspath('backend'))

from sqlalchemy import text
from app.core.database import SessionLocal

def fix_db():
    db = SessionLocal()
    columns_to_add = [
        ("workspaces", '"type"', "VARCHAR"),
        ("workspaces", '"status"', "VARCHAR"),
        ("workspaces", '"owner_id"', "INTEGER"),
        
        ("departments", '"status"', "VARCHAR"),
        ("departments", '"location"', "VARCHAR"),
        ("departments", '"head_id"', "INTEGER"),
        
        ("data_sources", '"type"', "VARCHAR"),
        ("data_sources", '"status"', "VARCHAR"),
        ("data_sources", '"last_sync"', "TIMESTAMP WITH TIME ZONE"),
        ("data_sources", '"document_count"', "INTEGER"),
        ("data_sources", '"size_bytes"', "INTEGER"),
        
        ("reports", '"type"', "VARCHAR"),
        ("reports", '"status"', "VARCHAR"),
        ("reports", '"frequency"', "VARCHAR"),
        ("reports", '"downloads"', "INTEGER"),
        
        ("chat_sessions", '"title"', "VARCHAR"),
        ("chat_sessions", '"is_pinned"', "BOOLEAN")
    ]
    
    for table, col, dtype in columns_to_add:
        try:
            db.execute(text(f'ALTER TABLE {table} ADD COLUMN {col} {dtype};'))
            db.commit() # Commit each one
            print(f"Added {col} to {table}")
        except Exception as e:
            db.rollback()
            print(f"Skipping {col} on {table}: {e}")

    db.close()
    print("Done!")

if __name__ == "__main__":
    fix_db()
