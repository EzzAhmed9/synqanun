from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.core.database import Base

class Integration(Base):
    __tablename__ = "integrations"

    id = Column(String, primary_key=True, index=True)
    firm_id = Column(String, ForeignKey("firms.id"), nullable=False, index=True)
    provider = Column(String, nullable=False, index=True)  # "microsoft" | "google"
    
    account_email = Column(String, nullable=True)
    account_name = Column(String, nullable=True)
    
    client_id = Column(String, nullable=True)
    client_secret = Column(Text, nullable=True)
    
    access_token = Column(Text, nullable=True)
    refresh_token = Column(Text, nullable=True)
    expires_at = Column(DateTime, nullable=True)
    
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    firm = relationship("Firm", foreign_keys=[firm_id])
