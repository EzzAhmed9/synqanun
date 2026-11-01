from typing import Optional, List
from pydantic import BaseModel

class LegalEntryCreate(BaseModel):
    reference: str
    kind: str  # 'judgment' | 'statute' | 'regulation' | 'commentary'
    title_en: str
    title_ar: str
    jurisdiction_en: str
    jurisdiction_ar: str
    issued_on: str
    content_en: str
    content_ar: str
    tags: Optional[str] = None

class LegalEntryResponse(BaseModel):
    id: str
    reference: str
    kind: str
    title_en: str
    title_ar: str
    jurisdiction_en: str
    jurisdiction_ar: str
    issued_on: str
    content_en: str
    content_ar: str
    tags: Optional[str] = None

    class Config:
        from_attributes = True
