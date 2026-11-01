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
    q: Optional[str] = Query(None),
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    all_entries = db.query(LegalDatabaseEntry).all()
    
    # Calculate facets over the entire collection
    kinds_count = {}
    jurisdictions_count = {}
    for e in all_entries:
        kinds_count[e.kind] = kinds_count.get(e.kind, 0) + 1
        jurisdictions_count[e.jurisdiction_en] = jurisdictions_count.get(e.jurisdiction_en, 0) + 1
        
    facets = {
        "kinds": [{"value": k, "count": cnt} for k, cnt in kinds_count.items()],
        "jurisdictions": [{"value": j, "count": cnt} for j, cnt in jurisdictions_count.items()],
    }
    
    target_pool = all_entries
    if kind and kind != "all":
        target_pool = [e for e in target_pool if e.kind == kind]
        
    if q:
        search = q.lower()
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
            "body": e.content_en,  # Latin text
            "tags": [t.strip() for t in e.tags.split(",")] if e.tags else []
        })
        
    return {
        "items": items,
        "total": len(items),
        "facets": facets
    }

@router.get("/{reference}", response_model=dict)
def get_legal_entry(
    reference: str,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    entry = db.query(LegalDatabaseEntry).filter(
        LegalDatabaseEntry.reference == reference
    ).first()
    
    if not entry:
        raise HTTPException(status_code=404, detail="Legal database entry not found")
        
    return {
        "reference": entry.reference,
        "kind": entry.kind,
        "title": {"en": entry.title_en, "ar": entry.title_ar},
        "jurisdiction": {"en": entry.jurisdiction_en, "ar": entry.jurisdiction_ar},
        "issuedOn": entry.issued_on,
        "body": entry.content_en,
        "tags": [t.strip() for t in entry.tags.split(",")] if entry.tags else []
    }
