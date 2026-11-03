"""
Comprehensive Automated Test Suite for SynQanun Suite Backend.
Tests Auth, RBAC, Clients, Matters, Billing, and Legal Database.
"""
import sys
import uuid

# Ensure clean UTF-8 console output across all platforms (especially Windows cp1252)
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_full_flow():
    print("\n--- 1. Testing Health Endpoint ---")
    res = client.get("/api/health")
    assert res.status_code == 200, res.text
    print("Health check passed:", res.json())

    print("\n--- 2. Testing Authentication (Partner Login) ---")
    login_res = client.post("/api/auth/login", json={
        "email": "partner@mr-law.eg",
        "password": "password123"
    })
    assert login_res.status_code == 200, login_res.text
    partner_token = login_res.json()["access_token"]
    partner_headers = {"Authorization": f"Bearer {partner_token}"}
    print("Partner login successful!")

    # Verify /api/auth/me
    me_res = client.get("/api/auth/me", headers=partner_headers)
    assert me_res.status_code == 200
    me = me_res.json()
    assert me["rank"] == "partner"
    print(f"Current User: {me['name_en']} ({me['name_ar']}) - Rank: {me['rank']}")

    print("\n--- 3. Testing RBAC (Junior Associate Login & Restricted Access) ---")
    jr_res = client.post("/api/auth/login", json={
        "email": "junior@mr-law.eg",
        "password": "password123"
    })
    assert jr_res.status_code == 200
    jr_token = jr_res.json()["access_token"]
    jr_headers = {"Authorization": f"Bearer {jr_token}"}
    
    # Partner accesses billing summary -> 200 OK
    b_partner = client.get("/api/staff/billing/summary", headers=partner_headers)
    assert b_partner.status_code == 200, b_partner.text
    print("Partner accessed billing summary successfully (200 OK):", b_partner.json()["currency"])

    # Junior Associate tries to access billing summary -> 403 Forbidden!
    b_jr = client.get("/api/staff/billing/summary", headers=jr_headers)
    assert b_jr.status_code == 403, f"Expected 403, got {b_jr.status_code}"
    print("RBAC working perfectly: Junior Associate blocked from billing (403 Forbidden):", b_jr.json()["detail"])

    print("\n--- 4. Testing Clients Module (العملاء) ---")
    clients_res = client.get("/api/staff/clients?standing=retainer", headers=partner_headers)
    assert clients_res.status_code == 200
    clients_data = clients_res.json()
    print(f"Retainer clients count: {clients_data['total']}")
    assert clients_data["total"] >= 1

    # Create new client with unique name
    unique_client_name = f"Test Client {uuid.uuid4().hex[:6]}"
    new_client_res = client.post("/api/staff/clients", headers=partner_headers, json={
        "name": unique_client_name,
        "summary": "Gas supply agreement dispute",
        "standing": "active"
    })
    assert new_client_res.status_code == 201, new_client_res.text
    created_client = new_client_res.json()
    assert created_client["ok"] is True
    print("Client created successfully:", created_client["client"]["name"]["en"])

    # Duplicate check test
    dup_res = client.post("/api/staff/clients", headers=partner_headers, json={
        "name": unique_client_name,
        "standing": "active"
    })
    assert dup_res.json()["ok"] is False and dup_res.json()["error"] == "duplicate"
    print("Duplicate client prevention working: 'duplicate' error returned!")

    # Client detail
    detail_res = client.get("/api/staff/clients/cli-001", headers=partner_headers)
    assert detail_res.status_code == 200
    detail = detail_res.json()
    print(f"Client detail retrieved: {detail['client']['name']['en']} with {len(detail['contacts'])} contacts and {len(detail['engagements'])} engagements")

    print("\n--- 5. Testing Matters Module (المسائل القانونية) ---")
    matters_res = client.get("/api/staff/matters", headers=partner_headers)
    assert matters_res.status_code == 200
    matters = matters_res.json()
    print(f"Active matters count: {matters['total']}")
    assert matters["total"] >= 3
    assert "counts" in matters and "facets" in matters
    print("Counts:", matters["counts"])

    # View matter detail by reference MAT-2201
    mat_detail = client.get("/api/staff/matters/MAT-2201", headers=partner_headers)
    assert mat_detail.status_code == 200
    m_data = mat_detail.json()
    eng = m_data.get("engagement", m_data)
    print(f"Matter MAT-2201: {eng['title']['ar']} - Forum: {eng['venue']['ar']}")
    print(f"Timeline events: {len(m_data['timeline'])}")

    # Create new matter
    new_mat_res = client.post("/api/staff/matters", headers=partner_headers, json={
        "title": "IP Trademark Infringement Defence",
        "workType": "dispute",
        "clientId": "cli-001",
        "practiceArea": "Intellectual Property",
        "forum": "Cairo Economic Court",
        "leadId": "stf-001",
        "scope": "Filing appeal against trademark invalidation decision."
    })
    assert new_mat_res.status_code == 201, new_mat_res.text
    created_mat = new_mat_res.json()
    print("New matter opened with reference:", created_mat["reference"])

    print("\n--- 6. Testing Billing & Time Tracking (الفوترة وتسجيل الوقت) ---")
    # Log time entry (Junior Associate can log time!)
    time_res = client.post("/api/staff/billing/time", headers=jr_headers, json={
        "matterId": "MAT-2201",
        "minutes": 90,
        "description": "Drafting witness interview questions and reviewing exhibits"
    })
    assert time_res.status_code == 201, time_res.text
    print("Time logged successfully by Junior Associate:", time_res.json()["minutes"], "minutes")

    # Invoices list
    inv_res = client.get("/api/staff/billing/invoices", headers=partner_headers)
    assert inv_res.status_code == 200
    invoices = inv_res.json()
    print(f"Invoices count: {invoices['counts']['all']} | Totals: {invoices['totals']}")

    # Save invoice draft
    draft_res = client.post("/api/staff/billing/drafts", headers=partner_headers, json={
        "engagementRef": "MAT-2201",
        "description": "Legal advisory and memorandum preparation",
        "lines": [
            {"description": "Memorial drafting", "amount": 15000.0, "detail": "Drafting defense arguments"}
        ]
    })
    assert draft_res.status_code == 201, draft_res.text
    print("Draft invoice created:", draft_res.json()["reference"])

    print("\n--- 7. Testing Legal Database (القاعدة القانونية) ---")
    legal_res = client.get("/api/staff/legal-database?q=الوكالة", headers=partner_headers)
    assert legal_res.status_code == 200
    legal_items = legal_res.json()["items"]
    assert len(legal_items) >= 1
    print(f"Found {len(legal_items)} legal entries for search 'الوكالة':")
    print(f"- Reference: {legal_items[0]['reference']} | Title: {legal_items[0]['title']['ar']}")

    # Get single legal entry
    single_legal = client.get(f"/api/staff/legal-database/{legal_items[0]['reference']}", headers=partner_headers)
    assert single_legal.status_code == 200
    assert single_legal.json()["reference"] == legal_items[0]["reference"]
    print("Single legal entry verified successfully!")

    print("\n==========================================")
    print(" ALL 7 BACKEND TEST SUITES PASSED (100%)! ")
    print("==========================================\n")

if __name__ == "__main__":
    test_full_flow()
