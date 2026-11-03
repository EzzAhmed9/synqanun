import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional
import bcrypt
from jose import jwt, JWTError
from app.core.config import settings

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8")
        )
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "typ": "access"})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        # Reject reset tokens or non-access tokens
        typ = payload.get("typ")
        token_type = payload.get("type")
        if typ == "reset" or token_type == "reset":
            return None
        if typ is not None and typ != "access":
            return None
        return payload
    except JWTError:
        return None

def create_reset_token(email: str, side: str = "staff") -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode = {"sub": email, "side": side, "type": "reset", "typ": "reset", "exp": expire}
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def verify_reset_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("type") != "reset" and payload.get("typ") != "reset":
            return None
        return payload
    except JWTError:
        return None

def create_oauth_ticket(staff_id: str, firm_id: str) -> str:
    """Generate a short-lived (5 min) signed ticket for browser-initiated Microsoft OAuth login."""
    expire = datetime.now(timezone.utc) + timedelta(minutes=5)
    to_encode = {"sub": staff_id, "firm_id": firm_id, "typ": "ms_login_ticket", "exp": expire}
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def verify_oauth_ticket(ticket: str) -> Optional[dict]:
    """Verify signed Microsoft login ticket."""
    try:
        payload = jwt.decode(ticket, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("typ") != "ms_login_ticket":
            return None
        return payload
    except JWTError:
        return None

def create_oauth_state(staff_id: str, firm_id: str, return_to: str) -> str:
    """Generate a tamper-proof signed JWT for OAuth state parameter (10 min expiry)."""
    expire = datetime.now(timezone.utc) + timedelta(minutes=10)
    to_encode = {
        "sub": staff_id,
        "firm_id": firm_id,
        "nonce": uuid.uuid4().hex,
        "return_to": return_to,
        "typ": "oauth_state",
        "exp": expire,
    }
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def verify_oauth_state(state: str) -> Optional[dict]:
    """Verify and decode signed OAuth state JWT."""
    try:
        payload = jwt.decode(state, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("typ") != "oauth_state":
            return None
        return payload
    except JWTError:
        return None
