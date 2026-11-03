import urllib.request
import urllib.parse
import json
import uuid
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

BASE = "http://localhost:8000"

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        # Don't follow external redirects
        return None

opener = urllib.request.build_opener(NoRedirect)

def req(method, path, body=None, token=None, content_type="application/json"):
    url = BASE + path
    headers = {}
    data = None
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if body is not None:
        if content_type == "application/json":
            headers["Content-Type"] = "application/json"
            data = json.dumps(body).encode("utf-8")
        elif content_type == "application/x-www-form-urlencoded":
            headers["Content-Type"] = "application/x-www-form-urlencoded"
            data = urllib.parse.urlencode(body).encode("utf-8")
    
    r = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with opener.open(r, timeout=5) as response:
            status_code = response.status
            resp_data = response.read()
            try:
                parsed = json.loads(resp_data.decode("utf-8"))
            except:
                parsed = f"binary/text: {len(resp_data)} bytes"
            return status_code, parsed
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="ignore")
        return e.code, err_body
    except Exception as e:
        return 0, str(e)

results = []
def record(tag, method, endpoint, status_code, res):
    ok = 200 <= status_code < 400
    results.append((tag, method, endpoint, status_code, ok))
    mark = "PASS" if ok else "FAIL"
    print(f"[{mark}] {method:6} {endpoint:45} -> {status_code}", flush=True)
    if not ok:
        print(f"       ERROR: {res}", flush=True)

print("=== STARTING TEST OF ALL 60 APIS ===", flush=True)

# 1. Authentication
# POST /api/auth/token
code, res = req("POST", "/api/auth/token", {"username": "partner@mr-law.eg", "password": "password123"}, content_type="application/x-www-form-urlencoded")
record("Auth", "POST", "/api/auth/token", code, res)
staff_token = res.get("access_token") if isinstance(res, dict) else None

# POST /api/auth/login
code, res = req("POST", "/api/auth/login", {"email": "client@mr-law.eg", "password": "password123"})
record("Auth", "POST", "/api/auth/login (client)", code, res)
client_token = res.get("access_token") if isinstance(res, dict) else None

# GET /api/auth/me
code, res = req("GET", "/api/auth/me", token=staff_token)
record("Auth", "GET", "/api/auth/me", code, res)

# POST /api/auth/password-reset/request
code, res = req("POST", "/api/auth/password-reset/request", {"email": "partner@mr-law.eg"})
record("Auth", "POST", "/api/auth/password-reset/request", code, res)
reset_token = res.get("token") if isinstance(res, dict) else ""

# GET /api/auth/password-reset/verify/{token}
code, res = req("GET", f"/api/auth/password-reset/verify/{reset_token}")
record("Auth", "GET", f"/api/auth/password-reset/verify/{{token}}", code, res)

# POST /api/auth/password-reset/complete
code, res = req("POST", "/api/auth/password-reset/complete", {"token": reset_token, "password": "password123"})
record("Auth", "POST", "/api/auth/password-reset/complete", code, res)

# 2. Clients
# GET /api/staff/clients
code, res = req("GET", "/api/staff/clients", token=staff_token)
record("Clients", "GET", "/api/staff/clients", code, res)

# POST /api/staff/clients
uid = uuid.uuid4().hex[:5]
code, res = req("POST", "/api/staff/clients", {
    "name": f"شركة النيل للاستثمار {uid}",
    "name_en": f"Nile Investment {uid}",
    "standing": "active",
    "summary": "شركة مساهمة مقيدة"
}, token=staff_token)
record("Clients", "POST", "/api/staff/clients", code, res)
created_client_id = res.get("clientId") if isinstance(res, dict) else "cli-001"

# GET /api/staff/clients/{client_id}
code, res = req("GET", f"/api/staff/clients/{created_client_id}", token=staff_token)
record("Clients", "GET", "/api/staff/clients/{client_id}", code, res)

# POST /api/staff/clients/{client_id}/contacts
code, res = req("POST", f"/api/staff/clients/{created_client_id}/contacts", {
    "name": "م. كريم عبد السلام",
    "email": f"karim_{uid}@nile-inv.eg",
    "phone": "+201009876543",
    "title": "مدير الشؤون القانونية",
    "role": "member"
}, token=staff_token)
record("Clients", "POST", "/api/staff/clients/{client_id}/contacts", code, res)

# GET /api/staff/clients/{client_id}/contacts
code, res = req("GET", f"/api/staff/clients/{created_client_id}/contacts", token=staff_token)
record("Clients", "GET", "/api/staff/clients/{client_id}/contacts", code, res)

# 3. Staff Matters
# GET /api/staff/matters
code, res = req("GET", "/api/staff/matters", token=staff_token)
record("Staff Matters", "GET", "/api/staff/matters", code, res)

# POST /api/staff/matters
code, res = req("POST", "/api/staff/matters", {
    "title": f"نزاع توريد معدات {uid}",
    "title_ar": f"نزاع توريد معدات {uid}",
    "title_en": f"Equipment Supply Dispute {uid}",
    "workType": "dispute",
    "clientId": created_client_id,
    "practiceArea": "Commercial Litigation",
    "forum": "Cairo Economic Court",
    "leadId": "stf-001",
    "scope": "مطالبة قضائية بالتعويض"
}, token=staff_token)
record("Staff Matters", "POST", "/api/staff/matters", code, res)
created_matter_ref = res.get("reference") if isinstance(res, dict) else "MAT-2201"

# GET /api/staff/matters/lead-options
code, res = req("GET", "/api/staff/matters/lead-options", token=staff_token)
record("Staff Matters", "GET", "/api/staff/matters/lead-options", code, res)

# GET /api/staff/matters/options
code, res = req("GET", "/api/staff/matters/options", token=staff_token)
record("Staff Matters", "GET", "/api/staff/matters/options", code, res)

# GET /api/staff/matters/{reference}
code, res = req("GET", f"/api/staff/matters/{created_matter_ref}", token=staff_token)
record("Staff Matters", "GET", "/api/staff/matters/{reference}", code, res)

# POST /api/staff/matters/{reference}/close
code, res = req("POST", f"/api/staff/matters/{created_matter_ref}/close", token=staff_token)
record("Staff Matters", "POST", "/api/staff/matters/{reference}/close", code, res)

# POST /api/staff/matters/{reference}/reopen
code, res = req("POST", f"/api/staff/matters/{created_matter_ref}/reopen", token=staff_token)
record("Staff Matters", "POST", "/api/staff/matters/{reference}/reopen", code, res)

# POST /api/staff/matters/reassign-lead
code, res = req("POST", "/api/staff/matters/reassign-lead", {
    "references": [created_matter_ref],
    "staffId": "stf-001"
}, token=staff_token)
record("Staff Matters", "POST", "/api/staff/matters/reassign-lead", code, res)

# POST /api/staff/matters/{reference}/team
code, res = req("POST", f"/api/staff/matters/{created_matter_ref}/team", {
    "staff_id": "stf-002",
    "role_ar": "محامٍ أول مساعد",
    "role_en": "Senior Associate"
}, token=staff_token)
record("Staff Matters", "POST", "/api/staff/matters/{reference}/team", code, res)

# DELETE /api/staff/matters/{reference}/team/{staff_id}
code, res = req("DELETE", f"/api/staff/matters/{created_matter_ref}/team/stf-002", token=staff_token)
record("Staff Matters", "DELETE", "/api/staff/matters/{reference}/team/{staff_id}", code, res)

# 4. Client Matters
# GET /api/client/matters
code, res = req("GET", "/api/client/matters", token=client_token)
record("Client Matters", "GET", "/api/client/matters", code, res)

# GET /api/client/matters/forums
code, res = req("GET", "/api/client/matters/forums", token=client_token)
record("Client Matters", "GET", "/api/client/matters/forums", code, res)

# GET /api/client/matters/{reference}
code, res = req("GET", f"/api/client/matters/MAT-2201", token=client_token)
record("Client Matters", "GET", "/api/client/matters/{reference}", code, res)

# 5. Billing (Staff)
# GET /api/staff/billing/summary
code, res = req("GET", "/api/staff/billing/summary", token=staff_token)
record("Billing", "GET", "/api/staff/billing/summary", code, res)

# GET /api/staff/billing/invoices
code, res = req("GET", "/api/staff/billing/invoices", token=staff_token)
record("Billing", "GET", "/api/staff/billing/invoices", code, res)

# GET /api/staff/billing/drafts
code, res = req("GET", "/api/staff/billing/drafts", token=staff_token)
record("Billing", "GET", "/api/staff/billing/drafts", code, res)

# POST /api/staff/billing/drafts
code, res = req("POST", "/api/staff/billing/drafts", {
    "engagementRef": created_matter_ref,
    "description": "دفعة أتعاب مرحلية",
    "lines": [
        {"description": "صياغة المذكرات وتجهيز حافظة المستندات", "amount": 45000, "minutes": 180}
    ]
}, token=staff_token)
record("Billing", "POST", "/api/staff/billing/drafts", code, res)
created_inv_ref = res.get("reference") if isinstance(res, dict) else "INV-2026-090"

# POST /api/staff/billing/invoices/{reference}/issue
code, res = req("POST", f"/api/staff/billing/invoices/{created_inv_ref}/issue", token=staff_token)
record("Billing", "POST", "/api/staff/billing/invoices/{reference}/issue", code, res)

# POST /api/staff/billing/invoices/{reference}/mark-paid
code, res = req("POST", f"/api/staff/billing/invoices/{created_inv_ref}/mark-paid", token=staff_token)
record("Billing", "POST", "/api/staff/billing/invoices/{reference}/mark-paid", code, res)

# GET /api/staff/billing/quotes
code, res = req("GET", "/api/staff/billing/quotes", token=staff_token)
record("Billing", "GET", "/api/staff/billing/quotes", code, res)

# POST /api/staff/billing/time
code, res = req("POST", "/api/staff/billing/time", {
    "matterId": created_matter_ref,
    "minutes": 90,
    "description": "جلسة مراجعة الدفوع مع الموكل",
    "billable": True
}, token=staff_token)
record("Billing", "POST", "/api/staff/billing/time", code, res)

# GET /api/staff/billing/time
code, res = req("GET", "/api/staff/billing/time", token=staff_token)
record("Billing", "GET", "/api/staff/billing/time", code, res)

# GET /api/staff/billing/context
code, res = req("GET", "/api/staff/billing/context", token=staff_token)
record("Billing", "GET", "/api/staff/billing/context", code, res)

# 6. Client Invoices
# GET /api/client/invoices
code, res = req("GET", "/api/client/invoices", token=client_token)
record("Client Invoices", "GET", "/api/client/invoices", code, res)

# GET /api/client/invoices/summary
code, res = req("GET", "/api/client/invoices/summary", token=client_token)
record("Client Invoices", "GET", "/api/client/invoices/summary", code, res)

# GET /api/client/invoices/engagements
code, res = req("GET", "/api/client/invoices/engagements", token=client_token)
record("Client Invoices", "GET", "/api/client/invoices/engagements", code, res)

# GET /api/client/invoices/{reference}
code, res = req("GET", f"/api/client/invoices/INV-2026-090", token=client_token)
record("Client Invoices", "GET", "/api/client/invoices/{reference}", code, res)

# 7. Legal Database
# GET /api/staff/legal-database
code, res = req("GET", f"/api/staff/legal-database?q={urllib.parse.quote('تحكيم')}", token=staff_token)
record("Legal Database", "GET", "/api/staff/legal-database", code, res)

# GET /api/staff/legal-database/{reference}
code, res = req("GET", "/api/staff/legal-database/EGY-LAW-27-1994", token=staff_token)
record("Legal Database", "GET", "/api/staff/legal-database/{reference}", code, res)

# 8. Documents (Staff)
# POST /api/staff/documents/generate-word
code, res = req("POST", "/api/staff/documents/generate-word", {
    "matter_reference": "MAT-2201",
    "template_type": "pleading",
    "title": "مذكرة دفاع رد مستعجلة",
    "court_name": "محكمة القاهرة الاقتصادية",
    "client_role": "المدعى عليه",
    "defenses": "الدفع بعدم قبول الدعوى لرفعها قبل الأوان",
    "requests": "أصلياً: الحكم برفض الدعوى. احتياطياً: ندب خبير."
}, token=staff_token)
record("Documents (Staff)", "POST", "/api/staff/documents/generate-word", code, res)
created_doc_id = res.get("id") if isinstance(res, dict) else "doc-434ee559d5af"

# POST /api/staff/documents/export-excel
code, res = req("POST", "/api/staff/documents/export-excel", {
    "export_type": "client_statement",
    "client_id": "cli-001"
}, token=staff_token)
record("Documents (Staff)", "POST", "/api/staff/documents/export-excel", code, res)

# GET /api/staff/documents
code, res = req("GET", "/api/staff/documents", token=staff_token)
record("Documents (Staff)", "GET", "/api/staff/documents", code, res)

# DELETE /api/staff/documents/{document_id}
code, res = req("DELETE", f"/api/staff/documents/{created_doc_id}", token=staff_token)
record("Documents (Staff)", "DELETE", "/api/staff/documents/{document_id}", code, res)

# 9. Documents (Client)
# GET /api/client/documents
code, res = req("GET", "/api/client/documents", token=client_token)
record("Documents (Client)", "GET", "/api/client/documents", code, res)

# 10. Documents Download
# GET /api/documents/{document_id}/preview
code, res = req("GET", "/api/documents/doc-af3c1535bb77/preview")
record("Documents Download", "GET", "/api/documents/{document_id}/preview", code, res)

# GET /api/documents/{document_id}/download
code, res = req("GET", "/api/documents/doc-af3c1535bb77/download")
record("Documents Download", "GET", "/api/documents/{document_id}/download", code, res)

# 11. Integrations & Word Online
# POST /api/staff/integrations/microsoft/save-client-id
code, res = req("POST", "/api/staff/integrations/microsoft/save-client-id", {
    "client_id": "mock-azure-client-id-12345",
    "client_secret": "mock-secret-67890"
}, token=staff_token)
record("Integrations", "POST", "/api/staff/integrations/microsoft/save-client-id", code, res)

# GET /api/staff/integrations/microsoft/login (307 redirect to MS)
code, res = req("GET", "/api/staff/integrations/microsoft/login", token=staff_token)
record("Integrations", "GET", "/api/staff/integrations/microsoft/login", code, res)

# GET /api/staff/integrations/microsoft/callback
code, res = req("GET", "/api/staff/integrations/microsoft/callback?code=mock_code&state=mock_state")
record("Integrations", "GET", "/api/staff/integrations/microsoft/callback", code, res)

# GET /api/staff/integrations/microsoft/status
code, res = req("GET", "/api/staff/integrations/microsoft/status", token=staff_token)
record("Integrations", "GET", "/api/staff/integrations/microsoft/status", code, res)

# GET /api/staff/integrations/microsoft/auth-url
code, res = req("GET", f"/api/staff/integrations/microsoft/auth-url?redirect_uri={urllib.parse.quote('http://localhost:8000/api/staff/integrations/microsoft/callback')}", token=staff_token)
record("Integrations", "GET", "/api/staff/integrations/microsoft/auth-url", code, res)

# POST /api/staff/integrations/microsoft/exchange-token
code, res = req("POST", "/api/staff/integrations/microsoft/exchange-token", {
    "code": "sample_auth_code_123",
    "redirect_uri": "http://localhost:8000/api/staff/integrations/microsoft/callback"
}, token=staff_token)
record("Integrations", "POST", "/api/staff/integrations/microsoft/exchange-token", code, res)

# POST /api/staff/integrations/microsoft/disconnect
code, res = req("POST", "/api/staff/integrations/microsoft/disconnect", token=staff_token)
record("Integrations", "POST", "/api/staff/integrations/microsoft/disconnect", code, res)

# POST /api/staff/integrations/documents/{document_id}/open-word-online
code, res = req("POST", "/api/staff/integrations/documents/doc-af3c1535bb77/open-word-online", token=staff_token)
record("Integrations", "POST", "/api/staff/integrations/documents/{document_id}/open-word-online", code, res)

# POST /api/staff/integrations/documents/{document_id}/sync-from-word-online
code, res = req("POST", "/api/staff/integrations/documents/doc-af3c1535bb77/sync-from-word-online", token=staff_token)
record("Integrations", "POST", "/api/staff/integrations/documents/{document_id}/sync-from-word-online", code, res)

# 12. Users & Team Management
# GET /api/staff/users
code, res = req("GET", "/api/staff/users", token=staff_token)
record("Users", "GET", "/api/staff/users", code, res)

# POST /api/staff/users
new_user_email = f"lawyer_{uid}@mr-law.eg"
code, res = req("POST", "/api/staff/users", {
    "name": f"أحمد سمير {uid}",
    "name_ar": f"أحمد سمير {uid}",
    "name_en": f"Ahmed Samir {uid}",
    "email": new_user_email,
    "rank": "juniorAssociate",
    "password": "password123"
}, token=staff_token)
record("Users", "POST", "/api/staff/users", code, res)
created_user_id = res.get("id") if isinstance(res, dict) else "stf-002"

# POST /api/staff/users/{user_id}/access
code, res = req("POST", f"/api/staff/users/{created_user_id}/access", {"grant": True}, token=staff_token)
record("Users", "POST", "/api/staff/users/{user_id}/access", code, res)

print("\n=== SUMMARY ===", flush=True)
total = len(results)
passed = sum(1 for r in results if r[4])
print(f"Total APIs Tested: {total} | Passed: {passed} | Failed: {total - passed}", flush=True)
