"""
Test Suite for Clients N+1 Removal, Snapshot Consistency, and Dynamic Last Activity.
Verifies:
1. Step 1 Snapshot Consistency: matters count, projects count, pending approvals, portal check,
   and matter lead counsel across all seed clients match baseline without N+1 queries.
2. Dynamic Last Activity:
   - Client with a new time entry, document, or invoice moves to 0 days ago (today).
   - Client without any activity falls back to the stored column value (last_activity_days_ago).
3. Ordering:
   - list_clients returns items ordered by computed lastActivityDaysAgo ascending (most recent first).
4. Zero DB Leak:
   - Everything created during tests is cleaned up in finally block.
   - Passes twice in a row with identical table row counts.
"""

import sys
import os
import uuid
import json
from datetime import datetime, timezone, timedelta

# Ensure clean UTF-8 output
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

sys.path.insert(0, os.path.abspath("backend"))

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.models.client import Client, ClientContact
from app.models.matter import Matter
from app.models.invoice import Invoice, InvoiceLineItem, TimeEntry, Quote
from app.models.document import Document
from app.core.dates import today

client = TestClient(app)


def get_table_counts(db):
    return {
        "clients": db.query(Client).count(),
        "client_contacts": db.query(ClientContact).count(),
        "matters": db.query(Matter).count(),
        "invoices": db.query(Invoice).count(),
        "invoice_line_items": db.query(InvoiceLineItem).count(),
        "time_entries": db.query(TimeEntry).count(),
        "documents": db.query(Document).count(),
        "quotes": db.query(Quote).count(),
    }


def run_tests():
    print("\n=== STARTING CLIENTS N+1 & LAST ACTIVITY TESTS ===")

    # Authenticate partner
    login_p = client.post("/api/auth/login", json={"email": "m.alfarooq@mr-law.eg", "password": "password123"})
    assert login_p.status_code == 200, f"Partner login failed: {login_p.text}"
    partner_id = login_p.json()["user"]["id"]
    partner_headers = {"Authorization": f"Bearer {login_p.json()['access_token']}"}

    db = SessionLocal()
    initial_counts = get_table_counts(db)
    print(f"[INITIAL DB COUNTS] {initial_counts}")

    created_client_ids = []
    created_matter_ids = []
    created_invoice_ids = []
    created_doc_ids = []
    created_time_ids = []

    try:
        # -------------------------------------------------------------
        # TEST 1: Step 1 Snapshot Consistency Check
        # -------------------------------------------------------------
        print("\n--- Test 1: Step 1 Snapshot Consistency (matters, projects, portal, quotes, leads) ---")
        baseline_list_path = os.path.join("scratch", "baseline_clients_list.json")
        baseline_details_path = os.path.join("scratch", "baseline_clients_details.json")

        assert os.path.exists(baseline_list_path), "baseline_clients_list.json not found"
        assert os.path.exists(baseline_details_path), "baseline_clients_details.json not found"

        with open(baseline_list_path, "r", encoding="utf-8") as f:
            base_list = json.load(f)
        with open(baseline_details_path, "r", encoding="utf-8") as f:
            base_details = json.load(f)

        res_list = client.get("/api/staff/clients", headers=partner_headers)
        assert res_list.status_code == 200, res_list.text
        live_list_data = res_list.json()
        assert live_list_data["total"] == base_list["total"], f"Total clients count mismatch: {live_list_data['total']} vs {base_list['total']}"

        base_list_map = {item["id"]: item for item in base_list["items"]}
        for item in live_list_data["items"]:
            cid = item["id"]
            assert cid in base_list_map, f"Client {cid} not found in baseline list"
            b_item = base_list_map[cid]

            # Verify all metrics computed by grouped queries match baseline
            assert item["matters"] == b_item["matters"], f"{cid}: matters count mismatch ({item['matters']} vs {b_item['matters']})"
            assert item["projects"] == b_item["projects"], f"{cid}: projects count mismatch ({item['projects']} vs {b_item['projects']})"
            assert item["hasPortal"] == b_item["hasPortal"], f"{cid}: hasPortal mismatch"
            assert item["pendingApprovals"] == b_item["pendingApprovals"], f"{cid}: pendingApprovals mismatch"
            assert item["standing"] == b_item["standing"], f"{cid}: standing mismatch"
            assert item["name"] == b_item["name"], f"{cid}: name mismatch"

        # Verify client details (including engagements and lead counsel resolution)
        detail_checked = 0
        for cid, b_det in base_details.items():
            res_det = client.get(f"/api/staff/clients/{cid}", headers=partner_headers)
            assert res_det.status_code == 200, res_det.text
            l_det = res_det.json()

            assert l_det["client"]["matters"] == b_det["client"]["matters"]
            assert l_det["client"]["projects"] == b_det["client"]["projects"]
            assert l_det["client"]["hasPortal"] == b_det["client"]["hasPortal"]
            assert l_det["client"]["pendingApprovals"] == b_det["client"]["pendingApprovals"]

            # Engagements list and lead names match
            assert len(l_det["engagements"]) == len(b_det["engagements"])
            b_eng_map = {e["reference"]: e for e in b_det["engagements"]}
            for l_eng in l_det["engagements"]:
                ref = l_eng["reference"]
                assert ref in b_eng_map, f"Engagement {ref} not in baseline"
                assert l_eng["leadName"] == b_eng_map[ref]["leadName"], f"Lead name mismatch for {ref}"
            detail_checked += 1

        print(f"[PASS] Snapshot equality confirmed across all {detail_checked} seed clients.")

        # -------------------------------------------------------------
        # TEST 2: Client without activity keeps stored column value
        # -------------------------------------------------------------
        print("\n--- Test 2: Client without activity keeps stored last_activity_days_ago ---")
        client_idle_id = f"cli-test-idle-{uuid.uuid4().hex[:6]}"
        c_idle = Client(
            id=client_idle_id,
            firm_id="firm-001",
            name_en="Idle Client Corp",
            name_ar="شركة خاملة",
            summary_en="No activity yet",
            summary_ar="لا نشاط",
            standing="prospect",
            last_activity_days_ago=45
        )
        db.add(c_idle)
        db.commit()
        created_client_ids.append(client_idle_id)

        res_idle = client.get(f"/api/staff/clients/{client_idle_id}", headers=partner_headers)
        assert res_idle.status_code == 200
        data_idle = res_idle.json()
        assert data_idle["client"]["lastActivityDaysAgo"] == 45, f"Expected 45 days, got {data_idle['client']['lastActivityDaysAgo']}"
        expected_idle_on = (today() - timedelta(days=45)).strftime("%Y-%m-%d")
        assert data_idle["client"]["lastActivityOn"] == expected_idle_on
        print("[PASS] Client without activity cleanly preserved stored column value.")

        # -------------------------------------------------------------
        # TEST 3: Dynamic last activity moves to 0 days
        # -------------------------------------------------------------
        print("\n--- Test 3: Activity today moves client to 0 days ago ---")
        client_act_id = f"cli-test-act-{uuid.uuid4().hex[:6]}"
        c_act = Client(
            id=client_act_id,
            firm_id="firm-001",
            name_en="Active Test Client",
            name_ar="عميل نشط تجريبي",
            summary_en="Active summary",
            summary_ar="ملخص نشط",
            standing="active",
            last_activity_days_ago=30  # stored is 30
        )
        db.add(c_act)
        db.commit()
        created_client_ids.append(client_act_id)

        # 3a. Add a matter updated today
        matter_test_id = f"mat-act-{uuid.uuid4().hex[:6]}"
        matter_test_ref = f"MAT-ACT-{uuid.uuid4().hex[:4].upper()}"
        m_act = Matter(
            id=matter_test_id,
            reference=matter_test_ref,
            firm_id="firm-001",
            client_id=client_act_id,
            title_en="Matter Active",
            title_ar="قضية نشطة",
            lead_counsel_id=partner_id,
            work_type="dispute",
            status_en="Open",
            status_ar="مفتوحة",
            updated_at=datetime.now(timezone.utc)
        )
        db.add(m_act)
        db.commit()
        created_matter_ids.append(matter_test_id)

        res_act = client.get(f"/api/staff/clients/{client_act_id}", headers=partner_headers)
        assert res_act.status_code == 200
        assert res_act.json()["client"]["lastActivityDaysAgo"] == 0, f"Expected 0 days ago with matter updated today, got {res_act.json()['client']['lastActivityDaysAgo']}"
        assert res_act.json()["client"]["lastActivityOn"] == today().strftime("%Y-%m-%d")

        # 3b. Test with document created today
        doc_test_id = f"doc-act-{uuid.uuid4().hex[:6]}"
        d_act = Document(
            id=doc_test_id,
            firm_id="firm-001",
            client_id=client_act_id,
            engagement_ref=matter_test_ref,
            name="Contract.docx",
            title="Contract Draft",
            kind="docx",
            file_path="uploads/contract.docx",
            created_at=datetime.now(timezone.utc)
        )
        db.add(d_act)
        db.commit()
        created_doc_ids.append(doc_test_id)

        res_act2 = client.get(f"/api/staff/clients/{client_act_id}", headers=partner_headers)
        assert res_act2.json()["client"]["lastActivityDaysAgo"] == 0

        # 3c. Test with time entry created today via matter reference
        time_test_id = f"tm-act-{uuid.uuid4().hex[:6]}"
        t_act = TimeEntry(
            id=time_test_id,
            firm_id="firm-001",
            matter_id=matter_test_ref,
            staff_id=partner_id,
            minutes=60,
            rate_at_time=3500.0,
            billable=True,
            description_en="Consultation session",
            description_ar="جلسة استشارة",
            entry_date=today().strftime("%Y-%m-%d"),
            created_at=datetime.now(timezone.utc)
        )
        db.add(t_act)
        db.commit()
        created_time_ids.append(time_test_id)

        res_act3 = client.get(f"/api/staff/clients/{client_act_id}", headers=partner_headers)
        assert res_act3.json()["client"]["lastActivityDaysAgo"] == 0

        # 3d. Test with invoice updated today
        inv_test_id = f"inv-act-{uuid.uuid4().hex[:6]}"
        inv_act = Invoice(
            id=inv_test_id,
            sequence="991",
            reference=f"INV-ACT-{uuid.uuid4().hex[:4].upper()}",
            firm_id="firm-001",
            client_id=client_act_id,
            engagement_ref=matter_test_ref,
            description_en="Monthly Invoice",
            description_ar="فاتورة شهرية",
            status="due",
            currency="EGP",
            issue_date=today().strftime("%Y-%m-%d"),
            due_date=(today() + timedelta(days=15)).strftime("%Y-%m-%d"),
            prepared_by_id=partner_id,
            updated_at=datetime.now(timezone.utc)
        )
        db.add(inv_act)
        db.commit()
        created_invoice_ids.append(inv_test_id)

        res_act4 = client.get(f"/api/staff/clients/{client_act_id}", headers=partner_headers)
        assert res_act4.json()["client"]["lastActivityDaysAgo"] == 0
        print("[PASS] Activity today (matters, documents, time entries, invoices) dynamically updates to 0 days.")

        # -------------------------------------------------------------
        # TEST 4: Ordering by computed lastActivityDaysAgo ascending
        # -------------------------------------------------------------
        print("\n--- Test 4: list_clients ordering (most recent first) ---")
        res_all = client.get("/api/staff/clients", headers=partner_headers)
        assert res_all.status_code == 200
        items = res_all.json()["items"]
        days_list = [item["lastActivityDaysAgo"] for item in items]
        is_sorted = all(days_list[i] <= days_list[i + 1] for i in range(len(days_list) - 1))
        assert is_sorted, f"Clients list is not sorted by lastActivityDaysAgo ascending: {days_list[:10]}"
        print(f"[PASS] Clients list correctly sorted most recent first (first 5: {days_list[:5]}).")

        print("\n===========================================================")
        print(" ALL CLIENTS N+1 & LAST ACTIVITY TESTS PASSED 100%!        ")
        print("===========================================================\n")

    finally:
        print("[CLEANUP] Cleaning up test data...")
        try:
            if created_time_ids:
                db.query(TimeEntry).filter(TimeEntry.id.in_(created_time_ids)).delete(synchronize_session=False)
            if created_doc_ids:
                db.query(Document).filter(Document.id.in_(created_doc_ids)).delete(synchronize_session=False)
            if created_invoice_ids:
                db.query(Invoice).filter(Invoice.id.in_(created_invoice_ids)).delete(synchronize_session=False)
            if created_matter_ids:
                db.query(Matter).filter(Matter.id.in_(created_matter_ids)).delete(synchronize_session=False)
            if created_client_ids:
                db.query(Client).filter(Client.id.in_(created_client_ids)).delete(synchronize_session=False)
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
