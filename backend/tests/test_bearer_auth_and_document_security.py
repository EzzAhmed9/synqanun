"""
Test Bearer Authentication, Document Security, File Upload Validation,
and Tamper-Proof Microsoft OAuth State / Tickets.
Zero database leaks: creates all test rows and tears them down cleanly.
"""
import os
import sys
import io
import zipfile
import uuid
from datetime import datetime, timezone, timedelta

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.core.config import settings
from app.core.database import get_db, Base, engine
from app.core.security import (
    create_access_token,
    create_reset_token,
    get_password_hash,
    create_oauth_ticket,
    create_oauth_state,
)
from app.models.firm import Firm
from app.models.user import User
from app.models.client import Client
from app.models.document import Document
from app.models.integration import Integration

client = TestClient(app)

def create_valid_docx_bytes() -> bytes:
    """Generate in-memory valid zip/docx bytes starting with PK\\x03\\x04."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", '<?xml version="1.0" encoding="UTF-8"?><Types></Types>')
        z.writestr("word/document.xml", '<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Security Test Doc</w:t></w:r></w:p></w:body></w:document>')
    return buf.getvalue()

def run_tests():
    db: Session = next(get_db())
    
    unique_suffix = uuid.uuid4().hex[:8]
    firm1_id = f"test-firm-1-{unique_suffix}"
    firm2_id = f"test-firm-2-{unique_suffix}"
    
    client1_id = f"test-cli-1-{unique_suffix}"
    
    staff1_id = f"test-stf-1-{unique_suffix}"
    staff2_id = f"test-stf-2-{unique_suffix}"
    client_user_id = f"test-usr-cli-{unique_suffix}"
    deactivated_staff_id = f"test-deact-stf-{unique_suffix}"
    
    doc_firm1_shared_id = f"test-doc-shared-{unique_suffix}"
    doc_firm1_firm_only_id = f"test-doc-firmonly-{unique_suffix}"
    doc_firm2_id = f"test-doc-firm2-{unique_suffix}"

    tmp_files = []

    try:
        print("[1/6] Seeding isolated test fixtures...")
        # 1. Firms
        firm1 = Firm(id=firm1_id, name_en=f"Firm 1 {unique_suffix}", name_ar="مكتب 1", domain=f"firm1-{unique_suffix}.com")
        firm2 = Firm(id=firm2_id, name_en=f"Firm 2 {unique_suffix}", name_ar="مكتب 2", domain=f"firm2-{unique_suffix}.com")
        db.add_all([firm1, firm2])
        db.commit()

        # 2. Client
        cli1 = Client(
            id=client1_id,
            firm_id=firm1_id,
            name_en="Client Corp 1",
            name_ar="شركة العميل 1",
            standing="active",
        )
        db.add(cli1)
        db.commit()

        # 3. Users
        pwd_hash = get_password_hash("SecretPass123!")
        
        # Staff in firm 1
        staff1 = User(
            id=staff1_id,
            firm_id=firm1_id,
            email=f"staff1_{unique_suffix}@example.com",
            hashed_password=pwd_hash,
            side="staff",
            name_en="Staff One",
            name_ar="موظف واحد",
            rank="partner",
            status="active",
        )
        # Staff in firm 2
        staff2 = User(
            id=staff2_id,
            firm_id=firm2_id,
            email=f"staff2_{unique_suffix}@example.com",
            hashed_password=pwd_hash,
            side="staff",
            name_en="Staff Two",
            name_ar="موظف اثنين",
            rank="partner",
            status="active",
        )
        # Client user in firm 1
        client_user = User(
            id=client_user_id,
            firm_id=firm1_id,
            client_id=client1_id,
            email=f"client1_{unique_suffix}@example.com",
            hashed_password=pwd_hash,
            side="client",
            name_en="Client Portal User",
            name_ar="مستخدم العميل",
            status="active",
        )
        # Deactivated staff user
        deactivated_staff = User(
            id=deactivated_staff_id,
            firm_id=firm1_id,
            email=f"deact_{unique_suffix}@example.com",
            hashed_password=pwd_hash,
            side="staff",
            name_en="Deactivated Staff",
            name_ar="موظف موقوف",
            rank="juniorAssociate",
            status="deactivated",
        )
        db.add_all([staff1, staff2, client_user, deactivated_staff])
        db.commit()

        # 4. Dummy files on disk for Document testing
        docx_bytes = create_valid_docx_bytes()
        
        file1_path = os.path.abspath(f"test_doc_shared_{unique_suffix}.docx")
        file2_path = os.path.abspath(f"test_doc_firmonly_{unique_suffix}.docx")
        file3_path = os.path.abspath(f"test_doc_firm2_{unique_suffix}.docx")
        tmp_files.extend([file1_path, file2_path, file3_path])

        with open(file1_path, "wb") as f:
            f.write(docx_bytes)
        with open(file2_path, "wb") as f:
            f.write(docx_bytes)
        with open(file3_path, "wb") as f:
            f.write(docx_bytes)

        # 5. Documents
        doc_shared = Document(
            id=doc_firm1_shared_id,
            firm_id=firm1_id,
            client_id=client1_id,
            name="shared_doc.docx",
            title="Shared Document",
            kind="docx",
            file_path=file1_path,
            size_bytes=len(docx_bytes),
            is_firm_only=False,
        )
        doc_firm_only = Document(
            id=doc_firm1_firm_only_id,
            firm_id=firm1_id,
            client_id=client1_id,
            name="firm_only_doc.docx",
            title="Firm Only Document",
            kind="docx",
            file_path=file2_path,
            size_bytes=len(docx_bytes),
            is_firm_only=True,
        )
        doc_firm2 = Document(
            id=doc_firm2_id,
            firm_id=firm2_id,
            name="firm2_doc.docx",
            title="Firm 2 Document",
            kind="docx",
            file_path=file3_path,
            size_bytes=len(docx_bytes),
            is_firm_only=False,
        )
        db.add_all([doc_shared, doc_firm_only, doc_firm2])
        db.commit()

        print("[2/6] Testing Bearer Authentication & Viewer Headers gating...")
        # A. Request with only X-Viewer-Staff-Id must return 401 when ALLOW_VIEWER_HEADERS=False
        assert settings.ALLOW_VIEWER_HEADERS is False, "ALLOW_VIEWER_HEADERS must default to False"
        res_viewer = client.get("/api/auth/me", headers={"X-Viewer-Staff-Id": staff1_id})
        assert res_viewer.status_code == 401, f"Expected 401 for header-only auth, got {res_viewer.status_code}"

        # B. Reset token as Bearer must return 401
        reset_token = create_reset_token(staff1.email)
        res_reset_bearer = client.get("/api/auth/me", headers={"Authorization": f"Bearer {reset_token}"})
        assert res_reset_bearer.status_code == 401, f"Expected 401 for reset token used as bearer, got {res_reset_bearer.status_code}"

        # C. Deactivated user Bearer token must return 401
        deact_token = create_access_token({"sub": deactivated_staff_id, "side": "staff", "rank": "juniorAssociate", "firm_id": firm1_id})
        res_deact = client.get("/api/auth/me", headers={"Authorization": f"Bearer {deact_token}"})
        assert res_deact.status_code == 401, f"Expected 401 for deactivated user, got {res_deact.status_code}"

        # D. Valid Bearer token must succeed (200)
        staff1_token = create_access_token({"sub": staff1_id, "side": "staff", "rank": "partner", "firm_id": firm1_id})
        res_valid = client.get("/api/auth/me", headers={"Authorization": f"Bearer {staff1_token}"})
        assert res_valid.status_code == 200, f"Expected 200 for valid staff token, got {res_valid.status_code}"
        assert res_valid.json()["id"] == staff1_id

        client_token = create_access_token({"sub": client_user_id, "side": "client", "client_id": client1_id, "firm_id": firm1_id})
        res_cli_valid = client.get("/api/auth/me", headers={"Authorization": f"Bearer {client_token}"})
        assert res_cli_valid.status_code == 200, f"Expected 200 for valid client token, got {res_cli_valid.status_code}"

        staff2_token = create_access_token({"sub": staff2_id, "side": "staff", "rank": "partner", "firm_id": firm2_id})

        print("[3/6] Testing Document Access Permissions (preview & download)...")
        # E. Unauthenticated download and preview must return 401
        res_unauth_dl = client.get(f"/api/documents/{doc_firm1_shared_id}/download")
        assert res_unauth_dl.status_code == 401, f"Expected 401 for unauth download, got {res_unauth_dl.status_code}"
        res_unauth_pv = client.get(f"/api/documents/{doc_firm1_shared_id}/preview")
        assert res_unauth_pv.status_code == 401, f"Expected 401 for unauth preview, got {res_unauth_pv.status_code}"

        # F. User from Firm 2 accessing Firm 1 document must return 404 (not 403)
        res_firm2_dl = client.get(f"/api/documents/{doc_firm1_shared_id}/download", headers={"Authorization": f"Bearer {staff2_token}"})
        assert res_firm2_dl.status_code == 404, f"Expected 404 for cross-firm doc download, got {res_firm2_dl.status_code}"
        res_firm2_pv = client.get(f"/api/documents/{doc_firm1_shared_id}/preview", headers={"Authorization": f"Bearer {staff2_token}"})
        assert res_firm2_pv.status_code == 404, f"Expected 404 for cross-firm doc preview, got {res_firm2_pv.status_code}"

        # G. Client accessing firm-only document must return 404
        res_cli_firmonly_dl = client.get(f"/api/documents/{doc_firm1_firm_only_id}/download", headers={"Authorization": f"Bearer {client_token}"})
        assert res_cli_firmonly_dl.status_code == 404, f"Expected 404 for client accessing firm-only doc download, got {res_cli_firmonly_dl.status_code}"
        res_cli_firmonly_pv = client.get(f"/api/documents/{doc_firm1_firm_only_id}/preview", headers={"Authorization": f"Bearer {client_token}"})
        assert res_cli_firmonly_pv.status_code == 404, f"Expected 404 for client accessing firm-only doc preview, got {res_cli_firmonly_pv.status_code}"

        # H. Client accessing their shared document must return 200 with proper headers
        res_cli_shared_dl = client.get(f"/api/documents/{doc_firm1_shared_id}/download", headers={"Authorization": f"Bearer {client_token}"})
        assert res_cli_shared_dl.status_code == 200, f"Expected 200 for client shared doc download, got {res_cli_shared_dl.status_code}"
        assert "attachment;" in res_cli_shared_dl.headers.get("content-disposition", "")
        res_cli_shared_pv = client.get(f"/api/documents/{doc_firm1_shared_id}/preview", headers={"Authorization": f"Bearer {client_token}"})
        assert res_cli_shared_pv.status_code == 200, f"Expected 200 for client shared doc preview, got {res_cli_shared_pv.status_code}"
        assert res_cli_shared_pv.json()["id"] == doc_firm1_shared_id

        # I. Staff accessing their firm's firm-only document must return 200
        res_staff_firmonly_dl = client.get(f"/api/documents/{doc_firm1_firm_only_id}/download", headers={"Authorization": f"Bearer {staff1_token}"})
        assert res_staff_firmonly_dl.status_code == 200, f"Expected 200 for staff firm-only download, got {res_staff_firmonly_dl.status_code}"

        print("[4/6] Testing Upload Security (magic bytes, kind extension, max size)...")
        # J. Fake .docx (plain text content) -> 400
        fake_docx = ("fake.docx", b"Hello, this is just plain text masquerading as docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
        res_fake_upload = client.post(
            f"/api/staff/integrations/documents/{doc_firm1_shared_id}/upload-updated-docx",
            files={"file": fake_docx},
            headers={"Authorization": f"Bearer {staff1_token}"}
        )
        assert res_fake_upload.status_code == 400, f"Expected 400 for fake docx magic bytes, got {res_fake_upload.status_code}"
        assert "غير صالح أو تالف" in res_fake_upload.text or "invalid" in res_fake_upload.text.lower()

        # K. Wrong extension -> 400
        wrong_ext = ("document.exe", b"PK\x03\x04fakepkcontent", "application/octet-stream")
        res_wrong_ext = client.post(
            f"/api/staff/integrations/documents/{doc_firm1_shared_id}/upload-updated-docx",
            files={"file": wrong_ext},
            headers={"Authorization": f"Bearer {staff1_token}"}
        )
        assert res_wrong_ext.status_code == 400, f"Expected 400 for wrong extension, got {res_wrong_ext.status_code}"

        # L. Oversized file (> MAX_UPLOAD_SIZE_MB) -> 400
        oversized_data = b"PK\x03\x04" + (b"0" * (11 * 1024 * 1024))
        oversized_file = ("big.docx", oversized_data, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
        res_oversized = client.post(
            f"/api/staff/integrations/documents/{doc_firm1_shared_id}/upload-updated-docx",
            files={"file": oversized_file},
            headers={"Authorization": f"Bearer {staff1_token}"}
        )
        assert res_oversized.status_code == 400, f"Expected 400 for oversized upload, got {res_oversized.status_code}"
        assert "يتجاوز الحد الأقصى" in res_oversized.text or "exceeds" in res_oversized.text.lower()

        # M. Valid .docx upload with real ZIP magic bytes -> 200
        valid_upload_file = ("updated.docx", docx_bytes, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
        res_valid_upload = client.post(
            f"/api/staff/integrations/documents/{doc_firm1_shared_id}/upload-updated-docx",
            files={"file": valid_upload_file},
            headers={"Authorization": f"Bearer {staff1_token}"}
        )
        assert res_valid_upload.status_code == 200, f"Expected 200 for valid docx upload, got {res_valid_upload.status_code}"
        assert res_valid_upload.json()["success"] is True

        print("[5/6] Testing Microsoft OAuth Ticket & Signed State Security...")
        # N. Unauthenticated call to /microsoft/ticket -> 401
        res_ticket_unauth = client.post("/api/staff/integrations/microsoft/ticket")
        assert res_ticket_unauth.status_code == 401, f"Expected 401 for unauth ticket, got {res_ticket_unauth.status_code}"

        # O. Client user requesting staff ticket -> 403
        res_ticket_cli = client.post("/api/staff/integrations/microsoft/ticket", headers={"Authorization": f"Bearer {client_token}"})
        assert res_ticket_cli.status_code == 403, f"Expected 403 for client asking for staff ticket, got {res_ticket_cli.status_code}"

        # P. Staff user requesting ticket -> 200 with ticket
        res_ticket_staff = client.post("/api/staff/integrations/microsoft/ticket", headers={"Authorization": f"Bearer {staff1_token}"})
        assert res_ticket_staff.status_code == 200, f"Expected 200 for staff ticket, got {res_ticket_staff.status_code}"
        ticket_val = res_ticket_staff.json()["ticket"]

        # Q. Start Microsoft login without ticket -> 400
        res_no_ticket = client.get("/api/staff/integrations/microsoft/login", follow_redirects=False)
        assert res_no_ticket.status_code == 400, f"Expected 400 without ticket, got {res_no_ticket.status_code}"

        # R. Start Microsoft login with invalid/tampered ticket -> 400
        res_bad_ticket = client.get("/api/staff/integrations/microsoft/login?ticket=invalid-ticket-123", follow_redirects=False)
        assert res_bad_ticket.status_code == 400, f"Expected 400 with bad ticket, got {res_bad_ticket.status_code}"

        # S. Start Microsoft login with valid ticket -> redirects with signed state JWT
        res_login_redirect = client.get(f"/api/staff/integrations/microsoft/login?ticket={ticket_val}&return_to=/ar/staff", follow_redirects=False)
        assert res_login_redirect.status_code in (302, 307), f"Expected redirect, got {res_login_redirect.status_code}"
        redirect_loc = res_login_redirect.headers.get("location", "")
        # Either redirects to Microsoft or returns ms_error if no real azure client id
        assert "login.microsoftonline.com" in redirect_loc or "ms_error" in redirect_loc

        # T. Callback with tampered or plain string state -> error redirect
        res_tampered_state = client.get("/api/staff/integrations/microsoft/callback?code=mock_code&state=stf-001::/ar/staff", follow_redirects=False)
        assert res_tampered_state.status_code in (302, 307)
        assert "ms_error=" in res_tampered_state.headers.get("location", "")

        # U. Callback with completely missing state -> error redirect
        res_missing_state = client.get("/api/staff/integrations/microsoft/callback?code=mock_code", follow_redirects=False)
        assert res_missing_state.status_code in (302, 307)
        assert "ms_error=" in res_missing_state.headers.get("location", "")

        print("[6/6] All security assertion tests PASSED perfectly!")

    finally:
        print("Cleaning up database fixtures and temporary files...")
        try:
            db.rollback()
        except Exception:
            pass
        for p in tmp_files:
            if os.path.exists(p):
                try:
                    os.remove(p)
                except Exception:
                    pass

        # Cleanup DB
        db.query(Document).filter(Document.id.in_([doc_firm1_shared_id, doc_firm1_firm_only_id, doc_firm2_id])).delete(synchronize_session=False)
        db.query(User).filter(User.id.in_([staff1_id, staff2_id, client_user_id, deactivated_staff_id])).delete(synchronize_session=False)
        db.query(Client).filter(Client.id == client1_id).delete(synchronize_session=False)
        db.query(Firm).filter(Firm.id.in_([firm1_id, firm2_id])).delete(synchronize_session=False)
        db.commit()
        db.close()
        print("Cleanup completed. Zero database leaks!")

if __name__ == "__main__":
    run_tests()
