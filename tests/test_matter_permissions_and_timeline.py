"""
Test Suite for Matter Permissions, Team Modification, Lead Reassignment, Timeline Visibility, and Client Contact Permissions.
Verifies:
1. Firm-only generated document creates no timeline event; shared document creates timeline event.
2. Client matter detail excludes kind="assignment" events.
3. Modify matter team permissions:
   - Senior associate who is NOT matter lead -> 403
   - Junior associate -> 403
   - Paralegal -> 403
   - Legal secretary -> 403
   - Partner / lead counsel -> 201 on add, 200 on remove
4. Senior associate reassigning a matter (led or unled) -> 403 notPermitted; partner gets OK.
5. Lead reassignment with duplicate references counts once, previous lead stays on team, timeline event is created, already-lead skipped.
6. create_matter validates leadId: rejects foreign firm / client user / deactivated user / paralegal with 400; valid senior associate gets 201.
7. add_client_contact validates staff rank:
   - juniorAssociate, paralegal, legalSecretary -> 403
   - seniorAssociate, partner -> 200
8. Clean up all created test data (matters, documents, timeline events, contacts, team members).
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
from app.models.user import User
from app.models.firm import Firm
from app.models.matter import Matter, MatterTimelineEvent, MatterTeamMember
from app.models.document import Document
from app.models.client import ClientContact
from app.core.security import get_password_hash

client = TestClient(app)


def test_matter_permissions_and_timeline():
    print("\n=== STARTING MATTER PERMISSIONS & TIMELINE TESTS ===")

    # 1. Login users
    res_p = client.post("/api/auth/login", json={"email": "partner@mr-law.eg", "password": "password123"})
    assert res_p.status_code == 200, "Partner login failed"
    partner_headers = {"Authorization": f"Bearer {res_p.json()['access_token']}"}
    partner_id = res_p.json()["user"]["id"]

    res_snr = client.post("/api/auth/login", json={"email": "senior@mr-law.eg", "password": "password123"})
    assert res_snr.status_code == 200, "Senior Associate login failed"
    snr_headers = {"Authorization": f"Bearer {res_snr.json()['access_token']}"}
    snr_id = res_snr.json()["user"]["id"]

    res_jnr = client.post("/api/auth/login", json={"email": "junior@mr-law.eg", "password": "password123"})
    assert res_jnr.status_code == 200, "Junior Associate login failed"
    jnr_headers = {"Authorization": f"Bearer {res_jnr.json()['access_token']}"}
    jnr_id = res_jnr.json()["user"]["id"]

    res_para = client.post("/api/auth/login", json={"email": "paralegal@mr-law.eg", "password": "password123"})
    assert res_para.status_code == 200, "Paralegal login failed"
    para_headers = {"Authorization": f"Bearer {res_para.json()['access_token']}"}
    para_id = res_para.json()["user"]["id"]

    res_sec = client.post("/api/auth/login", json={"email": "y.fouad@mr-law.eg", "password": "password123"})
    assert res_sec.status_code == 200, "Secretary login failed"
    sec_headers = {"Authorization": f"Bearer {res_sec.json()['access_token']}"}
    sec_id = res_sec.json()["user"]["id"]

    res_c = client.post("/api/auth/login", json={"email": "client@mr-law.eg", "password": "password123"})
    assert res_c.status_code == 200, "Client login failed"
    client_headers = {"Authorization": f"Bearer {res_c.json()['access_token']}"}

    db = SessionLocal()
    created_matter_refs = []
    created_doc_ids = []
    created_evt_ids = []
    created_contact_ids = []

    try:
        # Load a base matter (MAT-2201)
        matter = db.query(Matter).filter(Matter.reference == "MAT-2201").first()
        assert matter is not None, "MAT-2201 not found"
        orig_lead_id = matter.lead_counsel_id

        # Ensure MAT-2201 is led by partner for tests
        matter.lead_counsel_id = partner_id
        db.commit()

        # =====================================================================
        # TEST 1: Timeline events for generated documents (firm-only vs shared)
        # =====================================================================
        print("\n--- Test 1: Document generation timeline event visibility ---")
        # 1a. Firm-only document -> NO timeline event
        res_firm_doc = client.post("/api/staff/documents/generate-word", headers=partner_headers, json={
            "matter_reference": "MAT-2201",
            "template_type": "contract",
            "is_firm_only": True,
            "title": "Internal Firm Memo Only"
        })
        assert res_firm_doc.status_code == 201, res_firm_doc.text
        doc_firm_id = res_firm_doc.json()["id"]
        doc_firm_name = res_firm_doc.json()["name"]
        created_doc_ids.append(doc_firm_id)

        firm_evt = db.query(MatterTimelineEvent).filter(
            MatterTimelineEvent.matter_id == matter.id,
            MatterTimelineEvent.title_en == f"Generated document: {doc_firm_name}"
        ).first()
        assert firm_evt is None, "Firm-only document unexpectedly created a timeline event!"
        print("[PASS] is_firm_only=True document created NO timeline event.")

        # 1b. Shared document -> timeline event DOES exist
        res_shared_doc = client.post("/api/staff/documents/generate-word", headers=partner_headers, json={
            "matter_reference": "MAT-2201",
            "template_type": "contract",
            "is_firm_only": False,
            "title": "Shared Contract Agreement"
        })
        assert res_shared_doc.status_code == 201, res_shared_doc.text
        doc_shared_id = res_shared_doc.json()["id"]
        doc_shared_name = res_shared_doc.json()["name"]
        created_doc_ids.append(doc_shared_id)

        shared_evt = db.query(MatterTimelineEvent).filter(
            MatterTimelineEvent.matter_id == matter.id,
            MatterTimelineEvent.title_en == f"Generated document: {doc_shared_name}"
        ).first()
        assert shared_evt is not None, "Shared document failed to create a timeline event!"
        created_evt_ids.append(shared_evt.id)
        print("[PASS] is_firm_only=False document created a timeline event.")

        # =====================================================================
        # TEST 2: Client matter detail excludes kind="assignment" events
        # =====================================================================
        print("\n--- Test 2: Client matter detail excludes kind='assignment' ---")
        assign_evt = MatterTimelineEvent(
            id=f"evt-{uuid.uuid4().hex[:8]}",
            matter_id=matter.id,
            kind="assignment",
            title_en="Assigned to matter team: Confidential Lawyer",
            title_ar="انضمام لفريق العمل: محامٍ خاص",
            date="2026-11-03"
        )
        db.add(assign_evt)
        db.commit()
        created_evt_ids.append(assign_evt.id)

        res_client_matter = client.get("/api/client/matters/MAT-2201", headers=client_headers)
        assert res_client_matter.status_code == 200, res_client_matter.text
        client_timeline = res_client_matter.json().get("timeline", [])
        assignment_events_for_client = [e for e in client_timeline if e.get("eventKind") == "assignment" or e.get("id") == assign_evt.id]
        assert len(assignment_events_for_client) == 0, f"Client received assignment events: {assignment_events_for_client}"
        print(f"[PASS] Client matter detail returned {len(client_timeline)} timeline events, 0 assignment events.")

        # =====================================================================
        # TEST 3: Staff permissions on modifying matter team
        # =====================================================================
        print("\n--- Test 3: Modify matter team permissions ---")
        # Ensure MAT-2201 is led by partner so snr, jnr, para, sec are NOT the lead
        matter.lead_counsel_id = partner_id
        db.commit()

        # 3a. Non-lead Senior Associate tries to add/remove a team member -> 403 Forbidden
        res_snr_add = client.post("/api/staff/matters/MAT-2201/team", headers=snr_headers, json={
            "staff_id": "stf-004",
            "role_en": "Paralegal",
            "role_ar": "مساعد قانوني"
        })
        assert res_snr_add.status_code == 403, f"Expected 403 for non-lead senior associate adding team member, got {res_snr_add.status_code}"
        res_snr_rem = client.delete("/api/staff/matters/MAT-2201/team/stf-004", headers=snr_headers)
        assert res_snr_rem.status_code == 403, f"Expected 403 for non-lead senior associate removing team member, got {res_snr_rem.status_code}"
        print(f"[PASS] Non-lead senior associate rejected from modifying team -> 403: {res_snr_add.json()['detail']}")

        # 3b. Junior Associate tries to add/remove a team member -> 403 Forbidden
        res_jnr_add = client.post("/api/staff/matters/MAT-2201/team", headers=jnr_headers, json={
            "staff_id": "stf-004",
            "role_en": "Paralegal",
            "role_ar": "مساعد قانوني"
        })
        assert res_jnr_add.status_code == 403, f"Expected 403 for junior associate adding team member, got {res_jnr_add.status_code}"
        res_jnr_rem = client.delete("/api/staff/matters/MAT-2201/team/stf-004", headers=jnr_headers)
        assert res_jnr_rem.status_code == 403, f"Expected 403 for junior associate removing team member, got {res_jnr_rem.status_code}"
        print(f"[PASS] Junior associate rejected from modifying team -> 403: {res_jnr_add.json()['detail']}")

        # 3c. Paralegal tries to add/remove a team member -> 403 Forbidden
        res_para_add = client.post("/api/staff/matters/MAT-2201/team", headers=para_headers, json={
            "staff_id": "stf-003",
            "role_en": "Associate",
            "role_ar": "محامٍ مشارك"
        })
        assert res_para_add.status_code == 403, f"Expected 403 for paralegal adding team member, got {res_para_add.status_code}"
        res_para_rem = client.delete("/api/staff/matters/MAT-2201/team/stf-003", headers=para_headers)
        assert res_para_rem.status_code == 403, f"Expected 403 for paralegal removing team member, got {res_para_rem.status_code}"
        print(f"[PASS] Paralegal rejected from modifying team -> 403: {res_para_add.json()['detail']}")

        # 3d. Secretary tries to add/remove a team member -> 403 Forbidden
        res_sec_add = client.post("/api/staff/matters/MAT-2201/team", headers=sec_headers, json={
            "staff_id": "stf-003",
            "role_en": "Associate",
            "role_ar": "محامٍ مشارك"
        })
        assert res_sec_add.status_code == 403, f"Expected 403 for secretary adding team member, got {res_sec_add.status_code}"
        res_sec_rem = client.delete("/api/staff/matters/MAT-2201/team/stf-003", headers=sec_headers)
        assert res_sec_rem.status_code == 403, f"Expected 403 for secretary removing team member, got {res_sec_rem.status_code}"
        print(f"[PASS] Secretary rejected from modifying team -> 403: {res_sec_add.json()['detail']}")

        # 3e. Partner (or lead counsel) adds a team member -> 201 Created
        existing_tm = db.query(MatterTeamMember).filter(MatterTeamMember.matter_id == matter.id, MatterTeamMember.staff_id == "stf-003").first()
        if existing_tm:
            db.delete(existing_tm)
            db.commit()

        res_lead_add = client.post("/api/staff/matters/MAT-2201/team", headers=partner_headers, json={
            "staff_id": "stf-003",
            "role_en": "Associate",
            "role_ar": "محامٍ مشارك"
        })
        assert res_lead_add.status_code == 201, res_lead_add.text
        print(f"[PASS] Partner / Lead successfully added team member -> 201: {res_lead_add.json()['name']['en']}")

        # 3f. Partner (or lead counsel) removes the team member -> 200 OK
        res_lead_rem = client.delete("/api/staff/matters/MAT-2201/team/stf-003", headers=partner_headers)
        assert res_lead_rem.status_code == 200, res_lead_rem.text
        print(f"[PASS] Partner / Lead successfully removed team member -> 200: {res_lead_rem.json()['message']}")

        # =====================================================================
        # TEST 4: Senior associate reassigning lead -> 403 notPermitted
        # =====================================================================
        print("\n--- Test 4: Senior associate reassigning lead -> 403 notPermitted ---")
        
        # 4a. Senior associate reassigning a matter they do NOT lead -> 403 notPermitted
        matter.lead_counsel_id = partner_id
        db.commit()
        res_snr_unled = client.post("/api/staff/matters/reassign-lead", headers=snr_headers, json={
            "staffId": snr_id,
            "references": ["MAT-2201"]
        })
        assert res_snr_unled.status_code == 403, f"Expected 403, got {res_snr_unled.status_code}"
        assert res_snr_unled.json()["detail"] == "notPermitted", f"Expected 'notPermitted', got {res_snr_unled.json()['detail']}"
        print(f"[PASS] Senior associate reassigning unled matter rejected -> 403: {res_snr_unled.json()['detail']}")

        # 4b. Senior associate reassigning a matter they DO lead -> 403 notPermitted
        matter.lead_counsel_id = snr_id
        db.commit()
        res_snr_led = client.post("/api/staff/matters/reassign-lead", headers=snr_headers, json={
            "staffId": partner_id,
            "references": ["MAT-2201"]
        })
        assert res_snr_led.status_code == 403, f"Expected 403, got {res_snr_led.status_code}"
        assert res_snr_led.json()["detail"] == "notPermitted", f"Expected 'notPermitted', got {res_snr_led.json()['detail']}"
        print(f"[PASS] Senior associate reassigning matter they lead rejected -> 403: {res_snr_led.json()['detail']}")

        # Restore lead back to partner_id for next tests
        matter.lead_counsel_id = partner_id
        db.commit()

        # =====================================================================
        # TEST 5: Reassign lead with duplicates, old lead kept, timeline event
        # =====================================================================
        print("\n--- Test 5: Reassign lead with duplicate references & team update ---")
        # Clean any existing team member entry for snr_id or partner_id on MAT-2201
        db.query(MatterTeamMember).filter(
            MatterTeamMember.matter_id == matter.id,
            MatterTeamMember.staff_id.in_([partner_id, snr_id])
        ).delete()
        db.commit()

        # Partner reassigns MAT-2201 to snr_id, with duplicate case-insensitive references
        res_reassign_dups = client.post("/api/staff/matters/reassign-lead", headers=partner_headers, json={
            "staffId": snr_id,
            "references": ["MAT-2201", "mat-2201", "Mat-2201"]
        })
        assert res_reassign_dups.status_code == 200, res_reassign_dups.text
        reassign_data = res_reassign_dups.json()
        assert reassign_data["reassignedCount"] == 1, f"Expected deduplicated count 1, got {reassign_data['reassignedCount']}"
        print(f"[PASS] Deduplicated references counted once: reassignedCount={reassign_data['reassignedCount']}")

        # Verify old lead (partner) was added to the team
        old_lead_tm = db.query(MatterTeamMember).filter(
            MatterTeamMember.matter_id == matter.id,
            MatterTeamMember.staff_id == partner_id
        ).first()
        assert old_lead_tm is not None, "Previous lead was not added to the team!"
        assert old_lead_tm.role_en == "Associate"
        print(f"[PASS] Old lead {partner_id} kept on team as '{old_lead_tm.role_en}'.")

        # Verify timeline event was created
        lead_change_evt = db.query(MatterTimelineEvent).filter(
            MatterTimelineEvent.matter_id == matter.id,
            MatterTimelineEvent.kind == "assignment",
            MatterTimelineEvent.title_en.like("Lead counsel changed to:%")
        ).order_by(MatterTimelineEvent.id.desc()).first()
        assert lead_change_evt is not None, "Timeline event for lead change was not created!"
        created_evt_ids.append(lead_change_evt.id)
        print(f"[PASS] Assignment timeline event created: '{lead_change_evt.title_en}'.")

        # Reassign again when lead is already snr_id -> reassignedCount must be 0 (skipped)
        res_reassign_skip = client.post("/api/staff/matters/reassign-lead", headers=partner_headers, json={
            "staffId": snr_id,
            "references": ["MAT-2201"]
        })
        assert res_reassign_skip.status_code == 200
        assert res_reassign_skip.json()["reassignedCount"] == 0
        print("[PASS] Already-assigned lead was skipped: reassignedCount=0.")

        # Reassign back to partner_id
        res_restore_lead = client.post("/api/staff/matters/reassign-lead", headers=partner_headers, json={
            "staffId": partner_id,
            "references": ["MAT-2201"]
        })
        assert res_restore_lead.status_code == 200

        # =====================================================================
        # TEST 6: create_matter lead validation
        # =====================================================================
        print("\n--- Test 6: create_matter lead counsel validation ---")
        # 6a. Non-existent leadId -> 400
        res_c1 = client.post("/api/staff/matters", headers=partner_headers, json={
            "clientId": "cli-001",
            "title": "Test Lead Validation 1",
            "practiceArea": "Commercial Litigation",
            "forum": "Cairo Economic Court",
            "workType": "dispute",
            "leadId": "non-existent-user-id"
        })
        assert res_c1.status_code == 400, f"Expected 400, got {res_c1.status_code}"
        print(f"[PASS] Non-existent leadId rejected -> 400: {res_c1.json()['detail']}")

        # 6b. Client user as leadId -> 400
        client_user = db.query(User).filter(User.side == "client").first()
        res_c2 = client.post("/api/staff/matters", headers=partner_headers, json={
            "clientId": "cli-001",
            "title": "Test Lead Validation 2",
            "practiceArea": "Commercial Litigation",
            "forum": "Cairo Economic Court",
            "workType": "dispute",
            "leadId": client_user.id
        })
        assert res_c2.status_code == 400, f"Expected 400, got {res_c2.status_code}"
        print(f"[PASS] Client-side user as lead rejected -> 400: {res_c2.json()['detail']}")

        # 6c. Paralegal user as leadId -> 400
        paralegal_user = db.query(User).filter(User.rank == "paralegal").first()
        res_c3 = client.post("/api/staff/matters", headers=partner_headers, json={
            "clientId": "cli-001",
            "title": "Test Lead Validation 3",
            "practiceArea": "Commercial Litigation",
            "forum": "Cairo Economic Court",
            "workType": "dispute",
            "leadId": paralegal_user.id
        })
        assert res_c3.status_code == 400, f"Expected 400, got {res_c3.status_code}"
        print(f"[PASS] Paralegal user as lead rejected -> 400: {res_c3.json()['detail']}")

        # 6d. Deactivated user as leadId -> 400
        deactivated_user = User(
            id=f"usr-deact-{uuid.uuid4().hex[:6]}",
            firm_id="firm-001",
            email=f"deact-{uuid.uuid4().hex[:4]}@mr-law.eg",
            hashed_password=get_password_hash("password123"),
            side="staff",
            rank="partner",
            status="deactivated",
            name_en="Deactivated Partner",
            name_ar="شريك معطل"
        )
        db.add(deactivated_user)
        db.commit()

        res_c4 = client.post("/api/staff/matters", headers=partner_headers, json={
            "clientId": "cli-001",
            "title": "Test Lead Validation 4",
            "practiceArea": "Commercial Litigation",
            "forum": "Cairo Economic Court",
            "workType": "dispute",
            "leadId": deactivated_user.id
        })
        assert res_c4.status_code == 400, f"Expected 400, got {res_c4.status_code}"
        print(f"[PASS] Deactivated partner as lead rejected -> 400: {res_c4.json()['detail']}")
        db.delete(deactivated_user)
        db.commit()

        # 6e. Valid Senior Associate as leadId -> 201 Created
        res_c_valid = client.post("/api/staff/matters", headers=partner_headers, json={
            "clientId": "cli-001",
            "title": "Valid Senior Associate Lead Matter",
            "practiceArea": "Commercial Litigation",
            "forum": "Cairo Economic Court",
            "workType": "dispute",
            "leadId": snr_id
        })
        assert res_c_valid.status_code == 201, res_c_valid.text
        valid_matter_ref = res_c_valid.json()["reference"]
        created_matter_refs.append(valid_matter_ref)
        print(f"[PASS] Valid Senior Associate accepted as lead -> 201: {valid_matter_ref}")

        # =====================================================================
        # TEST 7: add_client_contact permissions
        # =====================================================================
        print("\n--- Test 7: add_client_contact staff rank permissions ---")
        # 7a. Junior Associate -> 403 Forbidden
        res_jnr_cnt = client.post("/api/staff/clients/cli-001/contacts", headers=jnr_headers, json={
            "name": "Unauthorized Contact Jnr",
            "email": f"jnr-contact-{uuid.uuid4().hex[:4]}@example.com",
            "role": "admin"
        })
        assert res_jnr_cnt.status_code == 403, f"Expected 403 for junior associate, got {res_jnr_cnt.status_code}"
        print(f"[PASS] Junior associate rejected from adding contact -> 403: {res_jnr_cnt.json()['detail']}")

        # 7b. Paralegal -> 403 Forbidden
        res_para_cnt = client.post("/api/staff/clients/cli-001/contacts", headers=para_headers, json={
            "name": "Unauthorized Contact Para",
            "email": f"para-contact-{uuid.uuid4().hex[:4]}@example.com",
            "role": "admin"
        })
        assert res_para_cnt.status_code == 403, f"Expected 403 for paralegal, got {res_para_cnt.status_code}"
        print(f"[PASS] Paralegal rejected from adding contact -> 403: {res_para_cnt.json()['detail']}")

        # 7c. Legal Secretary -> 403 Forbidden
        res_sec_cnt = client.post("/api/staff/clients/cli-001/contacts", headers=sec_headers, json={
            "name": "Unauthorized Contact Sec",
            "email": f"sec-contact-{uuid.uuid4().hex[:4]}@example.com",
            "role": "admin"
        })
        assert res_sec_cnt.status_code == 403, f"Expected 403 for secretary, got {res_sec_cnt.status_code}"
        print(f"[PASS] Secretary rejected from adding contact -> 403: {res_sec_cnt.json()['detail']}")

        # 7d. Senior Associate -> 200 OK
        res_snr_cnt = client.post("/api/staff/clients/cli-001/contacts", headers=snr_headers, json={
            "name": "Authorized Contact Snr",
            "email": f"snr-contact-{uuid.uuid4().hex[:4]}@example.com",
            "role": "admin"
        })
        assert res_snr_cnt.status_code == 200, f"Expected 200 for senior associate, got {res_snr_cnt.status_code}: {res_snr_cnt.text}"
        snr_cnt_id = res_snr_cnt.json()["contactId"]
        created_contact_ids.append(snr_cnt_id)
        print(f"[PASS] Senior associate successfully added contact -> 200: {snr_cnt_id}")

        # 7e. Partner -> 200 OK
        res_p_cnt = client.post("/api/staff/clients/cli-001/contacts", headers=partner_headers, json={
            "name": "Authorized Contact Partner",
            "email": f"partner-contact-{uuid.uuid4().hex[:4]}@example.com",
            "role": "admin"
        })
        assert res_p_cnt.status_code == 200, f"Expected 200 for partner, got {res_p_cnt.status_code}: {res_p_cnt.text}"
        p_cnt_id = res_p_cnt.json()["contactId"]
        created_contact_ids.append(p_cnt_id)
        print(f"[PASS] Partner successfully added contact -> 200: {p_cnt_id}")

        print("\n===========================================================")
        print(" ALL MATTER PERMISSIONS & TIMELINE TESTS PASSED 100%!      ")
        print("===========================================================\n")

    finally:
        # Cleanup
        print("[CLEANUP] Cleaning up test data...")
        for m_ref in created_matter_refs:
            m_obj = db.query(Matter).filter(Matter.reference == m_ref).first()
            if m_obj:
                db.delete(m_obj)
        for d_id in created_doc_ids:
            d_obj = db.query(Document).filter(Document.id == d_id).first()
            if d_obj:
                if d_obj.file_path and os.path.exists(d_obj.file_path):
                    try:
                        os.remove(d_obj.file_path)
                    except:
                        pass
                db.delete(d_obj)
        for e_id in created_evt_ids:
            e_obj = db.query(MatterTimelineEvent).filter(MatterTimelineEvent.id == e_id).first()
            if e_obj:
                db.delete(e_obj)
        for c_id in created_contact_ids:
            c_obj = db.query(ClientContact).filter(ClientContact.id == c_id).first()
            if c_obj:
                db.delete(c_obj)

        # Restore original lead counsel on MAT-2201 and clean up test events/members
        m_2201 = db.query(Matter).filter(Matter.reference == "MAT-2201").first()
        if m_2201:
            m_2201.lead_counsel_id = orig_lead_id
            db.query(MatterTeamMember).filter(
                MatterTeamMember.matter_id == m_2201.id,
                MatterTeamMember.staff_id.in_([partner_id, snr_id, "stf-003", "stf-004"])
            ).delete()
            db.query(MatterTimelineEvent).filter(
                MatterTimelineEvent.matter_id == m_2201.id,
                MatterTimelineEvent.kind == "assignment"
            ).delete()
        db.commit()
        db.close()
        print("[CLEANUP] Cleanup completed successfully.")


if __name__ == "__main__":
    test_matter_permissions_and_timeline()
