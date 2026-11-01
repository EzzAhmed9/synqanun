import os
import uuid
import urllib.parse
from typing import Optional, List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from app.core.database import get_db
from app.core.permissions import get_current_user, require_staff, require_client
from app.models.user import User
from app.models.firm import Firm
from app.models.client import Client
from app.models.matter import Matter, MatterTimelineEvent
from app.models.invoice import Invoice, TimeEntry
from app.models.document import Document
from app.schemas.document import (
    WordGenerationRequest,
    ExcelExportRequest,
    DocumentResponse,
    DocumentListResponse,
)
from app.services.docx_generator import generate_legal_docx
from app.services.xlsx_generator import (
    export_client_statement_xlsx,
    export_invoices_ledger_xlsx,
    export_timesheet_xlsx,
)

# Uploads directory
UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "uploads", "documents"))
os.makedirs(UPLOAD_DIR, exist_ok=True)

router = APIRouter(prefix="/staff/documents", tags=["Documents (Staff)"])
client_router = APIRouter(prefix="/client/documents", tags=["Documents (Client)"])
public_download_router = APIRouter(prefix="/documents", tags=["Documents Download"])


def format_size(bytes_num: int) -> str:
    """Format file size in human-readable Arabic/English format."""
    if bytes_num < 1024:
        return f"{bytes_num} B"
    elif bytes_num < 1024 * 1024:
        return f"{bytes_num / 1024:.1f} KB"
    else:
        return f"{bytes_num / (1024 * 1024):.1f} MB"


def map_doc_to_response(doc: Document) -> DocumentResponse:
    return DocumentResponse(
        id=doc.id,
        name=doc.name,
        title=doc.title,
        kind=doc.kind,
        document_type=doc.document_type,
        size_bytes=doc.size_bytes,
        size_label=format_size(doc.size_bytes),
        status=doc.status,
        is_firm_only=doc.is_firm_only,
        engagement_ref=doc.engagement_ref,
        client_id=doc.client_id,
        created_at=doc.created_at.strftime("%Y-%m-%d %H:%M") if doc.created_at else "",
        download_url=f"/api/documents/{doc.id}/download"
    )


# =========================================================================
# STAFF ENDPOINTS
# =========================================================================

@router.post("/generate-word", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
def generate_word_document(
    payload: WordGenerationRequest,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    """
    Generate an official Arabic Word (.docx) document (e.g. pleading memo or contract),
    save to disk, insert into PostgreSQL, and link to matter/client.
    """
    matter = db.query(Matter).filter(
        func.lower(Matter.reference) == payload.matter_reference.lower(),
        Matter.firm_id == current_user.firm_id
    ).first()
    if not matter:
        raise HTTPException(status_code=404, detail="Matter not found")

    client = db.query(Client).filter(Client.id == matter.client_id).first()
    firm = db.query(Firm).filter(Firm.id == current_user.firm_id).first()
    lead = db.query(User).filter(User.id == matter.lead_counsel_id).first()

    # Generate the .docx binary with Arabic RTL styling
    file_bytes, filename = generate_legal_docx(
        matter=matter,
        client=client,
        firm=firm,
        lead_counsel=lead,
        template_type=payload.template_type,
        params=payload.model_dump()
    )

    doc_id = f"doc-{uuid.uuid4().hex[:12]}"
    disk_filename = f"{doc_id}_{filename}"
    disk_path = os.path.join(UPLOAD_DIR, disk_filename)

    with open(disk_path, "wb") as f:
        f.write(file_bytes)

    doc_title = payload.title or (
        f"مذكرة دفاع - {matter.reference}" if payload.template_type == "pleading"
        else f"عقد خدمات وأتعاب - {matter.reference}"
    )

    new_doc = Document(
        id=doc_id,
        firm_id=current_user.firm_id,
        client_id=matter.client_id,
        engagement_ref=matter.reference,
        name=filename,
        title=doc_title,
        kind="docx",
        document_type=payload.template_type,
        file_path=disk_path,
        size_bytes=len(file_bytes),
        status="final",
        is_firm_only=payload.is_firm_only,
        created_by_id=current_user.id
    )
    db.add(new_doc)

    # Add timeline event to matter
    timeline_event = MatterTimelineEvent(
        id=f"evt-{uuid.uuid4().hex[:8]}",
        matter_id=matter.id,
        kind="filing",
        title_en=f"Generated document: {filename}",
        title_ar=f"تم تحرير وتوليد مستند: {filename}",
        date=datetime.now().strftime("%Y-%m-%d")
    )
    db.add(timeline_event)

    db.commit()
    db.refresh(new_doc)

    return map_doc_to_response(new_doc)


@router.post("/export-excel", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
def export_excel_spreadsheet(
    payload: ExcelExportRequest,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    """
    Generate an official Arabic Excel (.xlsx) spreadsheet (statement of account,
    invoice ledger, or billable hours report), save to disk, and persist in PostgreSQL.
    """
    firm = db.query(Firm).filter(Firm.id == current_user.firm_id).first()
    matter = None
    client = None

    if payload.matter_reference:
        matter = db.query(Matter).filter(
            func.lower(Matter.reference) == payload.matter_reference.lower(),
            Matter.firm_id == current_user.firm_id
        ).first()
        if matter:
            client = db.query(Client).filter(Client.id == matter.client_id).first()

    if not client and payload.client_id:
        client = db.query(Client).filter(
            Client.id == payload.client_id,
            Client.firm_id == current_user.firm_id
        ).first()

    # Generate according to export_type
    if payload.export_type == "client_statement":
        if not client and matter:
            client = matter.client

        query = db.query(Invoice).filter(Invoice.firm_id == current_user.firm_id)
        if client:
            query = query.filter(Invoice.client_id == client.id)
        elif matter:
            query = query.filter(Invoice.engagement_ref == matter.reference)
        invoices = query.all()

        file_bytes, filename = export_client_statement_xlsx(
            client=client,
            firm=firm,
            invoices=invoices
        )
        doc_title = f"كشف حساب موكل ({client.name_ar if client else 'عام'})"
        doc_type = "statementOfAccount"

    elif payload.export_type == "timesheet":
        query = db.query(TimeEntry).filter(TimeEntry.firm_id == current_user.firm_id)
        if matter:
            query = query.filter(TimeEntry.matter_id == matter.reference)
        time_entries = query.order_by(TimeEntry.entry_date.desc()).all()

        file_bytes, filename = export_timesheet_xlsx(
            time_entries=time_entries,
            matter=matter,
            firm=firm
        )
        doc_title = f"تقرير ساعات العمل والمطالبات ({matter.reference if matter else 'عام'})"
        doc_type = "timesheet"

    else:  # invoices_ledger
        query = db.query(Invoice).filter(Invoice.firm_id == current_user.firm_id)
        if matter:
            query = query.filter(Invoice.engagement_ref == matter.reference)
        elif client:
            query = query.filter(Invoice.client_id == client.id)
        invoices = query.order_by(Invoice.issue_date.desc()).all()

        file_bytes, filename = export_invoices_ledger_xlsx(
            invoices=invoices,
            matter=matter,
            firm=firm
        )
        doc_title = f"سجل الفواتير والمطالبات ({matter.reference if matter else 'المكتب'})"
        doc_type = "invoiceLedger"

    doc_id = f"doc-{uuid.uuid4().hex[:12]}"
    disk_filename = f"{doc_id}_{filename}"
    disk_path = os.path.join(UPLOAD_DIR, disk_filename)

    with open(disk_path, "wb") as f:
        f.write(file_bytes)

    new_doc = Document(
        id=doc_id,
        firm_id=current_user.firm_id,
        client_id=client.id if client else (matter.client_id if matter else None),
        engagement_ref=matter.reference if matter else None,
        name=filename,
        title=doc_title,
        kind="xlsx",
        document_type=doc_type,
        file_path=disk_path,
        size_bytes=len(file_bytes),
        status="final",
        is_firm_only=payload.is_firm_only,
        created_by_id=current_user.id
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)

    return map_doc_to_response(new_doc)


@router.get("", response_model=DocumentListResponse)
def list_documents_for_staff(
    engagement_ref: Optional[str] = Query(None),
    client_id: Optional[str] = Query(None),
    kind: Optional[str] = Query(None),
    document_type: Optional[str] = Query(None),
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    """List documents accessible to firm staff."""
    query = db.query(Document).filter(Document.firm_id == current_user.firm_id)

    if engagement_ref:
        query = query.filter(func.lower(Document.engagement_ref) == engagement_ref.lower())
    if client_id:
        query = query.filter(Document.client_id == client_id)
    if kind:
        query = query.filter(Document.kind == kind)
    if document_type:
        query = query.filter(Document.document_type == document_type)

    docs = query.order_by(Document.created_at.desc()).all()
    return DocumentListResponse(
        items=[map_doc_to_response(d) for d in docs],
        total=len(docs)
    )


@router.delete("/{document_id}")
def delete_document(
    document_id: str,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    """Delete a document record and its underlying disk file."""
    doc = db.query(Document).filter(
        Document.id == document_id,
        Document.firm_id == current_user.firm_id
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if os.path.exists(doc.file_path):
        try:
            os.remove(doc.file_path)
        except Exception:
            pass

    db.delete(doc)
    db.commit()
    return {"ok": True, "deleted_id": document_id}


# =========================================================================
# CLIENT ENDPOINTS
# =========================================================================

@client_router.get("", response_model=DocumentListResponse)
def list_documents_for_client(
    engagement_ref: Optional[str] = Query(None),
    current_user: User = Depends(require_client),
    db: Session = Depends(get_db)
):
    """List documents shared with the authenticated client."""
    query = db.query(Document).filter(
        Document.firm_id == current_user.firm_id,
        Document.client_id == current_user.client_id,
        Document.is_firm_only == False
    )

    if engagement_ref:
        query = query.filter(func.lower(Document.engagement_ref) == engagement_ref.lower())

    docs = query.order_by(Document.created_at.desc()).all()
    return DocumentListResponse(
        items=[map_doc_to_response(d) for d in docs],
        total=len(docs)
    )


# =========================================================================
# DOWNLOAD ENDPOINT
# =========================================================================

@public_download_router.get("/{document_id}/download")
def download_document(
    document_id: str,
    db: Session = Depends(get_db)
):
    """
    Stream document file (.docx or .xlsx) with proper headers for instant browser downloading.
    """
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="File not found on storage server")

    media_type = "application/octet-stream"
    if doc.kind == "docx":
        media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    elif doc.kind == "xlsx":
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    elif doc.kind == "pdf":
        media_type = "application/pdf"

    # RFC 5987 encoded filename for safe Arabic characters in Content-Disposition
    ascii_fallback = f"document_{doc.id}.{doc.kind}"
    encoded_filename = urllib.parse.quote(doc.name)
    content_disposition = f'attachment; filename="{ascii_fallback}"; filename*=UTF-8\'\'{encoded_filename}'

    return FileResponse(
        path=doc.file_path,
        media_type=media_type,
        headers={
            "Content-Disposition": content_disposition,
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )
