"""
Test Suite for Invoice Transitions & Client Visibility Fixes.
Verifies:
1. Clients cannot access draft/pending_approval invoices (returns 404).
2. Client matter details do not include draft/pending_approval invoices.
3. Cannot issue a paid or due invoice (returns 409).
4. Cannot issue an invoice without line items (returns 409).
5. Cannot mark a draft invoice as paid directly (returns 409).
6. Cannot mark an already-paid invoice as paid twice (returns 409).
7. The normal invoice lifecycle (draft -> issue -> mark-paid) works end-to-end.
8. (TASK 1) Client list, summary, and engagements endpoints exclude pending_approval invoices.
9. All invoices created during tests are deleted at the end.
"""
import sys
import os
import uuid

# Ensure clean UTF-8 output
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# Include backend in sys.path
sys.path.insert(0, os.path.abspath("backend"))

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.models.invoice import Invoice, InvoiceLineItem
from app.models.matter import Matter

client = TestClient(app)


def test_invoice_fixes():
    print("\n=== STARTING INVOICE TRANSITIONS & VISIBILITY TESTS ===")

    created_invoice_ids = []

    # 1. Authenticate users
    login_p = client.post("/api/auth/login", json={"email": "partner@mr-law.eg", "password": "password123"})
    assert login_p.status_code == 200, "Partner login failed"
    partner_id = login_p.json()["user"]["id"]
    staff_headers = {"Authorization": f"Bearer {login_p.json()['access_token']}"}

    login_c = client.post("/api/auth/login", json={"email": "client@mr-law.eg", "password": "password123"})
    assert login_c.status_code == 200, "Client login failed"
    client_headers = {"Authorization": f"Bearer {login_c.json()['access_token']}"}

    db = SessionLocal()
    try:
        matter = db.query(Matter).filter(Matter.client_id == "cli-001").first()
        assert matter is not None, "Matter for cli-001 not found"
        matter_ref = matter.reference

        # --- A. Setup Draft Invoice for testing ---
        res_draft = client.post("/api/staff/billing/drafts", headers=staff_headers, json={
            "engagementRef": matter_ref,
            "description": "Draft Invoice for Automated Verification",
            "lines": [
                {"description": "Legal Consultation", "amount": 15000, "minutes": 120}
            ]
        })
        assert res_draft.status_code == 201, res_draft.text
        draft_ref = res_draft.json()["reference"]
        draft_id = res_draft.json()["id"]
        created_invoice_ids.append(draft_id)
        print(f"[SETUP] Created Draft Invoice: {draft_ref} (ID: {draft_id})")

        # --- TEST 1: Client requests a draft invoice -> 404 ---
        print("\n--- Test 1: Client requests draft invoice detail -> 404 ---")
        res1_ref = client.get(f"/api/client/invoices/{draft_ref}", headers=client_headers)
        assert res1_ref.status_code == 404, f"Expected 404 for draft by ref, got {res1_ref.status_code}"
        print(f"[PASS] Client request by reference returned 404: {res1_ref.json()['detail']}")

        res1_id = client.get(f"/api/client/invoices/{draft_id}", headers=client_headers)
        assert res1_id.status_code == 404, f"Expected 404 for draft by id, got {res1_id.status_code}"
        print(f"[PASS] Client request by id returned 404: {res1_id.json()['detail']}")

        # --- TEST 2: Client matter detail does not include draft invoices ---
        print("\n--- Test 2: Client matter detail does not include draft invoices ---")
        res2 = client.get(f"/api/client/matters/{matter_ref}", headers=client_headers)
        assert res2.status_code == 200, res2.text
        matter_invoices = res2.json().get("invoices", [])
        draft_invoices_found = [inv for inv in matter_invoices if inv["status"] in ["draft", "pending_approval"]]
        assert len(draft_invoices_found) == 0, f"Found draft invoices in client matter detail: {draft_invoices_found}"
        assert not any(inv["reference"] == draft_ref for inv in matter_invoices), "Created draft invoice leaked into client matter"
        print(f"[PASS] Client matter detail contains {len(matter_invoices)} invoices, 0 drafts/pending_approval.")

        # --- TEST 3: Cannot issue an invoice without line items -> 409 ---
        print("\n--- Test 3: Issue invoice without line items -> 409 ---")
        empty_id = f"inv-empty-{uuid.uuid4().hex[:6]}"
        empty_inv = Invoice(
            id=empty_id,
            sequence="999",
            reference=f"INV-EMPTY-{uuid.uuid4().hex[:4]}",
            firm_id="firm-001",
            client_id="cli-001",
            engagement_ref=matter_ref,
            description_en="Empty Invoice",
            description_ar="فاتورة بدون بنود",
            status="draft",
            currency="EGP",
            issue_date="2026-11-03",
            due_date="2026-12-03",
            prepared_by_id=partner_id
        )
        db.add(empty_inv)
        db.commit()
        created_invoice_ids.append(empty_id)

        res_empty = client.post(f"/api/staff/billing/invoices/{empty_inv.reference}/issue", headers=staff_headers)
        assert res_empty.status_code == 409, f"Expected 409 for invoice without lines, got {res_empty.status_code}"
        print(f"[PASS] Reject issue without line items -> 409: {res_empty.json()['detail']}")

        # --- TEST 4: Mark a draft as paid -> 409 ---
        print("\n--- Test 4: Mark draft directly as paid -> 409 ---")
        res_mark_draft = client.post(f"/api/staff/billing/invoices/{draft_ref}/mark-paid", headers=staff_headers)
        assert res_mark_draft.status_code == 409, f"Expected 409 for mark-paid on draft, got {res_mark_draft.status_code}"
        print(f"[PASS] Reject mark-paid on draft -> 409: {res_mark_draft.json()['detail']}")

        # --- TEST 5: Normal Flow: Issue the draft invoice -> 200 ---
        print("\n--- Test 5: Normal flow: Issue draft invoice -> 200 ---")
        res_issue = client.post(f"/api/staff/billing/invoices/{draft_ref}/issue", headers=staff_headers)
        assert res_issue.status_code == 200, res_issue.text
        assert res_issue.json()["status"] == "due", f"Expected status 'due', got {res_issue.json()['status']}"
        print(f"[PASS] Issued draft invoice successfully: status is now '{res_issue.json()['status']}'")

        # --- TEST 6: Issue an already due invoice -> 409 ---
        print("\n--- Test 6: Issue an already due invoice -> 409 ---")
        res_reissue = client.post(f"/api/staff/billing/invoices/{draft_ref}/issue", headers=staff_headers)
        assert res_reissue.status_code == 409, f"Expected 409 when issuing already due invoice, got {res_reissue.status_code}"
        print(f"[PASS] Reject issuing due invoice -> 409: {res_reissue.json()['detail']}")

        # --- TEST 7: Normal Flow: Mark due invoice as paid -> 200 ---
        print("\n--- Test 7: Normal flow: Mark due invoice as paid -> 200 ---")
        res_paid = client.post(f"/api/staff/billing/invoices/{draft_ref}/mark-paid", headers=staff_headers)
        assert res_paid.status_code == 200, res_paid.text
        assert res_paid.json()["status"] == "paid", f"Expected status 'paid', got {res_paid.json()['status']}"
        print(f"[PASS] Marked invoice paid successfully: status is now '{res_paid.json()['status']}'")

        # --- TEST 8: Mark paid twice -> 409 ---
        print("\n--- Test 8: Mark invoice paid twice -> 409 ---")
        res_paid_twice = client.post(f"/api/staff/billing/invoices/{draft_ref}/mark-paid", headers=staff_headers)
        assert res_paid_twice.status_code == 409, f"Expected 409 for mark-paid twice, got {res_paid_twice.status_code}"
        print(f"[PASS] Reject mark-paid twice -> 409: {res_paid_twice.json()['detail']}")

        # --- TEST 9: Issue an already paid invoice -> 409 ---
        print("\n--- Test 9: Issue an already paid invoice -> 409 ---")
        res_issue_paid = client.post(f"/api/staff/billing/invoices/{draft_ref}/issue", headers=staff_headers)
        assert res_issue_paid.status_code == 409, f"Expected 409 when issuing paid invoice, got {res_issue_paid.status_code}"
        print(f"[PASS] Reject issuing paid invoice -> 409: {res_issue_paid.json()['detail']}")

        # --- TEST 10: Client can see the issued/paid invoice ---
        print("\n--- Test 10: Client can now see the paid invoice -> 200 ---")
        res_client_paid = client.get(f"/api/client/invoices/{draft_ref}", headers=client_headers)
        assert res_client_paid.status_code == 200, f"Client should be able to view paid invoice: {res_client_paid.text}"
        assert res_client_paid.json()["status"] == "paid"
        print(f"[PASS] Client fetched paid invoice successfully (status: paid)")

        # --- TEST 11 (TASK 1): pending_approval exclusion from list, summary, engagements ---
        print("\n--- Test 11 (TASK 1): Exclusion of pending_approval from list, summary, engagements ---")
        # 11a. Snapshot before creating pending_approval invoice
        res_list_before = client.get("/api/client/invoices", headers=client_headers)
        res_sum_before = client.get("/api/client/invoices/summary", headers=client_headers)
        assert res_list_before.status_code == 200
        assert res_sum_before.status_code == 200
        initial_balance = res_sum_before.json()["balanceDue"]
        initial_outstanding = res_sum_before.json()["outstandingCount"]

        # Create distinct pending_approval invoice directly in DB
        pending_id = f"inv-pending-{uuid.uuid4().hex[:6]}"
        pending_ref = f"INV-PENDING-{uuid.uuid4().hex[:4]}"
        pending_inv = Invoice(
            id=pending_id,
            sequence="998",
            reference=pending_ref,
            firm_id="firm-001",
            client_id="cli-001",
            engagement_ref="MAT-2201",
            description_en="Pending Approval Invoice",
            description_ar="فاتورة قيد الاعتماد",
            status="pending_approval",
            currency="EGP",
            issue_date="2026-11-03",
            due_date="2026-12-03",
            prepared_by_id=partner_id
        )
        db.add(pending_inv)
        db.commit()
        created_invoice_ids.append(pending_id)

        # Add line item
        pending_item = InvoiceLineItem(
            id=f"li-{uuid.uuid4().hex[:6]}",
            invoice_id=pending_id,
            description_en="Special Legal Advisory",
            description_ar="استشارة خاصة",
            amount=50000.0,
            order=1
        )
        db.add(pending_item)
        db.commit()

        # Check client list invoices: MUST NOT contain pending_inv
        res_list_after = client.get("/api/client/invoices", headers=client_headers)
        assert res_list_after.status_code == 200
        list_items = res_list_after.json()["items"]
        assert not any(i["reference"] == pending_ref for i in list_items), "pending_approval invoice leaked into client invoice list"
        print(f"[PASS] Client invoice list excludes pending_approval invoice ({pending_ref}).")

        # Check client invoices summary: MUST NOT include pending_inv amount or count
        res_sum_after = client.get("/api/client/invoices/summary", headers=client_headers)
        assert res_sum_after.status_code == 200
        assert res_sum_after.json()["balanceDue"] == initial_balance, "pending_approval invoice leaked into balanceDue"
        assert res_sum_after.json()["outstandingCount"] == initial_outstanding, "pending_approval invoice leaked into outstandingCount"
        print(f"[PASS] Client invoice summary excludes pending_approval amount and count.")

        # Check client invoices engagements with a dedicated engagement ref
        ded_id = f"inv-ded-{uuid.uuid4().hex[:6]}"
        ded_ref = f"INV-DED-{uuid.uuid4().hex[:4]}"
        ded_engagement = f"ENG-ISOLATED-{uuid.uuid4().hex[:4]}"
        ded_inv = Invoice(
            id=ded_id,
            sequence="997",
            reference=ded_ref,
            firm_id="firm-001",
            client_id="cli-001",
            engagement_ref=ded_engagement,
            description_en="Isolated Engagement Pending Invoice",
            description_ar="فاتورة ملف منفصل قيد الاعتماد",
            status="pending_approval",
            currency="EGP",
            issue_date="2026-11-03",
            due_date="2026-12-03",
            prepared_by_id=partner_id
        )
        db.add(ded_inv)
        db.commit()
        created_invoice_ids.append(ded_id)

        res_eng = client.get("/api/client/invoices/engagements", headers=client_headers)
        assert res_eng.status_code == 200
        eng_refs = [e["reference"] for e in res_eng.json()]
        assert ded_engagement not in eng_refs, f"pending_approval engagement {ded_engagement} leaked into client invoice engagements"
        print(f"[PASS] Client invoice engagements excludes pending_approval engagement.")

        print("\n=======================================================")
        print(" ALL INVOICE TRANSITION & VISIBILITY TESTS PASSED 100% ")
        print("=======================================================\n")

    finally:
        # Clean up every invoice created during this test run
        if created_invoice_ids:
            print(f"[CLEANUP] Deleting {len(created_invoice_ids)} test invoices created during run...")
            for inv_id in created_invoice_ids:
                inv_to_del = db.query(Invoice).filter(Invoice.id == inv_id).first()
                if inv_to_del:
                    db.delete(inv_to_del)
            db.commit()
            print("[CLEANUP] All test invoices successfully deleted from DB.")
        db.close()


if __name__ == "__main__":
    test_invoice_fixes()
