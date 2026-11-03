"""
Test Suite for Client Validation, Contacts Validation, Wildcards, Duplicates, and IDs.
Verifies:
1. Wildcard name does not match others (ilike escape in search and exact match in duplicate check).
2. Duplicate by exact name in each language (case/space insensitive) -> 409 {"ok": False, "error": "duplicate"}.
3. Empty name -> 400.
4. Invalid standing -> 400; valid standings (retainer, active, prospect, goodStanding case-insensitive) -> OK.
5. Contact validation:
   - Empty name -> 400.
   - Bad email pattern -> 400.
   - Duplicate email within same client (case-insensitive) -> 409.
   - Duplicate email on a different client -> allowed.
   - Invalid role -> 400; invalid status -> 400.
   - Valid role (admin, member) and status (active, invited) -> OK.
6. Short random IDs: New client and contact IDs use 12 hex characters (e.g. cli-xxxxxxxxxxxx).
7. Zero DB leak: All created records deleted, passes twice with identical counts.
"""

import sys
import os
import uuid

# Ensure clean UTF-8 output
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

sys.path.insert(0, os.path.abspath("backend"))

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.models.client import Client, ClientContact
from app.models.user import User

client = TestClient(app)


def get_table_counts(db):
    return {
        "clients": db.query(Client).count(),
        "client_contacts": db.query(ClientContact).count(),
    }


def run_tests():
    print("\n=== STARTING CLIENTS & CONTACTS VALIDATION TESTS ===")

    # Authenticate partner and senior associate
    login_p = client.post("/api/auth/login", json={"email": "m.alfarooq@mr-law.eg", "password": "password123"})
    assert login_p.status_code == 200, f"Partner login failed: {login_p.text}"
    partner_headers = {"Authorization": f"Bearer {login_p.json()['access_token']}"}

    db = SessionLocal()
    initial_counts = get_table_counts(db)
    print(f"[INITIAL DB COUNTS] {initial_counts}")

    created_client_ids = []
    created_contact_ids = []

    try:
        # -------------------------------------------------------------
        # TEST 1: Wildcard name does not match others (Issue 1)
        # -------------------------------------------------------------
        print("\n--- Test 1: Wildcard characters in create and search ---")
        # 1a. Creating a client with name "%" should NOT collide with all existing clients
        wildcard_name = f"%_TEST_{uuid.uuid4().hex[:6]}"
        res_wildcard = client.post("/api/staff/clients", headers=partner_headers, json={
            "name": wildcard_name,
            "standing": "active"
        })
        assert res_wildcard.status_code == 201, f"Expected 201 for wildcard name, got {res_wildcard.status_code}: {res_wildcard.text}"
        w_client_id = res_wildcard.json()["clientId"]
        created_client_ids.append(w_client_id)
        assert len(w_client_id) == 16, f"Expected 16 chars (cli- + 12 hex), got {w_client_id}"

        # 1b. Search q with % and _ escapes properly
        # Search for exact "%_TEST_"
        res_search_w = client.get("/api/staff/clients?q=%_TEST_", headers=partner_headers)
        assert res_search_w.status_code == 200, res_search_w.text
        found_ids = [c["id"] for c in res_search_w.json()["items"]]
        assert w_client_id in found_ids, "Escaped search should find the wildcard client"

        # Search for just "%" when clients exist - should ONLY match clients with literal '%'
        res_search_pct = client.get("/api/staff/clients?q=%", headers=partner_headers)
        assert res_search_pct.status_code == 200
        # Should not return every single client in the firm
        all_clients_count = db.query(Client).filter(Client.firm_id == "firm-001").count()
        assert res_search_pct.json()["total"] < all_clients_count, "Unescaped % matched all clients!"
        print("[PASS] Wildcard names and search escaping verified.")

        # -------------------------------------------------------------
        # TEST 2: Duplicate check & 409 status (Issue 1 & 2)
        # -------------------------------------------------------------
        print("\n--- Test 2: Duplicate check returns 409 with original body ---")
        base_name_en = f"Alpha Corp {uuid.uuid4().hex[:6]}"
        base_name_ar = f"شركة ألفا {uuid.uuid4().hex[:6]}"
        res_orig = client.post("/api/staff/clients", headers=partner_headers, json={
            "name_en": base_name_en,
            "name_ar": base_name_ar,
            "standing": "active"
        })
        assert res_orig.status_code == 201, res_orig.text
        orig_id = res_orig.json()["clientId"]
        created_client_ids.append(orig_id)

        # 2a. Duplicate in English (different case, leading/trailing whitespace)
        res_dup_en = client.post("/api/staff/clients", headers=partner_headers, json={
            "name_en": f"  {base_name_en.upper()}  ",
            "name_ar": f"اسم مختلف {uuid.uuid4().hex[:4]}",
            "standing": "active"
        })
        assert res_dup_en.status_code == 409, f"Expected 409 Conflict, got {res_dup_en.status_code}"
        assert res_dup_en.json() == {"ok": False, "error": "duplicate"}, f"Expected duplicate body, got {res_dup_en.json()}"

        # 2b. Duplicate in Arabic (whitespace/case)
        res_dup_ar = client.post("/api/staff/clients", headers=partner_headers, json={
            "name_en": f"Unique En {uuid.uuid4().hex[:4]}",
            "name_ar": f"  {base_name_ar}  ",
            "standing": "active"
        })
        assert res_dup_ar.status_code == 409, f"Expected 409 Conflict, got {res_dup_ar.status_code}"
        assert res_dup_ar.json() == {"ok": False, "error": "duplicate"}
        print("[PASS] Duplicate name check returns 409 with {'ok': False, 'error': 'duplicate'}.")

        # -------------------------------------------------------------
        # TEST 3: create_client name validation (Issue 3)
        # -------------------------------------------------------------
        print("\n--- Test 3: Name validation (empty -> 400) ---")
        # Empty string
        res_empty = client.post("/api/staff/clients", headers=partner_headers, json={
            "name": "",
            "standing": "active"
        })
        assert res_empty.status_code == 400, f"Expected 400, got {res_empty.status_code}"

        # Whitespace string
        res_spaces = client.post("/api/staff/clients", headers=partner_headers, json={
            "name": "   ",
            "standing": "active"
        })
        assert res_spaces.status_code == 400, f"Expected 400, got {res_spaces.status_code}"

        # Empty name_en and name_ar
        res_dual_empty = client.post("/api/staff/clients", headers=partner_headers, json={
            "name_en": "  ",
            "name_ar": "",
            "standing": "active"
        })
        assert res_dual_empty.status_code == 400, f"Expected 400, got {res_dual_empty.status_code}"
        print("[PASS] Empty name rejected with 400.")

        # -------------------------------------------------------------
        # TEST 4: Standing validation (Issue 3)
        # -------------------------------------------------------------
        print("\n--- Test 4: Standing validation ---")
        # Invalid standings -> 400
        for bad_standing in ["invalid_standing", "unknown", ""]:
            res_bad_s = client.post("/api/staff/clients", headers=partner_headers, json={
                "name": f"Client Bad Standing {uuid.uuid4().hex[:4]}",
                "standing": bad_standing
            })
            assert res_bad_s.status_code == 400, f"Expected 400 for standing '{bad_standing}', got {res_bad_s.status_code}"

        # Valid standings: retainer, active, prospect, goodStanding (case-insensitive)
        for valid_s in ["retainer", "RETAINER", "active", "prospect", "goodStanding", "goodstanding"]:
            res_val_s = client.post("/api/staff/clients", headers=partner_headers, json={
                "name": f"Client Valid S {uuid.uuid4().hex[:4]}",
                "standing": valid_s
            })
            assert res_val_s.status_code == 201, f"Expected 201 for standing '{valid_s}', got {res_val_s.status_code}: {res_val_s.text}"
            c_id = res_val_s.json()["clientId"]
            created_client_ids.append(c_id)
            expected_stored = "active" if valid_s.lower() == "goodstanding" else valid_s.lower()
            assert res_val_s.json()["client"]["standing"] == expected_stored
        print("[PASS] Standings validated: accepted retainer/active/prospect/goodStanding, rejected invalid.")

        # -------------------------------------------------------------
        # TEST 5: add_client_contact validation (Issue 4 & 5)
        # -------------------------------------------------------------
        print("\n--- Test 5: Contact validations (email, duplicate, role, status, 12 hex id) ---")
        target_client_id = orig_id

        # 5a. Name required
        res_c_noname = client.post(f"/api/staff/clients/{target_client_id}/contacts", headers=partner_headers, json={
            "name": "   ",
            "email": "test@example.com"
        })
        assert res_c_noname.status_code == 400, f"Expected 400 for empty contact name, got {res_c_noname.status_code}"

        # 5b. Bad email pattern -> 400
        bad_emails = ["not-an-email", "@missinguser.com", "missingat.com", "spaces in@email.com", "test@nodomain"]
        for bad_e in bad_emails:
            res_c_bad_e = client.post(f"/api/staff/clients/{target_client_id}/contacts", headers=partner_headers, json={
                "name": "Valid Contact Name",
                "email": bad_e,
                "role": "member"
            })
            assert res_c_bad_e.status_code == 400, f"Expected 400 for bad email '{bad_e}', got {res_c_bad_e.status_code}"

        # 5c. Valid contact creation & 12 hex ID
        valid_email = f"contact-{uuid.uuid4().hex[:6]}@partnerorg.ae"
        res_c_ok = client.post(f"/api/staff/clients/{target_client_id}/contacts", headers=partner_headers, json={
            "name": "Legal Director",
            "email": valid_email,
            "role": "admin",
            "status": "invited"
        })
        assert res_c_ok.status_code == 200, res_c_ok.text
        contact_id = res_c_ok.json()["contactId"]
        created_contact_ids.append(contact_id)
        assert contact_id.startswith("cnt-"), f"Contact ID should start with cnt-, got {contact_id}"
        assert len(contact_id) == 16, f"Expected 16 chars (cnt- + 12 hex), got {len(contact_id)}: {contact_id}"

        # 5d. Duplicate email within the same client (case-insensitive) -> 409
        res_c_dup = client.post(f"/api/staff/clients/{target_client_id}/contacts", headers=partner_headers, json={
            "name": "Another Director",
            "email": f"  {valid_email.upper()}  ",
            "role": "member"
        })
        assert res_c_dup.status_code == 409, f"Expected 409 for duplicate email, got {res_c_dup.status_code}"
        assert "already on this client's list" in res_c_dup.json()["detail"].lower() or "list" in res_c_dup.json()["detail"].lower()

        # 5e. Duplicate email on a DIFFERENT client -> allowed
        other_client_res = client.post("/api/staff/clients", headers=partner_headers, json={
            "name": f"Other Client {uuid.uuid4().hex[:4]}",
            "standing": "active"
        })
        assert other_client_res.status_code == 201
        other_client_id = other_client_res.json()["clientId"]
        created_client_ids.append(other_client_id)

        res_c_other_client = client.post(f"/api/staff/clients/{other_client_id}/contacts", headers=partner_headers, json={
            "name": "Cross-Client Contact",
            "email": valid_email,
            "role": "member"
        })
        assert res_c_other_client.status_code == 200, f"Expected 200 for same email on different client, got {res_c_other_client.status_code}: {res_c_other_client.text}"
        created_contact_ids.append(res_c_other_client.json()["contactId"])

        # 5f. Invalid role -> 400
        res_bad_role = client.post(f"/api/staff/clients/{target_client_id}/contacts", headers=partner_headers, json={
            "name": "Role Test",
            "email": f"unique-{uuid.uuid4().hex[:6]}@example.com",
            "role": "superadmin"
        })
        assert res_bad_role.status_code == 400, f"Expected 400 for bad role, got {res_bad_role.status_code}"

        # 5g. Invalid status -> 400
        res_bad_status = client.post(f"/api/staff/clients/{target_client_id}/contacts", headers=partner_headers, json={
            "name": "Status Test",
            "email": f"unique-{uuid.uuid4().hex[:6]}@example.com",
            "role": "member",
            "status": "terminated"
        })
        assert res_bad_status.status_code == 400, f"Expected 400 for bad status, got {res_bad_status.status_code}"
        print("[PASS] Contact validation (name, email format, duplicate, roles, status, id format) verified.")

        # 5h. Check GET contacts includes takenEmails
        res_get_contacts = client.get(f"/api/staff/clients/{target_client_id}/contacts", headers=partner_headers)
        assert res_get_contacts.status_code == 200
        taken = res_get_contacts.json()["takenEmails"]
        assert valid_email.lower() in taken, f"Expected {valid_email.lower()} in takenEmails"

        print("\n===========================================================")
        print(" ALL CLIENTS & CONTACTS VALIDATION TESTS PASSED 100%!     ")
        print("===========================================================\n")

    finally:
        print("[CLEANUP] Cleaning up test data...")
        try:
            if created_contact_ids:
                db.query(ClientContact).filter(ClientContact.id.in_(created_contact_ids)).delete(synchronize_session=False)
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
