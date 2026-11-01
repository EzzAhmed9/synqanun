from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)  # e.g. "stf-001" or "acct-client-tarek"
    firm_id = Column(String, ForeignKey("firms.id"), nullable=False, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    side = Column(String, nullable=False)  # 'staff' | 'client'
    
    # Names bilingual
    name_en = Column(String, nullable=False)
    name_ar = Column(String, nullable=False)
    
    # Title bilingual
    title_en = Column(String, nullable=True)
    title_ar = Column(String, nullable=True)
    
    phone = Column(String, nullable=True)
    
    # Staff-specific fields
    rank = Column(String, nullable=True)  # 'partner' | 'seniorAssociate' | 'juniorAssociate' | 'paralegal' | 'legalSecretary'
    status = Column(String, default="active")  # 'active' | 'temporaryPasswordIssued' | 'deactivated'
    joined_days_ago = Column(Integer, default=0)
    
    # Client-specific fields
    client_id = Column(String, ForeignKey("clients.id", ondelete="SET NULL"), nullable=True, index=True)
    client_role = Column(String, nullable=True)  # 'admin' | 'member'
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    firm = relationship("Firm", foreign_keys=[firm_id])
    client = relationship("Client", foreign_keys=[client_id], back_populates="portal_accounts")
