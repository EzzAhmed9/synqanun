from typing import Optional, List, Dict
from pydantic import BaseModel

class LocalizedText(BaseModel):
    en: str
    ar: str

class ClientContactBase(BaseModel):
    name_en: str
    name_ar: str
    title_en: Optional[str] = None
    title_ar: Optional[str] = None
    email: str
    phone: Optional[str] = None
    role: str = "member"  # 'admin' | 'member'
    status: str = "active"

class ClientContactCreate(BaseModel):
    name: str
    title: Optional[str] = None
    email: str
    phone: Optional[str] = None
    role: str = "member"
    status: Optional[str] = "invited"

class ClientContactResponse(ClientContactBase):
    id: str
    client_id: str

    class Config:
        from_attributes = True

class ClientCreate(BaseModel):
    name: str  # Can be single input or dual
    name_en: Optional[str] = None
    name_ar: Optional[str] = None
    summary: Optional[str] = None
    summary_en: Optional[str] = None
    summary_ar: Optional[str] = None
    standing: str = "active"  # 'retainer' | 'active' | 'prospect'

class ClientUpdate(BaseModel):
    name_en: Optional[str] = None
    name_ar: Optional[str] = None
    summary_en: Optional[str] = None
    summary_ar: Optional[str] = None
    standing: Optional[str] = None

class ClientResponse(BaseModel):
    id: str
    firm_id: str
    name_en: str
    name_ar: str
    summary_en: str
    summary_ar: str
    standing: str
    last_activity_days_ago: int
    contacts: List[ClientContactResponse] = []

    class Config:
        from_attributes = True

# Helper shape formatted for the frontend
class ClientSummaryItem(BaseModel):
    id: str
    name: Dict[str, str]
    summary: Dict[str, str]
    standing: str
    lastActivityDaysAgo: int
