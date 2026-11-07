from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.config import settings
from app.core.database import get_db
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_reset_token,
    verify_reset_token,
    decode_access_token,
    revoke_token,
)
from app.core.ratelimit import check_rate_limit, record_failure, record_success
from app.models.user import User
from app.schemas.auth import (
    Token,
    LoginRequest,
    UserResponse,
    PasswordResetRequest,
    PasswordResetComplete,
    ChangePasswordRequest,
)
from app.core.permissions import get_current_user, oauth2_scheme

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/token", response_model=Token)
def login_for_access_token(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    clean_user = form_data.username.strip().lower()
    check_rate_limit(request, clean_user)

    user = db.query(User).filter(func.lower(User.email) == clean_user).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        record_failure(request, clean_user)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if user.status == "deactivated":
        record_failure(request, clean_user)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated"
        )
    
    record_success(request, clean_user)
    must_change = (user.status == "temporaryPasswordIssued")
    access_token = create_access_token(
        data={
            "sub": user.id,
            "side": user.side,
            "rank": user.rank,
            "firm_id": user.firm_id,
            "must_change_password": must_change,
        }
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "must_change_password": must_change,
    }

@router.post("/login", response_model=Token)
def login_json(
    request: Request,
    credentials: LoginRequest,
    db: Session = Depends(get_db)
):
    email_clean = credentials.email.strip().lower()
    check_rate_limit(request, email_clean)

    user = db.query(User).filter(func.lower(User.email) == email_clean).first()

    if not user or not verify_password(credentials.password, user.hashed_password):
        record_failure(request, email_clean)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if user.status == "deactivated":
        record_failure(request, email_clean)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated"
        )
    
    record_success(request, email_clean)
    must_change = (user.status == "temporaryPasswordIssued")
    access_token = create_access_token(
        data={
            "sub": user.id,
            "side": user.side,
            "rank": user.rank,
            "firm_id": user.firm_id,
            "must_change_password": must_change,
        }
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user,
        "must_change_password": must_change,
    }

@router.get("/me", response_model=UserResponse)
def read_current_user(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/logout")
def logout_user(
    request: Request,
    token: Optional[str] = Depends(oauth2_scheme),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Revoke the current access token on the backend server, invalidating it completely.
    """
    active_token = token or request.cookies.get("syn-auth-token")
    if active_token:
        payload = decode_access_token(active_token)
        jti = payload.get("jti") if payload else None
        exp = payload.get("exp") if payload else None
        expires_at = datetime.fromtimestamp(exp, tz=timezone.utc) if exp else None
        revoke_token(token=active_token, jti=jti, token_type="access", expires_at=expires_at, db=db)

    return {"ok": True, "message": "Logged out successfully and token revoked"}

@router.post("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Change user password with current password verification.
    If the user was in 'temporaryPasswordIssued' status, automatically activates them.
    """
    if not verify_password(payload.old_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="كلمة المرور الحالية غير صحيحة"
        )
    if len(payload.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="كلمة المرور الجديدة يجب أن تحتوي على 8 خانات على الأقل"
        )

    current_user.hashed_password = get_password_hash(payload.new_password)
    if current_user.status == "temporaryPasswordIssued":
        current_user.status = "active"

    db.commit()
    db.refresh(current_user)

    return {
        "ok": True,
        "message": "تم تحديث كلمة المرور وتفعيل الحساب بنجاح",
        "email": current_user.email,
        "status": current_user.status
    }

@router.post("/password-reset/request")
def request_password_reset(
    request: Request,
    payload: PasswordResetRequest,
    db: Session = Depends(get_db)
):
    clean_email = payload.email.strip().lower()
    check_rate_limit(request, clean_email)

    user = db.query(User).filter(func.lower(User.email) == clean_email).first()
    
    token = None
    if user:
        record_success(request, clean_email)
        token = create_reset_token(user.email, user.side)
        if settings.DEV_PRINT_RESET_TOKEN and settings.ENVIRONMENT.lower() != "production":
            print(f"[DEV] Password reset token for {user.email}: {token}", flush=True)
    else:
        record_failure(request, clean_email)

    # Always respond with the SAME generic message to prevent user enumeration
    response_data = {
        "ok": True,
        "message": "If this email is registered, a password reset link has been sent."
    }

    # Backward compatibility for local dev flow only when explicitly enabled
    if settings.DEV_RETURN_RESET_TOKEN and settings.ENVIRONMENT.lower() != "production":
        if not token:
            token = create_reset_token(clean_email, "staff")
        response_data["token"] = token
        response_data["email"] = clean_email

    return response_data

@router.get("/password-reset/verify/{token}")
def verify_reset(token: str, db: Session = Depends(get_db)):
    payload = verify_reset_token(token, db=db)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
    email = payload.get("sub")
    user = db.query(User).filter(func.lower(User.email) == email.lower()).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found"
        )
    return {
        "ok": True,
        "email": user.email,
        "side": user.side,
        "name": user.name_ar,
        "rank": user.rank
    }

@router.post("/password-reset/complete")
def complete_password_reset(payload: PasswordResetComplete, db: Session = Depends(get_db)):
    token_payload = verify_reset_token(payload.token, db=db)
    if not token_payload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid, expired, or already-used reset token"
        )
    email = token_payload.get("sub")
    user = db.query(User).filter(func.lower(User.email) == email.lower()).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
        
    user.hashed_password = get_password_hash(payload.password)
    if user.status == "temporaryPasswordIssued":
        user.status = "active"

    # Immediately revoke the reset token so it can NEVER be reused (Single-Use Token)
    jti = token_payload.get("jti")
    exp = token_payload.get("exp")
    expires_at = datetime.fromtimestamp(exp, tz=timezone.utc) if exp else None
    revoke_token(token=payload.token, jti=jti, token_type="reset", expires_at=expires_at, db=db)

    db.commit()
    db.refresh(user)
    
    return {
        "ok": True,
        "message": "Password updated successfully in PostgreSQL",
        "email": user.email
    }
