import sys
import os
sys.path.insert(0, os.path.abspath('backend'))

from sqlalchemy import text
from app.core.database import SessionLocal

def check():
    db = SessionLocal()
    try:
        # Check actual columns in workspaces table
        cols = db.execute(text("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'workspaces'
            ORDER BY ordinal_position
        """)).fetchall()
        print("=== WORKSPACES TABLE COLUMNS ===")
        for c in cols:
            print(f"  {c[0]}: {c[1]}")

        # Check actual columns in organizations table  
        cols2 = db.execute(text("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'organizations'
            ORDER BY ordinal_position
        """)).fetchall()
        print("\n=== ORGANIZATIONS TABLE COLUMNS ===")
        for c in cols2:
            print(f"  {c[0]}: {c[1]}")

        # Fetch workspace 3
        ws = db.execute(text("SELECT * FROM workspaces WHERE id=3")).fetchone()
        print(f"\n=== WORKSPACE 3 ===")
        if ws:
            print(dict(ws._mapping))

    except Exception as e:
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    check()
