from typing import Optional
from fastapi import Depends, HTTPException, status, Header, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.core.config import settings
from app.core.database import get_db
from app.core.security import decode_access_token, is_token_revoked
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token", auto_error=False)

def get_current_user(
    request: Request,
    token: Optional[str] = Depends(oauth2_scheme),
    x_viewer_staff_id: Optional[str] = Header(None, alias="X-Viewer-Staff-Id"),
    x_viewer_client_id: Optional[str] = Header(None, alias="X-Viewer-Client-Id"),
    db: Session = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # 1. Primary Authentication: Bearer token or Secure Cookie
    active_token = token
    if not active_token:
        active_token = request.cookies.get("syn-auth-token")

    if active_token:
        payload = decode_access_token(active_token)
        if payload:
            jti = payload.get("jti")
            if is_token_revoked(active_token, jti, db):
                raise credentials_exception

            user_id: Optional[str] = payload.get("sub")
            if user_id:
                user = db.query(User).filter(User.id == user_id).first()
                if user and user.status != "deactivated":
                    return user
        raise credentials_exception
                    
    # 2. X-Viewer-* headers: ONLY permitted when ALLOW_VIEWER_HEADERS is True (dev only)
    if settings.ALLOW_VIEWER_HEADERS:
        if x_viewer_staff_id:
            user = db.query(User).filter(User.id == x_viewer_staff_id).first()
            if user and user.status != "deactivated":
                return user

        if x_viewer_client_id:
            user = db.query(User).filter(
                or_(User.id == x_viewer_client_id, User.client_id == x_viewer_client_id)
            ).first()
            if user and user.status != "deactivated":
                return user

    # Strict Security: If no valid token is provided, reject with 401
    raise credentials_exception

def require_staff(current_user: User = Depends(get_current_user)) -> User:
    if current_user.side != "staff":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Staff access required"
        )
    return current_user

def require_client(current_user: User = Depends(get_current_user)) -> User:
    if current_user.side != "client" or not current_user.client_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Client portal access required"
        )
    return current_user

def require_billing_access(current_user: User = Depends(require_staff)) -> User:
    if current_user.rank not in ["partner", "seniorAssociate"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Billing is restricted to partners and senior associates"
        )
    return current_user

def require_time_recording(current_user: User = Depends(require_staff)) -> User:
    if current_user.rank not in ["partner", "seniorAssociate", "juniorAssociate", "paralegal"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Legal secretary does not record billable time"
        )
    return current_user

def require_lead_eligible(current_user: User = Depends(require_staff)) -> User:
    """Only Partner and Senior Associate can lead cases or reassign leads."""
    if current_user.rank not in ("partner", "seniorAssociate"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="notPermitted"
        )
    return current_user

def require_partner(current_user: User = Depends(require_staff)) -> User:
    """Only Partner can perform executive operations (invoicing, deleting drafts, financial summary)."""
    if current_user.rank != "partner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Partner rank required for this operation"
        )
    return current_user
