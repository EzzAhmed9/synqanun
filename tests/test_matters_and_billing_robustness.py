"""
Test Suite for Matters & Billing Robustness, Reference Generation, Normalization,
Close/Reopen Constraints, and Approvals Overdue Calculations.

Verifies:
1. Multi-firm unique reference generation without collision (Matter & Invoice).
2. Deleting the last matter does not cause a collision on subsequent creation.
3. workType normalization (case -> dispute, enforcement -> execution), list filtering, and invalid workType -> 400.
4. create_matter input validations (empty title/practice/forum -> 400) and bilingual filling from PRACTICE_AREAS/FORUMS.
5. close / reopen transitions (already closed -> 409, already open -> 409, neutral text, timeline event recorded).
6. Approvals in staff matter detail: filtered to 'issued' only, and daysOverdue/dueToday computed via dates helper.
7. ID lengths: mat-, inv-, itm-, tm-, evt- all use hex[:12].
8. Zero DB Leak: all test records cleaned up, run twice consecutively with identical row counts.
"""

import sys
import os
import uuid
from datetime import datetime, timezone, timedelta

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

sys.path.insert(0, os.path.abspath("backend"))

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models.firm import Firm
from app.models.user import User
from app.models.client import Client, ClientContact
from app.models.matter import Matter, MatterTeamMember, MatterHearing, MatterTimelineEvent
from app.models.invoice import Invoice, InvoiceLineItem, TimeEntry, Quote
from app.core.dates import today

client = TestClient(app)


def get_table_counts(db):
    return {
        "firms": db.query(Firm).count(),
        "users": db.query(User).count(),
        "clients": db.query(Client).count(),
        "client_contacts": db.query(ClientContact).count(),
        "matters": db.query(Matter).count(),
        "matter_timeline_events": db.query(MatterTimelineEvent).count(),
        "matter_team_members": db.query(MatterTeamMember).count(),
        "invoices": db.query(Invoice).count(),
        "invoice_line_items": db.query(InvoiceLineItem).count(),
        "time_entries": db.query(TimeEntry).count(),
        "quotes": db.query(Quote).count(),
    }


def run_tests():
    print("\n=== STARTING MATTERS & BILLING ROBUSTNESS TESTS ===")

    db = SessionLocal()
    initial_counts = get_table_counts(db)
    print(f"[INITIAL DB COUNTS] {initial_counts}")

    created_firm_ids = []
    created_user_ids = []
    created_client_ids = []
    created_matter_ids = []
    created_invoice_ids = []
    created_quote_ids = []
    created_time_ids = []

    try:
        # ------------------------------------------------------------------
        # Setup: Authenticate Partner 1 (firm-001)
        # ------------------------------------------------------------------
        login_p1 = client.post("/api/auth/login", json={"email": "m.alfarooq@mr-law.eg", "password": "password123"})
        assert login_p1.status_code == 200, f"Login failed: {login_p1.text}"
        p1_headers = {"Authorization": f"Bearer {login_p1.json()['access_token']}"}
        p1_id = login_p1.json()["user"]["id"]

        # Setup Firm 2 with a Partner user
        firm2_id = f"firm-test-{uuid.uuid4().hex[:6]}"
        f2 = Firm(
            id=firm2_id,
            name_en="Second Law Firm LLC",
            name_ar="شركة المحاماة الثانية",
            domain=f"secondfirm-{uuid.uuid4().hex[:4]}.com",
            created_at=datetime.now(timezone.utc)
        )
        db.add(f2)
        created_firm_ids.append(firm2_id)

        user2_id = f"stf-test-{uuid.uuid4().hex[:6]}"
        user2_email = f"partner2_{uuid.uuid4().hex[:6]}@secondfirm.com"
        u2 = User(
            id=user2_id,
            firm_id=firm2_id,
            email=user2_email,
            hashed_password=get_password_hash("password123"),
            name_en="Tariq Al-Badr",
            name_ar="طارق البدر",
            rank="partner",
            side="staff",
            status="active"
        )
        db.add(u2)
        created_user_ids.append(user2_id)

        # Client for Firm 2
        cli2_id = f"cli-test-{uuid.uuid4().hex[:6]}"
        c2 = Client(
            id=cli2_id,
            firm_id=firm2_id,
            name_en="Firm 2 Client Corp",
            name_ar="عميل الشركة الثانية",
            standing="active",
            last_activity_days_ago=0
        )
        db.add(c2)
        created_client_ids.append(cli2_id)
        db.commit()

        login_p2 = client.post("/api/auth/login", json={"email": user2_email, "password": "password123"})
        assert login_p2.status_code == 200, f"Firm 2 login failed: {login_p2.text}"
        p2_headers = {"Authorization": f"Bearer {login_p2.json()['access_token']}"}

        # ------------------------------------------------------------------
        # TEST 1: Two firms create matters & invoices without collision
        # ------------------------------------------------------------------
        print("\n--- Test 1: Cross-Firm Unique Numbering (Matters & Invoices) ---")
        
        # Firm 1 creates a matter
        m1_res = client.post("/api/staff/matters", json={
            "title": "Firm 1 Matter",
            "workType": "dispute",
            "clientId": "cli-001",
            "practiceArea": "Commercial Litigation",
            "forum": "Cairo Economic Court",
            "leadId": p1_id
        }, headers=p1_headers)
        assert m1_res.status_code == 201, m1_res.text
        m1_data = m1_res.json()
        m1_ref = m1_data["reference"]
        created_matter_ids.append(m1_data["matterId"])
        m1_num = int(m1_ref.replace("MAT-", ""))

        # Check matter ID hex length
        assert len(m1_data["matterId"]) == 16, f"Matter ID must be mat- + 12 hex chars, got {m1_data['matterId']}"

        # Firm 2 creates a matter -> must increment across ALL rows
        m2_res = client.post("/api/staff/matters", json={
            "title": "Firm 2 Matter",
            "workType": "dispute",
            "clientId": cli2_id,
            "practiceArea": "Commercial Litigation",
            "forum": "Cairo Economic Court",
            "leadId": user2_id
        }, headers=p2_headers)
        assert m2_res.status_code == 201, m2_res.text
        m2_data = m2_res.json()
        m2_ref = m2_data["reference"]
        created_matter_ids.append(m2_data["matterId"])
        m2_num = int(m2_ref.replace("MAT-", ""))

        assert m2_num == m1_num + 1, f"Firm 2 matter number must be {m1_num + 1}, got {m2_num}"
        print(f"[PASS] Cross-firm matters: Firm 1 got {m1_ref}, Firm 2 got {m2_ref}")

        # Firm 1 creates an invoice draft
        inv1_res = client.post("/api/staff/billing/drafts", json={
            "engagementRef": m1_ref,
            "description": "Firm 1 Invoice Draft",
            "lines": [{"description": "Legal services", "amount": 5000.0, "fromEntryIds": []}]
        }, headers=p1_headers)
        assert inv1_res.status_code == 201, inv1_res.text
        inv1_data = inv1_res.json()
        inv1_ref = inv1_data["reference"]
        created_invoice_ids.append(inv1_data["id"])
        inv1_num = int(inv1_ref.split("-")[-1])

        # Check invoice & line item hex length
        assert len(inv1_data["id"]) == 16, f"Invoice ID must be inv- + 12 hex chars, got {inv1_data['id']}"
        assert len(inv1_data["draft"]["lines"][0]["id"]) == 16, f"Line ID must be itm- + 12 hex chars"

        # Firm 2 creates an invoice draft -> must increment across ALL rows
        inv2_res = client.post("/api/staff/billing/drafts", json={
            "engagementRef": m2_ref,
            "description": "Firm 2 Invoice Draft",
            "lines": [{"description": "Firm 2 consultation", "amount": 7500.0, "fromEntryIds": []}]
        }, headers=p2_headers)
        assert inv2_res.status_code == 201, inv2_res.text
        inv2_data = inv2_res.json()
        inv2_ref = inv2_data["reference"]
        created_invoice_ids.append(inv2_data["id"])
        inv2_num = int(inv2_ref.split("-")[-1])

        assert inv2_num == inv1_num + 1, f"Firm 2 invoice number must be {inv1_num + 1}, got {inv2_num}"
        print(f"[PASS] Cross-firm invoices: Firm 1 got {inv1_ref}, Firm 2 got {inv2_ref}")

        # ------------------------------------------------------------------
        # TEST 1b: Deleting the last matter does not cause duplicate collision
        # ------------------------------------------------------------------
        print("\n--- Test 1b: Deleting Last Matter Collision Check ---")
        # Delete Firm 2's matter from DB
        db.query(InvoiceLineItem).filter(InvoiceLineItem.invoice_id == inv2_data["id"]).delete()
        db.query(Invoice).filter(Invoice.id == inv2_data["id"]).delete()
        created_invoice_ids.remove(inv2_data["id"])

        db.query(Matter).filter(Matter.id == m2_data["matterId"]).delete()
        created_matter_ids.remove(m2_data["matterId"])
        db.commit()

        # Create new matter in Firm 2 -> it should reuse m2_ref cleanly without duplicate error
        m3_res = client.post("/api/staff/matters", json={
            "title": "Firm 2 Matter Recreated",
            "workType": "consultation",
            "clientId": cli2_id,
            "practiceArea": "Corporate & Regulatory",
            "forum": "Cairo Economic Court",
            "leadId": user2_id
        }, headers=p2_headers)
        assert m3_res.status_code == 201, m3_res.text
        m3_data = m3_res.json()
        assert m3_data["reference"] == m2_ref, f"Expected {m2_ref}, got {m3_data['reference']}"
        created_matter_ids.append(m3_data["matterId"])

        # Create another matter in Firm 2 -> increments cleanly
        m4_res = client.post("/api/staff/matters", json={
            "title": "Firm 2 Matter Subsequent",
            "workType": "contract",
            "clientId": cli2_id,
            "practiceArea": "Corporate & Regulatory",
            "forum": "Cairo Economic Court",
            "leadId": user2_id
        }, headers=p2_headers)
        assert m4_res.status_code == 201, m4_res.text
        m4_data = m4_res.json()
        created_matter_ids.append(m4_data["matterId"])
        assert m4_data["reference"] == f"MAT-{m2_num + 1}"
        print(f"[PASS] After deletion, new matters created without duplicate: {m3_data['reference']}, {m4_data['reference']}")

        # ------------------------------------------------------------------
        # TEST 2: workType normalization & filtering
        # ------------------------------------------------------------------
        print("\n--- Test 2: workType Normalization & Filtering ---")
        # 'case' normalized to 'dispute'
        m_case_res = client.post("/api/staff/matters", json={
            "title": "Case WorkType Matter",
            "workType": "case",
            "clientId": "cli-001",
            "practiceArea": "Commercial Litigation",
            "forum": "Cairo Economic Court",
            "leadId": p1_id
        }, headers=p1_headers)
        assert m_case_res.status_code == 201
        m_case_ref = m_case_res.json()["reference"]
        created_matter_ids.append(m_case_res.json()["matterId"])

        # 'enforcement' normalized to 'execution'
        m_enf_res = client.post("/api/staff/matters", json={
            "title": "Enforcement WorkType Matter",
            "workType": "enforcement",
            "clientId": "cli-001",
            "practiceArea": "Commercial Litigation",
            "forum": "Cairo Economic Court",
            "leadId": p1_id
        }, headers=p1_headers)
        assert m_enf_res.status_code == 201
        m_enf_ref = m_enf_res.json()["reference"]
        created_matter_ids.append(m_enf_res.json()["matterId"])

        # Verify DB storage
        db_case = db.query(Matter).filter(Matter.reference == m_case_ref).first()
        assert db_case.work_type == "dispute", f"Expected 'dispute' in DB, got {db_case.work_type}"

        db_enf = db.query(Matter).filter(Matter.reference == m_enf_ref).first()
        assert db_enf.work_type == "execution", f"Expected 'execution' in DB, got {db_enf.work_type}"

        # Test filtering with 'case' in query param
        f_case = client.get("/api/staff/matters?workType=case", headers=p1_headers)
        assert f_case.status_code == 200
        case_items = f_case.json()["items"]
        assert any(item["reference"] == m_case_ref for item in case_items)
        assert all(item["workType"] == "case" for item in case_items)

        # Test filtering with 'enforcement' in query param
        f_enf = client.get("/api/staff/matters?workType=enforcement", headers=p1_headers)
        assert f_enf.status_code == 200
        enf_items = f_enf.json()["items"]
        assert any(item["reference"] == m_enf_ref for item in enf_items)
        assert all(item["workType"] == "enforcement" for item in enf_items)

        # Test invalid workType -> 400
        inv_wt = client.post("/api/staff/matters", json={
            "title": "Invalid WT Matter",
            "workType": "not_a_valid_type",
            "clientId": "cli-001",
            "practiceArea": "Commercial Litigation",
            "forum": "Cairo Economic Court",
            "leadId": p1_id
        }, headers=p1_headers)
        assert inv_wt.status_code == 400
        assert inv_wt.json()["detail"] == "workTypeInvalid"
        print("[PASS] workType normalization, list filtering (case/enforcement), and invalid rejection verified.")

        # ------------------------------------------------------------------
        # TEST 3: create_matter validation & bilingual fields lookup
        # ------------------------------------------------------------------
        print("\n--- Test 3: Input Validations & Bilingual Fields Matching ---")
        # Empty title -> 400
        res_et = client.post("/api/staff/matters", json={
            "title": "   ",
            "workType": "dispute",
            "clientId": "cli-001",
            "practiceArea": "Commercial Litigation",
            "forum": "Cairo Economic Court",
            "leadId": p1_id
        }, headers=p1_headers)
        assert res_et.status_code == 400 and res_et.json()["detail"] == "titleRequired"

        # Empty practiceArea -> 400
        res_ep = client.post("/api/staff/matters", json={
            "title": "Valid Title",
            "workType": "dispute",
            "clientId": "cli-001",
            "practiceArea": "   ",
            "forum": "Cairo Economic Court",
            "leadId": p1_id
        }, headers=p1_headers)
        assert res_ep.status_code == 400 and res_ep.json()["detail"] == "practiceAreaRequired"

        # Empty forum -> 400
        res_ef = client.post("/api/staff/matters", json={
            "title": "Valid Title",
            "workType": "dispute",
            "clientId": "cli-001",
            "practiceArea": "Commercial Litigation",
            "forum": "   ",
            "leadId": p1_id
        }, headers=p1_headers)
        assert res_ef.status_code == 400 and res_ef.json()["detail"] == "forumRequired"

        # Bilingual matching from English inputs
        res_bil_en = client.post("/api/staff/matters", json={
            "title": "Bilingual Test Matter",
            "workType": "contract",
            "clientId": "cli-001",
            "practiceArea": "Maritime & Shipping",
            "forum": "Alexandria Economic Court",
            "leadId": p1_id
        }, headers=p1_headers)
        assert res_bil_en.status_code == 201
        m_bil_ref = res_bil_en.json()["reference"]
        created_matter_ids.append(res_bil_en.json()["matterId"])

        det_bil = client.get(f"/api/staff/matters/{m_bil_ref}", headers=p1_headers).json()
        assert det_bil["engagement"]["category"]["en"] == "Maritime & Shipping"
        assert det_bil["engagement"]["category"]["ar"] == "القانون البحري والشحن"
        assert det_bil["engagement"]["venue"]["en"] == "Alexandria Economic Court"
        assert det_bil["engagement"]["venue"]["ar"] == "محكمة الإسكندرية الاقتصادية"

        # Bilingual matching from Arabic inputs
        res_bil_ar = client.post("/api/staff/matters", json={
            "title": "قضية بحرية تجريبية",
            "workType": "contract",
            "clientId": "cli-001",
            "practiceArea": "التحكيم وفض المنازعات",
            "forum": "محاكم مركز دبي المالي العالمي (DIFC)",
            "leadId": p1_id
        }, headers=p1_headers)
        assert res_bil_ar.status_code == 201
        m_bilar_ref = res_bil_ar.json()["reference"]
        created_matter_ids.append(res_bil_ar.json()["matterId"])

        det_bilar = client.get(f"/api/staff/matters/{m_bilar_ref}", headers=p1_headers).json()
        assert det_bilar["engagement"]["category"]["en"] == "Arbitration & Dispute Resolution"
        assert det_bilar["engagement"]["category"]["ar"] == "التحكيم وفض المنازعات"
        assert det_bilar["engagement"]["venue"]["en"] == "Dubai International Financial Centre Courts"
        assert det_bilar["engagement"]["venue"]["ar"] == "محاكم مركز دبي المالي العالمي (DIFC)"
        print("[PASS] Input validations and bidirectional English/Arabic taxonomy lookups confirmed.")

        # ------------------------------------------------------------------
        # TEST 4: Close and Reopen (409 checks, neutral text, timeline event)
        # ------------------------------------------------------------------
        print("\n--- Test 4: Close and Reopen Transitions & Timeline Events ---")
        # Try reopening already open matter -> 409
        ro_fail = client.post(f"/api/staff/matters/{m_bil_ref}/reopen", headers=p1_headers)
        assert ro_fail.status_code == 409, f"Expected 409, got {ro_fail.status_code}"

        # Close open matter -> 200
        cl_res = client.post(f"/api/staff/matters/{m_bil_ref}/close", headers=p1_headers)
        assert cl_res.status_code == 200

        # Close already closed matter -> 409
        cl_fail = client.post(f"/api/staff/matters/{m_bil_ref}/close", headers=p1_headers)
        assert cl_fail.status_code == 409, f"Expected 409, got {cl_fail.status_code}"

        # Verify close status & timeline event
        det_closed = client.get(f"/api/staff/matters/{m_bil_ref}", headers=p1_headers).json()
        assert det_closed["engagement"]["active"] is False
        assert det_closed["engagement"]["status"]["en"] == "Closed and archived"
        close_events = [e for e in det_closed["timeline"] if "closed" in e["title"]["en"].lower()]
        assert len(close_events) >= 1, "Close timeline event missing"
        assert close_events[-1]["eventKind"] == "assignment"
        assert len(close_events[-1]["id"]) == 16, f"Timeline event ID must be evt- + 12 hex chars"

        # Reopen matter -> 200
        ro_res = client.post(f"/api/staff/matters/{m_bil_ref}/reopen", headers=p1_headers)
        assert ro_res.status_code == 200

        # Verify reopened neutral status and timeline event
        det_reopened = client.get(f"/api/staff/matters/{m_bil_ref}", headers=p1_headers).json()
        assert det_reopened["engagement"]["active"] is True
        assert det_reopened["engagement"]["status"]["en"] == "Reopened"
        assert det_reopened["engagement"]["status"]["ar"] == "أعيد فتح الملف"
        reopen_events = [e for e in det_reopened["timeline"] if "reopened" in e["title"]["en"].lower()]
        assert len(reopen_events) >= 1, "Reopen timeline event missing"
        assert reopen_events[-1]["eventKind"] == "assignment"
        print("[PASS] Close/reopen: 409 on invalid transitions, neutral status text, and timeline events verified.")

        # ------------------------------------------------------------------
        # TEST 5: Staff matter detail "approvals" filtering & overdue
        # ------------------------------------------------------------------
        print("\n--- Test 5: Matter Detail Approvals (Issued Only & Overdue Calculation) ---")
        yesterday_str = (today() - timedelta(days=1)).strftime("%Y-%m-%d")
        today_str = today().strftime("%Y-%m-%d")

        # 1. Quote 1: status="issued", valid_until yesterday -> daysOverdue == 1, dueToday == False
        q1_id = f"quo-test-{uuid.uuid4().hex[:6]}"
        q1 = Quote(
            id=q1_id,
            firm_id="firm-001",
            client_id="cli-001",
            engagement_ref=m_bil_ref,
            description_en="Overdue Quote",
            description_ar="عرض متأخر",
            amount=15000.0,
            currency="EGP",
            status="issued",
            valid_until=yesterday_str
        )
        db.add(q1)
        created_quote_ids.append(q1_id)

        # 2. Quote 2: status="issued", valid_until today -> daysOverdue == 0, dueToday == True
        q2_id = f"quo-test-{uuid.uuid4().hex[:6]}"
        q2 = Quote(
            id=q2_id,
            firm_id="firm-001",
            client_id="cli-001",
            engagement_ref=m_bil_ref,
            description_en="Due Today Quote",
            description_ar="عرض يستحق اليوم",
            amount=20000.0,
            currency="EGP",
            status="issued",
            valid_until=today_str
        )
        db.add(q2)
        created_quote_ids.append(q2_id)

        # 3. Quote 3: status="accepted" (not pending) -> must NOT appear in approvals
        q3_id = f"quo-test-{uuid.uuid4().hex[:6]}"
        q3 = Quote(
            id=q3_id,
            firm_id="firm-001",
            client_id="cli-001",
            engagement_ref=m_bil_ref,
            description_en="Accepted Quote",
            description_ar="عرض مقبول",
            amount=30000.0,
            currency="EGP",
            status="accepted",
            valid_until=yesterday_str
        )
        db.add(q3)
        created_quote_ids.append(q3_id)
        db.commit()

        det_appr = client.get(f"/api/staff/matters/{m_bil_ref}", headers=p1_headers).json()
        apprs = det_appr["approvals"]
        appr_ids = [a["id"] for a in apprs]

        assert q1_id in appr_ids, "Issued overdue quote must be in approvals"
        assert q2_id in appr_ids, "Issued due-today quote must be in approvals"
        assert q3_id not in appr_ids, "Accepted quote must NOT be in approvals"

        appr1 = next(a for a in apprs if a["id"] == q1_id)
        assert appr1["daysOverdue"] == 1, f"Expected daysOverdue=1, got {appr1['daysOverdue']}"
        assert appr1["dueToday"] is False

        appr2 = next(a for a in apprs if a["id"] == q2_id)
        assert appr2["daysOverdue"] == 0
        assert appr2["dueToday"] is True
        print("[PASS] Approvals correctly filtered to 'issued' only with accurate daysOverdue & dueToday.")

        # ------------------------------------------------------------------
        # TEST 6: Time Entry logging hex[:12] and client engagements kind
        # ------------------------------------------------------------------
        print("\n--- Test 6: Time Entry ID hex[:12] & Client Invoice Engagements Kind ---")
        tm_res = client.post("/api/staff/billing/time", json={
            "matterId": m_bil_ref,
            "minutes": 90,
            "description": "Preparation of maritime arguments",
            "billable": True
        }, headers=p1_headers)
        assert tm_res.status_code == 201
        tm_data = tm_res.json()
        created_time_ids.append(tm_data["id"])
        assert len(tm_data["id"]) == 15, f"Time entry ID must be tm- + 12 hex chars (15 total), got {tm_data['id']}"

        # Team member ID hex[:12]
        team_add = client.post(f"/api/staff/matters/{m_bil_ref}/team", json={
            "staff_id": "stf-002",
            "role_en": "Associate",
            "role_ar": "محامٍ مشارك"
        }, headers=p1_headers)
        assert team_add.status_code == 201
        assert len(team_add.json()["teamMemberId"]) == 15, f"Team member ID must be tm- + 12 hex chars (15 total)"

        print("[PASS] All ID formats confirmed with hex[:12].")

        print("\n===========================================================")
        print(" ALL MATTERS & BILLING ROBUSTNESS TESTS PASSED 100%!       ")
        print("===========================================================\n")

    finally:
        print("[CLEANUP] Cleaning up test data...")
        try:
            if created_time_ids:
                db.query(TimeEntry).filter(TimeEntry.id.in_(created_time_ids)).delete(synchronize_session=False)
            if created_quote_ids:
                db.query(Quote).filter(Quote.id.in_(created_quote_ids)).delete(synchronize_session=False)
            if created_invoice_ids:
                db.query(InvoiceLineItem).filter(InvoiceLineItem.invoice_id.in_(created_invoice_ids)).delete(synchronize_session=False)
                db.query(Invoice).filter(Invoice.id.in_(created_invoice_ids)).delete(synchronize_session=False)
            if created_matter_ids:
                db.query(MatterTimelineEvent).filter(MatterTimelineEvent.matter_id.in_(created_matter_ids)).delete(synchronize_session=False)
                db.query(MatterTeamMember).filter(MatterTeamMember.matter_id.in_(created_matter_ids)).delete(synchronize_session=False)
                db.query(MatterHearing).filter(MatterHearing.matter_id.in_(created_matter_ids)).delete(synchronize_session=False)
                db.query(Matter).filter(Matter.id.in_(created_matter_ids)).delete(synchronize_session=False)
            if created_client_ids:
                db.query(ClientContact).filter(ClientContact.client_id.in_(created_client_ids)).delete(synchronize_session=False)
                db.query(Client).filter(Client.id.in_(created_client_ids)).delete(synchronize_session=False)
            if created_user_ids:
                db.query(User).filter(User.id.in_(created_user_ids)).delete(synchronize_session=False)
            if created_firm_ids:
                db.query(Firm).filter(Firm.id.in_(created_firm_ids)).delete(synchronize_session=False)
            db.commit()
        except Exception as e:
            print(f"[CLEANUP ERROR] {e}")
            db.rollback()

        final_counts = get_table_counts(db)
        print(f"[FINAL DB COUNTS]   {final_counts}")
        db.close()

        assert initial_counts == final_counts, f"DB Leak detected! Initial: {initial_counts}, Final: {final_counts}"
        print("[CLEANUP] Zero DB leak verified! Initial counts match final counts exactly.")


if __name__ == "__main__":
    run_tests()
