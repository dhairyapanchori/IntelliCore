import sys
sys.path.append('.')
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timedelta
import random

from app.core.database import SessionLocal
from app.models.core import ActivityLog, User, Document

db = SessionLocal()

user = db.query(User).first()
documents = db.query(Document).all()
doc_ids = [d.id for d in documents] if documents else [1]
doc_titles = [d.title for d in documents] if documents else ["Sample Document"]

if not user:
    print("No users found to seed data for.")
    exit()

today = datetime.utcnow()
activities = []

search_queries = [
    "onboarding policy", "Q3 financial report", "engineering guidelines", 
    "expense policy", "cloud infrastructure architecture", "marketing assets 2026",
    "remote work policy", "holiday schedule", "benefits package"
]

# Generate random searches and downloads over the last 60 days
for i in range(250):
    # Random date in last 60 days (more weighted towards recent)
    days_ago = int(random.triangular(0, 60, 10))
    event_time = today - timedelta(days=days_ago, hours=random.randint(0, 23), minutes=random.randint(0, 59))
    
    # Randomly choose search or download
    if random.random() < 0.6:
        # Search
        query = random.choice(search_queries)
        activities.append(ActivityLog(
            user_id=user.id,
            action="search",
            details=f"Searched for '{query}'. Found {random.randint(1, 15)} results",
            created_at=event_time
        ))
    else:
        # Download
        doc_idx = random.randint(0, len(doc_ids) - 1)
        activities.append(ActivityLog(
            user_id=user.id,
            action="download",
            target_type="document",
            target_id=doc_ids[doc_idx],
            details=f"Downloaded document '{doc_titles[doc_idx]}'",
            created_at=event_time
        ))

db.add_all(activities)
db.commit()
print(f"Successfully seeded {len(activities)} historical activity logs.")
