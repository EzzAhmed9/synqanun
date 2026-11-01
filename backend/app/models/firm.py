from sqlalchemy import Column, String, DateTime
from datetime import datetime, timezone
from app.core.database import Base

class Firm(Base):
    __tablename__ = "firms"

    id = Column(String, primary_key=True, index=True)  # e.g. "firm-001"
    name_en = Column(String, nullable=False)
    name_ar = Column(String, nullable=False)
    domain = Column(String, nullable=False, unique=True)
    phone = Column(String, nullable=True)
    city_en = Column(String, default="Cairo")
    city_ar = Column(String, default="القاهرة")
    country_en = Column(String, default="Egypt")
    country_ar = Column(String, default="مصر")
    currency = Column(String, default="EGP")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
