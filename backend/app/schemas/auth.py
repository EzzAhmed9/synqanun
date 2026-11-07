from typing import Optional
from pydantic import BaseModel, EmailStr

class UserResponse(BaseModel):
    id: str
    email: str
    side: str
    name_en: str
    name_ar: str
    title_en: Optional[str] = None
    title_ar: Optional[str] = None
    phone: Optional[str] = None
    rank: Optional[str] = None
    status: str
    client_id: Optional[str] = None
    client_role: Optional[str] = None

    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Optional[UserResponse] = None
    must_change_password: bool = False

class PasswordResetRequest(BaseModel):
    email: str

class PasswordResetComplete(BaseModel):
    token: str
    password: str

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str
