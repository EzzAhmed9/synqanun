from sqlalchemy import Column, String, Text, DateTime
from datetime import datetime, timezone
from app.core.database import Base

class LegalDatabaseEntry(Base):
    __tablename__ = "legal_database_entries"

    id = Column(String, primary_key=True, index=True)
    reference = Column(String, unique=True, index=True, nullable=False)  # e.g. "SAMPLE-0001"
    
    # 'judgment' | 'statute' | 'regulation' | 'commentary'
    kind = Column(String, nullable=False, default="statute", index=True)
    
    title_en = Column(String, nullable=False)
    title_ar = Column(String, nullable=False)
    
    jurisdiction_en = Column(String, nullable=False)
    jurisdiction_ar = Column(String, nullable=False)
    
    issued_on = Column(String, nullable=False)  # YYYY-MM-DD
    
    content_en = Column(Text, nullable=False)
    content_ar = Column(Text, nullable=False)
    
    tags = Column(String, nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
