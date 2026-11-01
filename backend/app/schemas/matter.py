from typing import Optional, List, Dict
from pydantic import BaseModel

class MatterHearingSchema(BaseModel):
    id: str
    date: str
    time: Optional[str] = None
    notes_en: Optional[str] = None
    notes_ar: Optional[str] = None
    status: str

    class Config:
        from_attributes = True

class MatterTimelineSchema(BaseModel):
    id: str
    kind: str
    title_en: str
    title_ar: str
    date: str

    class Config:
        from_attributes = True

class MatterTeamSchema(BaseModel):
    id: str
    staff_id: str
    role_en: str
    role_ar: str

    class Config:
        from_attributes = True

class MatterCreate(BaseModel):
    title: str
    title_en: Optional[str] = None
    title_ar: Optional[str] = None
    workType: str = "dispute"
    clientId: str
    practiceArea: str
    forum: str
    leadId: str
    scope: Optional[str] = None

class MatterResponse(BaseModel):
    id: str
    reference: str
    firm_id: str
    client_id: str
    title_en: str
    title_ar: str
    work_type: str
    matter_type_en: str
    matter_type_ar: str
    forum_en: str
    forum_ar: str
    lead_counsel_id: str
    status_en: str
    status_ar: str
    status_tone: str
    current_phase_en: str
    current_phase_ar: str
    scope_summary_en: Optional[str] = None
    scope_summary_ar: Optional[str] = None
    is_closed: bool
    hearings: List[MatterHearingSchema] = []
    timeline: List[MatterTimelineSchema] = []
    team: List[MatterTeamSchema] = []

    class Config:
        from_attributes = True
