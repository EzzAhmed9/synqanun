from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.core.database import Base

class Client(Base):
    __tablename__ = "clients"

    id = Column(String, primary_key=True, index=True)  # e.g. "cli-001"
    firm_id = Column(String, ForeignKey("firms.id"), nullable=False, index=True)
    
    name_en = Column(String, nullable=False)
    name_ar = Column(String, nullable=False)
    
    summary_en = Column(String, nullable=False, default="No work opened yet")
    summary_ar = Column(String, nullable=False, default="لم يُفتح عمل بعد")
    
    # 'retainer' | 'active' | 'prospect'
    standing = Column(String, nullable=False, default="active", index=True)
    last_activity_days_ago = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    firm = relationship("Firm", foreign_keys=[firm_id])
    contacts = relationship("ClientContact", back_populates="client", cascade="all, delete-orphan")
    portal_accounts = relationship("User", foreign_keys="User.client_id", back_populates="client")
    matters = relationship("Matter", back_populates="client")


class ClientContact(Base):
    __tablename__ = "client_contacts"

    id = Column(String, primary_key=True, index=True)
    client_id = Column(String, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True)
    
    name_en = Column(String, nullable=False)
    name_ar = Column(String, nullable=False)
    
    title_en = Column(String, nullable=True)
    title_ar = Column(String, nullable=True)
    
    email = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    
    role = Column(String, default="member")  # 'admin' | 'member'
    status = Column(String, default="active")  # 'active' | 'invited'
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    client = relationship("Client", back_populates="contacts")
