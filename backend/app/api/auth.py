from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_reset_token,
    verify_reset_token,
)
from app.models.user import User
from app.schemas.auth import (
    Token,
    LoginRequest,
    UserResponse,
    PasswordResetRequest,
    PasswordResetComplete,
)
from app.core.permissions import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/token", response_model=Token)
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if user.status == "deactivated":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated"
        )
    
    access_token = create_access_token(
        data={"sub": user.id, "side": user.side, "rank": user.rank, "firm_id": user.firm_id}
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/login", response_model=Token)
def login_json(
    credentials: LoginRequest,
    db: Session = Depends(get_db)
):
    email_clean = credentials.email.strip().lower()
    user = db.query(User).filter(User.email.ilike(email_clean)).first()
    if not user:
        prefix = email_clean.split("@")[0]
        user = db.query(User).filter(User.email.ilike(f"{prefix}@%")).first()
    if not user:
        user = db.query(User).filter(User.id == email_clean).first()

    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if user.status == "deactivated":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated"
        )
    
    access_token = create_access_token(
        data={"sub": user.id, "side": user.side, "rank": user.rank, "firm_id": user.firm_id}
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/me", response_model=UserResponse)
def read_current_user(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/password-reset/request")
def request_password_reset(payload: PasswordResetRequest, db: Session = Depends(get_db)):
    clean_email = payload.email.strip().lower()
    user = db.query(User).filter(func.lower(User.email) == clean_email).first()
    
    # Always respond ok to avoid user enumeration
    token = None
    if user:
        token = create_reset_token(user.email, user.side)
    else:
        token = create_reset_token(clean_email, "staff")
        
    return {
        "ok": True,
        "message": "Password reset token generated",
        "token": token,
        "email": clean_email
    }

@router.get("/password-reset/verify/{token}")
def verify_reset(token: str, db: Session = Depends(get_db)):
    payload = verify_reset_token(token)
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
    token_payload = verify_reset_token(payload.token)
    if not token_payload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
    email = token_payload.get("sub")
    user = db.query(User).filter(func.lower(User.email) == email.lower()).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
        
    user.hashed_password = get_password_hash(payload.password)
    db.commit()
    db.refresh(user)
    
    return {
        "ok": True,
        "message": "Password updated successfully in PostgreSQL",
        "email": user.email
    }

