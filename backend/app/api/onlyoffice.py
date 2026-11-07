import os
import uuid
import httpx
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query, Body
from pydantic import BaseModel
from sqlalchemy.orm import Session
from jose import jwt, JWTError

from app.core.config import settings
from app.core.database import get_db
from app.core.permissions import get_current_user, require_staff, require_partner
from app.models.document import Document
from app.models.matter import Matter, MatterTimelineEvent
from app.models.integration import Integration
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/staff/onlyoffice", tags=["OnlyOffice Docs On-Premises"])


# ==============================================================================
# TOKEN HELPERS
# ==============================================================================

def create_onlyoffice_download_token(document_id: str) -> str:
    """Generate a short-lived signed token allowing ONLYOFFICE Document Server to download the file."""
    expire = datetime.now(timezone.utc) + timedelta(minutes=60)
    to_encode = {
        "sub": document_id,
        "purpose": "onlyoffice_download",
        "exp": expire,
    }
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def verify_onlyoffice_download_token(token: str, document_id: str) -> bool:
    """Verify that the download token is valid and matches the requested document ID."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("purpose") != "onlyoffice_download":
            return False
        return payload.get("sub") == document_id
    except JWTError:
        return False


def get_firm_onlyoffice_settings(firm_id: str, db: Session) -> tuple[str, str]:
    """Retrieve custom OnlyOffice server URL and JWT secret for the firm, or fall back to system defaults."""
    integration = db.query(Integration).filter(
        Integration.firm_id == firm_id,
        Integration.provider == "onlyoffice",
        Integration.is_active == True,
    ).first()

    server_url = (integration.client_id if integration and integration.client_id else None) or settings.ONLYOFFICE_DOCS_URL
    jwt_secret = (integration.client_secret if integration and integration.client_secret else None) or settings.ONLYOFFICE_JWT_SECRET
    return server_url.rstrip("/"), jwt_secret or ""


# ==============================================================================
# SCHEMAS
# ==============================================================================

class ConfigureOnlyOfficeRequest(BaseModel):
    server_url: str
    jwt_secret: Optional[str] = None
    is_active: bool = True


# ==============================================================================
# ENDPOINTS
# ==============================================================================

@router.get("/config/{document_id}")
def get_onlyoffice_config(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    """
    Generate the official ONLYOFFICE Document Server initialization configuration
    for the requested document with full Arabic RTL localization and editing permissions.
    """
    doc = db.query(Document).filter(
        Document.id == document_id,
        Document.firm_id == current_user.firm_id,
    ).first()

    if not doc:
        raise HTTPException(status_code=404, detail="المستند غير موجود في النظام")

    server_url, jwt_secret = get_firm_onlyoffice_settings(current_user.firm_id, db)
    download_token = create_onlyoffice_download_token(doc.id)

    backend_host = settings.BACKEND_HOST_URL.rstrip("/")
    download_url = f"{backend_host}/api/documents/{doc.id}/download?auth_token={download_token}"
    callback_url = f"{backend_host}/api/staff/onlyoffice/callback/{doc.id}"

    # Unique revision key changes when document is modified
    timestamp = int(doc.updated_at.timestamp()) if doc.updated_at else int(doc.created_at.timestamp() if doc.created_at else 0)
    doc_key = f"{doc.id}_{timestamp}"

    # Document type mapping: word for docx, cell for xlsx, slide for pptx
    doc_type = "cell" if doc.kind.lower() == "xlsx" else "word"

    user_display_name = current_user.name_ar or current_user.name_en or "المحامي"

    config: Dict[str, Any] = {
        "document": {
            "fileType": doc.kind.lower(),
            "key": doc_key,
            "title": doc.name,
            "url": download_url,
            "permissions": {
                "download": True,
                "edit": True,
                "print": True,
                "review": True,
                "comment": True,
                "fillForms": True,
            },
        },
        "documentType": doc_type,
        "editorConfig": {
            "mode": "edit",
            "lang": "ar",  # Full Arabic Interface
            "callbackUrl": callback_url,
            "user": {
                "id": current_user.id,
                "name": user_display_name,
            },
            "customization": {
                "autosave": True,
                "forcesave": True,
                "compactHeader": False,
                "toolbarNoTabs": False,
                "chat": False,
                "comments": True,
                "feedback": False,
                "unit": "cm",
                "uiTheme": "theme-classic-light",
            },
        },
    }

    # If JWT signature is required by OnlyOffice Document Server
    if jwt_secret:
        token = jwt.encode(config, jwt_secret, algorithm="HS256")
        config["token"] = token

    return {
        "ok": True,
        "serverUrl": server_url,
        "config": config,
        "document": {
            "id": doc.id,
            "name": doc.name,
            "title": doc.title,
            "kind": doc.kind,
            "size_bytes": doc.size_bytes,
            "engagement_ref": doc.engagement_ref,
        },
    }


@router.post("/callback/{document_id}")
async def onlyoffice_callback(
    document_id: str,
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
):
    """
    Handle ONLYOFFICE Document Server event callbacks (e.g. document saved, closed, forcesaved).
    Downloads the updated file from Document Server and saves it into local storage and PostgreSQL.
    """
    logger.info("OnlyOffice callback received for doc %s with status %s", document_id, payload.get("status"))

    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        return {"error": 1, "message": "Document not found"}

    status_code = payload.get("status")

    # Status 2 = Document ready for saving (user finished editing and closed)
    # Status 6 = Document forcesave (autosave while user continues editing)
    if status_code in (2, 6):
        download_url = payload.get("url")
        if download_url:
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    resp = await client.get(download_url)
                    if resp.status_code == 200:
                        file_bytes = resp.content
                        if len(file_bytes) > 0:
                            # Save updated file to disk
                            with open(doc.file_path, "wb") as f:
                                f.write(file_bytes)

                            doc.size_bytes = len(file_bytes)
                            doc.updated_at = datetime.now(timezone.utc)

                            # Log timeline event if associated with an active matter
                            if doc.engagement_ref:
                                matter = db.query(Matter).filter(
                                    Matter.reference == doc.engagement_ref,
                                    Matter.firm_id == doc.firm_id,
                                ).first()
                                if matter:
                                    event = MatterTimelineEvent(
                                        id=f"evt-{uuid.uuid4().hex[:8]}",
                                        matter_id=matter.id,
                                        kind="filing",
                                        title_ar="تعديل المستند عبر محرر OnlyOffice الداخلي",
                                        title_en="Document edited via OnlyOffice On-Premises",
                                        date=datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                                    )
                                    db.add(event)

                            db.commit()
                            logger.info("Successfully updated document %s (%d bytes) from OnlyOffice", doc.id, len(file_bytes))
                    else:
                        logger.warning("OnlyOffice download returned HTTP %d", resp.status_code)
                        return {"error": 1}
            except Exception as e:
                logger.error("Failed to download updated document from OnlyOffice URL: %s", e)
                return {"error": 1}

    # Status 0 = no error
    return {"error": 0}


@router.get("/status")
async def get_onlyoffice_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    """
    Check connectivity to the configured OnlyOffice Document Server.
    Tests whether the server is reachable and active.
    """
    server_url, jwt_secret = get_firm_onlyoffice_settings(current_user.firm_id, db)
    is_connected = False
    details = ""

    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            resp = await client.get(f"{server_url}/healthcheck")
            if resp.status_code == 200 and "true" in resp.text.lower():
                is_connected = True
                details = "خادم OnlyOffice يعمل بنجاح ومستعد لتحرير المستندات"
            else:
                details = f"استجاب الخادم برمز {resp.status_code}"
    except Exception as e:
        details = "تعذر الاتصال بخادم OnlyOffice المحلي (تأكد من تشغيل Docker أو الخادم)"

    return {
        "ok": True,
        "serverUrl": server_url,
        "hasJwt": bool(jwt_secret),
        "isConnected": is_connected,
        "details": details,
        "edition": "Community Edition (نسخة مجتمعية مجانية 100%)",
        "privacy": "أمان وخصوصية 100% (استضافة داخلية On-Premises)",
        "features": [
            "تحرير مستندات Word (.docx) و Excel (.xlsx) مباشرة من المتصفح",
            "واجهة عربية كاملة مطابقة لمحرر Microsoft Word",
            "حفظ ومزامنة تلقائية في قاعدة بيانات القضية",
            "بيانات ومستندات لا تخرج خارج خوادم المكتب إطلاقاً",
        ],
        "dockerCommand": "docker run -i -t -d -p 8080:80 --restart=always onlyoffice/documentserver",
    }


@router.post("/configure")
def configure_onlyoffice(
    payload: ConfigureOnlyOfficeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_partner),
):
    """
    Configure the firm's dedicated OnlyOffice Document Server connection URL and optional JWT secret.
    Requires partner permissions.
    """
    clean_url = payload.server_url.strip().rstrip("/")
    if not clean_url.startswith("http://") and not clean_url.startswith("https://"):
        raise HTTPException(status_code=400, detail="يجب إدخال رابط صالح يبدأ بـ http:// أو https://")

    integration = db.query(Integration).filter(
        Integration.firm_id == current_user.firm_id,
        Integration.provider == "onlyoffice",
    ).first()

    if not integration:
        integration = Integration(
            id=f"intg-{uuid.uuid4().hex[:12]}",
            firm_id=current_user.firm_id,
            provider="onlyoffice",
            client_id=clean_url,
            client_secret=payload.jwt_secret or "",
            is_active=payload.is_active,
        )
        db.add(integration)
    else:
        integration.client_id = clean_url
        if payload.jwt_secret is not None:
            integration.client_secret = payload.jwt_secret
        integration.is_active = payload.is_active
        integration.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(integration)

    return {
        "ok": True,
        "message": "تم حفظ وتحديث إعدادات خادم OnlyOffice بنجاح",
        "serverUrl": integration.client_id,
        "isActive": integration.is_active,
    }
