from typing import Optional
from fastapi import Depends, HTTPException, status, Header
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token", auto_error=False)

def get_current_user(
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
    
    # 1. First check Bearer token if provided
    if token:
        payload = decode_access_token(token)
        if payload:
            user_id: str = payload.get("sub")
            if user_id:
                user = db.query(User).filter(User.id == user_id).first()
                if user and user.status != "deactivated":
                    return user
                    
    # 2. Check internal server header (from Next.js Server Components)
    if x_viewer_staff_id:
        user = db.query(User).filter(User.id == x_viewer_staff_id).first()
        if user and user.status != "deactivated":
            return user

    # 3. Check client viewer header
    if x_viewer_client_id:
        user = db.query(User).filter(
            or_(User.id == x_viewer_client_id, User.client_id == x_viewer_client_id)
        ).first()
        if user and user.status != "deactivated":
            return user

    # Strict Security: If no valid token or authenticated header is provided, reject with 401
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
    if current_user.rank not in ["partner", "seniorAssociate"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Only partners and senior associates can lead matters"
        )
    return current_user

def require_partner(current_user: User = Depends(require_staff)) -> User:
    if current_user.rank != "partner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Only partners can perform this action"
        )
    return current_user

