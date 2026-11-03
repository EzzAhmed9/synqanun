import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc
from app.core.database import get_db
from app.core.permissions import require_staff
from app.models.user import User
from app.models.legal_db import LegalDatabaseEntry
from app.schemas.legal_db import LegalEntryCreate, LegalEntryResponse

router = APIRouter(prefix="/staff/legal-database", tags=["Legal Database"])

@router.get("", response_model=dict)
def search_legal_database(
    kind: Optional[str] = Query(None),
    jurisdiction: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    all_entries = db.query(LegalDatabaseEntry).order_by(desc(LegalDatabaseEntry.issued_on)).all()
    
    # Calculate facets over the entire collection
    unique_kinds = list(dict.fromkeys([e.kind for e in all_entries]))
    
    jurisdictions_map = {}
    for e in all_entries:
        if e.jurisdiction_en not in jurisdictions_map:
            jurisdictions_map[e.jurisdiction_en] = {
                "value": e.jurisdiction_en,
                "label": {"en": e.jurisdiction_en, "ar": e.jurisdiction_ar}
            }
    
    target_pool = all_entries
    if kind and kind != "all":
        target_pool = [e for e in target_pool if e.kind == kind]

    if jurisdiction and jurisdiction != "all":
        target_pool = [e for e in target_pool if e.jurisdiction_en == jurisdiction]
        
    if q:
        search = q.lower().strip()
        target_pool = [
            e for e in target_pool
            if search in e.reference.lower() or
               search in e.title_en.lower() or
               search in e.title_ar.lower() or
               search in e.jurisdiction_en.lower() or
               search in e.jurisdiction_ar.lower() or
               search in e.content_en.lower() or
               search in e.content_ar.lower() or
               (e.tags and search in e.tags.lower())
        ]
        
    items = []
    for e in target_pool:
        items.append({
            "reference": e.reference,
            "kind": e.kind,
            "title": {"en": e.title_en, "ar": e.title_ar},
            "jurisdiction": {"en": e.jurisdiction_en, "ar": e.jurisdiction_ar},
            "issuedOn": e.issued_on,
            "body": {"en": e.content_en, "ar": e.content_ar},
            "content": {"en": e.content_en, "ar": e.content_ar},
            "tags": [t.strip() for t in e.tags.split(",")] if e.tags else []
        })
        
    return {
        "items": items,
        "total": len(items),
        "kinds": unique_kinds,
        "jurisdictions": list(jurisdictions_map.values())
    }

@router.get("/{reference}", response_model=dict)
def get_legal_entry(
    reference: str,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    all_entries = db.query(LegalDatabaseEntry).order_by(desc(LegalDatabaseEntry.issued_on)).all()
    entry = next((e for e in all_entries if e.reference.lower() == reference.lower()), None)
    
    if not entry:
        raise HTTPException(status_code=404, detail="Legal database entry not found")
        
    all_refs = [e.reference for e in all_entries]
    idx = all_refs.index(entry.reference)
    prev_ref = all_refs[idx - 1] if idx > 0 else None
    next_ref = all_refs[idx + 1] if idx < len(all_refs) - 1 else None

    entry_data = {
        "reference": entry.reference,
        "kind": entry.kind,
        "title": {"en": entry.title_en, "ar": entry.title_ar},
        "jurisdiction": {"en": entry.jurisdiction_en, "ar": entry.jurisdiction_ar},
        "issuedOn": entry.issued_on,
        "body": {"en": entry.content_en, "ar": entry.content_ar},
        "content": {"en": entry.content_en, "ar": entry.content_ar},
        "tags": [t.strip() for t in entry.tags.split(",")] if entry.tags else []
    }

    return {
        "entry": entry_data,
        "reference": entry.reference,
        "kind": entry.kind,
        "title": {"en": entry.title_en, "ar": entry.title_ar},
        "jurisdiction": {"en": entry.jurisdiction_en, "ar": entry.jurisdiction_ar},
        "issuedOn": entry.issued_on,
        "body": {"en": entry.content_en, "ar": entry.content_ar},
        "previous": prev_ref,
        "next": next_ref,
        "position": idx + 1,
        "total": len(all_refs)
    }
