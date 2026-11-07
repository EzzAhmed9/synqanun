import uuid
import secrets
import string
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from app.core.database import get_db
from app.core.permissions import get_current_user, require_staff, require_partner, require_lead_eligible
from app.core.security import get_password_hash
from app.models.user import User
from app.models.firm import Firm
from app.models.matter import Matter, MatterTeamMember, MatterTimelineEvent

router = APIRouter(prefix="/staff/users", tags=["Users & Team Management"])


# ==============================================================================
# SCHEMAS
# ==============================================================================

class AddTeamMemberPayload(BaseModel):
    name: str
    name_ar: Optional[str] = None
    name_en: Optional[str] = None
    email: str
    rank: str  # 'partner' | 'seniorAssociate' | 'juniorAssociate' | 'paralegal' | 'legalSecretary'
    phone: Optional[str] = None
    password: Optional[str] = None

class SetAccessPayload(BaseModel):
    grant: bool


# ==============================================================================
# ENDPOINTS
# ==============================================================================

@router.get("", response_model=dict)
def list_team_members(
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    """
    List all staff members of the firm with their active matters,
    access status, and roster information from PostgreSQL.
    """
    staff_members = db.query(User).filter(
        User.firm_id == current_user.firm_id,
        User.side == "staff"
    ).order_by(User.created_at.asc()).all()

    members_data = []
    for u in staff_members:
        # Calculate active matters and practice areas for this lawyer
        lead_matters = db.query(Matter).filter(
            Matter.lead_counsel_id == u.id,
            Matter.is_closed == False
        ).all()
        
        team_matter_ids = [
            tm.matter_id for tm in db.query(MatterTeamMember).filter(MatterTeamMember.staff_id == u.id).all()
        ]
        supporting_matters = db.query(Matter).filter(
            Matter.id.in_(team_matter_ids),
            Matter.is_closed == False
        ).all() if team_matter_ids else []

        all_active_matters = list({m.id: m for m in (lead_matters + supporting_matters)}.values())
        engagements_count = len(all_active_matters)
        
        # Unique practice areas
        practice_areas = list({
            m.matter_type_ar for m in all_active_matters if m.matter_type_ar
        })

        has_access = (u.status != "deactivated")

        members_data.append({
            "id": u.id,
            "name": {"en": u.name_en or u.name_ar, "ar": u.name_ar or u.name_en},
            "email": u.email,
            "rank": u.rank or "juniorAssociate",
            "status": u.status,
            "hasAccess": has_access,
            "isSelf": (u.id == current_user.id),
            "phone": u.phone or "",
            "joinedDaysAgo": u.joined_days_ago or 0,
            "engagementsCount": engagements_count,
            "practiceAreas": practice_areas,
            "changedThisSession": False
        })

    return {
        "members": members_data,
        "total": len(members_data)
    }


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
def add_team_member(
    payload: AddTeamMemberPayload,
    current_user: User = Depends(require_partner),
    db: Session = Depends(get_db)
):
    """
    Add a new colleague to the firm's roster in PostgreSQL with a secure temporary password.
    Only partners can add new team members.
    """
    clean_name = payload.name.strip()
    clean_email = payload.email.strip().lower()

    if not clean_name:
        raise HTTPException(status_code=400, detail="Name is required")
    if not clean_email or "@" not in clean_email:
        raise HTTPException(status_code=400, detail="A valid email is required")

    # Check for existing email in PostgreSQL
    existing_user = db.query(User).filter(func.lower(User.email) == clean_email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="That email is already registered")

    valid_ranks = ["partner", "seniorAssociate", "juniorAssociate", "paralegal", "legalSecretary"]
    if payload.rank not in valid_ranks:
        raise HTTPException(status_code=400, detail="Invalid legal rank")

    # Generate sequential or UUID staff ID
    staff_count = db.query(User).filter(User.side == "staff").count()
    new_staff_id = f"stf-{staff_count + 1:03d}"
    
    # Check if ID collision, fallback to uuid
    if db.query(User).filter(User.id == new_staff_id).first():
        new_staff_id = f"stf-{uuid.uuid4().hex[:6]}"

    name_ar = payload.name_ar or clean_name
    name_en = payload.name_en or clean_name

    # Cryptographically secure random password if none specified
    if payload.password and len(payload.password.strip()) >= 8:
        temp_password = payload.password.strip()
    else:
        # 14 chars with mixed alpha, digits, and safe symbols
        charset = string.ascii_letters + string.digits + "!@#$%^&*"
        temp_password = "".join(secrets.choice(charset) for _ in range(14))

    new_user = User(
        id=new_staff_id,
        firm_id=current_user.firm_id,
        email=clean_email,
        hashed_password=get_password_hash(temp_password),
        side="staff",
        name_en=name_en,
        name_ar=name_ar,
        rank=payload.rank,
        status="temporaryPasswordIssued",
        joined_days_ago=0,
        phone=payload.phone
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "ok": True,
        "id": new_user.id,
        "name": {"en": new_user.name_en, "ar": new_user.name_ar},
        "email": new_user.email,
        "rank": new_user.rank,
        "status": new_user.status,
        "temporary_password": temp_password,
        "message": "تم إضافة العضو بنجاح وتوليد كلمة مرور مؤقتة آمنة"
    }


@router.post("/{user_id}/access", response_model=dict)
def set_team_access(
    user_id: str,
    payload: SetAccessPayload,
    current_user: User = Depends(require_partner),
    db: Session = Depends(get_db)
):
    """
    Revoke or restore access for a staff member in PostgreSQL.
    Setting grant=False changes status to 'deactivated', immediately revoking access.
    Setting grant=True restores status to 'active'.
    Only partners can change access permissions. A user cannot deactivate themselves.
    """
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot revoke your own workspace access")

    target_user = db.query(User).filter(
        User.id == user_id,
        User.firm_id == current_user.firm_id
    ).first()

    if not target_user:
        raise HTTPException(status_code=404, detail="Colleague not found")

    new_status = "active" if payload.grant else "deactivated"
    target_user.status = new_status
    db.commit()
    db.refresh(target_user)

    action_label = "تم إعادة تفعيل الصلاحية بنجاح" if payload.grant else "تم إلغاء الصلاحية وحظر الحساب بنجاح"

    return {
        "ok": True,
        "userId": target_user.id,
        "status": target_user.status,
        "hasAccess": (target_user.status != "deactivated"),
        "message": action_label
    }
