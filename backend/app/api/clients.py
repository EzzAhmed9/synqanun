import re
import uuid
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from app.core.database import get_db
from app.core.permissions import require_staff
from app.models.user import User
from app.models.client import Client, ClientContact
from app.models.matter import Matter
from app.models.invoice import Quote, Invoice, TimeEntry
from app.models.document import Document
from app.core.dates import today
from app.schemas.client import ClientCreate, ClientContactCreate

router = APIRouter(prefix="/staff/clients", tags=["Clients"])

@router.get("", response_model=dict)
def list_clients(
    standing: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    query = db.query(Client).filter(Client.firm_id == current_user.firm_id)
    
    if standing and standing != "all":
        query = query.filter(Client.standing == standing)
        
    if q:
        escaped_q = q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        search = f"%{escaped_q}%"
        query = query.filter(
            or_(
                Client.name_en.ilike(search, escape="\\"),
                Client.name_ar.ilike(search, escape="\\"),
                Client.summary_en.ilike(search, escape="\\"),
                Client.summary_ar.ilike(search, escape="\\"),
            )
        )
        
    clients = query.order_by(Client.last_activity_days_ago.asc()).all()
    client_ids = [c.id for c in clients]

    matters_counts = {}
    projects_counts = {}
    if client_ids:
        matter_rows = (
            db.query(Matter.client_id, Matter.work_type, func.count(Matter.id))
            .filter(
                Matter.client_id.in_(client_ids),
                Matter.is_closed == False
            )
            .group_by(Matter.client_id, Matter.work_type)
            .all()
        )
        for cid, wtype, cnt in matter_rows:
            if wtype == "otherProject":
                projects_counts[cid] = projects_counts.get(cid, 0) + cnt
            else:
                matters_counts[cid] = matters_counts.get(cid, 0) + cnt

    portal_client_ids = set()
    if client_ids:
        portal_rows = (
            db.query(User.client_id)
            .filter(
                User.client_id.in_(client_ids),
                User.side == "client"
            )
            .distinct()
            .all()
        )
        portal_client_ids = {r[0] for r in portal_rows}

    pending_approvals_counts = {}
    if client_ids:
        quote_rows = (
            db.query(Quote.client_id, func.count(Quote.id))
            .filter(
                Quote.client_id.in_(client_ids),
                Quote.status == "issued"
            )
            .group_by(Quote.client_id)
            .all()
        )
        pending_approvals_counts = {cid: cnt for cid, cnt in quote_rows}

    today_date = today()

    # Grouped last activity queries
    matters_last_act = {}
    invoices_last_act = {}
    docs_last_act = {}
    times_last_act = {}

    if client_ids:
        m_rows = (
            db.query(Matter.client_id, func.max(Matter.updated_at))
            .filter(Matter.client_id.in_(client_ids))
            .group_by(Matter.client_id)
            .all()
        )
        matters_last_act = {cid: dt for cid, dt in m_rows}

        inv_rows = (
            db.query(Invoice.client_id, func.max(Invoice.updated_at))
            .filter(Invoice.client_id.in_(client_ids))
            .group_by(Invoice.client_id)
            .all()
        )
        invoices_last_act = {cid: dt for cid, dt in inv_rows}

        doc_rows = (
            db.query(Document.client_id, func.max(Document.created_at))
            .filter(Document.client_id.in_(client_ids))
            .group_by(Document.client_id)
            .all()
        )
        docs_last_act = {cid: dt for cid, dt in doc_rows}

        time_rows = (
            db.query(Matter.client_id, func.max(TimeEntry.created_at))
            .join(TimeEntry, TimeEntry.matter_id == Matter.reference)
            .filter(Matter.client_id.in_(client_ids))
            .group_by(Matter.client_id)
            .all()
        )
        times_last_act = {cid: dt for cid, dt in time_rows}

    items = []
    for c in clients:
        candidates = [
            matters_last_act.get(c.id),
            invoices_last_act.get(c.id),
            docs_last_act.get(c.id),
            times_last_act.get(c.id)
        ]
        valid_dts = [dt for dt in candidates if dt is not None]
        if valid_dts:
            latest_dt = max(valid_dts)
            latest_date = latest_dt.date() if hasattr(latest_dt, "date") else latest_dt
            days_ago_val = max(0, (today_date - latest_date).days)
            last_activity_date = latest_date.strftime("%Y-%m-%d")
        else:
            days_ago_val = c.last_activity_days_ago
            last_activity_date = (today_date - timedelta(days=c.last_activity_days_ago)).strftime("%Y-%m-%d")

        items.append({
            "id": c.id,
            "name": {"en": c.name_en, "ar": c.name_ar},
            "summary": {"en": c.summary_en, "ar": c.summary_ar},
            "standing": c.standing,
            "lastActivityDaysAgo": days_ago_val,
            "lastActivityOn": last_activity_date,
            "matters": matters_counts.get(c.id, 0),
            "projects": projects_counts.get(c.id, 0),
            "openCorrespondence": 0,
            "pendingApprovals": pending_approvals_counts.get(c.id, 0),
            "hasPortal": c.id in portal_client_ids
        })

    # Sort by computed last activity: most recent first (ascending days ago)
    items.sort(key=lambda x: (x["lastActivityDaysAgo"], x["id"]))

    return {
        "items": items,
        "total": len(items)
    }

@router.get("/{client_id}", response_model=dict)
def get_client_detail(
    client_id: str,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    client = db.query(Client).filter(
        Client.id == client_id,
        Client.firm_id == current_user.firm_id
    ).first()
    
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
        
    today_date = today()

    # Compute last activity from matters, invoices, documents, time entries
    m_max = db.query(func.max(Matter.updated_at)).filter(Matter.client_id == client.id).scalar()
    i_max = db.query(func.max(Invoice.updated_at)).filter(Invoice.client_id == client.id).scalar()
    d_max = db.query(func.max(Document.created_at)).filter(Document.client_id == client.id).scalar()
    t_max = (
        db.query(func.max(TimeEntry.created_at))
        .join(Matter, TimeEntry.matter_id == Matter.reference)
        .filter(Matter.client_id == client.id)
        .scalar()
    )

    valid_dts = [dt for dt in [m_max, i_max, d_max, t_max] if dt is not None]
    if valid_dts:
        latest_dt = max(valid_dts)
        latest_date = latest_dt.date() if hasattr(latest_dt, "date") else latest_dt
        days_ago_val = max(0, (today_date - latest_date).days)
        last_activity_date = latest_date.strftime("%Y-%m-%d")
    else:
        days_ago_val = client.last_activity_days_ago
        last_activity_date = (today_date - timedelta(days=client.last_activity_days_ago)).strftime("%Y-%m-%d")

    # Check portal account
    has_portal = db.query(User).filter(
        User.client_id == client.id,
        User.side == "client"
    ).first() is not None

    matters_count = db.query(Matter).filter(
        Matter.client_id == client.id,
        Matter.is_closed == False,
        Matter.work_type != "otherProject"
    ).count()

    projects_count = db.query(Matter).filter(
        Matter.client_id == client.id,
        Matter.is_closed == False,
        Matter.work_type == "otherProject"
    ).count()

    pending_approvals = db.query(Quote).filter(
        Quote.client_id == client.id,
        Quote.status == "issued"
    ).count()

    client_summary = {
        "id": client.id,
        "name": {"en": client.name_en, "ar": client.name_ar},
        "summary": {"en": client.summary_en, "ar": client.summary_ar},
        "standing": client.standing,
        "lastActivityDaysAgo": days_ago_val,
        "lastActivityOn": last_activity_date,
        "matters": matters_count,
        "projects": projects_count,
        "openCorrespondence": 0,
        "pendingApprovals": pending_approvals,
        "hasPortal": has_portal
    }
    
    # Engagements for this client
    lead_ids = [m.lead_counsel_id for m in client.matters if m.lead_counsel_id]
    leads_map = {}
    if lead_ids:
        leads = db.query(User).filter(User.id.in_(lead_ids)).all()
        leads_map = {l.id: l for l in leads}

    engagements = []
    for m in client.matters:
        lead = leads_map.get(m.lead_counsel_id)
        engagements.append({
            "reference": m.reference,
            "kind": "project" if m.work_type == "otherProject" else "matter",
            "title": {"en": m.title_en, "ar": m.title_ar},
            "status": {"en": m.status_en, "ar": m.status_ar},
            "statusTone": m.status_tone,
            "leadName": {"en": lead.name_en if lead else "", "ar": lead.name_ar if lead else ""},
            "active": not m.is_closed,
            "needsAttention": m.status_tone == "urgent"
        })
        
    contacts = [
        {
            "id": cnt.id,
            "name": {"en": cnt.name_en, "ar": cnt.name_ar},
            "title": {"en": cnt.title_en or "", "ar": cnt.title_ar or ""},
            "email": cnt.email,
            "phone": cnt.phone or "",
            "role": cnt.role,
            "status": cnt.status
        }
        for cnt in client.contacts
    ]
    
    return {
        "client": client_summary,
        "engagements": engagements,
        "contacts": contacts,
        "correspondence": [],
        "approvals": []
    }

@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
def create_client(
    payload: ClientCreate,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    if current_user.rank not in ["partner", "seniorAssociate"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only partners and senior associates can create clients"
        )
        
    name_clean = (payload.name or "").strip()
    name_en = (payload.name_en or payload.name or "").strip()
    name_ar = (payload.name_ar or payload.name or "").strip()

    if not name_clean and not name_en and not name_ar:
        raise HTTPException(status_code=400, detail="nameRequired")
    if not name_en and not name_ar:
        raise HTTPException(status_code=400, detail="nameRequired")

    if not name_en and name_ar:
        name_en = name_ar
    elif not name_ar and name_en:
        name_ar = name_en

    raw_standing = (payload.standing or "").strip().lower()
    if raw_standing == "goodstanding":
        standing_val = "active"
    elif raw_standing in ("retainer", "active", "prospect"):
        standing_val = raw_standing
    else:
        raise HTTPException(status_code=400, detail="standingRequired")

    # Duplicate check: same firm only, case/space insensitive exact match
    dup_filters = []
    if name_en:
        dup_filters.append(func.lower(func.trim(Client.name_en)) == name_en.lower())
    if name_ar:
        dup_filters.append(func.lower(func.trim(Client.name_ar)) == name_ar.lower())

    existing = None
    if dup_filters:
        existing = db.query(Client).filter(
            Client.firm_id == current_user.firm_id,
            or_(*dup_filters)
        ).first()

    if existing:
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={"ok": False, "error": "duplicate"}
        )

    summary_en = (payload.summary_en or payload.summary or "").strip() or "No work opened yet"
    summary_ar = (payload.summary_ar or payload.summary or "").strip() or "لم يُفتح عمل بعد"

    client_id = f"cli-{uuid.uuid4().hex[:12]}"
    new_client = Client(
        id=client_id,
        firm_id=current_user.firm_id,
        name_en=name_en,
        name_ar=name_ar,
        summary_en=summary_en,
        summary_ar=summary_ar,
        standing=standing_val,
        last_activity_days_ago=0
    )
    
    db.add(new_client)
    db.commit()
    db.refresh(new_client)
    
    return {
        "ok": True,
        "clientId": new_client.id,
        "client": {
            "id": new_client.id,
            "name": {"en": new_client.name_en, "ar": new_client.name_ar},
            "standing": new_client.standing
        }
    }

@router.post("/{client_id}/contacts", response_model=dict)
def add_client_contact(
    client_id: str,
    payload: ClientContactCreate,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    client = db.query(Client).filter(
        Client.id == client_id,
        Client.firm_id == current_user.firm_id
    ).first()
    
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    if current_user.rank not in ["partner", "seniorAssociate"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Only partners and senior associates can add client contacts"
        )
        
    contact_name = (payload.name or "").strip()
    if not contact_name:
        raise HTTPException(status_code=400, detail="nameRequired")

    contact_email = (payload.email or "").strip()
    if not contact_email or not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", contact_email):
        raise HTTPException(status_code=400, detail="emailInvalid")

    # Email uniqueness within same client, case-insensitive -> 409
    existing_contact = db.query(ClientContact).filter(
        ClientContact.client_id == client_id,
        func.lower(ClientContact.email) == contact_email.lower()
    ).first()
    if existing_contact:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="That address is already on this client's list."
        )

    contact_role = (payload.role or "").strip().lower()
    if contact_role not in ("admin", "member"):
        raise HTTPException(status_code=400, detail="roleInvalid")

    raw_status = (payload.status or "invited").strip().lower()
    if raw_status not in ("active", "invited"):
        raise HTTPException(status_code=400, detail="statusInvalid")

    contact_id = f"cnt-{uuid.uuid4().hex[:12]}"
    contact = ClientContact(
        id=contact_id,
        client_id=client_id,
        name_en=contact_name,
        name_ar=contact_name,
        title_en=payload.title,
        title_ar=payload.title,
        email=contact_email,
        phone=payload.phone,
        role=contact_role,
        status=raw_status
    )
    
    db.add(contact)
    db.commit()
    db.refresh(contact)
    
    return {"ok": True, "contactId": contact.id}

@router.get("/{client_id}/contacts", response_model=dict)
def get_client_contacts(
    client_id: str,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    client = db.query(Client).filter(
        Client.id == client_id,
        Client.firm_id == current_user.firm_id
    ).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    contacts = db.query(ClientContact).filter(ClientContact.client_id == client_id).all()
    contacts_list = [
        {
            "id": cnt.id,
            "name": {"en": cnt.name_en, "ar": cnt.name_ar},
            "title": {"en": cnt.title_en or "", "ar": cnt.title_ar or ""},
            "email": cnt.email,
            "phone": cnt.phone or "",
            "role": cnt.role,
            "status": cnt.status
        }
        for cnt in contacts
    ]
    return {
        "clientId": client.id,
        "clientName": {"en": client.name_en, "ar": client.name_ar},
        "contacts": contacts_list,
        "takenEmails": [cnt.email.lower() for cnt in contacts]
    }
