from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.core.database import Base

class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(String, primary_key=True, index=True)
    sequence = Column(String, nullable=False)  # e.g. "089"
    reference = Column(String, unique=True, index=True, nullable=False)  # e.g. "INV-2026-089"
    
    firm_id = Column(String, ForeignKey("firms.id"), nullable=False, index=True)
    client_id = Column(String, ForeignKey("clients.id"), nullable=False, index=True)
    engagement_ref = Column(String, nullable=False, index=True)  # MAT-2201
    
    description_en = Column(String, nullable=False)
    description_ar = Column(String, nullable=False)
    
    # 'draft' | 'pending_approval' | 'due' | 'overdue' | 'paid'
    status = Column(String, nullable=False, default="due", index=True)
    currency = Column(String, default="EGP")
    
    issue_date = Column(String, nullable=False)
    due_date = Column(String, nullable=False)
    paid_at = Column(String, nullable=True)
    
    prepared_by_id = Column(String, ForeignKey("users.id"), nullable=False)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    firm = relationship("Firm", foreign_keys=[firm_id])
    client = relationship("Client", foreign_keys=[client_id])
    prepared_by = relationship("User", foreign_keys=[prepared_by_id])
    line_items = relationship("InvoiceLineItem", back_populates="invoice", cascade="all, delete-orphan")


class InvoiceLineItem(Base):
    __tablename__ = "invoice_line_items"

    id = Column(String, primary_key=True, index=True)
    invoice_id = Column(String, ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True)
    
    description_en = Column(String, nullable=False)
    description_ar = Column(String, nullable=False)
    
    detail_en = Column(String, nullable=True)
    detail_ar = Column(String, nullable=True)
    
    amount = Column(Float, nullable=False, default=0.0)
    order = Column(Integer, default=0)

    invoice = relationship("Invoice", back_populates="line_items")


class TimeEntry(Base):
    __tablename__ = "time_entries"

    id = Column(String, primary_key=True, index=True)
    firm_id = Column(String, ForeignKey("firms.id"), nullable=False, index=True)
    matter_id = Column(String, nullable=False, index=True)  # e.g. "MAT-2201"
    staff_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    
    minutes = Column(Integer, nullable=False)
    rate_at_time = Column(Float, nullable=False)
    billable = Column(Boolean, default=True)
    is_invoiced = Column(Boolean, default=False)
    invoice_id = Column(String, ForeignKey("invoices.id", ondelete="SET NULL"), nullable=True)
    
    description_en = Column(String, nullable=False)
    description_ar = Column(String, nullable=False)
    entry_date = Column(String, nullable=False)  # YYYY-MM-DD
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    staff = relationship("User", foreign_keys=[staff_id])


class Quote(Base):
    __tablename__ = "quotes"

    id = Column(String, primary_key=True, index=True)
    firm_id = Column(String, ForeignKey("firms.id"), nullable=False, index=True)
    client_id = Column(String, ForeignKey("clients.id"), nullable=False, index=True)
    engagement_ref = Column(String, nullable=True)
    
    description_en = Column(String, nullable=False)
    description_ar = Column(String, nullable=False)
    
    amount = Column(Float, nullable=False)
    currency = Column(String, default="EGP")
    valid_until = Column(String, nullable=False)
    
    # 'draft' | 'issued' | 'accepted' | 'declined'
    status = Column(String, default="issued", index=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    client = relationship("Client", foreign_keys=[client_id])
