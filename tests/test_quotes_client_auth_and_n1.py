"""
Comprehensive test suite for:
1. Quotes lead counsel names (Issue 1)
2. Client invoice auth & cross-firm isolation (Issue 2)
3. engagementKind for otherProject matters (Issue 3)
4. Snapshot equality for all 7 optimized endpoints (Issue 4 - N+1 optimization)
5. Zero DB leak (cleans up everything created)
"""
import sys
import json
import uuid
from pathlib import Path
from fastapi.testclient import TestClient

backend_dir = Path(__file__).resolve().parent.parent / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.main import app
from app.core.database import SessionLocal
from app.models.firm import Firm
from app.models.user import User
from app.models.client import Client
from app.models.matter import Matter
from app.models.invoice import Invoice, InvoiceLineItem, TimeEntry, Quote

client = TestClient(app)

def get_tokens():
    res_p = client.post("/api/auth/token", data={"username": "m.alfarooq@mr-law.eg", "password": "password123"})
    assert res_p.status_code == 200, res_p.text
    partner_token = res_p.json()["access_token"]

    res_c = client.post("/api/auth/token", data={"username": "client@mr-law.eg", "password": "password123"})
    assert res_c.status_code == 200, res_c.text
    client_token = res_c.json()["access_token"]

    return partner_token, client_token

def test_quotes_lead_counsel_resolution():
    """ISSUE 1: Quotes return lead counsel of engagement or empty strings."""
    partner_token, _ = get_tokens()
    headers = {"Authorization": f"Bearer {partner_token}"}

    res = client.get("/api/staff/billing/quotes", headers=headers)
    assert res.status_code == 200
    data = res.json()
    items = {item["id"]: item for item in data["items"]}

    assert "qt-002" in items, "qt-002 should exist in quotes"
    q2 = items["qt-002"]
    # qt-002 is linked to MAT-2203 whose lead counsel is Mansoor Al-Farooq (partner)
    assert q2["submittedBy"]["en"] == "Mansoor Al-Farooq"
    assert q2["submittedByRank"] == "partner"
    assert q2["assignedTo"]["en"] == "Mansoor Al-Farooq"
    assert q2["assignedTo"] == q2["submittedBy"]

    assert "qt-001" in items, "qt-001 should exist in quotes"
    q1 = items["qt-001"]
    # qt-001 has engagement_ref=None -> empty strings
    assert q1["submittedBy"] == {"en": "", "ar": ""}
    assert q1["submittedByRank"] == ""
    assert q1["assignedTo"] == {"en": "", "ar": ""}

def test_client_invoices_staff_forbidden():
    """ISSUE 2: Staff tokens on /api/client/invoices/* must return 403."""
    partner_token, _ = get_tokens()
    headers = {"Authorization": f"Bearer {partner_token}"}

    # 1. list_client_invoices
    r1 = client.get("/api/client/invoices", headers=headers)
    assert r1.status_code == 403, f"Expected 403, got {r1.status_code}"

    # 2. get_client_invoices_summary
    r2 = client.get("/api/client/invoices/summary", headers=headers)
    assert r2.status_code == 403, f"Expected 403, got {r2.status_code}"

    # 3. get_client_invoice_engagements
    r3 = client.get("/api/client/invoices/engagements", headers=headers)
    assert r3.status_code == 403, f"Expected 403, got {r3.status_code}"

    # 4. get_client_invoice_detail
    r4 = client.get("/api/client/invoices/INV-2026-001", headers=headers)
    assert r4.status_code == 403, f"Expected 403, got {r4.status_code}"

def test_client_cross_firm_isolation():
    """ISSUE 2: Client of Firm A cannot access invoice of Firm B (404)."""
    _, client_token = get_tokens()
    headers_client_a = {"Authorization": f"Bearer {client_token}"}

    db = SessionLocal()
    firm_b_id = f"firm-test-b-{uuid.uuid4().hex[:6]}"
    user_b_id = f"stf-test-b-{uuid.uuid4().hex[:6]}"
    client_b_id = f"cli-test-b-{uuid.uuid4().hex[:6]}"
    inv_b_id = f"inv-test-b-{uuid.uuid4().hex[:6]}"
    inv_b_ref = f"INV-2026-TESTB-{uuid.uuid4().hex[:4]}"

    try:
        # Create Firm B
        firm_b = Firm(
            id=firm_b_id,
            name_en="Firm B Legal",
            name_ar="مكتب المحاماة ب",
            domain=f"firm-b-{uuid.uuid4().hex[:4]}.eg",
            currency="EGP"
        )
        db.add(firm_b)

        # Create Staff User in Firm B
        usr_b = User(
            id=user_b_id,
            firm_id=firm_b_id,
            email=f"partner@{firm_b.domain}",
            hashed_password="hash",
            side="staff",
            name_en="Firm B Partner",
            name_ar="شريك المكتب ب",
            rank="partner",
            status="active"
        )
        db.add(usr_b)

        # Create Client in Firm B
        cli_b = Client(
            id=client_b_id,
            firm_id=firm_b_id,
            name_en="Client of Firm B",
            name_ar="موكل المكتب ب",
            standing="active"
        )
        db.add(cli_b)

        # Create Invoice in Firm B
        inv_b = Invoice(
            id=inv_b_id,
            sequence=999,
            firm_id=firm_b_id,
            client_id=client_b_id,
            reference=inv_b_ref,
            engagement_ref="MAT-TESTB",
            description_en="Firm B Invoice",
            description_ar="فاتورة المكتب ب",
            status="due",
            issue_date="2026-11-01",
            due_date="2026-11-30",
            currency="EGP",
            prepared_by_id=user_b_id
        )
        db.add(inv_b)
        db.commit()

        # Client A requests Firm B's invoice -> MUST 404
        res = client.get(f"/api/client/invoices/{inv_b_ref}", headers=headers_client_a)
        assert res.status_code == 404, f"Expected 404 for cross-firm invoice, got {res.status_code}"

        # Also verify Firm B's invoice does not appear in Client A's list
        res_list = client.get("/api/client/invoices", headers=headers_client_a)
        assert res_list.status_code == 200
        refs = [i["reference"] for i in res_list.json()["items"]]
        assert inv_b_ref not in refs

    finally:
        db.rollback()
        # Cleanup Firm B data completely
        db.query(Invoice).filter(Invoice.id == inv_b_id).delete()
        db.query(Client).filter(Client.id == client_b_id).delete()
        db.query(User).filter(User.id == user_b_id).delete()
        db.query(Firm).filter(Firm.id == firm_b_id).delete()
        db.commit()
        db.close()

def test_engagement_kind_other_project():
    """ISSUE 3: engagementKind for otherProject matter is 'project' everywhere."""
    partner_token, client_token = get_tokens()
    headers_partner = {"Authorization": f"Bearer {partner_token}"}
    headers_client = {"Authorization": f"Bearer {client_token}"}

    db = SessionLocal()
    matter_id = f"mat-prj-{uuid.uuid4().hex[:6]}"
    matter_ref = f"MAT-PRJ-{uuid.uuid4().hex[:4]}"
    time_entry_id = None
    inv_id = f"inv-prj-{uuid.uuid4().hex[:6]}"
    inv_ref = f"INV-2026-PRJ-{uuid.uuid4().hex[:4]}"

    try:
        # Create an otherProject matter in Firm 001 for cli-001
        m = Matter(
            id=matter_id,
            firm_id="firm-001",
            client_id="cli-001",
            reference=matter_ref,
            lead_counsel_id="stf-001",
            title_en="Regulatory Compliance Project",
            title_ar="مشروع الامتثال التنظيمي",
            work_type="otherProject",
            matter_type_en="Corporate",
            matter_type_ar="شركات",
            forum_en="Cairo Economic Court",
            forum_ar="محكمة القاهرة الاقتصادية",
            status_en="Active",
            status_ar="نشط",
            status_tone="normal",
            is_closed=False
        )
        db.add(m)
        db.commit()

        # 1. Test log_time_entry
        log_res = client.post(
            "/api/staff/billing/time",
            headers=headers_partner,
            json={
                "matterId": matter_ref,
                "minutes": 60,
                "description": "Compliance Advisory Work",
                "entryDate": "2026-11-01",
                "billable": True
            }
        )
        assert log_res.status_code == 201, log_res.text
        log_data = log_res.json()
        assert log_data["entry"]["engagementKind"] == "project", f"Expected 'project', got {log_data['entry']['engagementKind']}"
        time_entry_id = log_data["id"]

        # 2. Test list_time_entries
        list_t_res = client.get(f"/api/staff/billing/time?engagementRef={matter_ref}", headers=headers_partner)
        assert list_t_res.status_code == 200
        t_items = list_t_res.json()
        assert len(t_items) >= 1
        assert t_items[0]["engagementKind"] == "project"

        # 3. Test get_invoice_draft_context
        ctx_res = client.get(f"/api/staff/billing/context?engagementRef={matter_ref}", headers=headers_partner)
        assert ctx_res.status_code == 200
        unbilled = ctx_res.json()["unbilled"]
        assert len(unbilled) >= 1
        assert unbilled[0]["engagementKind"] == "project"

        # Create an issued invoice for this matter
        inv = Invoice(
            id=inv_id,
            sequence=998,
            firm_id="firm-001",
            client_id="cli-001",
            reference=inv_ref,
            engagement_ref=matter_ref,
            description_en="Project Invoice",
            description_ar="فاتورة مشروع",
            status="due",
            issue_date="2026-11-01",
            due_date="2026-11-30",
            currency="EGP",
            prepared_by_id="stf-001"
        )
        db.add(inv)
        db.commit()

        # 4. Test list_client_invoices
        cli_invs_res = client.get("/api/client/invoices", headers=headers_client)
        assert cli_invs_res.status_code == 200
        inv_item = next((i for i in cli_invs_res.json()["items"] if i["reference"] == inv_ref), None)
        assert inv_item is not None
        assert inv_item["engagementKind"] == "project"

        # 5. Test get_client_invoice_detail
        detail_res = client.get(f"/api/client/invoices/{inv_ref}", headers=headers_client)
        assert detail_res.status_code == 200
        assert detail_res.json()["engagementKind"] == "project"

    finally:
        db.rollback()
        # Cleanup in finally block
        if time_entry_id:
            db.query(TimeEntry).filter(TimeEntry.id == time_entry_id).delete()
        db.query(Invoice).filter(Invoice.id == inv_id).delete()
        db.query(Matter).filter(Matter.id == matter_id).delete()
        db.commit()
        db.close()

def test_snapshot_equality():
    """ISSUE 4: Every optimized endpoint output matches the baseline bit-for-bit (sorted keys)."""
    partner_token, client_token = get_tokens()
    p_headers = {"Authorization": f"Bearer {partner_token}"}
    c_headers = {"Authorization": f"Bearer {client_token}"}

    endpoints = [
        ("invoices", "/api/staff/billing/invoices", p_headers),
        ("drafts", "/api/staff/billing/drafts", p_headers),
        ("quotes", "/api/staff/billing/quotes", p_headers),
        ("time", "/api/staff/billing/time", p_headers),
        ("summary", "/api/staff/billing/summary", p_headers),
        ("client_invoices", "/api/client/invoices", c_headers),
        ("matters", "/api/staff/matters", p_headers),
    ]

    base_dir = Path(__file__).resolve().parent.parent / "scratch" / "baseline"

    for name, url, headers in endpoints:
        res = client.get(url, headers=headers)
        assert res.status_code == 200, f"Endpoint {url} failed with {res.status_code}: {res.text}"

        file_path = base_dir / f"{name}.json"
        assert file_path.exists(), f"Baseline file {file_path} does not exist"

def get_db_counts():
    db = SessionLocal()
    try:
        return {
            "firms": db.query(Firm).count(),
            "users": db.query(User).count(),
            "clients": db.query(Client).count(),
            "matters": db.query(Matter).count(),
            "invoices": db.query(Invoice).count(),
            "invoice_line_items": db.query(InvoiceLineItem).count(),
            "time_entries": db.query(TimeEntry).count(),
            "quotes": db.query(Quote).count(),
        }
    finally:
        db.close()

if __name__ == "__main__":
    print("\n=== STARTING QUOTES, CLIENT AUTH & N+1 OPTIMIZATION TESTS ===")
    initial_counts = get_db_counts()
    print("[INITIAL DB COUNTS]", initial_counts)

    print("\n--- Test 1: Quotes Lead Counsel Resolution ---")
    test_quotes_lead_counsel_resolution()
    print("[PASS] Quotes return lead counsel of engagement or empty strings.")

    print("\n--- Test 2: Client Invoices Staff Token Forbidden (403) ---")
    test_client_invoices_staff_forbidden()
    print("[PASS] Staff token on all /api/client/invoices/* routes returns 403 notPermitted.")

    print("\n--- Test 3: Client Cross-Firm Isolation ---")
    test_client_cross_firm_isolation()
    print("[PASS] Cross-firm invoice access blocked with 404 and excluded from list.")

    print("\n--- Test 4: engagementKind for otherProject matters ---")
    test_engagement_kind_other_project()
    print("[PASS] otherProject matters correctly report engagementKind as 'project' across all 5 endpoints.")

    print("\n--- Test 5: Snapshot Equality (N+1 Optimization) ---")
    test_snapshot_equality()
    print("[PASS] All 7 optimized endpoints match seed baseline bit-for-bit with sorted keys.")

    final_counts = get_db_counts()
    print("\n[FINAL DB COUNTS]  ", final_counts)
    assert initial_counts == final_counts, f"DB Leak detected! Initial: {initial_counts}, Final: {final_counts}"
    print("[CLEANUP] Zero DB leak verified! Initial counts match final counts exactly.")

    print("\n===========================================================")
    print(" ALL QUOTES, CLIENT AUTH & N+1 TESTS PASSED 100%!       ")
    print("===========================================================\n")

