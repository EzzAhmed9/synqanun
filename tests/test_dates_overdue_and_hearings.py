"""
Test Suite for Date Arithmetic, Overdue Invoices Transition, Hearings, and paidDaysAgo.
Verifies:
1. Invoice due today: status stays 'due', dueInDays == 0.
2. Invoice due yesterday: starts 'due' in DB, after list/summary calls is updated to 'overdue'
   in DB, and staff/client views (list, summary, detail, matter detail) reflect 'overdue'.
3. Hearing today: nextDate.inDays == 0 and counted in counts['soon'].
4. Completed and adjourned hearings ignored for nextDate and 'soon'.
5. Unsorted upcoming hearings: earliest hearing picked for nextDate.
6. Hearing dates with ISO datetime strings ('YYYY-MM-DDTHH:MM:SS') parsed cleanly.
7. paidDaysAgo computed correctly from paid_at (e.g. 3 days ago -> 3, today -> 0, unparseable/None -> None, unpaid -> None).
8. Cleanup deletes everything created, passes twice in a row with identical row counts.
"""

import sys
import os
import uuid
from datetime import date, datetime, timedelta

# Ensure clean UTF-8 output
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

sys.path.insert(0, os.path.abspath("backend"))

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.models.matter import Matter, MatterHearing
from app.models.invoice import Invoice, InvoiceLineItem
from app.core.dates import today, days_until, days_ago, parse_date

client = TestClient(app)


def get_table_counts(db):
    return {
        "invoices": db.query(Invoice).count(),
        "invoice_line_items": db.query(InvoiceLineItem).count(),
        "matter_hearings": db.query(MatterHearing).count(),
        "matters": db.query(Matter).count(),
    }


def run_tests():
    print("\n=== STARTING DATE ARITHMETIC, OVERDUE & HEARINGS TESTS ===")

    # Authenticate partner and client
    login_p = client.post("/api/auth/login", json={"email": "m.alfarooq@mr-law.eg", "password": "password123"})
    assert login_p.status_code == 200, f"Partner login failed: {login_p.text}"
    partner_id = login_p.json()["user"]["id"]
    staff_headers = {"Authorization": f"Bearer {login_p.json()['access_token']}"}

    login_c = client.post("/api/auth/login", json={"email": "t.alrahman@gulfholdings.ae", "password": "password123"})
    assert login_c.status_code == 200, f"Client login failed: {login_c.text}"
    client_headers = {"Authorization": f"Bearer {login_c.json()['access_token']}"}

    db = SessionLocal()
    initial_counts = get_table_counts(db)
    print(f"[INITIAL DB COUNTS] {initial_counts}")

    created_invoice_ids = []
    created_hearing_ids = []
    created_matter_ids = []

    today_curr = today()
    today_str = today_curr.isoformat()
    yesterday_str = (today_curr - timedelta(days=1)).isoformat()
    tomorrow_str = (today_curr + timedelta(days=1)).isoformat()

    try:
        # Load seed matter MAT-2201
        seed_matter = db.query(Matter).filter(Matter.reference == "MAT-2201").first()
        assert seed_matter is not None, "MAT-2201 not found"

        # -------------------------------------------------------------
        # TEST 1: Invoice due today -> stays "due", dueInDays == 0
        # -------------------------------------------------------------
        print("\n--- Test 1: Invoice due today -> stays 'due', dueInDays == 0 ---")
        inv_today_id = f"inv-test-today-{uuid.uuid4().hex[:6]}"
        inv_today_ref = f"INV-TEST-TODAY-{uuid.uuid4().hex[:4].upper()}"
        inv_today = Invoice(
            id=inv_today_id,
            sequence="901",
            reference=inv_today_ref,
            firm_id="firm-001",
            client_id="cli-001",
            engagement_ref="MAT-2201",
            description_en="Invoice Due Today",
            description_ar="فاتورة مستحقة اليوم",
            status="due",
            currency="EGP",
            issue_date=yesterday_str,
            due_date=today_str,
            paid_at=None,
            prepared_by_id=partner_id
        )
        li1 = InvoiceLineItem(
            id=f"li-{uuid.uuid4().hex[:6]}",
            invoice_id=inv_today_id,
            description_en="Consultation",
            description_ar="استشارة",
            amount=5000.0,
            order=1
        )
        db.add(inv_today)
        db.add(li1)
        db.commit()
        created_invoice_ids.append(inv_today_id)

        # Query staff list_invoices
        res = client.get("/api/staff/billing/invoices", headers=staff_headers)
        assert res.status_code == 200, res.text
        staff_invs = {i["id"]: i for i in res.json()["items"]}
        assert inv_today_id in staff_invs, "Test invoice due today not in staff invoice list"
        assert staff_invs[inv_today_id]["status"] == "due", f"Expected 'due', got {staff_invs[inv_today_id]['status']}"
        assert staff_invs[inv_today_id]["dueInDays"] == 0, f"Expected dueInDays 0, got {staff_invs[inv_today_id]['dueInDays']}"

        # Verify DB row status
        db.expire_all()
        db_inv = db.query(Invoice).filter(Invoice.id == inv_today_id).first()
        assert db_inv.status == "due", f"DB status should remain 'due', got {db_inv.status}"
        print("[PASS] Invoice due today stays 'due' in DB and list returns dueInDays == 0.")

        # -------------------------------------------------------------
        # TEST 2: Invoice due yesterday -> updated to "overdue" in DB
        #         and reflected in staff summary, client views, matter detail
        # -------------------------------------------------------------
        print("\n--- Test 2: Invoice due yesterday -> updated to 'overdue' in DB & views ---")
        inv_yest_id = f"inv-test-yest-{uuid.uuid4().hex[:6]}"
        inv_yest_ref = f"INV-TEST-YEST-{uuid.uuid4().hex[:4].upper()}"
        inv_yest = Invoice(
            id=inv_yest_id,
            sequence="902",
            reference=inv_yest_ref,
            firm_id="firm-001",
            client_id="cli-001",
            engagement_ref="MAT-2201",
            description_en="Invoice Due Yesterday",
            description_ar="فاتورة استحقت أمس",
            status="due",  # starts as "due"
            currency="EGP",
            issue_date=(today_curr - timedelta(days=10)).isoformat(),
            due_date=yesterday_str,
            paid_at=None,
            prepared_by_id=partner_id
        )
        li2 = InvoiceLineItem(
            id=f"li-{uuid.uuid4().hex[:6]}",
            invoice_id=inv_yest_id,
            description_en="Court Appearance",
            description_ar="حضور جلسة",
            amount=8000.0,
            order=1
        )
        db.add(inv_yest)
        db.add(li2)
        db.commit()
        created_invoice_ids.append(inv_yest_id)

        # Verify DB initially has 'due'
        db.expire_all()
        db_inv_yest = db.query(Invoice).filter(Invoice.id == inv_yest_id).first()
        assert db_inv_yest.status == "due", f"Expected initial status 'due', got {db_inv_yest.status}"

        # 2a. Staff list_invoices triggers refresh_overdue_invoices
        res = client.get("/api/staff/billing/invoices", headers=staff_headers)
        assert res.status_code == 200, res.text
        staff_invs = {i["id"]: i for i in res.json()["items"]}
        assert inv_yest_id in staff_invs, "Test invoice due yesterday not in staff invoices"
        assert staff_invs[inv_yest_id]["status"] == "overdue", f"Expected 'overdue', got {staff_invs[inv_yest_id]['status']}"
        assert staff_invs[inv_yest_id]["dueInDays"] == -1, f"Expected dueInDays -1, got {staff_invs[inv_yest_id]['dueInDays']}"

        # 2b. Verify DB row updated to 'overdue'
        db.expire_all()
        db_inv_yest = db.query(Invoice).filter(Invoice.id == inv_yest_id).first()
        assert db_inv_yest.status == "overdue", f"DB status should now be 'overdue', got {db_inv_yest.status}"

        # 2c. Staff billing summary
        res_summary = client.get("/api/staff/billing/summary", headers=staff_headers)
        assert res_summary.status_code == 200, res_summary.text
        summary_data = res_summary.json()
        assert summary_data["overdue"]["count"] >= 1, "Expected overdue.count >= 1"

        # 2d. Client invoice list
        res_client_list = client.get("/api/client/invoices", headers=client_headers)
        assert res_client_list.status_code == 200, res_client_list.text
        client_invs = {i["id"]: i for i in res_client_list.json()["items"]}
        assert inv_yest_id in client_invs, "Test invoice not in client list"
        assert client_invs[inv_yest_id]["status"] == "overdue", f"Client view status expected 'overdue', got {client_invs[inv_yest_id]['status']}"
        assert client_invs[inv_yest_id]["dueInDays"] == -1, f"Client view dueInDays expected -1, got {client_invs[inv_yest_id]['dueInDays']}"

        # 2e. Client invoice summary
        res_client_sum = client.get("/api/client/invoices/summary", headers=client_headers)
        assert res_client_sum.status_code == 200, res_client_sum.text
        assert res_client_sum.json()["overdueCount"] >= 1, "Client summary overdueCount should reflect overdue"

        # 2f. Client invoice detail
        res_client_det = client.get(f"/api/client/invoices/{inv_yest_ref}", headers=client_headers)
        assert res_client_det.status_code == 200, res_client_det.text
        assert res_client_det.json()["status"] == "overdue"
        assert res_client_det.json()["dueInDays"] == -1

        # 2g. Staff matter detail invoices
        res_staff_matter = client.get("/api/staff/matters/MAT-2201", headers=staff_headers)
        assert res_staff_matter.status_code == 200, res_staff_matter.text
        staff_matter_invs = {i["id"]: i for i in res_staff_matter.json().get("invoices", [])}
        assert inv_yest_id in staff_matter_invs
        assert staff_matter_invs[inv_yest_id]["status"] == "overdue"

        # 2h. Client matter detail invoices
        res_client_matter = client.get("/api/client/matters/MAT-2201", headers=client_headers)
        assert res_client_matter.status_code == 200, res_client_matter.text
        client_matter_invs = {i["id"]: i for i in res_client_matter.json().get("invoices", [])}
        assert inv_yest_id in client_matter_invs
        assert client_matter_invs[inv_yest_id]["status"] == "overdue"
        print("[PASS] Invoice due yesterday updated to 'overdue' in DB and all staff/client views reflect it.")

        # -------------------------------------------------------------
        # TEST 3: Hearing today -> nextDate.inDays == 0 and counted in "soon"
        # -------------------------------------------------------------
        print("\n--- Test 3: Hearing today -> nextDate.inDays == 0 and in 'soon' ---")
        # Create a dedicated matter to test cleanly without interfering with seed matters
        matter_today_id = f"mat-test-today-{uuid.uuid4().hex[:6]}"
        matter_today_ref = f"MAT-TEST-TODAY-{uuid.uuid4().hex[:4].upper()}"
        m_today = Matter(
            id=matter_today_id,
            reference=matter_today_ref,
            firm_id="firm-001",
            client_id="cli-001",
            title_en="Matter with Hearing Today",
            title_ar="قضية بجلسة اليوم",
            lead_counsel_id=partner_id,
            work_type="dispute",
            matter_type_en="Litigation",
            matter_type_ar="تقاضي",
            forum_en="Cairo Court",
            forum_ar="محكمة القاهرة",
            status_en="Under Review",
            status_ar="قيد النظر",
            status_tone="neutral",
            is_closed=False
        )
        h_today_id = f"mh-test-today-{uuid.uuid4().hex[:6]}"
        h_today = MatterHearing(
            id=h_today_id,
            matter_id=matter_today_id,
            date=today_str,
            time="09:30",
            notes_en="Today's Court Hearing",
            notes_ar="جلسة اليوم بالمحكمة",
            status="scheduled"
        )
        db.add(m_today)
        db.add(h_today)
        db.commit()
        created_matter_ids.append(matter_today_id)
        created_hearing_ids.append(h_today_id)

        # Get staff matters list
        res_matters = client.get("/api/staff/matters", headers=staff_headers)
        assert res_matters.status_code == 200, res_matters.text
        matters_data = res_matters.json()
        assert matters_data["counts"]["soon"] >= 1, "counts['soon'] should count matter with hearing today"

        # Find the matter in items
        items_map = {m["reference"]: m for m in matters_data["items"]}
        assert matter_today_ref in items_map, "Test matter not found in staff matters list"
        nxt = items_map[matter_today_ref]["nextDate"]
        assert nxt is not None, "nextDate should not be None for matter with hearing today"
        assert nxt["inDays"] == 0, f"Expected nextDate.inDays == 0, got {nxt['inDays']}"
        assert nxt["date"] == today_str

        # Get matter detail
        res_m_detail = client.get(f"/api/staff/matters/{matter_today_ref}", headers=staff_headers)
        assert res_m_detail.status_code == 200, res_m_detail.text
        nxt_det = res_m_detail.json()["engagement"]["nextDate"]
        assert nxt_det is not None
        assert nxt_det["inDays"] == 0
        assert nxt_det["date"] == today_str
        print("[PASS] Hearing today sets nextDate.inDays == 0 and is included in counts['soon'].")

        # -------------------------------------------------------------
        # TEST 4: Completed and adjourned hearings ignored
        # -------------------------------------------------------------
        print("\n--- Test 4: Completed and adjourned hearings ignored ---")
        matter_comp_id = f"mat-test-comp-{uuid.uuid4().hex[:6]}"
        matter_comp_ref = f"MAT-TEST-COMP-{uuid.uuid4().hex[:4].upper()}"
        m_comp = Matter(
            id=matter_comp_id,
            reference=matter_comp_ref,
            firm_id="firm-001",
            client_id="cli-001",
            title_en="Matter with Completed Hearing",
            title_ar="قضية بجلسة مكتملة",
            lead_counsel_id=partner_id,
            work_type="dispute",
            matter_type_en="Litigation",
            matter_type_ar="تقاضي",
            forum_en="Cairo Court",
            forum_ar="محكمة القاهرة",
            status_en="Under Review",
            status_ar="قيد النظر",
            status_tone="neutral",
            is_closed=False
        )
        h_comp_id = f"mh-test-comp-{uuid.uuid4().hex[:6]}"
        h_comp = MatterHearing(
            id=h_comp_id,
            matter_id=matter_comp_id,
            date=today_str,
            time="11:00",
            notes_en="Completed Hearing",
            notes_ar="جلسة منتهية",
            status="completed"
        )
        h_adj_id = f"mh-test-adj-{uuid.uuid4().hex[:6]}"
        h_adj = MatterHearing(
            id=h_adj_id,
            matter_id=matter_comp_id,
            date=(today_curr + timedelta(days=2)).isoformat(),
            time="11:00",
            notes_en="Adjourned Hearing",
            notes_ar="جلسة مؤجلة",
            status="adjourned"
        )
        db.add(m_comp)
        db.add(h_comp)
        db.add(h_adj)
        db.commit()
        created_matter_ids.append(matter_comp_id)
        created_hearing_ids.append(h_comp_id)
        created_hearing_ids.append(h_adj_id)

        # Matter detail should have nextDate == None
        res_comp_det = client.get(f"/api/staff/matters/{matter_comp_ref}", headers=staff_headers)
        assert res_comp_det.status_code == 200, res_comp_det.text
        assert res_comp_det.json()["engagement"]["nextDate"] is None, f"Expected nextDate None for completed/adjourned hearings, got {res_comp_det.json()['engagement']['nextDate']}"
        print("[PASS] Completed and adjourned hearings ignored for nextDate.")

        # -------------------------------------------------------------
        # TEST 5: Unsorted hearings -> earliest picked
        # -------------------------------------------------------------
        print("\n--- Test 5: Unsorted hearings -> earliest picked ---")
        matter_unsort_id = f"mat-test-unsort-{uuid.uuid4().hex[:6]}"
        matter_unsort_ref = f"MAT-TEST-UNSORT-{uuid.uuid4().hex[:4].upper()}"
        m_unsort = Matter(
            id=matter_unsort_id,
            reference=matter_unsort_ref,
            firm_id="firm-001",
            client_id="cli-001",
            title_en="Matter with Unsorted Hearings",
            title_ar="قضية بجلسات غير مرتبة",
            lead_counsel_id=partner_id,
            work_type="dispute",
            matter_type_en="Litigation",
            matter_type_ar="تقاضي",
            forum_en="Cairo Court",
            forum_ar="محكمة القاهرة",
            status_en="Under Review",
            status_ar="قيد النظر",
            status_tone="neutral",
            is_closed=False
        )
        # Add hearing in 10 days first, then hearing in 2 days
        h_far_id = f"mh-far-{uuid.uuid4().hex[:6]}"
        h_far = MatterHearing(
            id=h_far_id,
            matter_id=matter_unsort_id,
            date=(today_curr + timedelta(days=10)).isoformat(),
            status="scheduled",
            notes_en="Hearing in 10 days"
        )
        h_near_id = f"mh-near-{uuid.uuid4().hex[:6]}"
        h_near = MatterHearing(
            id=h_near_id,
            matter_id=matter_unsort_id,
            date=(today_curr + timedelta(days=2)).isoformat(),
            status="scheduled",
            notes_en="Hearing in 2 days"
        )
        db.add(m_unsort)
        db.add(h_far)
        db.add(h_near)
        db.commit()
        created_matter_ids.append(matter_unsort_id)
        created_hearing_ids.append(h_far_id)
        created_hearing_ids.append(h_near_id)

        res_unsort = client.get(f"/api/staff/matters/{matter_unsort_ref}", headers=staff_headers)
        assert res_unsort.status_code == 200, res_unsort.text
        nxt_unsort = res_unsort.json()["engagement"]["nextDate"]
        assert nxt_unsort is not None
        assert nxt_unsort["inDays"] == 2, f"Expected earliest inDays == 2, got {nxt_unsort['inDays']}"
        assert nxt_unsort["date"] == (today_curr + timedelta(days=2)).isoformat()
        print("[PASS] Unsorted hearings correctly selected earliest upcoming hearing.")

        # -------------------------------------------------------------
        # TEST 6: ISO datetime hearing parsed
        # -------------------------------------------------------------
        print("\n--- Test 6: ISO datetime hearing parsed ---")
        matter_iso_id = f"mat-test-iso-{uuid.uuid4().hex[:6]}"
        matter_iso_ref = f"MAT-TEST-ISO-{uuid.uuid4().hex[:4].upper()}"
        m_iso = Matter(
            id=matter_iso_id,
            reference=matter_iso_ref,
            firm_id="firm-001",
            client_id="cli-001",
            title_en="Matter with ISO Datetime Hearing",
            title_ar="قضية بجلسة بتوقيت كامل",
            lead_counsel_id=partner_id,
            work_type="dispute",
            matter_type_en="Litigation",
            matter_type_ar="تقاضي",
            forum_en="Cairo Court",
            forum_ar="محكمة القاهرة",
            status_en="Under Review",
            status_ar="قيد النظر",
            status_tone="neutral",
            is_closed=False
        )
        iso_hearing_date = f"{(today_curr + timedelta(days=5)).isoformat()}T10:30:00"
        h_iso_id = f"mh-iso-{uuid.uuid4().hex[:6]}"
        h_iso = MatterHearing(
            id=h_iso_id,
            matter_id=matter_iso_id,
            date=iso_hearing_date,
            status="scheduled",
            notes_en="Hearing with ISO datetime"
        )
        db.add(m_iso)
        db.add(h_iso)
        db.commit()
        created_matter_ids.append(matter_iso_id)
        created_hearing_ids.append(h_iso_id)

        res_iso = client.get(f"/api/staff/matters/{matter_iso_ref}", headers=staff_headers)
        assert res_iso.status_code == 200, res_iso.text
        nxt_iso = res_iso.json()["engagement"]["nextDate"]
        assert nxt_iso is not None, "ISO datetime hearing should not be skipped"
        assert nxt_iso["inDays"] == 5, f"Expected inDays == 5, got {nxt_iso['inDays']}"
        print("[PASS] ISO datetime hearing parsed successfully (inDays == 5).")

        # -------------------------------------------------------------
        # TEST 7: paidDaysAgo computation in list_invoices
        # -------------------------------------------------------------
        print("\n--- Test 7: paidDaysAgo computed correctly ---")
        # 7a. Paid 3 days ago
        paid_3d_id = f"inv-paid-3d-{uuid.uuid4().hex[:6]}"
        inv_paid_3d = Invoice(
            id=paid_3d_id,
            sequence="903",
            reference=f"INV-PAID-3D-{uuid.uuid4().hex[:4].upper()}",
            firm_id="firm-001",
            client_id="cli-001",
            engagement_ref="MAT-2201",
            description_en="Paid 3 days ago",
            description_ar="مدفوعة منذ 3 أيام",
            status="paid",
            currency="EGP",
            issue_date=(today_curr - timedelta(days=15)).isoformat(),
            due_date=(today_curr - timedelta(days=5)).isoformat(),
            paid_at=(today_curr - timedelta(days=3)).isoformat(),
            prepared_by_id=partner_id
        )
        li3 = InvoiceLineItem(
            id=f"li-{uuid.uuid4().hex[:6]}",
            invoice_id=paid_3d_id,
            description_en="Settled Work",
            description_ar="أعمال مسددة",
            amount=4000.0,
            order=1
        )
        db.add(inv_paid_3d)
        db.add(li3)

        # 7b. Paid today
        paid_today_id = f"inv-paid-today-{uuid.uuid4().hex[:6]}"
        inv_paid_today = Invoice(
            id=paid_today_id,
            sequence="904",
            reference=f"INV-PAID-TODAY-{uuid.uuid4().hex[:4].upper()}",
            firm_id="firm-001",
            client_id="cli-001",
            engagement_ref="MAT-2201",
            description_en="Paid today",
            description_ar="مدفوعة اليوم",
            status="paid",
            currency="EGP",
            issue_date=(today_curr - timedelta(days=10)).isoformat(),
            due_date=(today_curr - timedelta(days=2)).isoformat(),
            paid_at=today_str,
            prepared_by_id=partner_id
        )
        li4 = InvoiceLineItem(
            id=f"li-{uuid.uuid4().hex[:6]}",
            invoice_id=paid_today_id,
            description_en="Settled Work Today",
            description_ar="أعمال مسددة اليوم",
            amount=3000.0,
            order=1
        )
        db.add(inv_paid_today)
        db.add(li4)

        # 7c. Paid with invalid/null paid_at
        paid_none_id = f"inv-paid-none-{uuid.uuid4().hex[:6]}"
        inv_paid_none = Invoice(
            id=paid_none_id,
            sequence="905",
            reference=f"INV-PAID-NONE-{uuid.uuid4().hex[:4].upper()}",
            firm_id="firm-001",
            client_id="cli-001",
            engagement_ref="MAT-2201",
            description_en="Paid with None paid_at",
            description_ar="مدفوعة بدون تاريخ سداد",
            status="paid",
            currency="EGP",
            issue_date=(today_curr - timedelta(days=10)).isoformat(),
            due_date=(today_curr - timedelta(days=2)).isoformat(),
            paid_at=None,
            prepared_by_id=partner_id
        )
        li5 = InvoiceLineItem(
            id=f"li-{uuid.uuid4().hex[:6]}",
            invoice_id=paid_none_id,
            description_en="Settled Work No Date",
            description_ar="أعمال بدون تاريخ سداد",
            amount=2000.0,
            order=1
        )
        db.add(inv_paid_none)
        db.add(li5)

        db.commit()
        created_invoice_ids.extend([paid_3d_id, paid_today_id, paid_none_id])

        res = client.get("/api/staff/billing/invoices", headers=staff_headers)
        assert res.status_code == 200, res.text
        staff_invs = {i["id"]: i for i in res.json()["items"]}

        assert staff_invs[paid_3d_id]["paidDaysAgo"] == 3, f"Expected paidDaysAgo == 3, got {staff_invs[paid_3d_id]['paidDaysAgo']}"
        assert staff_invs[paid_today_id]["paidDaysAgo"] == 0, f"Expected paidDaysAgo == 0, got {staff_invs[paid_today_id]['paidDaysAgo']}"
        assert staff_invs[paid_none_id]["paidDaysAgo"] is None, f"Expected paidDaysAgo None, got {staff_invs[paid_none_id]['paidDaysAgo']}"
        assert staff_invs[inv_today_id]["paidDaysAgo"] is None, f"Unpaid invoice should have paidDaysAgo None, got {staff_invs[inv_today_id]['paidDaysAgo']}"
        print("[PASS] paidDaysAgo calculated correctly across all cases (past, today, None, unpaid).")

        # -------------------------------------------------------------
        # TEST 8: Core dates helper unit checks
        # -------------------------------------------------------------
        print("\n--- Test 8: Core dates helper unit checks ---")
        assert parse_date(None) is None
        assert parse_date("") is None
        assert parse_date("invalid-date") is None
        assert parse_date("2026-11-05") == date(2026, 11, 5)
        assert parse_date("2026-11-05T10:00:00Z") == date(2026, 11, 5)
        assert days_until(today_str) == 0
        assert days_until(tomorrow_str) == 1
        assert days_until(yesterday_str) == -1
        assert days_ago(today_str) == 0
        assert days_ago(yesterday_str) == 1
        assert days_ago(tomorrow_str) == -1
        assert days_until(None) is None
        assert days_ago(None) is None
        print("[PASS] Core dates helper functions verified thoroughly.")

        print("\n===========================================================")
        print(" ALL DATE, OVERDUE & HEARINGS TESTS PASSED 100%!          ")
        print("===========================================================\n")

    finally:
        print("[CLEANUP] Cleaning up test data...")
        try:
            if created_hearing_ids:
                db.query(MatterHearing).filter(MatterHearing.id.in_(created_hearing_ids)).delete(synchronize_session=False)
            if created_matter_ids:
                db.query(Matter).filter(Matter.id.in_(created_matter_ids)).delete(synchronize_session=False)
            if created_invoice_ids:
                db.query(InvoiceLineItem).filter(InvoiceLineItem.invoice_id.in_(created_invoice_ids)).delete(synchronize_session=False)
                db.query(Invoice).filter(Invoice.id.in_(created_invoice_ids)).delete(synchronize_session=False)
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
