import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.core.database import get_db
from app.core.permissions import require_staff, require_billing_access, require_time_recording, get_current_user
from app.models.user import User
from app.models.client import Client
from app.models.matter import Matter
from app.models.invoice import Invoice, InvoiceLineItem, TimeEntry, Quote
from app.schemas.invoice import (
    InvoiceDraftCreate,
    TimeEntryCreate,
    BillingSummaryResponse
)

router = APIRouter(prefix="/staff/billing", tags=["Billing"])
client_router = APIRouter(prefix="/client/invoices", tags=["Client Invoices"])

HOURLY_RATES = {
    "partner": 3500.0,
    "seniorAssociate": 2200.0,
    "juniorAssociate": 1400.0,
    "paralegal": 800.0,
    "legalSecretary": 500.0,
}

# ==============================================================================
# STAFF BILLING ENDPOINTS
# ==============================================================================

@router.get("/summary", response_model=dict)
def get_billing_summary(
    current_user: User = Depends(require_billing_access),
    db: Session = Depends(get_db)
):
    unbilled_entries = db.query(TimeEntry).filter(
        TimeEntry.firm_id == current_user.firm_id,
        TimeEntry.is_invoiced == False,
        TimeEntry.billable == True
    ).all()
    
    unbilled_minutes = sum(t.minutes for t in unbilled_entries)
    unbilled_amount = sum((t.minutes / 60.0) * t.rate_at_time for t in unbilled_entries)
    
    invoices = db.query(Invoice).filter(Invoice.firm_id == current_user.firm_id).all()
    
    draft_count, draft_amount = 0, 0.0
    due_count, due_amount = 0, 0.0
    overdue_count, overdue_amount = 0, 0.0
    paid_count, paid_amount = 0, 0.0
    
    for inv in invoices:
        inv_total = sum(item.amount for item in inv.line_items)
        if inv.status == "draft":
            draft_count += 1
            draft_amount += inv_total
        elif inv.status == "due":
            due_count += 1
            due_amount += inv_total
        elif inv.status == "overdue":
            overdue_count += 1
            overdue_amount += inv_total
        elif inv.status == "paid":
            paid_count += 1
            paid_amount += inv_total
            
    return {
        "unbilledMinutes": unbilled_minutes,
        "unbilledAmount": unbilled_amount,
        "drafts": {"count": draft_count, "amount": draft_amount},
        "due": {"count": due_count, "amount": due_amount},
        "overdue": {"count": overdue_count, "amount": overdue_amount},
        "paid": {"count": paid_count, "amount": paid_amount},
        "currency": "EGP"
    }

@router.get("/invoices", response_model=dict)
def list_invoices(
    filter_by: Optional[str] = Query("all", alias="filter"),
    clientId: Optional[str] = Query(None),
    current_user: User = Depends(require_billing_access),
    db: Session = Depends(get_db)
):
    all_invoices = db.query(Invoice).filter(
        Invoice.firm_id == current_user.firm_id,
        Invoice.status != "draft"
    ).all()
    
    today = datetime.now()
    rows = []
    clients_map = {}
    
    for inv in all_invoices:
        client = db.query(Client).filter(Client.id == inv.client_id).first()
        prep = db.query(User).filter(User.id == inv.prepared_by_id).first()
        total_amount = sum(i.amount for i in inv.line_items)
        
        try:
            due_dt = datetime.strptime(inv.due_date, "%Y-%m-%d")
            due_in_days = (due_dt - today).days
        except Exception:
            due_in_days = 0
            
        row = {
            "id": inv.id,
            "reference": inv.reference,
            "engagementRef": inv.engagement_ref,
            "clientId": inv.client_id,
            "clientName": {"en": client.name_en if client else "", "ar": client.name_ar if client else ""},
            "description": {"en": inv.description_en, "ar": inv.description_ar},
            "status": inv.status,
            "currency": inv.currency,
            "amount": total_amount,
            "issuedOn": inv.issue_date,
            "dueOn": inv.due_date,
            "dueInDays": due_in_days,
            "paidOn": inv.paid_at,
            "paidDaysAgo": 0 if inv.status == "paid" else None,
            "preparedBy": {"en": prep.name_en if prep else "", "ar": prep.name_ar if prep else ""},
            "lineItems": [
                {
                    "id": li.id,
                    "description": {"en": li.description_en, "ar": li.description_ar},
                    "detail": {"en": li.detail_en or "", "ar": li.detail_ar or ""},
                    "amount": li.amount
                }
                for li in inv.line_items
            ]
        }
        rows.append(row)
        
        if client:
            clients_map[client.id] = clients_map.get(
                client.id,
                {"value": client.id, "label": {"en": client.name_en, "ar": client.name_ar}, "count": 0}
            )
            clients_map[client.id]["count"] += 1
            
    matches = lambda r, f: True if f == "all" else r["status"] == f
    visible = [r for r in rows if matches(r, filter_by)]
    if clientId:
        visible = [r for r in visible if r["clientId"] == clientId]
        
    unpaid = [r for r in rows if r["status"] != "paid"]
    sum_amount = lambda lst: sum(r["amount"] for r in lst)
    
    return {
        "items": visible,
        "counts": {
            "all": len(rows),
            "overdue": len([r for r in rows if r["status"] == "overdue"]),
            "due": len([r for r in rows if r["status"] == "due"]),
            "paid": len([r for r in rows if r["status"] == "paid"]),
        },
        "totals": {
            "outstanding": sum_amount(unpaid),
            "overdue": sum_amount([r for r in rows if r["status"] == "overdue"]),
            "settled": sum_amount([r for r in rows if r["status"] == "paid"]),
            "issuedRecently": sum_amount(rows),
        },
        "currency": "EGP",
        "selection": {
            "outstanding": sum_amount([r for r in visible if r["status"] != "paid"]),
            "overdue": sum_amount([r for r in visible if r["status"] == "overdue"]),
            "count": len(visible),
            "unpaid": len([r for r in visible if r["status"] != "paid"]),
        },
        "clients": list(clients_map.values())
    }

@router.get("/drafts", response_model=List[dict])
def list_invoice_drafts(
    current_user: User = Depends(require_billing_access),
    db: Session = Depends(get_db)
):
    drafts = db.query(Invoice).filter(
        Invoice.firm_id == current_user.firm_id,
        Invoice.status == "draft"
    ).all()
    
    items = []
    for d in drafts:
        cl = db.query(Client).filter(Client.id == d.client_id).first()
        items.append({
            "id": d.id,
            "clientId": d.client_id,
            "clientName": {"en": cl.name_en if cl else "", "ar": cl.name_ar if cl else ""},
            "engagementRef": d.engagement_ref,
            "description": d.description_ar or d.description_en or "فاتورة أتعاب قانونية",
            "createdOn": d.issue_date,
            "preparedById": d.prepared_by_id,
            "currency": d.currency,
            "lines": [
                {
                    "id": li.id,
                    "description": li.description_ar or li.description_en or "",
                    "detail": li.detail_ar or li.detail_en or "",
                    "amount": li.amount
                }
                for li in d.line_items
            ],
            "total": sum(li.amount for li in d.line_items),
            "totalAmount": sum(li.amount for li in d.line_items)
        })
    return items

@router.post("/drafts", response_model=dict, status_code=status.HTTP_201_CREATED)
def save_invoice_draft(
    payload: InvoiceDraftCreate,
    current_user: User = Depends(require_billing_access),
    db: Session = Depends(get_db)
):
    matter = db.query(Matter).filter(
        Matter.reference == payload.engagementRef,
        Matter.firm_id == current_user.firm_id
    ).first()
    
    if not matter:
        raise HTTPException(status_code=400, detail="Matter engagement not found")
        
    inv_count = db.query(Invoice).filter(Invoice.firm_id == current_user.firm_id).count()
    seq = f"{inv_count + 89:03d}"
    year = datetime.now().year
    ref = f"INV-{year}-{seq}"
    
    invoice_id = f"inv-{uuid.uuid4().hex[:6]}"
    now_str = datetime.now().strftime("%Y-%m-%d")
    due_str = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
    
    invoice = Invoice(
        id=invoice_id,
        sequence=seq,
        reference=ref,
        firm_id=current_user.firm_id,
        client_id=matter.client_id,
        engagement_ref=payload.engagementRef,
        description_en=payload.description,
        description_ar=payload.description,
        status="draft",
        currency="EGP",
        issue_date=now_str,
        due_date=due_str,
        prepared_by_id=current_user.id
    )
    db.add(invoice)
    db.flush()
    
    total_amount = 0.0
    saved_lines = []
    
    for idx, line in enumerate(payload.lines, start=1):
        line_id = f"itm-{uuid.uuid4().hex[:6]}"
        item = InvoiceLineItem(
            id=line_id,
            invoice_id=invoice.id,
            description_en=line.description,
            description_ar=line.description,
            detail_en=line.detail,
            detail_ar=line.detail,
            amount=line.amount,
            order=idx
        )
        db.add(item)
        total_amount += line.amount
        saved_lines.append({
            "id": line_id,
            "description": line.description,
            "amount": line.amount,
            "minutes": line.minutes,
            "fromEntryIds": line.fromEntryIds or []
        })
        
        if line.fromEntryIds:
            db.query(TimeEntry).filter(
                TimeEntry.id.in_(line.fromEntryIds)
            ).update(
                {"is_invoiced": True, "invoice_id": invoice.id},
                synchronize_session=False
            )
            
    db.commit()
    db.refresh(invoice)
    
    return {
        "ok": True,
        "id": invoice.id,
        "invoiceId": invoice.id,
        "reference": invoice.reference,
        "draft": {
            "id": invoice.id,
            "reference": invoice.reference,
            "clientId": invoice.client_id,
            "engagementRef": invoice.engagement_ref,
            "description": invoice.description_ar,
            "total": total_amount,
            "lines": saved_lines,
            "currency": invoice.currency,
            "createdOn": invoice.issue_date,
            "preparedById": invoice.prepared_by_id
        }
    }

@router.post("/invoices/{reference}/issue", response_model=dict)
def issue_invoice(
    reference: str,
    current_user: User = Depends(require_billing_access),
    db: Session = Depends(get_db)
):
    invoice = db.query(Invoice).filter(
        Invoice.reference == reference,
        Invoice.firm_id == current_user.firm_id
    ).first()
    if not invoice:
        invoice = db.query(Invoice).filter(
            Invoice.id == reference,
            Invoice.firm_id == current_user.firm_id
        ).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
        
    now_str = datetime.now().strftime("%Y-%m-%d")
    due_str = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
    
    invoice.status = "due"
    invoice.issue_date = now_str
    invoice.due_date = due_str
    db.commit()
    db.refresh(invoice)
    
    return {
        "ok": True,
        "reference": invoice.reference,
        "status": invoice.status,
        "issuedOn": invoice.issue_date,
        "dueOn": invoice.due_date
    }

@router.post("/invoices/{reference}/mark-paid", response_model=dict)
def mark_invoice_paid(
    reference: str,
    current_user: User = Depends(require_billing_access),
    db: Session = Depends(get_db)
):
    invoice = db.query(Invoice).filter(
        Invoice.reference == reference,
        Invoice.firm_id == current_user.firm_id
    ).first()
    if not invoice:
        invoice = db.query(Invoice).filter(
            Invoice.id == reference,
            Invoice.firm_id == current_user.firm_id
        ).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
        
    invoice.status = "paid"
    invoice.paid_at = datetime.now().strftime("%Y-%m-%d")
    db.commit()
    db.refresh(invoice)
    
    return {
        "ok": True,
        "reference": invoice.reference,
        "status": invoice.status,
        "paidOn": invoice.paid_at
    }

@router.get("/quotes", response_model=dict)
def list_quotes(
    state: Optional[str] = Query(None),
    current_user: User = Depends(require_billing_access),
    db: Session = Depends(get_db)
):
    quotes = db.query(Quote).filter(Quote.firm_id == current_user.firm_id).all()
    today = datetime.now()
    items = []
    
    counts = {"all": len(quotes), "pending": 0, "approved": 0, "changesRequested": 0}
    totals = {"all": 0.0, "pending": 0.0, "approved": 0.0, "changesRequested": 0.0}
    pending_value = 0.0
    
    for q in quotes:
        cl = db.query(Client).filter(Client.id == q.client_id).first()
        matter = db.query(Matter).filter(Matter.reference == q.engagement_ref).first()
        
        # State mapping
        if q.status == "accepted":
            item_state = "approved"
        elif q.status == "declined":
            item_state = "changesRequested"
        else:
            item_state = "pending"
            
        try:
            valid_dt = datetime.strptime(q.valid_until, "%Y-%m-%d")
            due_in_days = (valid_dt - today).days
        except Exception:
            due_in_days = 0
            
        counts[item_state] = counts.get(item_state, 0) + 1
        totals[item_state] = totals.get(item_state, 0.0) + q.amount
        totals["all"] += q.amount
        if item_state == "pending":
            pending_value += q.amount
            
        row = {
            "id": q.id,
            "title": {"en": q.description_en, "ar": q.description_ar},
            "description": {"en": q.description_en, "ar": q.description_ar},
            "clientId": q.client_id,
            "clientName": {"en": cl.name_en if cl else "", "ar": cl.name_ar if cl else ""},
            "engagementRef": q.engagement_ref,
            "engagementTitle": {"en": matter.title_en if matter else "", "ar": matter.title_ar if matter else ""},
            "amount": q.amount,
            "currency": q.currency,
            "validUntil": q.valid_until,
            "dueOn": q.valid_until,
            "dueInDays": due_in_days,
            "status": q.status,
            "state": item_state,
            "submittedBy": {"en": "Mansoor Al-Farooq", "ar": "منصور الفاروق"},
            "submittedByRank": "partner",
            "assignedTo": {"en": "Salem Al-Hashemi", "ar": "سالم الهاشمي"}
        }
        items.append(row)
        
    filtered = items
    if state and state in counts:
        filtered = [item for item in items if item["state"] == state]
        
    return {
        "items": filtered,
        "counts": counts,
        "totals": totals,
        "pendingValue": pending_value,
        "currency": "EGP",
        "selection": {
            "count": len(filtered),
            "total": sum(i["amount"] for i in filtered)
        }
    }

@router.post("/time", response_model=dict, status_code=status.HTTP_201_CREATED)
def log_time_entry(
    payload: TimeEntryCreate,
    current_user: User = Depends(require_time_recording),
    db: Session = Depends(get_db)
):
    rate = HOURLY_RATES.get(current_user.rank, 1400.0)
    entry_date = payload.entryDate or datetime.now().strftime("%Y-%m-%d")
    
    # Verify matter exists
    matter = db.query(Matter).filter(
        Matter.reference == payload.matterId,
        Matter.firm_id == current_user.firm_id
    ).first()
    if not matter:
        # Fallback by id
        matter = db.query(Matter).filter(
            Matter.id == payload.matterId,
            Matter.firm_id == current_user.firm_id
        ).first()
        
    matter_ref = matter.reference if matter else payload.matterId
    
    time_entry = TimeEntry(
        id=f"tm-{uuid.uuid4().hex[:6]}",
        firm_id=current_user.firm_id,
        matter_id=matter_ref,
        staff_id=current_user.id,
        minutes=payload.minutes,
        rate_at_time=rate,
        billable=payload.billable,
        is_invoiced=False,
        description_en=payload.description,
        description_ar=payload.description,
        entry_date=entry_date
    )
    
    db.add(time_entry)
    db.commit()
    db.refresh(time_entry)
    
    amount = (time_entry.minutes / 60.0) * time_entry.rate_at_time
    
    return {
        "ok": True,
        "id": time_entry.id,
        "entryId": time_entry.id,
        "minutes": time_entry.minutes,
        "entry": {
            "id": time_entry.id,
            "staffId": time_entry.staff_id,
            "staffName": {"en": current_user.name_en, "ar": current_user.name_ar},
            "staffRank": current_user.rank,
            "engagementRef": time_entry.matter_id,
            "engagementTitle": {"en": matter.title_en if matter else "", "ar": matter.title_ar if matter else ""},
            "engagementKind": "project" if (matter and matter.reference.startswith("PRJ")) else "matter",
            "clientId": matter.client_id if matter else "",
            "on": time_entry.entry_date,
            "minutes": time_entry.minutes,
            "rate": time_entry.rate_at_time,
            "amount": amount,
            "currency": "EGP",
            "description": {"en": time_entry.description_en, "ar": time_entry.description_ar},
            "billable": time_entry.billable,
            "billed": time_entry.is_invoiced,
            "invoiceId": time_entry.invoice_id
        }
    }

@router.get("/time", response_model=List[dict])
def list_time_entries(
    engagementRef: Optional[str] = Query(None),
    matterId: Optional[str] = Query(None),
    staffId: Optional[str] = Query(None),
    clientId: Optional[str] = Query(None),
    unbilledOnly: Optional[bool] = Query(False),
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    target_ref = engagementRef or matterId
    query = db.query(TimeEntry).filter(TimeEntry.firm_id == current_user.firm_id)
    
    if target_ref:
        query = query.filter(TimeEntry.matter_id == target_ref)
    if staffId:
        query = query.filter(TimeEntry.staff_id == staffId)
    if unbilledOnly:
        query = query.filter(TimeEntry.is_invoiced == False)
        
    entries = query.order_by(TimeEntry.entry_date.desc(), TimeEntry.created_at.desc()).all()
    results = []
    
    for t in entries:
        matter = db.query(Matter).filter(Matter.reference == t.matter_id).first()
        client = db.query(Client).filter(Client.id == matter.client_id).first() if matter else None
        staff = db.query(User).filter(User.id == t.staff_id).first()
        
        if clientId and (not client or client.id != clientId):
            continue
            
        amount = (t.minutes / 60.0) * t.rate_at_time
        results.append({
            "id": t.id,
            "staffId": t.staff_id,
            "staffName": {"en": staff.name_en if staff else "", "ar": staff.name_ar if staff else ""},
            "staffRank": staff.rank if staff else "associate",
            "engagementRef": t.matter_id,
            "engagementTitle": {"en": matter.title_en if matter else "", "ar": matter.title_ar if matter else ""},
            "engagementKind": "project" if (matter and matter.reference.startswith("PRJ")) else "matter",
            "clientId": matter.client_id if matter else "",
            "clientName": {"en": client.name_en if client else "", "ar": client.name_ar if client else ""},
            "on": t.entry_date,
            "minutes": t.minutes,
            "rate": t.rate_at_time,
            "amount": amount,
            "currency": "EGP",
            "description": {"en": t.description_en, "ar": t.description_ar},
            "billable": t.billable,
            "billed": t.is_invoiced,
            "invoiceId": t.invoice_id
        })
        
    return results

@router.get("/context", response_model=dict)
def get_invoice_draft_context(
    engagementRef: Optional[str] = Query(None),
    current_user: User = Depends(require_billing_access),
    db: Session = Depends(get_db)
):
    matters = db.query(Matter).filter(
        Matter.firm_id == current_user.firm_id,
        Matter.is_closed == False
    ).order_by(Matter.reference.asc()).all()
    
    engagements_list = [
        {"value": m.reference, "label": {"en": m.title_en, "ar": m.title_ar}}
        for m in matters
    ]
    
    unbilled_results = []
    if engagementRef:
        unbilled_entries = db.query(TimeEntry).filter(
            TimeEntry.firm_id == current_user.firm_id,
            TimeEntry.matter_id == engagementRef,
            TimeEntry.is_invoiced == False,
            TimeEntry.billable == True
        ).order_by(TimeEntry.entry_date.desc()).all()
        
        matter = db.query(Matter).filter(Matter.reference == engagementRef).first()
        client = db.query(Client).filter(Client.id == matter.client_id).first() if matter else None
        
        for t in unbilled_entries:
            staff = db.query(User).filter(User.id == t.staff_id).first()
            amount = (t.minutes / 60.0) * t.rate_at_time
            unbilled_results.append({
                "id": t.id,
                "staffId": t.staff_id,
                "staffName": {"en": staff.name_en if staff else "", "ar": staff.name_ar if staff else ""},
                "staffRank": staff.rank if staff else "associate",
                "engagementRef": t.matter_id,
                "engagementTitle": {"en": matter.title_en if matter else "", "ar": matter.title_ar if matter else ""},
                "engagementKind": "project" if (matter and matter.reference.startswith("PRJ")) else "matter",
                "clientId": matter.client_id if matter else "",
                "clientName": {"en": client.name_en if client else "", "ar": client.name_ar if client else ""},
                "on": t.entry_date,
                "minutes": t.minutes,
                "rate": t.rate_at_time,
                "amount": amount,
                "currency": "EGP",
                "description": t.description_ar or t.description_en or "استشارات وأعمال قانونية",
                "descriptionI18n": {"en": t.description_en or "", "ar": t.description_ar or ""},
                "billable": t.billable,
                "billed": t.is_invoiced,
                "invoiceId": t.invoice_id
            })
            
    return {
        "engagements": engagements_list,
        "unbilled": unbilled_results,
        "currency": "EGP",
        "today": datetime.now().strftime("%Y-%m-%d")
    }

# ==============================================================================
# CLIENT PORTAL INVOICE ENDPOINTS
# ==============================================================================

@client_router.get("", response_model=dict)
def list_client_invoices(
    filter_by: Optional[str] = Query("all", alias="filter"),
    page: int = Query(1, ge=1),
    pageSize: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    target_client_id = current_user.client_id if current_user.side == "client" else "cli-001"
    
    invoices = db.query(Invoice).filter(
        Invoice.client_id == target_client_id,
        Invoice.status != "draft"
    ).order_by(Invoice.issue_date.desc()).all()
    
    today = datetime.now()
    items = []
    
    counts = {"all": len(invoices), "overdue": 0, "due": 0, "paid": 0}
    
    for inv in invoices:
        matter = db.query(Matter).filter(Matter.reference == inv.engagement_ref).first()
        total_amount = sum(i.amount for i in inv.line_items)
        
        try:
            due_dt = datetime.strptime(inv.due_date, "%Y-%m-%d")
            due_in_days = (due_dt - today).days
        except Exception:
            due_in_days = 0
            
        counts[inv.status] = counts.get(inv.status, 0) + 1
        
        row = {
            "id": inv.id,
            "reference": inv.reference,
            "engagementRef": inv.engagement_ref,
            "engagementKind": "project" if (matter and matter.reference.startswith("PRJ")) else "matter",
            "engagementTitle": {"en": matter.title_en if matter else "", "ar": matter.title_ar if matter else ""},
            "description": {"en": inv.description_en, "ar": inv.description_ar},
            "status": inv.status,
            "currency": inv.currency,
            "amount": total_amount,
            "issuedOn": inv.issue_date,
            "dueOn": inv.due_date,
            "dueInDays": due_in_days,
            "paidOn": inv.paid_at,
            "lineItems": [
                {
                    "id": li.id,
                    "description": {"en": li.description_en, "ar": li.description_ar},
                    "detail": {"en": li.detail_en or "", "ar": li.detail_ar or ""},
                    "amount": li.amount
                }
                for li in inv.line_items
            ]
        }
        items.append(row)
        
    filtered = items if filter_by == "all" else [i for i in items if i["status"] == filter_by]
    
    total = len(filtered)
    start_idx = (page - 1) * pageSize
    end_idx = start_idx + pageSize
    paged_items = filtered[start_idx:end_idx]
    
    return {
        "items": paged_items,
        "total": total,
        "page": page,
        "pageSize": pageSize,
        "totalPages": max(1, (total + pageSize - 1) // pageSize),
        "counts": counts
    }

@client_router.get("/summary", response_model=dict)
def get_client_invoices_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    target_client_id = current_user.client_id if current_user.side == "client" else "cli-001"
    
    invoices = db.query(Invoice).filter(
        Invoice.client_id == target_client_id,
        Invoice.status != "draft"
    ).all()
    
    unpaid = [i for i in invoices if i.status != "paid"]
    overdue = [i for i in invoices if i.status == "overdue"]
    settled = [i for i in invoices if i.status == "paid"]
    
    sum_inv = lambda lst: sum(sum(li.amount for li in inv.line_items) for inv in lst)
    
    return {
        "balanceDue": sum_inv(unpaid),
        "currency": "EGP",
        "outstandingCount": len(unpaid),
        "overdueTotal": sum_inv(overdue),
        "overdueCount": len(overdue),
        "paidTotal": sum_inv(settled),
        "paidCount": len(settled)
    }

@client_router.get("/engagements", response_model=List[dict])
def get_client_invoice_engagements(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    target_client_id = current_user.client_id if current_user.side == "client" else "cli-001"
    
    invoices = db.query(Invoice).filter(
        Invoice.client_id == target_client_id,
        Invoice.status != "draft"
    ).all()
    
    seen = set()
    results = []
    
    for inv in invoices:
        if inv.engagement_ref in seen:
            continue
        seen.add(inv.engagement_ref)
        matter = db.query(Matter).filter(Matter.reference == inv.engagement_ref).first()
        if matter:
            results.append({
                "reference": matter.reference,
                "kind": (matter.work_type if matter and matter.work_type else "dispute"),
                "title": {"en": matter.title_en, "ar": matter.title_ar}
            })
            
    return results

@client_router.get("/{reference}", response_model=dict)
def get_client_invoice_detail(
    reference: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    target_client_id = current_user.client_id if current_user.side == "client" else "cli-001"
    
    inv = db.query(Invoice).filter(
        Invoice.reference == reference,
        Invoice.client_id == target_client_id
    ).first()
    
    if not inv:
        # Fallback by id
        inv = db.query(Invoice).filter(
            Invoice.id == reference,
            Invoice.client_id == target_client_id
        ).first()
        
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
        
    matter = db.query(Matter).filter(Matter.reference == inv.engagement_ref).first()
    client = db.query(Client).filter(Client.id == inv.client_id).first()
    prep = db.query(User).filter(User.id == inv.prepared_by_id).first()
    total_amount = sum(i.amount for i in inv.line_items)
    
    today = datetime.now()
    try:
        due_dt = datetime.strptime(inv.due_date, "%Y-%m-%d")
        due_in_days = (due_dt - today).days
    except Exception:
        due_in_days = 0
        
    return {
        "id": inv.id,
        "sequence": inv.sequence,
        "reference": inv.reference,
        "engagementRef": inv.engagement_ref,
        "engagementKind": "project" if (matter and matter.reference.startswith("PRJ")) else "matter",
        "engagementTitle": {"en": matter.title_en if matter else "", "ar": matter.title_ar if matter else ""},
        "clientId": inv.client_id,
        "clientName": {"en": client.name_en if client else "", "ar": client.name_ar if client else ""},
        "description": {"en": inv.description_en, "ar": inv.description_ar},
        "status": inv.status,
        "currency": inv.currency,
        "amount": total_amount,
        "issuedOn": inv.issue_date,
        "dueOn": inv.due_date,
        "dueInDays": due_in_days,
        "paidOn": inv.paid_at,
        "preparedBy": {"en": prep.name_en if prep else "", "ar": prep.name_ar if prep else ""},
        "lineItems": [
            {
                "id": li.id,
                "description": {"en": li.description_en, "ar": li.description_ar},
                "detail": {"en": li.detail_en or "", "ar": li.detail_ar or ""},
                "amount": li.amount,
                "order": li.order
            }
            for li in inv.line_items
        ]
    }
