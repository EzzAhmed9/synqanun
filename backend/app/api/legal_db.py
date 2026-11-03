import re
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, func

from app.core.legal_database import get_legal_db
from app.core.database import get_db as get_operational_db
from app.core.permissions import require_staff
from app.models.user import User
from app.models.saudi_legal import (
    Court,
    CourtJudgment,
    JudgmentSection,
    JusticeSystem,
    SystemPart,
    SimpleDocument,
    DocumentType,
)
from app.models.legal_db import LegalDatabaseEntry

router = APIRouter(prefix="/staff/legal-database", tags=["Legal Database"])


def extract_snippet(text: str, query: Optional[str] = None, max_chars: int = 250) -> str:
    if not text:
        return ""
    clean_text = " ".join(text.split())
    if not query:
        return clean_text[:max_chars].strip() + ("..." if len(clean_text) > max_chars else "")

    idx = clean_text.lower().find(query.lower().strip())
    if idx == -1:
        return clean_text[:max_chars].strip() + ("..." if len(clean_text) > max_chars else "")

    start = max(0, idx - 60)
    end = min(len(clean_text), idx + max_chars - 60)
    prefix = "... " if start > 0 else ""
    suffix = " ..." if end < len(clean_text) else ""
    return prefix + clean_text[start:end].strip() + suffix


@router.get("", response_model=dict)
def search_legal_database(
    q: Optional[str] = Query(None, description="Search query across judgments, statutes, and decrees"),
    kind: Optional[str] = Query(None, description="Filter: all, judgment, statute, regulation"),
    jurisdiction: Optional[str] = Query(None, description="Filter by court or issuing authority"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(15, ge=1, le=50, description="Items per page"),
    current_user: User = Depends(require_staff),
    legal_db: Session = Depends(get_legal_db),
    app_db: Session = Depends(get_operational_db),
):
    offset = (page - 1) * limit
    clean_q = q.strip() if q else ""
    selected_kind = kind if kind and kind != "all" else None
    selected_jurisdiction = jurisdiction if jurisdiction and jurisdiction != "all" else None

    items: List[Dict[str, Any]] = []
    total_count = 0

    # Counts by kind
    counts = {
        "all": 0,
        "judgment": 0,
        "statute": 0,
        "regulation": 0,
    }

    # 1. Total counts estimation/queries
    if not clean_q:
        counts["judgment"] = legal_db.query(func.count(CourtJudgment.case_number)).scalar() or 0
        counts["statute"] = legal_db.query(func.count(JusticeSystem.id)).scalar() or 0
        counts["regulation"] = legal_db.query(func.count(SimpleDocument.id)).scalar() or 0
        counts["all"] = counts["judgment"] + counts["statute"] + counts["regulation"]
    else:
        # Search query matching
        search_pattern = f"%{clean_q}%"
        counts["judgment"] = (
            legal_db.query(func.count(CourtJudgment.case_number))
            .filter(or_(CourtJudgment.full_text.ilike(search_pattern), CourtJudgment.case_number.ilike(search_pattern)))
            .scalar()
            or 0
        )
        counts["statute"] = (
            legal_db.query(func.count(JusticeSystem.id))
            .filter(or_(JusticeSystem.name.ilike(search_pattern), JusticeSystem.full_text.ilike(search_pattern)))
            .scalar()
            or 0
        )
        counts["regulation"] = (
            legal_db.query(func.count(SimpleDocument.id))
            .filter(or_(SimpleDocument.title.ilike(search_pattern), SimpleDocument.content.ilike(search_pattern)))
            .scalar()
            or 0
        )
        counts["all"] = counts["judgment"] + counts["statute"] + counts["regulation"]

    # 2. Query target pools based on kind
    # A) JUDGMENTS
    if not selected_kind or selected_kind == "judgment":
        judg_query = legal_db.query(CourtJudgment, Court).outerjoin(Court, CourtJudgment.court_id == Court.id)
        if clean_q:
            search_pattern = f"%{clean_q}%"
            judg_query = judg_query.filter(
                or_(CourtJudgment.full_text.ilike(search_pattern), CourtJudgment.case_number.ilike(search_pattern))
            )
        if selected_jurisdiction:
            judg_query = judg_query.filter(
                or_(Court.name.ilike(f"%{selected_jurisdiction}%"), Court.city.ilike(f"%{selected_jurisdiction}%"))
            )

        judg_pool_count = judg_query.count()
        if selected_kind == "judgment":
            total_count = judg_pool_count
            records = judg_query.order_by(CourtJudgment.case_year.desc(), CourtJudgment.case_number.desc()).offset(offset).limit(limit).all()
        else:
            records = judg_query.order_by(CourtJudgment.case_year.desc()).limit(8).all()

        for j, c in records:
            court_name = c.name if c else "المحكمة المختصة"
            court_city = f" - {c.city}" if (c and c.city) else ""
            venue_label = f"{court_name}{court_city}"
            items.append({
                "reference": f"JUDG-{j.case_year}-{j.case_number}",
                "kind": "judgment",
                "title": {
                    "ar": f"حكم قضائي في القضية رقم {j.case_number} لسنة {j.case_year}هـ ({j.judgment_level})",
                    "en": f"Court Judgment Case No. {j.case_number}/{j.case_year}H ({j.judgment_level})"
                },
                "jurisdiction": {
                    "ar": venue_label,
                    "en": venue_label
                },
                "issuedOn": j.judgment_date or f"{j.case_year}-01-01",
                "body": {
                    "ar": extract_snippet(j.full_text, clean_q),
                    "en": extract_snippet(j.full_text, clean_q)
                },
                "status": j.judgment_level or "حكم نهائي",
                "category": j.case_category or "قضاء عام",
                "tags": [j.judgment_level, j.case_year]
            })

    # B) STATUTES & SYSTEMS
    if not selected_kind or selected_kind == "statute":
        sys_query = legal_db.query(JusticeSystem)
        if clean_q:
            search_pattern = f"%{clean_q}%"
            sys_query = sys_query.filter(
                or_(JusticeSystem.name.ilike(search_pattern), JusticeSystem.full_text.ilike(search_pattern))
            )
        if selected_jurisdiction:
            sys_query = sys_query.filter(JusticeSystem.category.ilike(f"%{selected_jurisdiction}%"))

        sys_pool_count = sys_query.count()
        if selected_kind == "statute":
            total_count = sys_pool_count
            sys_records = sys_query.order_by(JusticeSystem.id.asc()).offset(offset).limit(limit).all()
        else:
            sys_records = sys_query.order_by(JusticeSystem.id.asc()).limit(5).all()

        for s in sys_records:
            items.append({
                "reference": f"SYS-{s.id}",
                "kind": "statute",
                "title": {
                    "ar": s.name,
                    "en": s.name
                },
                "jurisdiction": {
                    "ar": s.category or "الأنظمة واللوائح العدلية",
                    "en": s.category or "Saudi Justice Systems"
                },
                "issuedOn": s.issue_date or (s.created_at.strftime("%Y-%m-%d") if s.created_at else "1440-01-01"),
                "body": {
                    "ar": extract_snippet(s.full_text or s.name, clean_q),
                    "en": extract_snippet(s.full_text or s.name, clean_q)
                },
                "status": s.status or "ساري",
                "category": s.system_type or "نظام",
                "tags": [s.status or "ساري", s.category or "نظام"]
            })

    # C) SIMPLE DOCUMENTS (DECREES & REGULATIONS)
    if not selected_kind or selected_kind == "regulation":
        doc_query = legal_db.query(SimpleDocument)
        if clean_q:
            search_pattern = f"%{clean_q}%"
            doc_query = doc_query.filter(
                or_(SimpleDocument.title.ilike(search_pattern), SimpleDocument.content.ilike(search_pattern))
            )

        doc_pool_count = doc_query.count()
        if selected_kind == "regulation":
            total_count = doc_pool_count
            doc_records = doc_query.order_by(SimpleDocument.id.desc()).offset(offset).limit(limit).all()
        else:
            doc_records = doc_query.order_by(SimpleDocument.id.desc()).limit(4).all()

        for d in doc_records:
            items.append({
                "reference": f"DOC-{d.id}",
                "kind": "regulation",
                "title": {
                    "ar": d.title,
                    "en": d.title
                },
                "jurisdiction": {
                    "ar": "الجريدة الرسمية واللوائح التنفيذية",
                    "en": "Official Gazette & Executive Regulations"
                },
                "issuedOn": d.hijri_date or (d.gregorian_date.strftime("%Y-%m-%d") if d.gregorian_date else "1445-01-01"),
                "body": {
                    "ar": extract_snippet(d.content or d.title, clean_q),
                    "en": extract_snippet(d.content or d.title, clean_q)
                },
                "status": "ساري",
                "category": "لوائح وقرارات",
                "tags": ["قرار تنفيذي", d.document_number or ""]
            })

    if not selected_kind:
        total_count = counts["all"]

    # Available facets
    kinds_facet = [
        {"value": "all", "label": "الكل", "count": counts["all"]},
        {"value": "judgment", "label": "أحكام قضائية", "count": counts["judgment"]},
        {"value": "statute", "label": "أنظمة ولوائح", "count": counts["statute"]},
        {"value": "regulation", "label": "قرارات وتعاميم", "count": counts["regulation"]},
    ]

    jurisdictions_facet = [
        {"value": "المحكمة التجارية", "label": {"ar": "المحكمة التجارية", "en": "Commercial Court"}},
        {"value": "محكمة الاستئناف", "label": {"ar": "محكمة الاستئناف", "en": "Court of Appeal"}},
        {"value": "المحكمة العامة", "label": {"ar": "المحكمة العامة", "en": "General Court"}},
        {"value": "القضاء", "label": {"ar": "الأنظمة القضائية", "en": "Judicial Systems"}},
        {"value": "المحاماة", "label": {"ar": "أنظمة وقواعد المحاماة", "en": "Advocacy & Legal Practice"}},
    ]

    return {
        "items": items,
        "total": total_count,
        "page": page,
        "limit": limit,
        "totalPages": max(1, (total_count + limit - 1) // limit),
        "kinds": ["judgment", "statute", "regulation"],
        "kinds_facet": kinds_facet,
        "jurisdictions": jurisdictions_facet,
        "counts": counts
    }


@router.get("/{reference}", response_model=dict)
def get_legal_entry_detail(
    reference: str,
    current_user: User = Depends(require_staff),
    legal_db: Session = Depends(get_legal_db),
    app_db: Session = Depends(get_operational_db),
):
    decoded_ref = reference.strip()

    # 1. JUDGMENT (Format: JUDG-{case_year}-{case_number})
    if decoded_ref.startswith("JUDG-"):
        parts = decoded_ref.replace("JUDG-", "").split("-", 1)
        if len(parts) == 2:
            case_year, case_number = parts[0], parts[1]
            judg = legal_db.query(CourtJudgment).filter(
                CourtJudgment.case_year == case_year,
                CourtJudgment.case_number == case_number
            ).first()

            if judg:
                court = legal_db.query(Court).filter(Court.id == judg.court_id).first()
                court_label = f"{court.name} - {court.city}" if (court and court.city) else (court.name if court else "المحكمة المختصة")
                
                # Fetch structured sections (الوقائع، الأسباب، المنطوق)
                sections_db = legal_db.query(JudgmentSection).filter(
                    JudgmentSection.case_year == case_year,
                    JudgmentSection.case_number == case_number
                ).order_by(JudgmentSection.section_order.asc()).all()

                sections_list = []
                for s in sections_db:
                    sections_list.append({
                        "id": s.id,
                        "type": s.section_type or "نص الحكم",
                        "number": s.section_type or str(s.section_order or 1),
                        "body": s.content
                    })

                # If no sections in table, parse paragraphs from full_text
                if not sections_list and judg.full_text:
                    paragraphs = [p.strip() for p in judg.full_text.split("\n\n") if p.strip()]
                    for i, p in enumerate(paragraphs[:10], start=1):
                        sections_list.append({
                            "id": i,
                            "type": "فقرة",
                            "number": str(i),
                            "body": p
                        })

                entry_obj = {
                    "reference": decoded_ref,
                    "kind": "judgment",
                    "title": {
                        "ar": f"حكم قضائي في القضية رقم {judg.case_number} لسنة {judg.case_year}هـ",
                        "en": f"Court Judgment Case No. {judg.case_number}/{judg.case_year}H"
                    },
                    "jurisdiction": {
                        "ar": court_label,
                        "en": court_label
                    },
                    "issuedOn": judg.judgment_date or f"{judg.case_year}-01-01",
                    "body": {
                        "ar": judg.full_text,
                        "en": judg.full_text
                    },
                    "sections": sections_list,
                    "partyName": judg.party_name,
                    "partyRole": judg.party_role,
                    "category": judg.case_category or "قضاء عام",
                    "level": judg.judgment_level,
                    "judgmentNumber": judg.judgment_number
                }

                return {
                    "entry": entry_obj,
                    "reference": decoded_ref,
                    "kind": "judgment",
                    "title": entry_obj["title"],
                    "jurisdiction": entry_obj["jurisdiction"],
                    "issuedOn": entry_obj["issuedOn"],
                    "body": entry_obj["body"],
                    "sections": sections_list,
                    "position": 1,
                    "total": 1
                }

    # 2. JUSTICE SYSTEM (Format: SYS-{id})
    if decoded_ref.startswith("SYS-"):
        sys_id_str = decoded_ref.replace("SYS-", "")
        if sys_id_str.isdigit():
            sys_id = int(sys_id_str)
            system = legal_db.query(JusticeSystem).filter(JusticeSystem.id == sys_id).first()

            if system:
                parts_db = legal_db.query(SystemPart).filter(
                    SystemPart.system_id == sys_id
                ).order_by(SystemPart.part_order.asc()).all()

                sections_list = []
                for p in parts_db:
                    label = f"{p.part_type} {p.article_number or ''}".strip()
                    if p.article_title:
                        label += f": {p.article_title}"
                    sections_list.append({
                        "id": p.id,
                        "type": p.part_type,
                        "number": label or str(p.part_order or 1),
                        "body": p.content
                    })

                entry_obj = {
                    "reference": decoded_ref,
                    "kind": "statute",
                    "title": {
                        "ar": system.name,
                        "en": system.name
                    },
                    "jurisdiction": {
                        "ar": system.category or "الأنظمة واللوائح العدلية",
                        "en": system.category or "Saudi Justice Systems"
                    },
                    "issuedOn": system.issue_date or (system.created_at.strftime("%Y-%m-%d") if system.created_at else "1440-01-01"),
                    "body": {
                        "ar": system.full_text or system.name,
                        "en": system.full_text or system.name
                    },
                    "sections": sections_list,
                    "status": system.status or "ساري",
                    "category": system.system_type or "نظام",
                    "code": system.system_code
                }

                return {
                    "entry": entry_obj,
                    "reference": decoded_ref,
                    "kind": "statute",
                    "title": entry_obj["title"],
                    "jurisdiction": entry_obj["jurisdiction"],
                    "issuedOn": entry_obj["issuedOn"],
                    "body": entry_obj["body"],
                    "sections": sections_list,
                    "position": 1,
                    "total": 1
                }

    # 3. SIMPLE DOCUMENT / DECREE (Format: DOC-{id})
    if decoded_ref.startswith("DOC-"):
        doc_id_str = decoded_ref.replace("DOC-", "")
        if doc_id_str.isdigit():
            doc_id = int(doc_id_str)
            doc = legal_db.query(SimpleDocument).filter(SimpleDocument.id == doc_id).first()

            if doc:
                sections_list = []
                paragraphs = [p.strip() for p in (doc.content or "").split("\n\n") if p.strip()]
                for i, p in enumerate(paragraphs, start=1):
                    sections_list.append({
                        "id": i,
                        "type": "فقرة",
                        "number": f"مادة / فقرة {i}",
                        "body": p
                    })

                entry_obj = {
                    "reference": decoded_ref,
                    "kind": "regulation",
                    "title": {
                        "ar": doc.title,
                        "en": doc.title
                    },
                    "jurisdiction": {
                        "ar": "الجريدة الرسمية واللوائح التنفيذية",
                        "en": "Official Gazette & Executive Regulations"
                    },
                    "issuedOn": doc.hijri_date or (doc.gregorian_date.strftime("%Y-%m-%d") if doc.gregorian_date else "1445-01-01"),
                    "body": {
                        "ar": doc.content or doc.title,
                        "en": doc.content or doc.title
                    },
                    "sections": sections_list,
                    "documentNumber": doc.document_number,
                    "category": "لوائح وقرارات"
                }

                return {
                    "entry": entry_obj,
                    "reference": decoded_ref,
                    "kind": "regulation",
                    "title": entry_obj["title"],
                    "jurisdiction": entry_obj["jurisdiction"],
                    "issuedOn": entry_obj["issuedOn"],
                    "body": entry_obj["body"],
                    "sections": sections_list,
                    "position": 1,
                    "total": 1
                }

    # 4. FALLBACK: Check operational db for legacy seed entries
    legacy_entry = app_db.query(LegalDatabaseEntry).filter(
        LegalDatabaseEntry.reference.ilike(decoded_ref)
    ).first()

    if legacy_entry:
        entry_obj = {
            "reference": legacy_entry.reference,
            "kind": legacy_entry.kind,
            "title": {"en": legacy_entry.title_en, "ar": legacy_entry.title_ar},
            "jurisdiction": {"en": legacy_entry.jurisdiction_en, "ar": legacy_entry.jurisdiction_ar},
            "issuedOn": legacy_entry.issued_on,
            "body": {"en": legacy_entry.content_en, "ar": legacy_entry.content_ar},
            "content": {"en": legacy_entry.content_en, "ar": legacy_entry.content_ar},
            "sections": [
                {"id": 1, "type": "نص", "number": "1", "body": legacy_entry.content_ar}
            ],
            "tags": [t.strip() for t in legacy_entry.tags.split(",")] if legacy_entry.tags else []
        }
        return {
            "entry": entry_obj,
            "reference": legacy_entry.reference,
            "kind": legacy_entry.kind,
            "title": entry_obj["title"],
            "jurisdiction": entry_obj["jurisdiction"],
            "issuedOn": entry_obj["issuedOn"],
            "body": entry_obj["body"],
            "sections": entry_obj["sections"],
            "position": 1,
            "total": 1
        }

    raise HTTPException(status_code=404, detail="السجل القانوني غير موجود")
