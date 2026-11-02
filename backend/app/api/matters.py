import uuid
from datetime import datetime, timedelta
from typing import Optional, List
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, func
from app.core.database import get_db
from app.core.permissions import require_staff, require_client, require_lead_eligible, require_partner
from app.models.user import User
from app.models.client import Client
from app.models.matter import Matter, MatterTeamMember, MatterHearing, MatterTimelineEvent
from app.models.invoice import Invoice, Quote
from app.models.document import Document
from app.schemas.matter import MatterCreate

router = APIRouter(prefix="/staff/matters", tags=["Staff Matters"])
client_router = APIRouter(prefix="/client/matters", tags=["Client Matters"])

PRACTICE_AREAS = [
    {"en": "Commercial Litigation", "ar": "النزاعات التجارية"},
    {"en": "Corporate & Regulatory", "ar": "حوكمة الشركات والتنظيم"},
    {"en": "Maritime & Shipping", "ar": "القانون البحري والشحن"},
    {"en": "Intellectual Property", "ar": "الملكية الفكرية"},
    {"en": "Arbitration & Dispute Resolution", "ar": "التحكيم وفض المنازعات"},
    {"en": "Employment & Labour", "ar": "العمل والتوظيف"},
]

FORUMS = [
    {"en": "Cairo Court of Appeal (Commercial Circuit)", "ar": "محكمة استئناف القاهرة (الدائرة التجارية)"},
    {"en": "Cairo Economic Court", "ar": "محكمة القاهرة الاقتصادية"},
    {"en": "Alexandria Economic Court", "ar": "محكمة الإسكندرية الاقتصادية"},
    {"en": "CRCICA Arbitration Tribunal", "ar": "هيئة تحكيم مركز القاهرة الإقليمي (CRCICA)"},
    {"en": "Abu Dhabi Global Market Registration Authority", "ar": "سلطة التسجيل في سوق أبوظبي العالمي"},
    {"en": "Dubai International Financial Centre Courts", "ar": "محاكم مركز دبي المالي العالمي (DIFC)"},
]

def map_support_role(role_en: Optional[str]) -> str:
    if not role_en:
        return "drafting"
    r = role_en.lower()
    if "lead" in r:
        return "lead"
    if "draft" in r:
        return "drafting"
    if "evidence" in r:
        return "evidence"
    if "filing" in r or "clerk" in r or "secre" in r or "para" in r:
        return "filings"
    if "diligen" in r:
        return "diligence"
    if "research" in r:
        return "research"
    return "drafting"

# ==============================================================================
# STAFF MATTERS ENDPOINTS
# ==============================================================================

@router.get("", response_model=dict)
def list_matters(
    view: Optional[str] = Query("active"),
    filter_by: Optional[str] = Query("all", alias="filter"),
    clientId: Optional[str] = Query(None),
    venue: Optional[str] = Query(None),
    leadId: Optional[str] = Query(None),
    workType: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    all_matters = db.query(Matter).filter(Matter.firm_id == current_user.firm_id).all()
    today = datetime.now()
    
    # Pre-calculate counts
    open_matters = [m for m in all_matters if not m.is_closed]
    archived_matters = [m for m in all_matters if m.is_closed]
    
    def is_mine(m: Matter) -> bool:
        if m.lead_counsel_id == current_user.id:
            return True
        return any(tm.staff_id == current_user.id for tm in m.team)
        
    def has_soon_hearing(m: Matter) -> bool:
        for h in m.hearings:
            try:
                h_date = datetime.strptime(h.date, "%Y-%m-%d")
                delta = (h_date - today).days
                if 0 <= delta <= 14:
                    return True
            except Exception:
                pass
        return False
        
    counts = {
        "all": len(open_matters),
        "mine": len([m for m in open_matters if is_mine(m)]),
        "waitingOnClient": len([m for m in open_matters if m.status_tone == "urgent"]),
        "soon": len([m for m in open_matters if has_soon_hearing(m)]),
        "archived": len(archived_matters),
    }
    
    target_pool = archived_matters if view == "archive" else open_matters
    
    # Filter by segment
    if view != "archive":
        if filter_by == "mine":
            target_pool = [m for m in target_pool if is_mine(m)]
        elif filter_by == "waitingOnClient":
            target_pool = [m for m in target_pool if m.status_tone == "urgent"]
        elif filter_by == "soon":
            target_pool = [m for m in target_pool if has_soon_hearing(m)]
            
    # Secondary filters
    if clientId:
        target_pool = [m for m in target_pool if m.client_id == clientId]
    if venue:
        target_pool = [m for m in target_pool if m.forum_en == venue or m.forum_ar == venue]
    if leadId:
        target_pool = [m for m in target_pool if m.lead_counsel_id == leadId]
    if workType:
        target_pool = [m for m in target_pool if m.work_type == workType]
        
    if q:
        search = q.lower()
        target_pool = [
            m for m in target_pool
            if search in m.reference.lower() or search in m.title_en.lower() or search in m.title_ar.lower()
        ]
        
    # Build rows
    items = []
    for m in target_pool:
        lead = db.query(User).filter(User.id == m.lead_counsel_id).first()
        client = db.query(Client).filter(Client.id == m.client_id).first()
        
        team_members = [
            {
                "name": {"en": lead.name_en, "ar": lead.name_ar},
                "rank": lead.rank,
                "role": "lead"
            }
        ] if lead else []
        
        for tm in m.team:
            st = db.query(User).filter(User.id == tm.staff_id).first()
            if st and st.id != m.lead_counsel_id:
                team_members.append({
                    "name": {"en": st.name_en, "ar": st.name_ar},
                    "rank": st.rank,
                    "role": map_support_role(tm.role_en)
                })
                
        # Next date
        next_date = None
        for h in m.hearings:
            try:
                h_date = datetime.strptime(h.date, "%Y-%m-%d")
                delta = (h_date - today).days
                if delta >= 0:
                    next_date = {
                        "kind": "hearing",
                        "title": {
                            "en": h.notes_en or "Court Hearing",
                            "ar": h.notes_ar or "جلسة محكمة"
                        },
                        "on": h.date,
                        "date": h.date,
                        "inDays": delta
                    }
                    break
            except Exception:
                pass
                
        last_updated = m.updated_at.strftime("%Y-%m-%d") if m.updated_at else today.strftime("%Y-%m-%d")
        
        mapped_work_type = m.work_type
        if mapped_work_type == "dispute":
            mapped_work_type = "case"
        elif mapped_work_type == "execution":
            mapped_work_type = "enforcement"

        items.append({
            "reference": m.reference,
            "kind": "project" if mapped_work_type == "otherProject" else "matter",
            "title": {"en": m.title_en, "ar": m.title_ar},
            "workType": mapped_work_type,
            "category": {"en": m.matter_type_en, "ar": m.matter_type_ar},
            "matterType": {"en": m.matter_type_en, "ar": m.matter_type_ar},
            "clientId": m.client_id,
            "clientName": {"en": client.name_en if client else "", "ar": client.name_ar if client else ""},
            "venue": {"en": m.forum_en, "ar": m.forum_ar},
            "forum": {"en": m.forum_en, "ar": m.forum_ar},
            "status": {"en": m.status_en, "ar": m.status_ar},
            "statusTone": m.status_tone,
            "team": team_members,
            "lastUpdatedOn": last_updated,
            "nextDate": next_date,
            "active": not m.is_closed,
            "needsAttention": m.status_tone == "urgent"
        })
        
    # Facets
    clients_seen = {}
    venues_seen = {}
    leads_seen = {}
    for m in (archived_matters if view == "archive" else open_matters):
        c = db.query(Client).filter(Client.id == m.client_id).first()
        if c:
            clients_seen[c.id] = clients_seen.get(c.id, {"value": c.id, "label": {"en": c.name_en, "ar": c.name_ar}, "count": 0})
            clients_seen[c.id]["count"] += 1
            
        venues_seen[m.forum_en] = venues_seen.get(m.forum_en, {"value": m.forum_en, "label": {"en": m.forum_en, "ar": m.forum_ar}, "count": 0})
        venues_seen[m.forum_en]["count"] += 1
        
        ld = db.query(User).filter(User.id == m.lead_counsel_id).first()
        if ld:
            leads_seen[ld.id] = leads_seen.get(ld.id, {"value": ld.id, "label": {"en": ld.name_en, "ar": ld.name_ar}, "count": 0})
            leads_seen[ld.id]["count"] += 1
            
    WORK_TYPES_LIST = ["case", "consultation", "contract", "enforcement", "otherProject"]
    types_facets = [
        {
            "value": wt,
            "count": len([m for m in target_pool if (
                "case" if m.work_type == "dispute" else (
                    "enforcement" if m.work_type == "execution" else m.work_type
                )
            ) == wt])
        }
        for wt in WORK_TYPES_LIST
    ]
    
    counts["register"] = len(all_matters)

    return {
        "items": items,
        "counts": counts,
        "clients": list(clients_seen.values()),
        "venues": list(venues_seen.values()),
        "leads": list(leads_seen.values()),
        "types": types_facets,
        "facets": {
            "clients": list(clients_seen.values()),
            "venues": list(venues_seen.values()),
            "leads": list(leads_seen.values()),
            "types": types_facets,
        },
        "total": len(items)
    }

@router.get("/lead-options", response_model=List[dict])
def get_lead_options(
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    leads = db.query(User).filter(
        User.firm_id == current_user.firm_id,
        User.side == "staff",
        User.rank.in_(["partner", "seniorAssociate"])
    ).all()
    return [{"value": l.id, "label": {"en": l.name_en, "ar": l.name_ar}} for l in leads]

@router.get("/options", response_model=dict)
def get_new_matter_options(
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    clients = db.query(Client).filter(Client.firm_id == current_user.firm_id).all()
    leads = db.query(User).filter(
        User.firm_id == current_user.firm_id,
        User.side == "staff",
        User.rank.in_(["partner", "seniorAssociate"])
    ).all()
    
    return {
        "clients": [{"id": c.id, "name": {"en": c.name_en, "ar": c.name_ar}} for c in clients],
        "leads": [{"id": l.id, "name": {"en": l.name_en, "ar": l.name_ar}, "rank": l.rank} for l in leads],
        "practiceAreas": PRACTICE_AREAS,
        "forums": FORUMS,
        "workTypes": ["dispute", "consultation", "contract", "execution", "otherProject"]
    }

@router.get("/{reference}", response_model=dict)
def get_matter_by_reference(
    reference: str,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    matter = db.query(Matter).filter(
        func.lower(Matter.reference) == reference.lower(),
        Matter.firm_id == current_user.firm_id
    ).first()
    
    if not matter:
        raise HTTPException(status_code=404, detail="Matter not found")
        
    lead = db.query(User).filter(User.id == matter.lead_counsel_id).first()
    client = db.query(Client).filter(Client.id == matter.client_id).first()
    today = datetime.now()
    
    # Team members
    team_members = []
    if lead:
        team_members.append({
            "name": {"en": lead.name_en, "ar": lead.name_ar},
            "rank": lead.rank,
            "role": "lead"
        })
    for tm in matter.team:
        staff_user = db.query(User).filter(User.id == tm.staff_id).first()
        if staff_user and staff_user.id != matter.lead_counsel_id:
            team_members.append({
                "name": {"en": staff_user.name_en, "ar": staff_user.name_ar},
                "rank": staff_user.rank,
                "role": map_support_role(tm.role_en)
            })
            
    # Next date from hearings
    next_date = None
    for h in matter.hearings:
        try:
            h_date = datetime.strptime(h.date, "%Y-%m-%d")
            delta = (h_date - today).days
            if delta >= 0:
                next_date = {
                    "on": h.date,
                    "date": h.date,
                    "inDays": delta,
                    "title": {
                        "en": h.notes_en or "Court Hearing",
                        "ar": h.notes_ar or "جلسة محكمة"
                    }
                }
                break
        except Exception:
            pass

    mapped_wt = matter.work_type
    if mapped_wt == "dispute":
        mapped_wt = "case"
    elif mapped_wt == "execution":
        mapped_wt = "enforcement"

    opened_date = matter.created_at.strftime("%Y-%m-%d") if matter.created_at else today.strftime("%Y-%m-%d")
    updated_date = matter.updated_at.strftime("%Y-%m-%d") if matter.updated_at else today.strftime("%Y-%m-%d")
    closed_date = updated_date if matter.is_closed else None

    # Construct the StaffEngagementRow contract
    engagement_row = {
        "kind": "project" if mapped_wt == "otherProject" else "matter",
        "reference": matter.reference,
        "title": {"en": matter.title_en, "ar": matter.title_ar},
        "workType": mapped_wt,
        "category": {"en": matter.matter_type_en, "ar": matter.matter_type_ar},
        "venue": {"en": matter.forum_en, "ar": matter.forum_ar},
        "status": {"en": matter.status_en, "ar": matter.status_ar},
        "statusTone": matter.status_tone or "neutral",
        "registryNumber": matter.court_file_number,
        "clientId": matter.client_id,
        "clientName": {"en": client.name_en if client else "", "ar": client.name_ar if client else ""},
        "team": team_members,
        "lastUpdatedOn": updated_date,
        "openedOn": opened_date,
        "nextDate": next_date,
        "active": not matter.is_closed,
        "closedOn": closed_date,
        "reopenedThisSession": False,
        "needsAttention": matter.needs_attention or (matter.status_tone == "urgent"),
        "leadReassignedThisSession": False
    }

    # Timeline events
    timeline_events = []
    for t in matter.timeline:
        t_date = t.date if t.date else today.strftime("%Y-%m-%d")
        timeline_events.append({
            "id": t.id,
            "kind": "matter",
            "sourceRef": matter.reference,
            "reference": matter.reference,
            "date": t_date,
            "on": t_date,
            "title": {"en": t.title_en, "ar": t.title_ar},
            "detail": {"en": t.title_en, "ar": t.title_ar},
            "note": None,
            "completed": True,
            "awaitingClient": False,
            "eventKind": t.kind or "filing",
            "body": None,
            "documents": []
        })
    for h in matter.hearings:
        h_date = h.date if h.date else today.strftime("%Y-%m-%d")
        is_completed = (h.status == "completed")
        timeline_events.append({
            "id": h.id,
            "kind": "matter",
            "sourceRef": matter.reference,
            "reference": matter.reference,
            "date": h_date,
            "on": h_date,
            "title": {"en": h.notes_en or "Court Hearing", "ar": h.notes_ar or "جلسة محكمة"},
            "detail": {"en": f"Court Hearing - {h.status}", "ar": f"جلسة محكمة - {h.status}"},
            "note": None,
            "completed": is_completed,
            "awaitingClient": False,
            "eventKind": "hearing",
            "body": None,
            "documents": []
        })

    timeline_events.sort(key=lambda x: x["date"])

    # Invoices for this engagement from DB
    matter_invoices = []
    invoices_db = db.query(Invoice).filter(
        Invoice.engagement_ref == matter.reference,
        Invoice.status.in_(["due", "paid", "overdue"])
    ).all()
    for inv in invoices_db:
        total = sum(li.amount for li in inv.line_items) if inv.line_items else 0.0
        desc_en = inv.description_en or "Legal Services Invoice"
        desc_ar = inv.description_ar or "فاتورة خدمات قانونية"
        matter_invoices.append({
            "id": inv.id,
            "reference": inv.reference,
            "engagementRef": matter.reference,
            "issuedOn": inv.issue_date,
            "dueOn": inv.due_date,
            "amount": total,
            "currency": inv.currency,
            "status": inv.status,
            "description": {"en": desc_en, "ar": desc_ar},
            "summary": {"en": desc_en, "ar": desc_ar},
            "lineItems": []
        })

    # Approvals / quotes for this engagement from DB
    matter_approvals = []
    quotes_db = db.query(Quote).filter(Quote.engagement_ref == matter.reference).all()
    for q in quotes_db:
        matter_approvals.append({
            "id": q.id,
            "kind": "quote",
            "title": {"en": q.description_en or "Fee Quote", "ar": q.description_ar or "عرض أتعاب"},
            "submittedBy": {"en": lead.name_en if lead else "", "ar": lead.name_ar if lead else ""},
            "submittedByRank": lead.rank if lead else "partner",
            "clientName": {"en": client.name_en if client else "", "ar": client.name_ar if client else ""},
            "engagementRef": matter.reference,
            "dueOn": q.valid_until or today.strftime("%Y-%m-%d"),
            "daysOverdue": 0,
            "dueToday": False
        })

    # Documents for this matter from PostgreSQL
    docs_db = db.query(Document).filter(
        func.lower(Document.engagement_ref) == matter.reference.lower()
    ).order_by(Document.created_at.desc()).all()

    matter_shared_docs = []
    matter_firm_docs = []
    for d in docs_db:
        shared_days_ago = (today - d.created_at.replace(tzinfo=None)).days if d.created_at else 0
        time_display = ""
        if d.created_at:
            h = d.created_at.hour
            m = d.created_at.minute
            s = d.created_at.second
            period = "م" if h >= 12 else "ص"
            h_12 = h if (h == 12 or h == 0) else (h % 12)
            if h_12 == 0:
                h_12 = 12
            time_display = f"{h_12:02d}:{m:02d}:{s:02d} {period}"

        doc_entry = {
            "id": d.id,
            "name": d.name,
            "kind": d.kind,
            "sizeBytes": d.size_bytes,
            "sharedDaysAgo": max(0, shared_days_ago),
            "sharedOn": d.created_at.strftime("%Y-%m-%d") if d.created_at else today.strftime("%Y-%m-%d"),
            "createdAt": d.created_at.isoformat() if d.created_at else None,
            "updatedAt": d.updated_at.isoformat() if d.updated_at else None,
            "timeFormatted": time_display,
            "status": d.status,
            "engagementRef": matter.reference,
            "firmId": d.firm_id,
            "downloadUrl": f"/api/documents/{d.id}/download",
            "versions": []
        }
        if not d.is_firm_only:
            matter_shared_docs.append(doc_entry)

        firm_type = d.document_type if d.document_type in [
            "letter", "memo", "filing", "contract", "correspondence", "courtSubmission", "other"
        ] else "courtSubmission"
        matter_firm_docs.append({
            "id": d.id,
            "title": d.title,
            "type": firm_type,
            "engagementRef": matter.reference,
            "createdDaysAgo": max(0, shared_days_ago),
            "createdOn": d.created_at.strftime("%Y-%m-%d") if d.created_at else today.strftime("%Y-%m-%d"),
            "firmId": d.firm_id,
            "addedThisSession": False,
            "downloadUrl": f"/api/documents/{d.id}/download"
        })

    counterpart = None
    if matter.opposing_party_en or matter.opposing_party_ar:
        counterpart = {"en": matter.opposing_party_en or "", "ar": matter.opposing_party_ar or ""}

    attention_reason = None
    if matter.attention_reason_en or matter.attention_reason_ar:
        attention_reason = {"en": matter.attention_reason_en or "", "ar": matter.attention_reason_ar or ""}

    return {
        "reference": matter.reference,
        "engagement": engagement_row,
        "openedOn": opened_date,
        "currentPhase": {"en": matter.current_phase_en, "ar": matter.current_phase_ar},
        "counterpart": counterpart,
        "scopeSummary": {"en": matter.scope_summary_en or "", "ar": matter.scope_summary_ar or ""},
        "attentionReason": attention_reason,
        "client": {
            "id": client.id if client else "",
            "name": {"en": client.name_en if client else "", "ar": client.name_ar if client else ""},
            "standing": client.standing if client else "active"
        },
        "timeline": timeline_events,
        "documents": matter_shared_docs,
        "firmDocuments": matter_firm_docs,
        "signatureRequests": [],
        "invoices": matter_invoices,
        "approvals": matter_approvals,
        "tasks": []
    }

@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
def create_matter(
    payload: MatterCreate,
    current_user: User = Depends(require_lead_eligible),
    db: Session = Depends(get_db)
):
    client = db.query(Client).filter(
        Client.id == payload.clientId,
        Client.firm_id == current_user.firm_id
    ).first()
    if not client:
        raise HTTPException(status_code=400, detail="Client not found")
        
    count = db.query(Matter).filter(Matter.firm_id == current_user.firm_id).count()
    reference = f"MAT-{2200 + count + 1}"
    
    title_en = payload.title_en or payload.title
    title_ar = payload.title_ar or payload.title
    
    new_matter = Matter(
        id=f"mat-{uuid.uuid4().hex[:6]}",
        reference=reference,
        firm_id=current_user.firm_id,
        client_id=payload.clientId,
        title_en=title_en,
        title_ar=title_ar,
        work_type=payload.workType,
        matter_type_en=payload.practiceArea,
        matter_type_ar=payload.practiceArea,
        forum_en=payload.forum,
        forum_ar=payload.forum,
        lead_counsel_id=payload.leadId,
        status_en="Opened, no steps taken yet",
        status_ar="فُتح الملف، ولم تُتَّخذ أي خطوة بعد",
        status_tone="neutral",
        current_phase_en="Intake",
        current_phase_ar="القيد الأولي",
        scope_summary_en=payload.scope or "No scope has been recorded for this matter yet.",
        scope_summary_ar=payload.scope or "لم يُسجَّل بعد نطاق تكليف لهذه المسألة القانونية.",
        is_closed=False
    )
    
    db.add(new_matter)
    db.commit()
    db.refresh(new_matter)
    
    return {
        "ok": True,
        "reference": new_matter.reference,
        "matterId": new_matter.id
    }

@router.post("/{reference}/reopen", response_model=dict)
def reopen_matter(
    reference: str,
    current_user: User = Depends(require_partner),
    db: Session = Depends(get_db)
):
    matter = db.query(Matter).filter(
        func.lower(Matter.reference) == reference.lower(),
        Matter.firm_id == current_user.firm_id
    ).first()
    
    if not matter:
        raise HTTPException(status_code=404, detail="Matter not found")
        
    matter.is_closed = False
    matter.status_en = "Reopened by lead counsel"
    matter.status_ar = "أعيد فتح الملف بقرار المحامي المسؤول"
    matter.status_tone = "positive"
    matter.current_phase_en = "Reopened - Under Review"
    matter.current_phase_ar = "مُعاد فتحه - قيد المتابعة والإجراءات"
    
    db.commit()
    return {"ok": True, "reference": matter.reference}

@router.post("/{reference}/close", response_model=dict)
def close_matter(
    reference: str,
    current_user: User = Depends(require_partner),
    db: Session = Depends(get_db)
):
    matter = db.query(Matter).filter(
        func.lower(Matter.reference) == reference.lower(),
        Matter.firm_id == current_user.firm_id
    ).first()
    
    if not matter:
        raise HTTPException(status_code=404, detail="Matter not found")
        
    matter.is_closed = True
    matter.status_en = "Closed and archived"
    matter.status_ar = "مغلقة ومؤرشفة"
    matter.status_tone = "neutral"
    matter.current_phase_en = "Docket Closed"
    matter.current_phase_ar = "الملف مغلق ومؤرشف"
    
    db.commit()
    return {"ok": True, "reference": matter.reference}

class ReassignLeadPayload(BaseModel):
    references: List[str]
    staffId: str

@router.post("/reassign-lead", response_model=dict)
def reassign_lead(
    payload: ReassignLeadPayload,
    current_user: User = Depends(require_lead_eligible),
    db: Session = Depends(get_db)
):
    if not payload.references:
        raise HTTPException(status_code=400, detail="noEngagements")
        
    new_lead = db.query(User).filter(
        User.id == payload.staffId,
        User.firm_id == current_user.firm_id,
        User.status != "deactivated",
        User.rank.in_(["partner", "seniorAssociate"])
    ).first()
    if not new_lead:
        raise HTTPException(status_code=400, detail="leadInvalid")
        
    for ref in payload.references:
        matter = db.query(Matter).filter(
            func.lower(Matter.reference) == ref.lower(),
            Matter.firm_id == current_user.firm_id
        ).first()
        if not matter:
            raise HTTPException(status_code=400, detail="engagementInvalid")
            
    for ref in payload.references:
        matter = db.query(Matter).filter(
            func.lower(Matter.reference) == ref.lower(),
            Matter.firm_id == current_user.firm_id
        ).first()
        matter.lead_counsel_id = new_lead.id
        
    db.commit()
    return {
        "ok": True,
        "reassignedCount": len(payload.references),
        "changed": len(payload.references),
        "leadName": {"en": new_lead.name_en, "ar": new_lead.name_ar}
    }


class AddMatterTeamMemberPayload(BaseModel):
    staff_id: str
    role_ar: Optional[str] = "محامٍ مشارك"
    role_en: Optional[str] = "Associate"


@router.post("/{reference}/team", response_model=dict, status_code=status.HTTP_201_CREATED)
def add_matter_team_member(
    reference: str,
    payload: AddMatterTeamMemberPayload,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    """
    Assign a lawyer / team member to a specific matter and record it in the timeline.
    """
    matter = db.query(Matter).filter(
        func.lower(Matter.reference) == reference.lower(),
        Matter.firm_id == current_user.firm_id
    ).first()
    if not matter:
        raise HTTPException(status_code=404, detail="Matter not found")

    staff = db.query(User).filter(
        User.id == payload.staff_id,
        User.firm_id == current_user.firm_id,
        User.status != "deactivated"
    ).first()
    if not staff:
        raise HTTPException(status_code=400, detail="Staff member not found or deactivated")

    # Check if already lead
    if matter.lead_counsel_id == staff.id:
        raise HTTPException(status_code=400, detail="This lawyer is already the lead counsel on this matter")

    # Check if already a team member
    existing = db.query(MatterTeamMember).filter(
        MatterTeamMember.matter_id == matter.id,
        MatterTeamMember.staff_id == staff.id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Lawyer is already assigned to this matter")

    tm_id = f"tm-{uuid.uuid4().hex[:8]}"
    new_tm = MatterTeamMember(
        id=tm_id,
        matter_id=matter.id,
        staff_id=staff.id,
        role_en=payload.role_en or "Associate",
        role_ar=payload.role_ar or "محامٍ مشارك"
    )
    db.add(new_tm)

    # Add timeline event
    evt_id = f"evt-{uuid.uuid4().hex[:8]}"
    today_str = datetime.now().strftime("%Y-%m-%d")
    evt = MatterTimelineEvent(
        id=evt_id,
        matter_id=matter.id,
        kind="assignment",
        title_en=f"Assigned to matter team: {staff.name_en}",
        title_ar=f"انضمام لفريق العمل: الأستاذ / {staff.name_ar}",
        date=today_str
    )
    db.add(evt)
    db.commit()

    return {
        "ok": True,
        "teamMemberId": tm_id,
        "staffId": staff.id,
        "name": {"en": staff.name_en, "ar": staff.name_ar},
        "rank": staff.rank,
        "role": {"en": new_tm.role_en, "ar": new_tm.role_ar},
        "message": f"تم إضافة الأستاذ {staff.name_ar} إلى فريق عمل القضية بنجاح"
    }


@router.delete("/{reference}/team/{staff_id}", response_model=dict)
def remove_matter_team_member(
    reference: str,
    staff_id: str,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    """
    Remove a supporting lawyer from a matter team and record it in the timeline.
    """
    matter = db.query(Matter).filter(
        func.lower(Matter.reference) == reference.lower(),
        Matter.firm_id == current_user.firm_id
    ).first()
    if not matter:
        raise HTTPException(status_code=404, detail="Matter not found")

    if matter.lead_counsel_id == staff_id:
        raise HTTPException(status_code=400, detail="Cannot remove lead counsel. Reassign lead counsel first.")

    tm = db.query(MatterTeamMember).filter(
        MatterTeamMember.matter_id == matter.id,
        MatterTeamMember.staff_id == staff_id
    ).first()
    if not tm:
        raise HTTPException(status_code=404, detail="Team member not found on this matter")

    staff = db.query(User).filter(User.id == staff_id).first()
    staff_name = staff.name_ar if staff else staff_id

    db.delete(tm)

    # Add timeline event
    evt_id = f"evt-{uuid.uuid4().hex[:8]}"
    today_str = datetime.now().strftime("%Y-%m-%d")
    evt = MatterTimelineEvent(
        id=evt_id,
        matter_id=matter.id,
        kind="assignment",
        title_en=f"Removed from matter team: {staff.name_en if staff else staff_id}",
        title_ar=f"استبعاد من فريق العمل: الأستاذ / {staff_name}",
        date=today_str
    )
    db.add(evt)
    db.commit()

    return {
        "ok": True,
        "message": f"تم استبعاد الأستاذ {staff_name} من فريق عمل القضية بنجاح"
    }



# ==============================================================================
# CLIENT PORTAL MATTERS ENDPOINTS
# ==============================================================================

@client_router.get("", response_model=dict)
def list_client_matters(
    filter: Optional[str] = Query("all"),
    page: int = Query(1, ge=1),
    pageSize: int = Query(25, ge=1, le=100),
    current_user: User = Depends(require_client),
    db: Session = Depends(get_db)
):
    all_client_matters = db.query(Matter).filter(
        Matter.firm_id == current_user.firm_id,
        Matter.client_id == current_user.client_id
    ).all()
    today = datetime.now()

    counts = {
        "all": len(all_client_matters),
        "needsAttention": len([m for m in all_client_matters if not m.is_closed and (m.needs_attention or m.status_tone == 'urgent')]),
        "inProgress": len([m for m in all_client_matters if not m.is_closed and not (m.needs_attention or m.status_tone == 'urgent')]),
        "closed": len([m for m in all_client_matters if m.is_closed]),
    }

    if filter == "needsAttention":
        target = [m for m in all_client_matters if not m.is_closed and (m.needs_attention or m.status_tone == 'urgent')]
    elif filter == "inProgress":
        target = [m for m in all_client_matters if not m.is_closed and not (m.needs_attention or m.status_tone == 'urgent')]
    elif filter == "closed":
        target = [m for m in all_client_matters if m.is_closed]
    else:
        target = all_client_matters

    items = []
    for m in target:
        lead = db.query(User).filter(User.id == m.lead_counsel_id).first()
        lead_en = lead.name_en if lead else "Lead Counsel"
        lead_ar = lead.name_ar if lead else "المحامي المسؤول"

        mapped_wt = m.work_type
        if mapped_wt == "dispute":
            mapped_wt = "case"
        elif mapped_wt == "execution":
            mapped_wt = "enforcement"

        updated_days_ago = (today - m.updated_at.replace(tzinfo=None)).days if m.updated_at else 0
        opened_days_ago = (today - m.created_at.replace(tzinfo=None)).days if m.created_at else 0
        last_updated_on = m.updated_at.strftime("%Y-%m-%d") if m.updated_at else today.strftime("%Y-%m-%d")

        items.append({
            "id": m.id,
            "reference": m.reference,
            "firmId": m.firm_id,
            "clientId": m.client_id,
            "title": {"en": m.title_en, "ar": m.title_ar},
            "workType": mapped_wt,
            "matterType": {"en": m.matter_type_en, "ar": m.matter_type_ar},
            "leadCounsel": {"en": lead_en, "ar": lead_ar},
            "forum": {"en": m.forum_en, "ar": m.forum_ar},
            "status": {"en": m.status_en, "ar": m.status_ar},
            "statusTone": m.status_tone or "neutral",
            "needsAttention": m.needs_attention or (m.status_tone == "urgent"),
            "attentionReason": {"en": m.attention_reason_en or "", "ar": m.attention_reason_ar or ""} if (m.attention_reason_en or m.attention_reason_ar) else None,
            "active": not m.is_closed,
            "lastUpdatedDaysAgo": max(0, updated_days_ago),
            "openedDaysAgo": max(0, opened_days_ago),
            "lastUpdatedOn": last_updated_on,
            "courtFileNumber": m.court_file_number,
            "opposingParty": {"en": m.opposing_party_en or "", "ar": m.opposing_party_ar or ""} if (m.opposing_party_en or m.opposing_party_ar) else None,
        })

    return {
        "items": items,
        "counts": counts,
        "total": len(target),
        "page": page,
        "pageSize": pageSize,
        "totalPages": 1
    }

@client_router.get("/forums", response_model=List[dict])
def list_client_forums(
    current_user: User = Depends(require_client),
    db: Session = Depends(get_db)
):
    matters = db.query(Matter).filter(
        Matter.firm_id == current_user.firm_id,
        Matter.client_id == current_user.client_id
    ).all()
    
    seen = set()
    forums = []
    for m in matters:
        key = (m.forum_en, m.forum_ar)
        if key not in seen:
            seen.add(key)
            forums.append({"en": m.forum_en, "ar": m.forum_ar})
    return forums

@client_router.get("/{reference}", response_model=dict)
def get_client_matter_by_reference(
    reference: str,
    current_user: User = Depends(require_client),
    db: Session = Depends(get_db)
):
    matter = db.query(Matter).filter(
        func.lower(Matter.reference) == reference.lower(),
        Matter.firm_id == current_user.firm_id,
        Matter.client_id == current_user.client_id
    ).first()
    
    if not matter:
        raise HTTPException(status_code=404, detail="Matter not found")
        
    lead = db.query(User).filter(User.id == matter.lead_counsel_id).first()
    lead_en = lead.name_en if lead else "Lead Counsel"
    lead_ar = lead.name_ar if lead else "المحامي المسؤول"
    today = datetime.now()

    mapped_wt = matter.work_type
    if mapped_wt == "dispute":
        mapped_wt = "case"
    elif mapped_wt == "execution":
        mapped_wt = "enforcement"

    opened_date = matter.created_at.strftime("%Y-%m-%d") if matter.created_at else today.strftime("%Y-%m-%d")
    updated_date = matter.updated_at.strftime("%Y-%m-%d") if matter.updated_at else today.strftime("%Y-%m-%d")
    updated_days_ago = (today - matter.updated_at.replace(tzinfo=None)).days if matter.updated_at else 0
    opened_days_ago = (today - matter.created_at.replace(tzinfo=None)).days if matter.created_at else 0

    matter_record = {
        "id": matter.id,
        "reference": matter.reference,
        "firmId": matter.firm_id,
        "clientId": matter.client_id,
        "title": {"en": matter.title_en, "ar": matter.title_ar},
        "workType": mapped_wt,
        "matterType": {"en": matter.matter_type_en, "ar": matter.matter_type_ar},
        "leadCounsel": {"en": lead_en, "ar": lead_ar},
        "forum": {"en": matter.forum_en, "ar": matter.forum_ar},
        "status": {"en": matter.status_en, "ar": matter.status_ar},
        "statusTone": matter.status_tone or "neutral",
        "needsAttention": matter.needs_attention or (matter.status_tone == "urgent"),
        "attentionReason": {"en": matter.attention_reason_en or "", "ar": matter.attention_reason_ar or ""} if (matter.attention_reason_en or matter.attention_reason_ar) else None,
        "active": not matter.is_closed,
        "lastUpdatedDaysAgo": max(0, updated_days_ago),
        "openedDaysAgo": max(0, opened_days_ago),
        "lastUpdatedOn": updated_date,
        "courtFileNumber": matter.court_file_number,
        "opposingParty": {"en": matter.opposing_party_en or "", "ar": matter.opposing_party_ar or ""} if (matter.opposing_party_en or matter.opposing_party_ar) else None,
    }

    # Timeline events
    timeline_events = []
    for t in matter.timeline:
        t_date = t.date if t.date else today.strftime("%Y-%m-%d")
        timeline_events.append({
            "id": t.id,
            "kind": "matter",
            "sourceRef": matter.reference,
            "reference": matter.reference,
            "date": t_date,
            "on": t_date,
            "title": {"en": t.title_en, "ar": t.title_ar},
            "detail": {"en": t.title_en, "ar": t.title_ar},
            "note": None,
            "completed": True,
            "awaitingClient": False,
            "eventKind": t.kind or "filing",
            "body": None,
            "documents": []
        })
    for h in matter.hearings:
        h_date = h.date if h.date else today.strftime("%Y-%m-%d")
        is_completed = (h.status == "completed")
        timeline_events.append({
            "id": h.id,
            "kind": "matter",
            "sourceRef": matter.reference,
            "reference": matter.reference,
            "date": h_date,
            "on": h_date,
            "title": {"en": h.notes_en or "Court Hearing", "ar": h.notes_ar or "جلسة محكمة"},
            "detail": {"en": f"Court Hearing - {h.status}", "ar": f"جلسة محكمة - {h.status}"},
            "note": None,
            "completed": is_completed,
            "awaitingClient": False,
            "eventKind": "hearing",
            "body": None,
            "documents": []
        })

    timeline_events.sort(key=lambda x: x["date"])

    # Invoices for this engagement
    matter_invoices = []
    invoices_db = db.query(Invoice).filter(Invoice.engagement_ref == matter.reference).all()
    for inv in invoices_db:
        total = sum(li.amount for li in inv.line_items) if inv.line_items else 0.0
        desc_en = inv.description_en or "Legal Services Invoice"
        desc_ar = inv.description_ar or "فاتورة خدمات قانونية"
        matter_invoices.append({
            "id": inv.id,
            "reference": inv.reference,
            "engagementRef": matter.reference,
            "issuedOn": inv.issue_date,
            "dueOn": inv.due_date,
            "amount": total,
            "currency": inv.currency,
            "status": inv.status,
            "description": {"en": desc_en, "ar": desc_ar},
            "summary": {"en": desc_en, "ar": desc_ar},
            "lineItems": []
        })

    # Shared documents for this matter from PostgreSQL
    client_docs_db = db.query(Document).filter(
        func.lower(Document.engagement_ref) == matter.reference.lower(),
        Document.is_firm_only == False
    ).order_by(Document.created_at.desc()).all()

    client_shared_docs = []
    for d in client_docs_db:
        shared_days_ago = (today - d.created_at.replace(tzinfo=None)).days if d.created_at else 0
        time_display = ""
        if d.created_at:
            h = d.created_at.hour
            m = d.created_at.minute
            s = d.created_at.second
            period = "م" if h >= 12 else "ص"
            h_12 = h if (h == 12 or h == 0) else (h % 12)
            if h_12 == 0:
                h_12 = 12
            time_display = f"{h_12:02d}:{m:02d}:{s:02d} {period}"

        client_shared_docs.append({
            "id": d.id,
            "name": d.name,
            "kind": d.kind,
            "sizeBytes": d.size_bytes,
            "sharedDaysAgo": max(0, shared_days_ago),
            "sharedOn": d.created_at.strftime("%Y-%m-%d") if d.created_at else today.strftime("%Y-%m-%d"),
            "createdAt": d.created_at.isoformat() if d.created_at else None,
            "updatedAt": d.updated_at.isoformat() if d.updated_at else None,
            "timeFormatted": time_display,
            "status": d.status,
            "engagementRef": matter.reference,
            "firmId": d.firm_id,
            "downloadUrl": f"/api/documents/{d.id}/download",
            "versions": []
        })

    return {
        "matter": matter_record,
        "openedOn": opened_date,
        "timeline": timeline_events,
        "documents": client_shared_docs,
        "invoices": matter_invoices
    }
