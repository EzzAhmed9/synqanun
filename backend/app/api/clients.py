import uuid
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from app.core.database import get_db
from app.core.permissions import require_staff
from app.models.user import User
from app.models.client import Client, ClientContact
from app.models.matter import Matter
from app.models.invoice import Quote
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
        search = f"%{q}%"
        query = query.filter(
            or_(
                Client.name_en.ilike(search),
                Client.name_ar.ilike(search),
                Client.summary_en.ilike(search),
                Client.summary_ar.ilike(search),
            )
        )
        
    clients = query.order_by(Client.last_activity_days_ago.asc()).all()
    today = datetime.now()
    
    items = []
    for c in clients:
        # Count matters and projects for this client
        matters_count = db.query(Matter).filter(
            Matter.client_id == c.id,
            Matter.is_closed == False,
            Matter.work_type != "otherProject"
        ).count()
        
        projects_count = db.query(Matter).filter(
            Matter.client_id == c.id,
            Matter.is_closed == False,
            Matter.work_type == "otherProject"
        ).count()
        
        # Check if client has portal accounts
        has_portal = db.query(User).filter(
            User.client_id == c.id,
            User.side == "client"
        ).first() is not None
        
        pending_approvals = db.query(Quote).filter(
            Quote.client_id == c.id,
            Quote.status == "issued"
        ).count()

        last_activity_date = (today - timedelta(days=c.last_activity_days_ago)).strftime("%Y-%m-%d")
        
        items.append({
            "id": c.id,
            "name": {"en": c.name_en, "ar": c.name_ar},
            "summary": {"en": c.summary_en, "ar": c.summary_ar},
            "standing": c.standing,
            "lastActivityDaysAgo": c.last_activity_days_ago,
            "lastActivityOn": last_activity_date,
            "matters": matters_count,
            "projects": projects_count,
            "openCorrespondence": 0,
            "pendingApprovals": pending_approvals,
            "hasPortal": has_portal
        })
        
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
        
    today = datetime.now()
    last_activity_date = (today - timedelta(days=client.last_activity_days_ago)).strftime("%Y-%m-%d")
    
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
        "lastActivityDaysAgo": client.last_activity_days_ago,
        "lastActivityOn": last_activity_date,
        "matters": matters_count,
        "projects": projects_count,
        "openCorrespondence": 0,
        "pendingApprovals": pending_approvals,
        "hasPortal": has_portal
    }
    
    # Engagements for this client
    engagements = []
    for m in client.matters:
        lead = db.query(User).filter(User.id == m.lead_counsel_id).first()
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
        
    name_clean = (payload.name_ar or payload.name_en or payload.name or "").strip()
    name_en = (payload.name_en or payload.name or "").strip()
    name_ar = (payload.name_ar or payload.name or "").strip()
    
    # Check duplicate ignoring case and trailing/leading spaces
    existing = db.query(Client).filter(
        Client.firm_id == current_user.firm_id,
        or_(
            func.trim(Client.name_en).ilike(name_clean),
            func.trim(Client.name_ar).ilike(name_clean)
        )
    ).first()
    
    if existing:
        return {"ok": False, "error": "duplicate"}
        
    summary_en = payload.summary_en or payload.summary or "No work opened yet"
    summary_ar = payload.summary_ar or payload.summary or "لم يُفتح عمل بعد"
    
    client_id = f"cli-{uuid.uuid4().hex[:6]}"
    new_client = Client(
        id=client_id,
        firm_id=current_user.firm_id,
        name_en=name_en,
        name_ar=name_ar,
        summary_en=summary_en,
        summary_ar=summary_ar,
        standing=payload.standing or "active",
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
        
    contact_id = f"cnt-{uuid.uuid4().hex[:6]}"
    contact = ClientContact(
        id=contact_id,
        client_id=client_id,
        name_en=payload.name,
        name_ar=payload.name,
        title_en=payload.title,
        title_ar=payload.title,
        email=payload.email,
        phone=payload.phone,
        role=payload.role,
        status=payload.status or "invited"
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
