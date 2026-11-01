from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from datetime import datetime

class WordGenerationRequest(BaseModel):
    matter_reference: str
    template_type: str = "pleading"  # "pleading" | "contract" | "memo" | "assignment"
    title: Optional[str] = None
    court_name: Optional[str] = None
    circuit: Optional[str] = None
    case_number: Optional[str] = None
    client_role: Optional[str] = "المدعي"
    opposing_party: Optional[str] = None
    facts: Optional[str] = None
    defenses: Optional[str] = None
    requests: Optional[str] = None
    body: Optional[str] = None
    contract_clauses: Optional[List[Dict[str, str]]] = None
    is_firm_only: bool = False

class ExcelExportRequest(BaseModel):
    export_type: str = "client_statement"  # "client_statement" | "invoices_ledger" | "timesheet"
    matter_reference: Optional[str] = None
    client_id: Optional[str] = None
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    is_firm_only: bool = False

class DocumentResponse(BaseModel):
    id: str
    name: str
    title: str
    kind: str  # "docx" | "xlsx" | "pdf"
    document_type: str
    size_bytes: int
    size_label: str
    status: str
    is_firm_only: bool
    engagement_ref: Optional[str] = None
    client_id: Optional[str] = None
    created_at: str
    download_url: str

    class Config:
        from_attributes = True

class DocumentListResponse(BaseModel):
    items: List[DocumentResponse]
    total: int
