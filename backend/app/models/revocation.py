from sqlalchemy import Column, String, DateTime
from datetime import datetime, timezone
from app.core.database import Base

class RevokedToken(Base):
    __tablename__ = "revoked_tokens"

    id = Column(String, primary_key=True, index=True)  # JTI or SHA-256 token digest
    token_type = Column(String, default="access", nullable=False)  # 'access' | 'reset'
    revoked_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    expires_at = Column(DateTime, nullable=True, index=True)
