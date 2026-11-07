import re
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc, func, case

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


def build_judgment_title(
    case_num: Optional[str],
    case_yr: Optional[str],
    j_level: Optional[str] = None,
    j_num: Optional[str] = None,
    c_name: Optional[str] = None,
    c_cat: Optional[str] = None,
) -> Dict[str, str]:
    """
    Format judgment title as "قضية رقم X لسنة Yهـ" with smart fallbacks if case_number or case_year is missing.
    """
    INVALID_PLACEHOLDERS = {"غير محدد", "0", "null", "none", "na", "n/a", "-"}
    num = (case_num or "").strip()
    year = (case_yr or "").strip()
    if num.lower() in INVALID_PLACEHOLDERS:
        num = ""
    if year.lower() in INVALID_PLACEHOLDERS:
        year = ""
    court = (c_name or "").strip()
    category = (c_cat or "").strip()
    level = (j_level or "").strip()
    judgment_no = (j_num or "").strip()
    if judgment_no.lower() in INVALID_PLACEHOLDERS:
        judgment_no = ""

    # 1. Primary: Both case number and year are present
    if num and year:
        ar_title = f"قضية رقم {num} لسنة {year}هـ"
        en_title = f"Case No. {num} of {year}H"
        if level and level != "حكم نهائي":
            ar_title += f" ({level})"
            en_title += f" ({level})"
        return {"ar": ar_title, "en": en_title}

    # 2. Only case number is present (year missing)
    if num and not year:
        ar_title = f"قضية رقم {num}" + (f" - {court}" if court else "")
        en_title = f"Case No. {num}" + (f" - {court}" if court else "")
        return {"ar": ar_title, "en": en_title}

    # 3. Only case year is present (case number missing)
    if year and not num:
        if judgment_no:
            return {
                "ar": f"حكم رقم {judgment_no} لسنة {year}هـ",
                "en": f"Judgment No. {judgment_no} of {year}H",
            }
        cat_label = category if category else "قضائية"
        return {
            "ar": f"قضية {cat_label} لسنة {year}هـ",
            "en": f"{category or 'Legal'} Case of {year}H",
        }

    # 4. Both missing (Fallback)
    if judgment_no:
        return {
            "ar": f"حكم قضائي رقم {judgment_no}" + (f" - {court}" if court else ""),
            "en": f"Judgment No. {judgment_no}" + (f" - {court}" if court else ""),
        }
    if category:
        return {
            "ar": f"حكم في دعوى {category}" + (f" ({court})" if court else ""),
            "en": f"Judgment in {category}" + (f" ({court})" if court else ""),
        }
    fallback_court = court if court else "المحكمة المختصة"
    return {
        "ar": f"حكم قضائي ({fallback_court})",
        "en": f"Court Judgment ({fallback_court})",
    }


def build_judgment_search_filter(clean_q: str):
    """
    Build SQLAlchemy filter conditions for CourtJudgment matching text,
    single number/year, or combined case number + year queries (e.g. 1428/1442 or 1428 لسنة 1442).
    """
    clean = clean_q.strip()
    if not clean:
        return None

    conditions = []

    # Check for combined case number + year pattern (e.g. 1428/1442 or 1428 لسنة 1442 or 1428-1442)
    case_year_match = re.search(r"(\d+)\s*(?:/|لسنة|-)\s*(\d+)", clean)
    if case_year_match:
        num, yr = case_year_match.groups()
        conditions.append(
            and_(
                CourtJudgment.case_number.ilike(f"%{num}%"),
                CourtJudgment.case_year.ilike(f"%{yr}%"),
            )
        )

    # Extract isolated digits for queries like "قضية رقم 4670219586" or "رقم القضية 1428"
    extracted_digits = re.findall(r"\d+", clean)
    for d in extracted_digits:
        if len(d) >= 3:
            conditions.append(CourtJudgment.case_number.ilike(f"%{d}%"))
            if len(d) == 4 and (d.startswith("14") or d.startswith("13") or d.startswith("20")):
                conditions.append(CourtJudgment.case_year.ilike(f"%{d}%"))

    # General search pattern: matches full_text, case_number, or case_year
    search_pattern = f"%{clean}%"
    conditions.append(CourtJudgment.full_text.ilike(search_pattern))
    conditions.append(CourtJudgment.case_number.ilike(search_pattern))
    conditions.append(CourtJudgment.case_year.ilike(search_pattern))

    return or_(*conditions)


def calculate_relevance_score(item: Dict[str, Any], query: str) -> float:
    """
    Calculate relevance score for a search result item against the search query.
    Higher score means more relevant (ranks higher in search results).
    Prioritizes exact case numbers and whole-word matches over accidental substrings.
    """
    if not query:
        return 0.0

    q_clean = query.strip().lower()
    title_dict = item.get("title", {})
    title_ar = (title_dict.get("ar", "") if isinstance(title_dict, dict) else str(title_dict or "")).strip().lower()
    body_dict = item.get("body", {})
    body_ar = (body_dict.get("ar", "") if isinstance(body_dict, dict) else str(body_dict or "")).strip().lower()
    ref = str(item.get("reference", "")).strip().lower()
    kind = str(item.get("kind", "")).strip().lower()
    jurisdiction_dict = item.get("jurisdiction", {})
    jurisdiction_ar = (jurisdiction_dict.get("ar", "") if isinstance(jurisdiction_dict, dict) else str(jurisdiction_dict or "")).strip().lower()

    score = 0.0

    # Parse reference parts e.g. 'judg-1442-1120'
    ref_parts = ref.split("-")
    ref_year = ref_parts[1] if len(ref_parts) >= 2 else ""
    ref_case_num = ref_parts[2] if len(ref_parts) >= 3 else ""

    # 1. Exact or prefix title match
    if q_clean == title_ar:
        score += 5000.0
    elif title_ar.startswith(q_clean):
        score += 2500.0
    elif q_clean in title_ar:
        score += 800.0

    # 2. Case Number / Reference match with exact vs partial discrimination
    digits = re.findall(r"\d+", q_clean)
    if digits:
        for d in digits:
            if d == ref_case_num:
                score += 15000.0  # Massive priority for EXACT case number match!
            elif re.search(r"(?<!\d)" + re.escape(d) + r"(?!\d)", title_ar):
                score += 8000.0   # Standalone whole number in title (e.g. "رقم 1120 لسنة")
            elif d in ref:
                score += 150.0    # Substring embedded in longer number (e.g. 1120 inside 4470011205)
            elif d in title_ar:
                score += 100.0

    # Compound case/year match: e.g. "1428/1442" or "1428 لسنة 1442"
    compound_match = re.search(r"(\d+)\s*(?:/|لسنة|-)\s*(\d+)", q_clean)
    if compound_match:
        num, yr = compound_match.groups()
        if num == ref_case_num and yr == ref_year:
            score += 25000.0  # Exact case number + exact year!
        elif num == ref_case_num or (num in ref and yr in ref):
            score += 12000.0
        elif num in title_ar and yr in title_ar:
            score += 6000.0

    # 3. Keyword intent matching across kinds
    has_system_keyword = any(kw in q_clean for kw in ["نظام", "قانون", "تنظيم", "مرسوم"])
    has_judgment_keyword = any(kw in q_clean for kw in ["حكم", "قضية", "دعوى", "طعن", "استئناف"])
    has_regulation_keyword = any(kw in q_clean for kw in ["لائحة", "قرار", "تعميم", "ضوابط", "قواعد"])

    if has_system_keyword and kind == "statute":
        score += 700.0
    if has_judgment_keyword and kind == "judgment":
        score += 500.0
    if has_regulation_keyword and kind == "regulation":
        score += 700.0

    # 4. Multi-word coverage
    words = [w for w in re.split(r"\s+", q_clean) if len(w) > 1]
    matched_title_words = 0
    for w in words:
        is_matched = bool(re.search(r"(?<!\d)" + re.escape(w) + r"(?!\d)", title_ar)) if w.isdigit() else (w in title_ar)
        if is_matched:
            matched_title_words += 1
            score += 180.0
        elif w in jurisdiction_ar:
            score += 40.0
        elif w in body_ar:
            score += 15.0

    # Strong boost if ALL query words appear in the title
    if words and matched_title_words == len(words):
        score += 600.0

    # Frequency in body (capped at +50)
    if body_ar and q_clean in body_ar:
        score += min(50.0, body_ar.count(q_clean) * 10.0)

    return score


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
        counts["judgment"] = 12403
        counts["statute"] = 66
        counts["regulation"] = 825
        counts["all"] = 13294
    else:
        # Search query matching
        search_pattern = f"%{clean_q}%"
        judg_filter = build_judgment_search_filter(clean_q)
        counts["judgment"] = (
            legal_db.query(func.count(CourtJudgment.case_number))
            .filter(judg_filter)
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
        judg_query = legal_db.query(
            CourtJudgment.case_number,
            CourtJudgment.case_year,
            CourtJudgment.judgment_level,
            CourtJudgment.judgment_date,
            CourtJudgment.case_category,
            CourtJudgment.judgment_number,
            Court.name,
            Court.city,
            CourtJudgment.full_text,
        ).outerjoin(Court, CourtJudgment.court_id == Court.id)

        if clean_q:
            judg_filter = build_judgment_search_filter(clean_q)
            if judg_filter is not None:
                judg_query = judg_query.filter(judg_filter)
        if selected_jurisdiction:
            judg_query = judg_query.filter(
                or_(Court.name.ilike(f"%{selected_jurisdiction}%"), Court.city.ilike(f"%{selected_jurisdiction}%"))
            )

        # Order criteria for judgments
        if clean_q:
            digits = re.findall(r"\d+", clean_q)
            if digits:
                primary_digit = digits[0]
                judg_score = case(
                    (CourtJudgment.case_number == clean_q, 10000),
                    (CourtJudgment.case_number == primary_digit, 10000),
                    (CourtJudgment.case_number.in_(digits), 8000),
                    (CourtJudgment.case_number.startswith(primary_digit), 2000),
                    (CourtJudgment.case_number.ilike(f"%{primary_digit}%"), 500),
                    else_=10,
                )
                judg_order = [judg_score.desc(), CourtJudgment.case_year.desc(), CourtJudgment.case_number.desc()]
            else:
                judg_order = [CourtJudgment.case_year.desc(), CourtJudgment.case_number.desc()]
        else:
            judg_order = [CourtJudgment.case_year.desc(), CourtJudgment.case_number.desc()]

        if selected_kind == "judgment":
            total_count = counts["judgment"] if not (clean_q or selected_jurisdiction) else judg_query.count()
            records = (
                judg_query.order_by(*judg_order)
                .offset(offset)
                .limit(limit)
                .all()
            )
        else:
            pool_limit = max(limit, 15) if clean_q else 8
            records = (
                judg_query.order_by(*judg_order)
                .limit(pool_limit)
                .all()
            )

        for case_num, case_yr, j_level, j_date, c_cat, j_num, c_name, c_city, full_text in records:
            court_name = c_name if c_name else "المحكمة المختصة"
            court_city = f" - {c_city}" if c_city else ""
            venue_label = f"{court_name}{court_city}"
            ref_yr = case_yr or "NA"
            ref_num = case_num or (j_num or "0")
            snippet = extract_snippet(full_text or "", clean_q, max_chars=320)
            items.append({
                "reference": f"JUDG-{ref_yr}-{ref_num}",
                "kind": "judgment",
                "title": build_judgment_title(
                    case_num=case_num,
                    case_yr=case_yr,
                    j_level=j_level,
                    j_num=j_num,
                    c_name=court_name,
                    c_cat=c_cat,
                ),
                "jurisdiction": {
                    "ar": venue_label,
                    "en": venue_label
                },
                "issuedOn": j_date or (f"{case_yr}-01-01" if case_yr else None),
                "body": {
                    "ar": snippet or "",
                    "en": snippet or ""
                },
                "status": j_level or "حكم نهائي",
                "category": c_cat or "قضاء عام",
                "tags": [t for t in [j_level or "استئناف", case_yr] if t]
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

        if clean_q:
            sys_score = case(
                (func.lower(JusticeSystem.name) == clean_q.lower(), 2000),
                (JusticeSystem.name.ilike(f"{clean_q}%"), 1000),
                (JusticeSystem.name.ilike(f"%{clean_q}%"), 500),
                else_=10,
            )
            sys_order = [sys_score.desc(), JusticeSystem.id.asc()]
        else:
            sys_order = [JusticeSystem.id.asc()]

        sys_pool_count = sys_query.count()
        if selected_kind == "statute":
            total_count = sys_pool_count
            sys_records = sys_query.order_by(*sys_order).offset(offset).limit(limit).all()
        else:
            pool_limit = max(limit, 15) if clean_q else 5
            sys_records = sys_query.order_by(*sys_order).limit(pool_limit).all()

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

        if clean_q:
            doc_score = case(
                (func.lower(SimpleDocument.title) == clean_q.lower(), 2000),
                (SimpleDocument.title.ilike(f"{clean_q}%"), 1000),
                (SimpleDocument.title.ilike(f"%{clean_q}%"), 500),
                else_=10,
            )
            doc_order = [doc_score.desc(), SimpleDocument.id.desc()]
        else:
            doc_order = [SimpleDocument.id.desc()]

        doc_pool_count = doc_query.count()
        if selected_kind == "regulation":
            total_count = doc_pool_count
            doc_records = doc_query.order_by(*doc_order).offset(offset).limit(limit).all()
        else:
            pool_limit = max(limit, 15) if clean_q else 4
            doc_records = doc_query.order_by(*doc_order).limit(pool_limit).all()

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

    # 3. Cross-category Relevance Ranking across all sources
    if clean_q and not selected_kind:
        items.sort(key=lambda it: calculate_relevance_score(it, clean_q), reverse=True)
        items = items[offset : offset + limit]

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
                    "title": build_judgment_title(
                        case_num=judg.case_number,
                        case_yr=judg.case_year,
                        j_level=judg.judgment_level,
                        j_num=judg.judgment_number,
                        c_name=court.name if court else None,
                        c_cat=judg.case_category,
                    ),
                    "jurisdiction": {
                        "ar": court_label,
                        "en": court_label
                    },
                    "issuedOn": judg.judgment_date or (f"{judg.case_year}-01-01" if judg.case_year else None),
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
