import os
import uuid
import urllib.parse
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.document import Document
from app.models.firm import Firm
from app.models.integration import Integration
from app.models.user import User
import logging
from app.core.permissions import get_current_user, require_staff, require_partner
from app.core.config import settings
from app.core.security import (
    create_oauth_ticket,
    verify_oauth_ticket,
    create_oauth_state,
    verify_oauth_state,
)
from app.services import onedrive_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/staff/integrations", tags=["Integrations & Word Online"])

def sanitize_return_to(return_to: Optional[str]) -> str:
    default_path = "/ar/staff"
    if not return_to:
        return default_path
    clean = return_to.strip()
    if not clean.startswith("/") or clean.startswith("//") or "://" in clean or "\\" in clean:
        return default_path
    return clean

class ConfigureMicrosoftRequest(BaseModel):
    client_id: str
    client_secret: Optional[str] = None

class ExchangeTokenRequest(BaseModel):
    code: str
    redirect_uri: str

class SaveClientIdRequest(BaseModel):
    client_id: str
    client_secret: Optional[str] = None

@router.post("/microsoft/save-client-id")
def save_microsoft_client_id(
    payload: SaveClientIdRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_partner),
):
    """Save or update Microsoft Azure Client ID and optional secret."""
    clean_id = payload.client_id.strip()
    if not clean_id:
        raise HTTPException(status_code=400, detail="Client ID cannot be empty")

    integration = db.query(Integration).filter(
        Integration.firm_id == current_user.firm_id,
        Integration.provider == "microsoft",
    ).first()

    if not integration:
        integration = Integration(
            id=f"intg-{uuid.uuid4().hex[:12]}",
            firm_id=current_user.firm_id,
            provider="microsoft",
            client_id=clean_id,
            client_secret=payload.client_secret.strip() if payload.client_secret else None,
            is_active=False,
        )
        db.add(integration)
    else:
        integration.client_id = clean_id
        if payload.client_secret:
            integration.client_secret = payload.client_secret.strip()

    db.commit()
    db.refresh(integration)
    return {"success": True, "client_id": clean_id, "message": "تم حفظ Client ID بنجاح"}

@router.post("/microsoft/ticket")
def create_microsoft_login_ticket(
    current_user: User = Depends(require_staff),
):
    """
    Generate a short-lived (5 min) cryptographically signed ticket for browser-initiated
    Microsoft OAuth login. Ensures only authenticated staff can initiate Microsoft login.
    """
    ticket = create_oauth_ticket(current_user.id, current_user.firm_id)
    return {"ticket": ticket, "expires_in": 300}

@router.get("/microsoft/login")
def start_microsoft_login(
    ticket: Optional[str] = None,
    staff_id: Optional[str] = None,
    return_to: Optional[str] = "/ar/staff",
    db: Session = Depends(get_db),
):
    """Redirect user directly to Microsoft login using a signed ticket or dev staff_id."""
    target_staff_id = None
    target_firm_id = None

    if ticket:
        payload = verify_oauth_ticket(ticket)
        if not payload:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired Microsoft login ticket")
        target_staff_id = payload.get("sub")
        target_firm_id = payload.get("firm_id")
    elif settings.ALLOW_VIEWER_HEADERS and staff_id and staff_id.strip():
        target_staff_id = staff_id.strip()
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A valid login ticket is required to initiate Microsoft login"
        )

    staff_user = db.query(User).filter(User.id == target_staff_id).first()
    if not staff_user or staff_user.side != "staff":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff user not found")

    if target_firm_id and staff_user.firm_id != target_firm_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Firm mismatch")

    safe_return_to = sanitize_return_to(return_to)
    frontend_base = settings.FRONTEND_URL.rstrip("/")

    integration = db.query(Integration).filter(
        Integration.firm_id == staff_user.firm_id,
        Integration.provider == "microsoft",
    ).first()

    client_id = (integration.client_id if integration and integration.client_id else None) or \
                os.getenv("MICROSOFT_OAUTH_CLIENT_ID") or \
                os.getenv("MS_CLIENT_ID")

    if not client_id or "mock" in client_id.lower():
        separator = "&" if "?" in safe_return_to else "?"
        err_text = urllib.parse.quote("يلزم إدخال Azure Client ID حقيقي لتفعيل المزامنة التلقائية مع OneDrive، أو يمكنك استخدام محرر Word المباشر فوراً بالضغط على 'فتح في Microsoft Word'.")
        return RedirectResponse(url=f"{frontend_base}{safe_return_to}{separator}ms_error={err_text}")

    # Cryptographically signed state JWT (staff_id, firm_id, nonce, safe_return_to, 10 min expiry)
    state = create_oauth_state(staff_user.id, staff_user.firm_id, safe_return_to)

    redirect_uri = "http://localhost:8000/api/staff/integrations/microsoft/callback"
    auth_url = onedrive_service.get_authorization_url(
        client_id=client_id,
        redirect_uri=redirect_uri,
        state=state,
    )
    return RedirectResponse(url=auth_url)

@router.get("/microsoft/callback")
async def microsoft_oauth_callback(
    code: str,
    state: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Callback receiving authorization code from Microsoft, saving tokens, and redirecting back."""
    frontend_base = settings.FRONTEND_URL.rstrip("/")
    default_target = "/ar/staff"

    if not state:
        err_msg = urllib.parse.quote("Missing OAuth state parameter")
        return RedirectResponse(url=f"{frontend_base}{default_target}?ms_error={err_msg}")

    state_payload = verify_oauth_state(state)
    if not state_payload:
        err_msg = urllib.parse.quote("Invalid or expired OAuth state parameter")
        return RedirectResponse(url=f"{frontend_base}{default_target}?ms_error={err_msg}")

    staff_id = state_payload.get("sub")
    firm_id = state_payload.get("firm_id")
    raw_return_to = state_payload.get("return_to")
    target_path = sanitize_return_to(raw_return_to)

    staff_user = db.query(User).filter(User.id == staff_id, User.firm_id == firm_id).first()
    if not staff_user or staff_user.side != "staff":
        err_msg = urllib.parse.quote("Staff user or firm not found")
        separator = "&" if "?" in target_path else "?"
        return RedirectResponse(url=f"{frontend_base}{target_path}{separator}ms_error={err_msg}")

    integration = db.query(Integration).filter(
        Integration.firm_id == firm_id,
        Integration.provider == "microsoft",
    ).first()

    client_id = (integration.client_id if integration and integration.client_id else None) or \
                os.getenv("MICROSOFT_OAUTH_CLIENT_ID") or \
                os.getenv("MS_CLIENT_ID")

    client_secret = (integration.client_secret if integration and integration.client_secret else None) or \
                    os.getenv("MICROSOFT_OAUTH_CLIENT_SECRET") or \
                    os.getenv("MS_CLIENT_SECRET")

    redirect_uri = "http://localhost:8000/api/staff/integrations/microsoft/callback"

    try:
        tokens = await onedrive_service.exchange_code_for_tokens(
            client_id=client_id,
            client_secret=client_secret,
            code=code,
            redirect_uri=redirect_uri,
        )
        access_token = tokens.get("access_token")
        refresh_token = tokens.get("refresh_token")
        expires_in = tokens.get("expires_in", 3600)
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)

        account_email = None
        account_name = None
        try:
            profile = await onedrive_service.get_user_profile(access_token)
            account_email = profile.get("mail") or profile.get("userPrincipalName")
            account_name = profile.get("displayName")
        except Exception:
            pass

        if not integration:
            integration = Integration(
                id=f"intg-{uuid.uuid4().hex[:12]}",
                firm_id=firm_id,
                provider="microsoft",
                client_id=client_id,
                client_secret=client_secret,
                is_active=True,
            )
            db.add(integration)

        integration.access_token = access_token
        if refresh_token:
            integration.refresh_token = refresh_token
        integration.expires_at = expires_at
        integration.account_email = account_email
        integration.account_name = account_name
        integration.is_active = True
        db.commit()

        separator = "&" if "?" in target_path else "?"
        return RedirectResponse(url=f"{frontend_base}{target_path}{separator}ms_connected=true")
    except Exception as e:
        logger.error("MICROSOFT OAUTH ERROR: %s", e)
        err_msg = urllib.parse.quote("فشل ربط الحساب مع Microsoft")
        separator = "&" if "?" in target_path else "?"
        return RedirectResponse(url=f"{frontend_base}{target_path}{separator}ms_error={err_msg}")

@router.get("/microsoft/status")
def get_microsoft_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Check Microsoft 365 / OneDrive integration connection status."""
    integration = db.query(Integration).filter(
        Integration.firm_id == current_user.firm_id,
        Integration.provider == "microsoft",
    ).first()

    env_client_id = os.getenv("MICROSOFT_OAUTH_CLIENT_ID") or os.getenv("MS_CLIENT_ID") or ""
    configured_client_id = (integration.client_id if integration and integration.client_id else None) or env_client_id

    if not integration or not integration.is_active or not integration.access_token:
        return {
            "is_connected": False,
            "has_configured_client_id": bool(configured_client_id),
            "client_id": configured_client_id,
            "account_email": integration.account_email if integration else None,
            "account_name": integration.account_name if integration else None,
        }

    return {
        "is_connected": True,
        "has_configured_client_id": True,
        "client_id": configured_client_id,
        "account_email": integration.account_email,
        "account_name": integration.account_name,
        "expires_at": integration.expires_at.isoformat() if integration.expires_at else None,
    }

@router.get("/microsoft/auth-url")
def get_microsoft_auth_url(
    redirect_uri: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate the OAuth2 URL to authenticate with Microsoft."""
    integration = db.query(Integration).filter(
        Integration.firm_id == current_user.firm_id,
        Integration.provider == "microsoft",
    ).first()

    client_id = (integration.client_id if integration and integration.client_id else None) or \
                os.getenv("MICROSOFT_OAUTH_CLIENT_ID") or \
                os.getenv("MS_CLIENT_ID")

    if not client_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Microsoft Client ID is not configured yet."
        )

    url = onedrive_service.get_authorization_url(client_id=client_id, redirect_uri=redirect_uri)
    return {"auth_url": url, "client_id": client_id}

@router.post("/microsoft/exchange-token")
async def exchange_microsoft_token(
    payload: ExchangeTokenRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Exchange authorization code for tokens and save Microsoft integration."""
    integration = db.query(Integration).filter(
        Integration.firm_id == current_user.firm_id,
        Integration.provider == "microsoft",
    ).first()

    client_id = (integration.client_id if integration and integration.client_id else None) or \
                os.getenv("MICROSOFT_OAUTH_CLIENT_ID") or \
                os.getenv("MS_CLIENT_ID")

    client_secret = (integration.client_secret if integration and integration.client_secret else None) or \
                    os.getenv("MICROSOFT_OAUTH_CLIENT_SECRET") or \
                    os.getenv("MS_CLIENT_SECRET")

    if not client_id:
        raise HTTPException(status_code=400, detail="Microsoft Client ID missing.")

    try:
        tokens = await onedrive_service.exchange_code_for_tokens(
            client_id=client_id,
            client_secret=client_secret,
            code=payload.code,
            redirect_uri=payload.redirect_uri,
        )
    except Exception as e:
        logger.error("Token exchange failed: %s", e)
        raise HTTPException(status_code=400, detail="فشل تبادل رمز المصادقة مع Microsoft")

    access_token = tokens.get("access_token")
    refresh_token = tokens.get("refresh_token")
    expires_in = tokens.get("expires_in", 3600)
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)

    # Fetch user details
    account_email = None
    account_name = None
    try:
        profile = await onedrive_service.get_user_profile(access_token)
        account_email = profile.get("mail") or profile.get("userPrincipalName")
        account_name = profile.get("displayName")
    except Exception:
        pass

    if not integration:
        integration = Integration(
            id=f"intg-{uuid.uuid4().hex[:12]}",
            firm_id=current_user.firm_id,
            provider="microsoft",
            client_id=client_id,
            client_secret=client_secret,
            access_token=access_token,
            refresh_token=refresh_token,
            expires_at=expires_at,
            account_email=account_email,
            account_name=account_name,
            is_active=True,
        )
        db.add(integration)
    else:
        integration.access_token = access_token
        if refresh_token:
            integration.refresh_token = refresh_token
        integration.expires_at = expires_at
        integration.account_email = account_email or integration.account_email
        integration.account_name = account_name or integration.account_name
        integration.is_active = True

    db.commit()
    db.refresh(integration)

    return {
        "success": True,
        "message": "تم ربط حساب Microsoft بنجاح",
        "account_email": integration.account_email,
        "account_name": integration.account_name,
    }

@router.post("/microsoft/disconnect")
def disconnect_microsoft(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_partner),
):
    """Disconnect Microsoft account."""
    integration = db.query(Integration).filter(
        Integration.firm_id == current_user.firm_id,
        Integration.provider == "microsoft",
    ).first()

    if integration:
        integration.is_active = False
        integration.access_token = None
        integration.refresh_token = None
        db.commit()

    return {"success": True, "message": "تم إلغاء ربط Microsoft"}


# --- Document Word Online Operations ---

@router.post("/documents/{document_id}/open-word-online")
async def open_document_in_word_online(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Open an existing document in Microsoft Word Online (Office 365).
    If Microsoft OneDrive is connected, uploads to OneDrive and returns the official Word Online webUrl.
    Otherwise, returns direct word.new URL and document download link.
    """
    doc = db.query(Document).filter(
        Document.id == document_id,
        Document.firm_id == current_user.firm_id,
    ).first()

    if not doc:
        raise HTTPException(status_code=404, detail="المستند غير موجود")

    if not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="ملف المستند غير موجود على الخادم")

    integration = db.query(Integration).filter(
        Integration.firm_id == current_user.firm_id,
        Integration.provider == "microsoft",
        Integration.is_active == True,
    ).first()

    # If OneDrive is connected, upload and get Word Online webUrl
    if integration and integration.access_token:
        # Check token expiry and refresh if needed
        token = integration.access_token
        if integration.expires_at and datetime.now(timezone.utc) >= integration.expires_at:
            if integration.refresh_token:
                try:
                    refreshed = await onedrive_service.refresh_access_token(
                        client_id=integration.client_id,
                        client_secret=integration.client_secret,
                        refresh_token=integration.refresh_token,
                    )
                    token = refreshed.get("access_token")
                    integration.access_token = token
                    if refreshed.get("refresh_token"):
                        integration.refresh_token = refreshed.get("refresh_token")
                    integration.expires_at = datetime.now(timezone.utc) + timedelta(seconds=refreshed.get("expires_in", 3600))
                    db.commit()
                except Exception:
                    token = None

        if token:
            try:
                # If already uploaded to OneDrive, reuse existing item & URL to preserve edits
                if doc.onedrive_item_id and doc.onedrive_web_url:
                    return {
                        "success": True,
                        "mode": "onedrive",
                        "webUrl": doc.onedrive_web_url,
                        "document_id": doc.id,
                        "filename": doc.name,
                        "message": "تم فتح المستند المحفوظ في Microsoft Word Online الرسمي",
                    }

                with open(doc.file_path, "rb") as f:
                    file_bytes = f.read()

                upload_res = await onedrive_service.upload_docx_to_onedrive(
                    access_token=token,
                    file_bytes=file_bytes,
                    filename=doc.name,
                )
                web_url = upload_res["web_url"]
                if "action=" not in web_url:
                    separator = "&" if "?" in web_url else "?"
                    web_url = f"{web_url}{separator}action=edit"

                doc.onedrive_item_id = upload_res["item_id"]
                doc.onedrive_web_url = web_url
                doc.onedrive_synced_at = datetime.now(timezone.utc)
                db.commit()

                return {
                    "success": True,
                    "mode": "onedrive",
                    "webUrl": web_url,
                    "document_id": doc.id,
                    "filename": doc.name,
                    "message": "تم رفع المستند إلى OneDrive وفتحه في Microsoft Word Online الرسمي",
                }
            except Exception as e:
                # Fallback to direct Word Online if upload fails
                pass

    # Direct Word Online mode (word.new)
    return {
        "success": True,
        "mode": "direct",
        "webUrl": "https://word.new",
        "document_id": doc.id,
        "filename": doc.name,
        "downloadUrl": f"/api/documents/{doc.id}/download",
        "message": "تم تجهيز المستند وفتح Microsoft Word Online الرسمي في تبويب جديد",
    }


@router.post("/documents/{document_id}/sync-from-word-online")
async def sync_from_word_online(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Sync the latest edits from Microsoft Word Online / OneDrive back into the database and server storage."""
    doc = db.query(Document).filter(
        Document.id == document_id,
        Document.firm_id == current_user.firm_id,
    ).first()

    if not doc:
        raise HTTPException(status_code=404, detail="المستند غير موجود")

    if not doc.onedrive_item_id:
        raise HTTPException(
            status_code=400,
            detail="المستند غير مربوط بـ OneDrive بعد. يرجى فتحه أولاً عبر Word Online أو رفع النسخة المحدثة يدوياً."
        )

    integration = db.query(Integration).filter(
        Integration.firm_id == current_user.firm_id,
        Integration.provider == "microsoft",
        Integration.is_active == True,
    ).first()

    if not integration or not integration.access_token:
        raise HTTPException(status_code=400, detail="حساب Microsoft غير متصل")

    # Refresh token if needed
    token = integration.access_token
    if integration.expires_at and datetime.now(timezone.utc) >= integration.expires_at:
        if integration.refresh_token:
            refreshed = await onedrive_service.refresh_access_token(
                client_id=integration.client_id,
                client_secret=integration.client_secret,
                refresh_token=integration.refresh_token,
            )
            token = refreshed.get("access_token")
            integration.access_token = token
            db.commit()

    try:
        updated_bytes = await onedrive_service.download_docx_from_onedrive(
            access_token=token,
            item_id=doc.onedrive_item_id,
        )
        with open(doc.file_path, "wb") as f:
            f.write(updated_bytes)

        doc.size_bytes = len(updated_bytes)
        doc.onedrive_synced_at = datetime.now(timezone.utc)
        doc.updated_at = datetime.now(timezone.utc)
        db.commit()

        preview_text = ""
        try:
            import io
            from docx import Document as DocxDoc
            docx_file = DocxDoc(io.BytesIO(updated_bytes))
            texts = [p.text.strip() for p in docx_file.paragraphs if p.text.strip()]
            preview_text = "\n".join(texts[-3:]) if texts else ""
        except Exception:
            pass

        return {
            "success": True,
            "message": "تمت مزامنة وحفظ كافة التعديلات من Word في الموقع وقاعدة البيانات بنجاح!",
            "document_id": doc.id,
            "size_bytes": doc.size_bytes,
            "synced_at": doc.onedrive_synced_at.isoformat(),
            "preview_text": preview_text,
            "download_url": f"http://localhost:8000/api/documents/{doc.id}/download",
        }
    except Exception as e:
        logger.error("OneDrive sync error for document %s: %s", document_id, e)
        raise HTTPException(status_code=500, detail="فشلت المزامنة من OneDrive")


@router.post("/documents/{document_id}/upload-updated-docx")
async def upload_updated_docx(
    document_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Directly update/replace an existing document with an edited .docx or .xlsx file.
    Validates file extension against document kind, checks ZIP magic bytes (PK\x03\x04),
    and enforces maximum upload size.
    Persists immediately in server storage and PostgreSQL.
    """
    doc = db.query(Document).filter(
        Document.id == document_id,
        Document.firm_id == current_user.firm_id,
    ).first()

    if not doc:
        raise HTTPException(status_code=404, detail="المستند غير موجود")

    filename = (file.filename or "").lower()
    expected_ext = f".{doc.kind.lower()}"
    if not filename.endswith(expected_ext):
        raise HTTPException(
            status_code=400,
            detail=f"نوع الملف غير مطابق للمستند (يجب أن يكون {expected_ext})"
        )

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="الملف المرفوع فارغ")

    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"حجم الملف يتجاوز الحد الأقصى المسموح به ({settings.MAX_UPLOAD_SIZE_MB} ميجابايت)"
        )

    if doc.kind.lower() in ("docx", "xlsx"):
        if not content.startswith(b"PK\x03\x04"):
            raise HTTPException(status_code=400, detail="محتوى الملف غير صالح أو تالف")

    with open(doc.file_path, "wb") as f:
        f.write(content)

    doc.size_bytes = len(content)
    doc.updated_at = datetime.now(timezone.utc)
    db.commit()

    return {
        "success": True,
        "message": "تم حفظ وتحديث المستند في الموقع وقاعدة البيانات بنجاح!",
        "document_id": doc.id,
        "size_bytes": doc.size_bytes,
        "updated_at": doc.updated_at.isoformat(),
    }
