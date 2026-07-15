from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class OrganizationResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class DummyORM:
    def __init__(self):
        self.id = 1
        self.name = "Test"
        self.created_at = datetime.now()
        # Note: No description and no updated_at

try:
    obj = DummyORM()
    res = OrganizationResponse.model_validate(obj)
    print("Success:", res)
except Exception as e:
    print("Failed:", e)
