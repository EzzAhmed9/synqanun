from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.core.database import Base

class Matter(Base):
    __tablename__ = "matters"

    id = Column(String, primary_key=True, index=True)
    reference = Column(String, unique=True, index=True, nullable=False)  # e.g. "MAT-2201"
    firm_id = Column(String, ForeignKey("firms.id"), nullable=False, index=True)
    client_id = Column(String, ForeignKey("clients.id"), nullable=False, index=True)
    
    title_en = Column(String, nullable=False)
    title_ar = Column(String, nullable=False)
    
    # 'dispute' | 'consultation' | 'contract' | 'execution' | 'otherProject'
    work_type = Column(String, nullable=False, default="dispute", index=True)
    
    matter_type_en = Column(String, nullable=False, default="Commercial Litigation")
    matter_type_ar = Column(String, nullable=False, default="النزاعات التجارية")
    
    forum_en = Column(String, nullable=False, default="Cairo Court of Appeal")
    forum_ar = Column(String, nullable=False, default="محكمة استئناف القاهرة")
    
    lead_counsel_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    
    status_en = Column(String, nullable=False, default="Opened, no steps taken yet")
    status_ar = Column(String, nullable=False, default="فُتح الملف، ولم تُتَّخذ أي خطوة بعد")
    status_tone = Column(String, default="neutral")  # 'neutral' | 'urgent' | 'positive' | 'warning'
    
    current_phase_en = Column(String, default="Intake")
    current_phase_ar = Column(String, default="القيد الأولي")
    
    court_file_number = Column(String, nullable=True)
    opposing_party_en = Column(String, nullable=True)
    opposing_party_ar = Column(String, nullable=True)
    needs_attention = Column(Boolean, default=False)
    attention_reason_en = Column(String, nullable=True)
    attention_reason_ar = Column(String, nullable=True)
    
    scope_summary_en = Column(Text, nullable=True)
    scope_summary_ar = Column(Text, nullable=True)
    
    is_closed = Column(Boolean, default=False, index=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    firm = relationship("Firm", foreign_keys=[firm_id])
    client = relationship("Client", foreign_keys=[client_id], back_populates="matters")
    lead_counsel = relationship("User", foreign_keys=[lead_counsel_id])
    hearings = relationship("MatterHearing", back_populates="matter", cascade="all, delete-orphan")
    timeline = relationship("MatterTimelineEvent", back_populates="matter", cascade="all, delete-orphan")
    team = relationship("MatterTeamMember", back_populates="matter", cascade="all, delete-orphan")


class MatterTeamMember(Base):
    __tablename__ = "matter_team_members"

    id = Column(String, primary_key=True, index=True)
    matter_id = Column(String, ForeignKey("matters.id", ondelete="CASCADE"), nullable=False, index=True)
    staff_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    role_en = Column(String, default="Associate")
    role_ar = Column(String, default="محامٍ مشارك")

    matter = relationship("Matter", back_populates="team")
    staff = relationship("User", foreign_keys=[staff_id])


class MatterHearing(Base):
    __tablename__ = "matter_hearings"

    id = Column(String, primary_key=True, index=True)
    matter_id = Column(String, ForeignKey("matters.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(String, nullable=False)  # ISO string or YYYY-MM-DD
    time = Column(String, nullable=True)  # e.g. "10:00"
    notes_en = Column(String, nullable=True)
    notes_ar = Column(String, nullable=True)
    status = Column(String, default="scheduled")  # 'scheduled' | 'completed' | 'adjourned'

    matter = relationship("Matter", back_populates="hearings")


class MatterTimelineEvent(Base):
    __tablename__ = "matter_timeline_events"

    id = Column(String, primary_key=True, index=True)
    matter_id = Column(String, ForeignKey("matters.id", ondelete="CASCADE"), nullable=False, index=True)
    kind = Column(String, default="hearing")  # 'filing' | 'hearing' | 'order' | 'consultation'
    title_en = Column(String, nullable=False)
    title_ar = Column(String, nullable=False)
    date = Column(String, nullable=False)

    matter = relationship("Matter", back_populates="timeline")
