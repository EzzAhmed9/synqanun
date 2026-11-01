from typing import Optional, List, Dict
from pydantic import BaseModel

class LineItemCreate(BaseModel):
    description: str
    amount: float
    detail: Optional[str] = None
    minutes: Optional[int] = None
    fromEntryIds: Optional[List[str]] = None

class LineItemResponse(BaseModel):
    id: str
    description_en: str
    description_ar: str
    detail_en: Optional[str] = None
    detail_ar: Optional[str] = None
    amount: float
    order: int

    class Config:
        from_attributes = True

class InvoiceDraftCreate(BaseModel):
    engagementRef: str
    description: str
    lines: List[LineItemCreate]

class InvoiceResponse(BaseModel):
    id: str
    sequence: str
    reference: str
    firm_id: str
    client_id: str
    engagement_ref: str
    description_en: str
    description_ar: str
    status: str
    currency: str
    issue_date: str
    due_date: str
    paid_at: Optional[str] = None
    prepared_by_id: str
    total_amount: Optional[float] = None
    line_items: List[LineItemResponse] = []

    class Config:
        from_attributes = True

class TimeEntryCreate(BaseModel):
    matterId: str  # e.g. MAT-2201
    minutes: int
    description: str
    billable: bool = True
    entryDate: Optional[str] = None

class TimeEntryResponse(BaseModel):
    id: str
    matter_id: str
    staff_id: str
    minutes: int
    rate_at_time: float
    billable: bool
    is_invoiced: bool
    description_en: str
    description_ar: str
    entry_date: str

    class Config:
        from_attributes = True

class BillingSummaryResponse(BaseModel):
    unbilledMinutes: int
    unbilledAmount: float
    draftInvoicesCount: int
    draftInvoicesAmount: float
    dueInvoicesCount: int
    dueInvoicesAmount: float
    overdueInvoicesCount: int
    overdueInvoicesAmount: float
    currency: str
