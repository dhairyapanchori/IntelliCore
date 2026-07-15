import sys
sys.path.append('.')
from app.core.database import SessionLocal
from app.models.core import User, Document, Collection, Department, Workspace, OrganizationUser, ActivityLog, ChatSession, ChatMessage
from app.services.analytics_service import AnalyticsService

db = SessionLocal()
user = db.query(User).first()
print(f"Testing for User: {user.email} (ID: {user.id})")

service = AnalyticsService(db, user)

print(f"User Org IDs: {service.org_ids}")

print("Total Users in DB:", db.query(User).count())
print("Total Documents in DB:", db.query(Document).count())
print("Total Collections in DB:", db.query(Collection).count())
print("Total ActivityLogs in DB:", db.query(ActivityLog).count())
print("Total ChatSessions in DB:", db.query(ChatSession).count())
print("Total ChatMessages in DB:", db.query(ChatMessage).count())

docs_query = service._get_base_docs()
print("Service Base Docs SQL:", docs_query.statement)
print("Service Base Docs Count:", docs_query.count())

activity_query = service._get_base_activity()
print("Service Base Activity SQL:", activity_query.statement)
print("Service Base Activity Count:", activity_query.count())

chat_query = service._get_base_chat()
print("Service Base Chat SQL:", chat_query.statement)
print("Service Base Chat Count:", chat_query.count())

metrics = service.get_analytics_page_metrics()
print("\nKPIs:")
print(metrics["kpis"])
