import uuid
import math
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from collections import defaultdict
from sqlalchemy.orm import Session, subqueryload
from sqlalchemy import desc, func, or_, Integer
from sqlalchemy.exc import IntegrityError
from app.core.database import get_db
from app.core.permissions import require_staff, require_billing_access, require_time_recording, get_current_user, require_client
from app.models.user import User
from app.models.client import Client
from app.models.matter import Matter
from app.models.invoice import Invoice, InvoiceLineItem, TimeEntry, Quote
from app.schemas.invoice import (
    InvoiceDraftCreate,
    TimeEntryCreate,
    BillingSummaryResponse
)
from app.core.dates import today, parse_date, days_until, days_ago

router = APIRouter(prefix="/staff/billing", tags=["Billing"])
client_router = APIRouter(prefix="/client/invoices", tags=["Client Invoices"])

def refresh_overdue_invoices(db: Session, firm_id: Optional[str] = None) -> int:
    today_str = today().isoformat()
    q = db.query(Invoice).filter(
        Invoice.status == "due",
        Invoice.due_date < today_str
    )
    if firm_id:
        q = q.filter(Invoice.firm_id == firm_id)
    updated_count = q.update({"status": "overdue"}, synchronize_session=False)
    if updated_count > 0:
        db.commit()
    return updated_count


def map_work_type_for_display(wt: Optional[str]) -> str:
    if wt == "dispute":
        return "case"
    if wt == "execution":
        return "enforcement"
    return wt or "dispute"

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
    refresh_overdue_invoices(db, firm_id=current_user.firm_id)
    
    unbilled_row = db.query(
        func.coalesce(func.sum(TimeEntry.minutes), 0),
        func.coalesce(func.sum((TimeEntry.minutes / 60.0) * TimeEntry.rate_at_time), 0.0)
    ).filter(
        TimeEntry.firm_id == current_user.firm_id,
        TimeEntry.is_invoiced == False,
        TimeEntry.billable == True
    ).first()
    
    unbilled_minutes = int(unbilled_row[0]) if unbilled_row else 0
    unbilled_amount = float(unbilled_row[1]) if unbilled_row else 0.0
    
    invoices = db.query(Invoice).filter(Invoice.firm_id == current_user.firm_id).all()
    inv_ids = [inv.id for inv in invoices]
    
    inv_amounts = dict(
        db.query(
            InvoiceLineItem.invoice_id,
            func.coalesce(func.sum(InvoiceLineItem.amount), 0.0)
        ).filter(InvoiceLineItem.invoice_id.in_(inv_ids)).group_by(InvoiceLineItem.invoice_id).all()
    ) if inv_ids else {}
    
    draft_count, draft_amount = 0, 0.0
    due_count, due_amount = 0, 0.0
    overdue_count, overdue_amount = 0, 0.0
    paid_count, paid_amount = 0, 0.0
    
    for inv in invoices:
        inv_total = float(inv_amounts.get(inv.id, 0.0))
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
    refresh_overdue_invoices(db, firm_id=current_user.firm_id)
    all_invoices = db.query(Invoice).filter(
        Invoice.firm_id == current_user.firm_id,
        Invoice.status != "draft"
    ).all()
    
    client_ids = {inv.client_id for inv in all_invoices if inv.client_id}
    clients = {c.id: c for c in db.query(Client).filter(Client.id.in_(client_ids)).all()} if client_ids else {}
    
    prep_ids = {inv.prepared_by_id for inv in all_invoices if inv.prepared_by_id}
    preps = {u.id: u for u in db.query(User).filter(User.id.in_(prep_ids)).all()} if prep_ids else {}
    
    inv_ids = [inv.id for inv in all_invoices]
    line_items_by_inv = defaultdict(list)
    if inv_ids:
        all_lines = db.query(InvoiceLineItem).filter(InvoiceLineItem.invoice_id.in_(inv_ids)).order_by(InvoiceLineItem.order).all()
        for li in all_lines:
            line_items_by_inv[li.invoice_id].append(li)
    
    rows = []
    clients_map = {}
    
    for inv in all_invoices:
        client = clients.get(inv.client_id)
        prep = preps.get(inv.prepared_by_id)
        inv_lines = line_items_by_inv.get(inv.id, [])
        total_amount = sum(i.amount for i in inv_lines)
        
        due_in_days = days_until(inv.due_date)
        if due_in_days is None:
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
            "paidDaysAgo": days_ago(inv.paid_at) if inv.status == "paid" else None,
            "preparedBy": {"en": prep.name_en if prep else "", "ar": prep.name_ar if prep else ""},
            "lineItems": [
                {
                    "id": li.id,
                    "description": {"en": li.description_en, "ar": li.description_ar},
                    "detail": {"en": li.detail_en or "", "ar": li.detail_ar or ""},
                    "amount": li.amount
                }
                for li in inv_lines
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
    
    client_ids = {d.client_id for d in drafts if d.client_id}
    clients = {c.id: c for c in db.query(Client).filter(Client.id.in_(client_ids)).all()} if client_ids else {}
    
    draft_ids = [d.id for d in drafts]
    line_items_by_draft = defaultdict(list)
    if draft_ids:
        all_lines = db.query(InvoiceLineItem).filter(InvoiceLineItem.invoice_id.in_(draft_ids)).order_by(InvoiceLineItem.order).all()
        for li in all_lines:
            line_items_by_draft[li.invoice_id].append(li)
            
    items = []
    for d in drafts:
        cl = clients.get(d.client_id)
        d_lines = line_items_by_draft.get(d.id, [])
        d_total = sum(li.amount for li in d_lines)
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
                for li in d_lines
            ],
            "total": d_total,
            "totalAmount": d_total
        })
    return items

@router.post("/drafts", response_model=dict, status_code=status.HTTP_201_CREATED)
def save_invoice_draft(
    payload: InvoiceDraftCreate,
    current_user: User = Depends(require_billing_access),
    db: Session = Depends(get_db)
):
    # 1. Validate matter case-insensitively
    engagement_ref_raw = (payload.engagementRef or "").strip()
    matter = None
    if engagement_ref_raw:
        matter = db.query(Matter).filter(
            func.lower(Matter.reference) == engagement_ref_raw.lower(),
            Matter.firm_id == current_user.firm_id
        ).first()
        if not matter:
            matter = db.query(Matter).filter(
                func.lower(Matter.id) == engagement_ref_raw.lower(),
                Matter.firm_id == current_user.firm_id
            ).first()

    if not matter:
        raise HTTPException(status_code=400, detail="engagementInvalid")

    # 2. Validate description
    desc = (payload.description or "").strip()
    if not desc:
        raise HTTPException(status_code=400, detail="descriptionRequired")

    # 3. Validate lines
    if not payload.lines or len(payload.lines) == 0:
        raise HTTPException(status_code=400, detail="noLines")

    for line in payload.lines:
        line_desc = (line.description or "").strip()
        if not line_desc:
            raise HTTPException(status_code=400, detail="lineDescriptionRequired")

        if (
            line.amount is None
            or not isinstance(line.amount, (int, float))
            or isinstance(line.amount, bool)
            or not math.isfinite(line.amount)
            or line.amount <= 0
            or line.amount > 100_000_000
        ):
            raise HTTPException(status_code=400, detail="lineAmountRequired")

    # 4. Validate time entries
    all_entry_ids = []
    seen_ids = set()
    for line in payload.lines:
        line_ids = set(line.fromEntryIds or [])
        for eid in line_ids:
            if eid in seen_ids:
                raise HTTPException(status_code=400, detail="entryInvalid")
            seen_ids.add(eid)
            all_entry_ids.append(eid)

    entries = []
    if all_entry_ids:
        entries = (
            db.query(TimeEntry)
            .filter(
                TimeEntry.firm_id == current_user.firm_id,
                TimeEntry.id.in_(all_entry_ids)
            )
            .with_for_update()
            .all()
        )

        if len(entries) != len(all_entry_ids):
            raise HTTPException(status_code=400, detail="entryInvalid")

        for entry in entries:
            if entry.matter_id != matter.reference:
                raise HTTPException(status_code=400, detail="entryInvalid")
            if not entry.billable:
                raise HTTPException(status_code=400, detail="entryInvalid")
            if entry.is_invoiced:
                raise HTTPException(status_code=409, detail="entryAlreadyBilled")

    # 5. Create invoice and lines with retry
    invoice = None
    saved_lines = []
    total_amount = 0.0

    for attempt in range(3):
        year = datetime.now().year
        max_num = db.query(
            func.max(func.cast(func.substr(Invoice.reference, 10), Integer))
        ).filter(Invoice.reference.op("~")(f"^INV-{year}-[0-9]+$")).scalar()

        base_num = max_num if (max_num is not None and max_num >= 88) else 88
        new_num = base_num + 1
        seq = f"{new_num:03d}"
        ref = f"INV-{year}-{seq}"

        invoice_id = f"inv-{uuid.uuid4().hex[:12]}"
        now_str = datetime.now().strftime("%Y-%m-%d")
        due_str = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")

        invoice = Invoice(
            id=invoice_id,
            sequence=seq,
            reference=ref,
            firm_id=current_user.firm_id,
            client_id=matter.client_id,
            engagement_ref=matter.reference,
            description_en=desc,
            description_ar=desc,
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
            line_id = f"itm-{uuid.uuid4().hex[:12]}"
            item = InvoiceLineItem(
                id=line_id,
                invoice_id=invoice.id,
                description_en=(line.description or "").strip(),
                description_ar=(line.description or "").strip(),
                detail_en=line.detail,
                detail_ar=line.detail,
                amount=float(line.amount),
                order=idx
            )
            db.add(item)
            total_amount += float(line.amount)
            saved_lines.append({
                "id": line_id,
                "description": (line.description or "").strip(),
                "amount": float(line.amount),
                "minutes": line.minutes,
                "fromEntryIds": line.fromEntryIds or []
            })

        for entry in entries:
            entry.is_invoiced = True
            entry.invoice_id = invoice.id
            db.add(entry)

        try:
            db.commit()
            db.refresh(invoice)
            break
        except IntegrityError:
            db.rollback()
            if attempt == 2:
                raise
            matter = db.query(Matter).filter(
                func.lower(Matter.reference) == engagement_ref_raw.lower(),
                Matter.firm_id == current_user.firm_id
            ).first() or db.query(Matter).filter(
                func.lower(Matter.id) == engagement_ref_raw.lower(),
                Matter.firm_id == current_user.firm_id
            ).first()
            if all_entry_ids:
                entries = (
                    db.query(TimeEntry)
                    .filter(
                        TimeEntry.firm_id == current_user.firm_id,
                        TimeEntry.id.in_(all_entry_ids)
                    )
                    .with_for_update()
                    .all()
                )

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


@router.delete("/drafts/{id}", response_model=dict)
def delete_invoice_draft(
    id: str,
    current_user: User = Depends(require_billing_access),
    db: Session = Depends(get_db)
):
    invoice = db.query(Invoice).filter(
        Invoice.firm_id == current_user.firm_id,
        or_(
            Invoice.id == id,
            Invoice.reference == id,
            func.lower(Invoice.reference) == id.lower()
        )
    ).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    if invoice.status != "draft":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot delete invoice with status '{invoice.status}'. Only draft invoices can be deleted."
        )

    # Release time entries
    db.query(TimeEntry).filter(
        TimeEntry.invoice_id == invoice.id,
        TimeEntry.firm_id == current_user.firm_id
    ).update(
        {"is_invoiced": False, "invoice_id": None},
        synchronize_session=False
    )

    # Delete line items explicitly
    db.query(InvoiceLineItem).filter(InvoiceLineItem.invoice_id == invoice.id).delete(synchronize_session=False)

    db.delete(invoice)
    db.commit()

    return {"ok": True, "message": "Draft deleted successfully", "id": invoice.id}

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

    if invoice.status != "draft":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot issue invoice with status '{invoice.status}'. Only draft invoices can be issued."
        )

    if not invoice.line_items:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot issue invoice without line items."
        )
        
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

    if invoice.status not in ["due", "overdue"]:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot mark invoice as paid with status '{invoice.status}'. Only due or overdue invoices can be marked as paid."
        )
        
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
    
    client_ids = {q.client_id for q in quotes if q.client_id}
    clients = {c.id: c for c in db.query(Client).filter(Client.id.in_(client_ids)).all()} if client_ids else {}
    
    engagement_refs = {q.engagement_ref for q in quotes if q.engagement_ref}
    matters = {m.reference: m for m in db.query(Matter).filter(Matter.reference.in_(engagement_refs), Matter.firm_id == current_user.firm_id).all()} if engagement_refs else {}
    
    lead_ids = {m.lead_counsel_id for m in matters.values() if m.lead_counsel_id}
    leads = {u.id: u for u in db.query(User).filter(User.id.in_(lead_ids)).all()} if lead_ids else {}
    
    for q in quotes:
        cl = clients.get(q.client_id)
        matter = matters.get(q.engagement_ref)
        lead = leads.get(matter.lead_counsel_id) if (matter and matter.lead_counsel_id) else None
        
        # State mapping
        if q.status == "accepted":
            item_state = "approved"
        elif q.status == "declined":
            item_state = "changesRequested"
        else:
            item_state = "pending"
            
        due_in_days = days_until(q.valid_until)
        if due_in_days is None:
            due_in_days = 0
            
        counts[item_state] = counts.get(item_state, 0) + 1
        totals[item_state] = totals.get(item_state, 0.0) + q.amount
        totals["all"] += q.amount
        if item_state == "pending":
            pending_value += q.amount
            
        if lead:
            submitted_by = {"en": lead.name_en, "ar": lead.name_ar}
            submitted_by_rank = lead.rank or ""
        else:
            submitted_by = {"en": "", "ar": ""}
            submitted_by_rank = ""
            
        assigned_to = submitted_by
            
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
            "submittedBy": submitted_by,
            "submittedByRank": submitted_by_rank,
            "assignedTo": assigned_to
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
    # 1. Unknown matter -> 400 "engagementInvalid" and NO row created
    matter_id_raw = (payload.matterId or "").strip()
    matter = None
    if matter_id_raw:
        matter = db.query(Matter).filter(
            func.lower(Matter.reference) == matter_id_raw.lower(),
            Matter.firm_id == current_user.firm_id
        ).first()
        if not matter:
            matter = db.query(Matter).filter(
                func.lower(Matter.id) == matter_id_raw.lower(),
                Matter.firm_id == current_user.firm_id
            ).first()

    if not matter:
        raise HTTPException(status_code=400, detail="engagementInvalid")

    # 2. Minutes must be an integer between 1 and 1440
    if (
        payload.minutes is None
        or not isinstance(payload.minutes, int)
        or isinstance(payload.minutes, bool)
        or payload.minutes < 1
        or payload.minutes > 1440
    ):
        raise HTTPException(status_code=400, detail="durationRequired")

    # 3. EntryDate must be a valid YYYY-MM-DD and not in the future
    if payload.entryDate:
        try:
            parsed_date = datetime.strptime(payload.entryDate, "%Y-%m-%d").date()
        except (ValueError, TypeError):
            raise HTTPException(status_code=400, detail="dateRequired")
        if parsed_date > datetime.now().date():
            raise HTTPException(status_code=400, detail="dateFuture")
        entry_date = payload.entryDate
    else:
        entry_date = datetime.now().strftime("%Y-%m-%d")

    # 4. Description must be non-empty after strip and at most 500 characters
    desc = (payload.description or "").strip()
    if not desc or len(desc) > 500:
        raise HTTPException(status_code=400, detail="descriptionRequired")

    rate = HOURLY_RATES.get(current_user.rank, 1400.0)

    time_entry = TimeEntry(
        id=f"tm-{uuid.uuid4().hex[:12]}",
        firm_id=current_user.firm_id,
        matter_id=matter.reference,
        staff_id=current_user.id,
        minutes=payload.minutes,
        rate_at_time=rate,
        billable=True if payload.billable is None else payload.billable,
        is_invoiced=False,
        description_en=desc,
        description_ar=desc,
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
            "engagementTitle": {"en": matter.title_en, "ar": matter.title_ar},
            "engagementKind": "project" if (matter and matter.work_type == "otherProject") else "matter",
            "clientId": matter.client_id,
            "clientName": {"en": matter.client.name_en if matter.client else "", "ar": matter.client.name_ar if matter.client else ""},
            "date": time_entry.entry_date,
            "minutes": time_entry.minutes,
            "hours": time_entry.minutes / 60.0,
            "description": time_entry.description_ar,
            "billable": time_entry.billable,
            "rate": time_entry.rate_at_time,
            "amount": amount,
            "billed": time_entry.is_invoiced
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
    
    matter_refs = {t.matter_id for t in entries if t.matter_id}
    matters = {m.reference: m for m in db.query(Matter).filter(Matter.reference.in_(matter_refs), Matter.firm_id == current_user.firm_id).all()} if matter_refs else {}
    
    client_ids = {m.client_id for m in matters.values() if m.client_id}
    clients = {c.id: c for c in db.query(Client).filter(Client.id.in_(client_ids)).all()} if client_ids else {}
    
    staff_ids = {t.staff_id for t in entries if t.staff_id}
    staff_map = {u.id: u for u in db.query(User).filter(User.id.in_(staff_ids)).all()} if staff_ids else {}
    
    results = []
    for t in entries:
        matter = matters.get(t.matter_id)
        client = clients.get(matter.client_id) if matter else None
        staff = staff_map.get(t.staff_id)
        
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
            "engagementKind": "project" if (matter and matter.work_type == "otherProject") else "matter",
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
        
        matter = db.query(Matter).filter(Matter.reference == engagementRef, Matter.firm_id == current_user.firm_id).first()
        client = db.query(Client).filter(Client.id == matter.client_id).first() if matter else None
        
        staff_ids = {t.staff_id for t in unbilled_entries if t.staff_id}
        staff_map = {u.id: u for u in db.query(User).filter(User.id.in_(staff_ids)).all()} if staff_ids else {}
        
        for t in unbilled_entries:
            staff = staff_map.get(t.staff_id)
            amount = (t.minutes / 60.0) * t.rate_at_time
            unbilled_results.append({
                "id": t.id,
                "staffId": t.staff_id,
                "staffName": {"en": staff.name_en if staff else "", "ar": staff.name_ar if staff else ""},
                "staffRank": staff.rank if staff else "associate",
                "engagementRef": t.matter_id,
                "engagementTitle": {"en": matter.title_en if matter else "", "ar": matter.title_ar if matter else ""},
                "engagementKind": "project" if (matter and matter.work_type == "otherProject") else "matter",
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
    current_user: User = Depends(require_client),
    db: Session = Depends(get_db)
):
    target_client_id = current_user.client_id
    refresh_overdue_invoices(db, firm_id=current_user.firm_id)
    
    invoices = db.query(Invoice).filter(
        Invoice.firm_id == current_user.firm_id,
        Invoice.client_id == target_client_id,
        Invoice.status.notin_(["draft", "pending_approval"])
    ).order_by(Invoice.issue_date.desc()).all()
    
    engagement_refs = {inv.engagement_ref for inv in invoices if inv.engagement_ref}
    matters = {m.reference: m for m in db.query(Matter).filter(Matter.reference.in_(engagement_refs), Matter.firm_id == current_user.firm_id).all()} if engagement_refs else {}
    
    inv_ids = [inv.id for inv in invoices]
    line_items_by_inv = defaultdict(list)
    if inv_ids:
        all_lines = db.query(InvoiceLineItem).filter(InvoiceLineItem.invoice_id.in_(inv_ids)).order_by(InvoiceLineItem.order).all()
        for li in all_lines:
            line_items_by_inv[li.invoice_id].append(li)
            
    items = []
    counts = {"all": len(invoices), "overdue": 0, "due": 0, "paid": 0}
    
    for inv in invoices:
        matter = matters.get(inv.engagement_ref)
        inv_lines = line_items_by_inv.get(inv.id, [])
        total_amount = sum(i.amount for i in inv_lines)
        
        due_in_days = days_until(inv.due_date)
        if due_in_days is None:
            due_in_days = 0
            
        counts[inv.status] = counts.get(inv.status, 0) + 1
        
        row = {
            "id": inv.id,
            "reference": inv.reference,
            "engagementRef": inv.engagement_ref,
            "engagementKind": "project" if (matter and matter.work_type == "otherProject") else "matter",
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
                for li in inv_lines
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
    current_user: User = Depends(require_client),
    db: Session = Depends(get_db)
):
    target_client_id = current_user.client_id
    refresh_overdue_invoices(db, firm_id=current_user.firm_id)
    
    invoices = db.query(Invoice).filter(
        Invoice.firm_id == current_user.firm_id,
        Invoice.client_id == target_client_id,
        Invoice.status.notin_(["draft", "pending_approval"])
    ).all()
    
    inv_ids = [inv.id for inv in invoices]
    inv_amounts = dict(
        db.query(
            InvoiceLineItem.invoice_id,
            func.coalesce(func.sum(InvoiceLineItem.amount), 0.0)
        ).filter(InvoiceLineItem.invoice_id.in_(inv_ids)).group_by(InvoiceLineItem.invoice_id).all()
    ) if inv_ids else {}
    
    unpaid = [i for i in invoices if i.status != "paid"]
    overdue = [i for i in invoices if i.status == "overdue"]
    settled = [i for i in invoices if i.status == "paid"]
    
    sum_inv = lambda lst: sum(float(inv_amounts.get(inv.id, 0.0)) for inv in lst)
    
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
    current_user: User = Depends(require_client),
    db: Session = Depends(get_db)
):
    target_client_id = current_user.client_id
    refresh_overdue_invoices(db, firm_id=current_user.firm_id)
    
    invoices = db.query(Invoice).filter(
        Invoice.firm_id == current_user.firm_id,
        Invoice.client_id == target_client_id,
        Invoice.status.notin_(["draft", "pending_approval"])
    ).all()
    
    seen = set()
    results = []
    
    engagement_refs = {inv.engagement_ref for inv in invoices if inv.engagement_ref}
    matters = {m.reference: m for m in db.query(Matter).filter(Matter.reference.in_(engagement_refs), Matter.firm_id == current_user.firm_id).all()} if engagement_refs else {}
    
    for inv in invoices:
        if inv.engagement_ref in seen:
            continue
        seen.add(inv.engagement_ref)
        matter = matters.get(inv.engagement_ref)
        if matter:
            results.append({
                "reference": matter.reference,
                "kind": map_work_type_for_display(matter.work_type),
                "title": {"en": matter.title_en, "ar": matter.title_ar}
            })
            
    return results

@client_router.get("/{reference}", response_model=dict)
def get_client_invoice_detail(
    reference: str,
    current_user: User = Depends(require_client),
    db: Session = Depends(get_db)
):
    target_client_id = current_user.client_id
    refresh_overdue_invoices(db, firm_id=current_user.firm_id)
    
    inv = db.query(Invoice).filter(
        Invoice.reference == reference,
        Invoice.firm_id == current_user.firm_id,
        Invoice.client_id == target_client_id,
        Invoice.status.notin_(["draft", "pending_approval"])
    ).first()
    
    if not inv:
        # Fallback by id
        inv = db.query(Invoice).filter(
            Invoice.id == reference,
            Invoice.firm_id == current_user.firm_id,
            Invoice.client_id == target_client_id,
            Invoice.status.notin_(["draft", "pending_approval"])
        ).first()
        
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
        
    matter = db.query(Matter).filter(Matter.reference == inv.engagement_ref, Matter.firm_id == current_user.firm_id).first()
    client = db.query(Client).filter(Client.id == inv.client_id, Client.firm_id == current_user.firm_id).first()
    prep = db.query(User).filter(User.id == inv.prepared_by_id, User.firm_id == current_user.firm_id).first()
    total_amount = sum(i.amount for i in inv.line_items)
    
    due_in_days = days_until(inv.due_date)
    if due_in_days is None:
        due_in_days = 0
        
    return {
        "id": inv.id,
        "sequence": inv.sequence,
        "reference": inv.reference,
        "engagementRef": inv.engagement_ref,
        "engagementKind": "project" if (matter and matter.work_type == "otherProject") else "matter",
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
