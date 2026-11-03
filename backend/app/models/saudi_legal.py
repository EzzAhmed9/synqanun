from sqlalchemy import Column, BigInteger, String, Text, Integer, Date, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from app.core.legal_database import LegalBase

class Court(LegalBase):
    __tablename__ = "courts"

    id = Column(BigInteger, primary_key=True, index=True)
    name = Column(String, nullable=False)
    city = Column(String, nullable=True)
    court_level = Column(String, nullable=True)

    judgments = relationship("CourtJudgment", back_populates="court")


class CourtJudgment(LegalBase):
    __tablename__ = "court_judgments"

    case_number = Column(String, primary_key=True)
    case_year = Column(String, primary_key=True)
    court_id = Column(BigInteger, ForeignKey("courts.id"), nullable=False)
    judgment_level = Column(String, nullable=False)
    judgment_number = Column(String, nullable=True)
    judgment_date = Column(String, nullable=True)
    source_url = Column(String, nullable=True)
    full_text = Column(Text, nullable=False)
    attributes = Column(JSONB, nullable=False, default={})
    party_name = Column(String, nullable=True)
    party_role = Column(String, nullable=True)
    identity_number = Column(String, nullable=True)
    case_category = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)

    court = relationship("Court", back_populates="judgments")


class JudgmentSection(LegalBase):
    __tablename__ = "judgment_sections"

    id = Column(BigInteger, primary_key=True, index=True)
    case_number = Column(String, nullable=False)
    case_year = Column(String, nullable=False)
    section_order = Column(Integer, nullable=True)
    section_type = Column(String, nullable=True)
    content = Column(Text, nullable=False)


class JusticeSystem(LegalBase):
    __tablename__ = "justice_systems"

    id = Column(BigInteger, primary_key=True, index=True)
    system_code = Column(String, nullable=True)
    name = Column(String, nullable=False)
    category = Column(String, nullable=True)
    system_type = Column(String, nullable=True)
    status = Column(String, nullable=True)
    issue_date = Column(String, nullable=True)
    full_text = Column(Text, nullable=True)
    attributes = Column(JSONB, nullable=False, default={})
    created_at = Column(DateTime(timezone=True), nullable=True)

    parts = relationship("SystemPart", back_populates="system", order_by="SystemPart.part_order")


class SystemPart(LegalBase):
    __tablename__ = "system_parts"

    id = Column(BigInteger, primary_key=True, index=True)
    system_id = Column(BigInteger, ForeignKey("justice_systems.id"), nullable=False)
    parent_part_id = Column(BigInteger, nullable=True)
    part_type = Column(String, nullable=False)
    part_order = Column(Integer, nullable=True)
    article_number = Column(String, nullable=True)
    article_title = Column(String, nullable=True)
    content = Column(Text, nullable=False)
    part_status = Column(String, nullable=True)
    attributes = Column(JSONB, nullable=False, default={})
    created_at = Column(DateTime(timezone=True), nullable=True)

    system = relationship("JusticeSystem", back_populates="parts")


class DocumentType(LegalBase):
    __tablename__ = "document_types"

    id = Column(BigInteger, primary_key=True, index=True)
    name = Column(String, nullable=True)


class SimpleDocument(LegalBase):
    __tablename__ = "simple_documents"

    id = Column(BigInteger, primary_key=True, index=True)
    title = Column(String, nullable=False)
    document_number = Column(String, nullable=True)
    hijri_date = Column(String, nullable=True)
    gregorian_date = Column(Date, nullable=True)
    content = Column(Text, nullable=True)
    type_id = Column(BigInteger, ForeignKey("document_types.id"), nullable=True)
    created_at = Column(DateTime, nullable=True)
