from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.core import User, Organization, Workspace, Department, Collection, Document, DocumentMetadata
from app.api.deps import get_current_active_user
from app.api.workspaces import check_org_access

router = APIRouter()

@router.get("/")
def get_knowledge_graph(
    organization_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Generate a knowledge graph for the entire organization."""
    check_org_access(db, current_user.id, organization_id)
    
    nodes = []
    links = []
    
    org = db.query(Organization).filter(Organization.id == organization_id).first()
    if not org:
        return {"nodes": [], "links": []}
        
    org_node_id = f"org_{org.id}"
    nodes.append({"id": org_node_id, "name": org.name, "type": "Organization", "val": 10})
    
    workspaces = db.query(Workspace).filter(Workspace.organization_id == organization_id).all()
    
    # Track unique topics globally to connect them to multiple documents
    topic_map = {}
    
    for ws in workspaces:
        ws_node_id = f"ws_{ws.id}"
        nodes.append({"id": ws_node_id, "name": ws.name, "type": "Workspace", "val": 8})
        links.append({"source": org_node_id, "target": ws_node_id, "label": "OWNS"})
        
        departments = db.query(Department).filter(Department.workspace_id == ws.id).all()
        for dept in departments:
            dept_node_id = f"dept_{dept.id}"
            nodes.append({"id": dept_node_id, "name": dept.name, "type": "Department", "val": 7})
            links.append({"source": ws_node_id, "target": dept_node_id, "label": "CONTAINS"})
            
            collections = db.query(Collection).filter(Collection.department_id == dept.id).all()
            for col in collections:
                col_node_id = f"col_{col.id}"
                nodes.append({"id": col_node_id, "name": col.name, "type": "Collection", "val": 6})
                links.append({"source": dept_node_id, "target": col_node_id, "label": "MANAGES"})
                
                documents = db.query(Document).filter(Document.collection_id == col.id).all()
                for doc in documents:
                    doc_node_id = f"doc_{doc.id}"
                    nodes.append({"id": doc_node_id, "name": doc.title, "type": "Document", "val": 5})
                    links.append({"source": col_node_id, "target": doc_node_id, "label": "STORES"})
                    
                    # Topics
                    metadata = db.query(DocumentMetadata).filter(DocumentMetadata.document_id == doc.id).first()
                    if metadata and metadata.topics:
                        for topic in metadata.topics:
                            topic_id = f"topic_{topic.replace(' ', '_').lower()}"
                            if topic_id not in topic_map:
                                topic_map[topic_id] = True
                                nodes.append({"id": topic_id, "name": topic, "type": "Topic", "val": 4})
                            links.append({"source": doc_node_id, "target": topic_id, "label": "MENTIONS"})
                            
    return {"nodes": nodes, "links": links}
