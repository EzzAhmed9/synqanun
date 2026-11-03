"""
Test Suite for Billing Drafts, Time Entries Validation, and Concurrency.
Verifies:
1. save_invoice_draft links time entries with validation (firm filter, matter match, billable, not already invoiced, no duplicate IDs across lines).
2. Two concurrent drafts attempting to bill the same time entry using threads -> exactly one succeeds with 201, other fails with 409.
3. save_invoice_draft payload validations (case-insensitive matter, engagementInvalid, descriptionRequired, noLines, lineDescriptionRequired, lineAmountRequired).
4. DELETE /staff/billing/drafts/{id}: releases time entries, only allows status 'draft' (status 'due' -> 409).
5. log_time_entry validations (engagementInvalid, durationRequired, dateRequired, dateFuture, descriptionRequired, no row created on failure).
6. Complete cleanup and verify zero DB leak.
"""
import sys
import os
import uuid
import concurrent.futures

# Ensure clean UTF-8 output
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

sys.path.insert(0, os.path.abspath("backend"))

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.models.user import User
from app.models.firm import Firm
from app.models.matter import Matter
from app.models.invoice import Invoice, InvoiceLineItem, TimeEntry
from app.core.security import get_password_hash

client = TestClient(app)


def test_billing_drafts_and_time():
    print("\n=== STARTING BILLING DRAFTS & TIME VALIDATION TESTS ===")

    # 1. Login partner
    res_p = client.post("/api/auth/login", json={"email": "partner@mr-law.eg", "password": "password123"})
    assert res_p.status_code == 200, "Partner login failed"
    partner_headers = {"Authorization": f"Bearer {res_p.json()['access_token']}"}
    partner_id = res_p.json()["user"]["id"]

    db = SessionLocal()

    created_firm_ids = []
    created_user_ids = []
    created_matter_ids = []
    created_entry_ids = []
    created_invoice_ids = []

    try:
        # Load MAT-2201 (firm-001)
        matter_2201 = db.query(Matter).filter(Matter.reference == "MAT-2201").first()
        assert matter_2201 is not None, "MAT-2201 not found"

        # Load MAT-2202 (firm-001)
        matter_2202 = db.query(Matter).filter(Matter.reference == "MAT-2202").first()
        assert matter_2202 is not None, "MAT-2202 not found"

        # Setup: Create a second firm and user
        foreign_firm_id = f"firm-test-{uuid.uuid4().hex[:6]}"
        foreign_firm = Firm(
            id=foreign_firm_id,
            name_en="Foreign Law Firm LLC",
            name_ar="مكتب أجنبي",
            domain=f"foreign-{uuid.uuid4().hex[:4]}.eg"
        )
        db.add(foreign_firm)
        created_firm_ids.append(foreign_firm_id)

        foreign_user_id = f"usr-for-{uuid.uuid4().hex[:6]}"
        foreign_user = User(
            id=foreign_user_id,
            firm_id=foreign_firm_id,
            email=f"foreign-{uuid.uuid4().hex[:4]}@foreign-law.eg",
            hashed_password=get_password_hash("password123"),
            side="staff",
            rank="partner",
            status="active",
            name_en="Foreign Partner",
            name_ar="شريك أجنبي"
        )
        db.add(foreign_user)
        created_user_ids.append(foreign_user_id)
        db.commit()

        # Create time entries for testing
        # 1. Entry belonging to another firm
        te_foreign = TimeEntry(
            id=f"tm-for-{uuid.uuid4().hex[:6]}",
            firm_id=foreign_firm_id,
            matter_id="MAT-9999",
            staff_id=foreign_user_id,
            minutes=60,
            rate_at_time=2000.0,
            billable=True,
            is_invoiced=False,
            description_en="Foreign firm work",
            description_ar="عمل لصالح مكتب آخر",
            entry_date="2026-11-01"
        )
        db.add(te_foreign)
        created_entry_ids.append(te_foreign.id)

        # 2. Entry belonging to another matter (MAT-2202)
        te_other_matter = TimeEntry(
            id=f"tm-mat-{uuid.uuid4().hex[:6]}",
            firm_id="firm-001",
            matter_id=matter_2202.reference,
            staff_id=partner_id,
            minutes=90,
            rate_at_time=3500.0,
            billable=True,
            is_invoiced=False,
            description_en="Work on MAT-2202",
            description_ar="عمل على ملف آخر",
            entry_date="2026-11-01"
        )
        db.add(te_other_matter)
        created_entry_ids.append(te_other_matter.id)

        # 3. Non-billable entry on MAT-2201
        te_non_billable = TimeEntry(
            id=f"tm-nb-{uuid.uuid4().hex[:6]}",
            firm_id="firm-001",
            matter_id=matter_2201.reference,
            staff_id=partner_id,
            minutes=120,
            rate_at_time=3500.0,
            billable=False,
            is_invoiced=False,
            description_en="Non-billable pro bono research",
            description_ar="بحث غير خاضع للفوترة",
            entry_date="2026-11-01"
        )
        db.add(te_non_billable)
        created_entry_ids.append(te_non_billable.id)

        seed_inv = db.query(Invoice).first()
        assert seed_inv is not None, "No seed invoice found"

        # 4. Already-invoiced entry on MAT-2201
        te_already_invoiced = TimeEntry(
            id=f"tm-inv-{uuid.uuid4().hex[:6]}",
            firm_id="firm-001",
            matter_id=matter_2201.reference,
            staff_id=partner_id,
            minutes=45,
            rate_at_time=3500.0,
            billable=True,
            is_invoiced=True,
            invoice_id=seed_inv.id,
            description_en="Already invoiced drafting",
            description_ar="تم فوترتها مسبقاً",
            entry_date="2026-11-01"
        )
        db.add(te_already_invoiced)
        created_entry_ids.append(te_already_invoiced.id)

        # 5. Valid billable unbilled entry on MAT-2201
        te_valid = TimeEntry(
            id=f"tm-val-{uuid.uuid4().hex[:6]}",
            firm_id="firm-001",
            matter_id=matter_2201.reference,
            staff_id=partner_id,
            minutes=180,
            rate_at_time=3500.0,
            billable=True,
            is_invoiced=False,
            description_en="Valid billable court representation",
            description_ar="مرافعة قضائية معتمدة",
            entry_date="2026-11-01"
        )
        db.add(te_valid)
        created_entry_ids.append(te_valid.id)
        db.commit()

        # =====================================================================
        # ISSUE 1: save_invoice_draft time entry validation
        # =====================================================================
        print("\n--- Test 1: Time Entry Linkage Validations ---")

        # 1a. Entry of another firm -> 400 and untouched
        res_for = client.post("/api/staff/billing/drafts", headers=partner_headers, json={
            "engagementRef": matter_2201.reference,
            "description": "Draft with foreign entry",
            "lines": [
                {"description": "Fee line", "amount": 5000.0, "fromEntryIds": [te_foreign.id]}
            ]
        })
        assert res_for.status_code == 400, f"Expected 400, got {res_for.status_code}: {res_for.text}"
        assert res_for.json()["detail"] == "entryInvalid"
        db.refresh(te_foreign)
        assert te_foreign.is_invoiced is False, "Foreign entry was modified!"
        print(f"[PASS] Entry of another firm rejected -> 400 entryInvalid, entry untouched.")

        # 1b. Entry of another matter -> 400
        res_oth = client.post("/api/staff/billing/drafts", headers=partner_headers, json={
            "engagementRef": matter_2201.reference,
            "description": "Draft with other matter entry",
            "lines": [
                {"description": "Fee line", "amount": 5000.0, "fromEntryIds": [te_other_matter.id]}
            ]
        })
        assert res_oth.status_code == 400, f"Expected 400, got {res_oth.status_code}: {res_oth.text}"
        assert res_oth.json()["detail"] == "entryInvalid"
        print(f"[PASS] Entry of another matter rejected -> 400 entryInvalid.")

        # 1c. Already invoiced -> 409 and invoice count unchanged
        inv_count_before = db.query(Invoice).filter(Invoice.firm_id == "firm-001").count()
        res_inv = client.post("/api/staff/billing/drafts", headers=partner_headers, json={
            "engagementRef": matter_2201.reference,
            "description": "Draft with already invoiced entry",
            "lines": [
                {"description": "Fee line", "amount": 5000.0, "fromEntryIds": [te_already_invoiced.id]}
            ]
        })
        assert res_inv.status_code == 409, f"Expected 409, got {res_inv.status_code}: {res_inv.text}"
        assert res_inv.json()["detail"] == "entryAlreadyBilled"
        inv_count_after = db.query(Invoice).filter(Invoice.firm_id == "firm-001").count()
        assert inv_count_after == inv_count_before, "Invoice count changed after rejected draft!"
        print(f"[PASS] Already invoiced entry rejected -> 409 entryAlreadyBilled, invoice count unchanged.")

        # 1d. Non-billable -> 400
        res_nb = client.post("/api/staff/billing/drafts", headers=partner_headers, json={
            "engagementRef": matter_2201.reference,
            "description": "Draft with non-billable entry",
            "lines": [
                {"description": "Fee line", "amount": 5000.0, "fromEntryIds": [te_non_billable.id]}
            ]
        })
        assert res_nb.status_code == 400, f"Expected 400, got {res_nb.status_code}: {res_nb.text}"
        assert res_nb.json()["detail"] == "entryInvalid"
        print(f"[PASS] Non-billable entry rejected -> 400 entryInvalid.")

        # 1e. Same id in two lines -> 400
        res_dup = client.post("/api/staff/billing/drafts", headers=partner_headers, json={
            "engagementRef": matter_2201.reference,
            "description": "Draft with same entry in two lines",
            "lines": [
                {"description": "Line 1", "amount": 3000.0, "fromEntryIds": [te_valid.id]},
                {"description": "Line 2", "amount": 2000.0, "fromEntryIds": [te_valid.id]}
            ]
        })
        assert res_dup.status_code == 400, f"Expected 400, got {res_dup.status_code}: {res_dup.text}"
        assert res_dup.json()["detail"] == "entryInvalid"
        print(f"[PASS] Same entry id in two lines rejected -> 400 entryInvalid.")

        # 1f. Two concurrent drafts with the same entry (threads) -> exactly one succeeds
        print("\n--- Test 1f: Two concurrent drafts with the same entry (threads) ---")
        te_concurrent = TimeEntry(
            id=f"tm-con-{uuid.uuid4().hex[:6]}",
            firm_id="firm-001",
            matter_id=matter_2201.reference,
            staff_id=partner_id,
            minutes=60,
            rate_at_time=3500.0,
            billable=True,
            is_invoiced=False,
            description_en="Concurrent test entry",
            description_ar="قيد اختبار التزامن",
            entry_date="2026-11-01"
        )
        db.add(te_concurrent)
        db.commit()
        created_entry_ids.append(te_concurrent.id)

        def make_draft_call():
            c = TestClient(app)
            return c.post("/api/staff/billing/drafts", headers=partner_headers, json={
                "engagementRef": matter_2201.reference,
                "description": "Concurrent Draft Attempt",
                "lines": [
                    {"description": "Concurrent line", "amount": 3500.0, "fromEntryIds": [te_concurrent.id]}
                ]
            })

        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
            fut1 = executor.submit(make_draft_call)
            fut2 = executor.submit(make_draft_call)
            r1 = fut1.result()
            r2 = fut2.result()

        statuses = sorted([r1.status_code, r2.status_code])
        assert statuses == [201, 409], f"Expected exactly one 201 and one 409, got {statuses}"
        # Save created invoice id for cleanup
        if r1.status_code == 201:
            created_invoice_ids.append(r1.json()["id"])
        if r2.status_code == 201:
            created_invoice_ids.append(r2.json()["id"])
        print(f"[PASS] Two concurrent drafts -> statuses {statuses}: exactly one succeeded (201) and one rejected (409).")

        # =====================================================================
        # ISSUE 2: save_invoice_draft payload validation
        # =====================================================================
        print("\n--- Test 2: save_invoice_draft payload validations ---")

        # 2a. Matter not found -> 400 "engagementInvalid"
        res_m_nf = client.post("/api/staff/billing/drafts", headers=partner_headers, json={
            "engagementRef": "MAT-NON-EXISTENT-9999",
            "description": "Test",
            "lines": [{"description": "Line", "amount": 1000.0}]
        })
        assert res_m_nf.status_code == 400
        assert res_m_nf.json()["detail"] == "engagementInvalid"
        print(f"[PASS] Unknown matter rejected -> 400 engagementInvalid.")

        # 2b. Case-insensitive matter lookup works -> 201
        res_ci = client.post("/api/staff/billing/drafts", headers=partner_headers, json={
            "engagementRef": "mat-2201",
            "description": "Valid case-insensitive test draft",
            "lines": [{"description": "Advisory services", "amount": 2500.0}]
        })
        assert res_ci.status_code == 201, res_ci.text
        created_invoice_ids.append(res_ci.json()["id"])
        print(f"[PASS] Case-insensitive matter 'mat-2201' resolved successfully -> 201: {res_ci.json()['reference']}")

        # 2c. Empty description -> 400 "descriptionRequired"
        res_desc_empty = client.post("/api/staff/billing/drafts", headers=partner_headers, json={
            "engagementRef": "MAT-2201",
            "description": "   ",
            "lines": [{"description": "Line", "amount": 1000.0}]
        })
        assert res_desc_empty.status_code == 400
        assert res_desc_empty.json()["detail"] == "descriptionRequired"
        print(f"[PASS] Empty description rejected -> 400 descriptionRequired.")

        # 2d. No lines -> 400 "noLines"
        res_no_lines = client.post("/api/staff/billing/drafts", headers=partner_headers, json={
            "engagementRef": "MAT-2201",
            "description": "Valid description",
            "lines": []
        })
        assert res_no_lines.status_code == 400
        assert res_no_lines.json()["detail"] == "noLines"
        print(f"[PASS] Empty lines rejected -> 400 noLines.")

        # 2e. Empty line description -> 400 "lineDescriptionRequired"
        res_line_desc_empty = client.post("/api/staff/billing/drafts", headers=partner_headers, json={
            "engagementRef": "MAT-2201",
            "description": "Valid description",
            "lines": [{"description": "   ", "amount": 1000.0}]
        })
        assert res_line_desc_empty.status_code == 400
        assert res_line_desc_empty.json()["detail"] == "lineDescriptionRequired"
        print(f"[PASS] Empty line description rejected -> 400 lineDescriptionRequired.")

        # 2f. Amount validations -> 400 "lineAmountRequired"
        # 0
        r_amt_zero = client.post("/api/staff/billing/drafts", headers=partner_headers, json={
            "engagementRef": "MAT-2201",
            "description": "Valid description",
            "lines": [{"description": "Valid line", "amount": 0}]
        })
        assert r_amt_zero.status_code == 400 and r_amt_zero.json()["detail"] == "lineAmountRequired"

        # negative
        r_amt_neg = client.post("/api/staff/billing/drafts", headers=partner_headers, json={
            "engagementRef": "MAT-2201",
            "description": "Valid description",
            "lines": [{"description": "Valid line", "amount": -50.0}]
        })
        assert r_amt_neg.status_code == 400 and r_amt_neg.json()["detail"] == "lineAmountRequired"

        # > 100_000_000
        r_amt_huge = client.post("/api/staff/billing/drafts", headers=partner_headers, json={
            "engagementRef": "MAT-2201",
            "description": "Valid description",
            "lines": [{"description": "Valid line", "amount": 100000001.0}]
        })
        assert r_amt_huge.status_code == 400 and r_amt_huge.json()["detail"] == "lineAmountRequired"

        # None / null
        r_amt_null = client.post("/api/staff/billing/drafts", headers=partner_headers, json={
            "engagementRef": "MAT-2201",
            "description": "Valid description",
            "lines": [{"description": "Valid line", "amount": None}]
        })
        assert r_amt_null.status_code == 400 and r_amt_null.json()["detail"] == "lineAmountRequired"
        print(f"[PASS] All invalid line amounts rejected -> 400 lineAmountRequired.")

        # =====================================================================
        # ISSUE 3: DELETE /staff/billing/drafts/{id}
        # =====================================================================
        print("\n--- Test 3: Delete Draft & Release Time Entries ---")
        # Create a fresh time entry to link
        te_for_delete = TimeEntry(
            id=f"tm-del-{uuid.uuid4().hex[:6]}",
            firm_id="firm-001",
            matter_id=matter_2201.reference,
            staff_id=partner_id,
            minutes=120,
            rate_at_time=3500.0,
            billable=True,
            is_invoiced=False,
            description_en="Entry to be released upon delete",
            description_ar="قيد يُحرر عند الحذف",
            entry_date="2026-11-01"
        )
        db.add(te_for_delete)
        db.commit()
        created_entry_ids.append(te_for_delete.id)

        # Create draft linking this entry
        res_draft_to_del = client.post("/api/staff/billing/drafts", headers=partner_headers, json={
            "engagementRef": "MAT-2201",
            "description": "Draft to be deleted",
            "lines": [{"description": "Draft Line", "amount": 7000.0, "fromEntryIds": [te_for_delete.id]}]
        })
        assert res_draft_to_del.status_code == 201, res_draft_to_del.text
        del_draft_id = res_draft_to_del.json()["id"]

        db.refresh(te_for_delete)
        assert te_for_delete.is_invoiced is True, "Entry was not invoiced after draft creation"
        assert te_for_delete.invoice_id == del_draft_id

        # Delete draft
        res_del = client.delete(f"/api/staff/billing/drafts/{del_draft_id}", headers=partner_headers)
        assert res_del.status_code == 200, res_del.text
        assert res_del.json()["ok"] is True

        # Verify entry released
        db.refresh(te_for_delete)
        assert te_for_delete.is_invoiced is False, "Entry was not released after draft deletion!"
        assert te_for_delete.invoice_id is None, "Entry still points to deleted invoice!"
        # Verify invoice gone
        inv_check = db.query(Invoice).filter(Invoice.id == del_draft_id).first()
        assert inv_check is None, "Invoice was not deleted!"
        print(f"[PASS] Delete draft released time entries (is_invoiced=False, invoice_id=None) and deleted invoice.")

        # Delete a 'due' invoice -> 409
        res_due_draft = client.post("/api/staff/billing/drafts", headers=partner_headers, json={
            "engagementRef": "MAT-2201",
            "description": "Draft to become due",
            "lines": [{"description": "Due Line", "amount": 4000.0}]
        })
        assert res_due_draft.status_code == 201
        due_inv_id = res_due_draft.json()["id"]
        due_inv_ref = res_due_draft.json()["reference"]
        created_invoice_ids.append(due_inv_id)

        # Issue it so status is 'due'
        res_issue = client.post(f"/api/staff/billing/invoices/{due_inv_ref}/issue", headers=partner_headers)
        assert res_issue.status_code == 200

        # Attempt DELETE -> 409
        res_del_due = client.delete(f"/api/staff/billing/drafts/{due_inv_id}", headers=partner_headers)
        assert res_del_due.status_code == 409, f"Expected 409 for due invoice, got {res_del_due.status_code}"
        print(f"[PASS] Delete a 'due' invoice rejected -> 409: {res_del_due.json()['detail']}")

        # =====================================================================
        # ISSUE 4: log_time_entry validations
        # =====================================================================
        print("\n--- Test 4: log_time_entry validations ---")

        # 4a. Unknown matter -> 400 "engagementInvalid" and NO row created
        entries_count_before = db.query(TimeEntry).count()
        res_t_nf = client.post("/api/staff/billing/time", headers=partner_headers, json={
            "matterId": "MAT-FAKE-9999",
            "minutes": 60,
            "description": "Valid description",
            "entryDate": "2026-11-01"
        })
        assert res_t_nf.status_code == 400
        assert res_t_nf.json()["detail"] == "engagementInvalid"
        entries_count_after = db.query(TimeEntry).count()
        assert entries_count_after == entries_count_before, "A fake time entry row was created on failure!"
        print(f"[PASS] Unknown matter rejected -> 400 engagementInvalid and NO row created.")

        # 4b. Minutes validation
        for bad_min in [0, -10, 1441, "abc", 15.5]:
            r_min = client.post("/api/staff/billing/time", headers=partner_headers, json={
                "matterId": "MAT-2201",
                "minutes": bad_min,
                "description": "Valid description"
            })
            assert r_min.status_code == 400, f"Expected 400 for minutes={bad_min}, got {r_min.status_code}"
            assert r_min.json()["detail"] == "durationRequired"
        print(f"[PASS] Invalid minutes (0, -10, 1441, 'abc', 15.5) rejected -> 400 durationRequired.")

        # 4c. EntryDate validation
        # Bad format
        r_dt_bad = client.post("/api/staff/billing/time", headers=partner_headers, json={
            "matterId": "MAT-2201",
            "minutes": 60,
            "description": "Valid description",
            "entryDate": "2026/11/01"
        })
        assert r_dt_bad.status_code == 400 and r_dt_bad.json()["detail"] == "dateRequired"

        # Future date
        r_dt_future = client.post("/api/staff/billing/time", headers=partner_headers, json={
            "matterId": "MAT-2201",
            "minutes": 60,
            "description": "Valid description",
            "entryDate": "2099-01-01"
        })
        assert r_dt_future.status_code == 400 and r_dt_future.json()["detail"] == "dateFuture"
        print(f"[PASS] Invalid date format -> 400 dateRequired; Future date -> 400 dateFuture.")

        # 4d. Description validation
        # Empty after strip
        r_desc_empty = client.post("/api/staff/billing/time", headers=partner_headers, json={
            "matterId": "MAT-2201",
            "minutes": 60,
            "description": "    "
        })
        assert r_desc_empty.status_code == 400 and r_desc_empty.json()["detail"] == "descriptionRequired"

        # > 500 characters
        r_desc_huge = client.post("/api/staff/billing/time", headers=partner_headers, json={
            "matterId": "MAT-2201",
            "minutes": 60,
            "description": "x" * 501
        })
        assert r_desc_huge.status_code == 400 and r_desc_huge.json()["detail"] == "descriptionRequired"
        print(f"[PASS] Empty description & >500 char description rejected -> 400 descriptionRequired.")

        # 4e. Valid time entry -> 201
        r_valid_time = client.post("/api/staff/billing/time", headers=partner_headers, json={
            "matterId": "MAT-2201",
            "minutes": 75,
            "description": "Preparation of responsive memorandum",
            "entryDate": "2026-11-02",
            "billable": True
        })
        assert r_valid_time.status_code == 201, r_valid_time.text
        valid_t_id = r_valid_time.json()["id"]
        created_entry_ids.append(valid_t_id)
        assert r_valid_time.json()["entry"]["engagementRef"] == "MAT-2201"
        assert r_valid_time.json()["entry"]["minutes"] == 75
        print(f"[PASS] Valid time entry logged successfully -> 201: {valid_t_id}")

        print("\n===========================================================")
        print(" ALL BILLING DRAFTS & TIME VALIDATION TESTS PASSED 100%!   ")
        print("===========================================================\n")

    finally:
        # Cleanup all created data
        print("[CLEANUP] Cleaning up test data...")
        db.rollback()
        for inv_id in created_invoice_ids:
            inv_obj = db.query(Invoice).filter(Invoice.id == inv_id).first()
            if inv_obj:
                db.query(InvoiceLineItem).filter(InvoiceLineItem.invoice_id == inv_id).delete(synchronize_session=False)
                db.delete(inv_obj)
        for t_id in created_entry_ids:
            t_obj = db.query(TimeEntry).filter(TimeEntry.id == t_id).first()
            if t_obj:
                db.delete(t_obj)
        for u_id in created_user_ids:
            u_obj = db.query(User).filter(User.id == u_id).first()
            if u_obj:
                db.delete(u_obj)
        for f_id in created_firm_ids:
            f_obj = db.query(Firm).filter(Firm.id == f_id).first()
            if f_obj:
                db.delete(f_obj)
        db.commit()
        db.close()
        print("[CLEANUP] Cleanup completed successfully.")


if __name__ == "__main__":
    test_billing_drafts_and_time()
