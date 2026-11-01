from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.core.database import Base

class Document(Base):
    __tablename__ = "documents"

    id = Column(String, primary_key=True, index=True)  # e.g. "doc-uuid"
    firm_id = Column(String, ForeignKey("firms.id"), nullable=False, index=True)
    client_id = Column(String, ForeignKey("clients.id"), nullable=True, index=True)
    engagement_ref = Column(String, nullable=True, index=True)  # e.g. "MAT-2201"
    
    name = Column(String, nullable=False)  # Filename with extension e.g. "مذكرة_دفاع_طعن_ضرائب.docx"
    title = Column(String, nullable=False)  # Descriptive title
    kind = Column(String, nullable=False)  # "docx" | "xlsx" | "pdf"
    
    # "courtSubmission" | "contract" | "memo" | "filing" | "statementOfAccount" | "invoiceLedger" | "timesheet" | "other"
    document_type = Column(String, nullable=False, default="courtSubmission", index=True)
    
    file_path = Column(String, nullable=False)  # Relative or absolute path to the stored file
    size_bytes = Column(Integer, nullable=False, default=0)
    
    # "final" | "draft" | "awaitingSignature"
    status = Column(String, nullable=False, default="final", index=True)
    
    # True: firm internal only; False: shared with client portal
    is_firm_only = Column(Boolean, nullable=False, default=False, index=True)
    
    # Microsoft OneDrive / Word Online integration
    onedrive_item_id = Column(String, nullable=True, index=True)
    onedrive_web_url = Column(Text, nullable=True)
    onedrive_synced_at = Column(DateTime, nullable=True)
    
    created_by_id = Column(String, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    firm = relationship("Firm", foreign_keys=[firm_id])
    client = relationship("Client", foreign_keys=[client_id])
    created_by = relationship("User", foreign_keys=[created_by_id])
