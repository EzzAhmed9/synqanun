import urllib.request
import json
import sys

BASE_URL = "http://127.0.0.1:8000/api"
STAFF_ID = "stf-001"
CLIENT_ID = "acct-client-tarek"

passed = 0
failed = 0

def log_test(name, success, info=""):
    global passed, failed
    if success:
        passed += 1
        print(f"  [PASS] {name} {info}")
    else:
        failed += 1
        print(f"  [FAIL] {name} {info}")

def request(path, method="GET", body=None, headers=None):
    url = f"{BASE_URL}{path}"
    h = headers or {}
    data = json.dumps(body).encode("utf-8") if body else None
    req = urllib.request.Request(url, data=data, headers=h, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            content = resp.read().decode("utf-8")
            return resp.status, json.loads(content) if content else {}
    except urllib.error.HTTPError as e:
        err_content = e.read().decode("utf-8")
        try:
            return e.code, json.loads(err_content)
        except Exception:
            return e.code, {"error": err_content}
    except Exception as e:
        return 500, {"error": str(e)}

print("\n--- AUDITING MODULE 4: BILLING & INVOICING + TIME TRACKING ---\n")

# 1. Staff Billing Summary
status, res = request("/staff/billing/summary", headers={"X-Viewer-Staff-Id": STAFF_ID})
log_test("1. GET /staff/billing/summary", status == 200 and "unbilledMinutes" in res, f"(Unbilled: {res.get('unbilledMinutes')} mins, Currency: {res.get('currency')})")

# 2. Staff Invoices Ledger
status, res = request("/staff/billing/invoices", headers={"X-Viewer-Staff-Id": STAFF_ID})
log_test("2. GET /staff/billing/invoices", status == 200 and "items" in res and "totals" in res, f"(Invoices: {len(res.get('items', []))}, Outstanding: {res.get('totals', {}).get('outstanding')})")

# 3. Staff Quotes List
status, res = request("/staff/billing/quotes", headers={"X-Viewer-Staff-Id": STAFF_ID})
log_test("3. GET /staff/billing/quotes", status == 200 and "items" in res and "counts" in res, f"(Quotes: {len(res.get('items', []))}, Pending: {res.get('counts', {}).get('pending')})")

# 4. Staff Time Entries List
status, res = request("/staff/billing/time?matterId=MAT-2201", headers={"X-Viewer-Staff-Id": STAFF_ID})
log_test("4. GET /staff/billing/time?matterId=MAT-2201", status == 200 and isinstance(res, list), f"(Entries: {len(res)})")

# 5. Staff Invoice Draft Context
status, res = request("/staff/billing/context?engagementRef=MAT-2201", headers={"X-Viewer-Staff-Id": STAFF_ID})
log_test("5. GET /staff/billing/context?engagementRef=MAT-2201", status == 200 and "engagements" in res and "unbilled" in res, f"(Engagements: {len(res.get('engagements', []))}, Unbilled: {len(res.get('unbilled', []))})")

# 6. Log Time (Simulating Timer or LogTimeModal)
new_time_payload = {
    "matterId": "MAT-2203",
    "minutes": 45,
    "description": "صياغة لائحة الحوكمة والامتثال التنظيمي",
    "billable": True
}
status, res = request(
    "/staff/billing/time",
    method="POST",
    body=new_time_payload,
    headers={"Content-Type": "application/json", "X-Viewer-Staff-Id": STAFF_ID}
)
entry_id = res.get("entryId") or res.get("id")
log_test("6. POST /staff/billing/time", status == 201 and bool(entry_id), f"(Created entry ID: {entry_id}, Minutes: {res.get('minutes')})")

# 7. Create Draft Invoice from the logged time entry
draft_payload = {
    "engagementRef": "MAT-2201",
    "description": "فاتورة استشارات حوكمة وإعداد السياسات التنظيمية",
    "lines": [
        {
            "description": "صياغة لائحة الحوكمة والامتثال التنظيمي",
            "amount": 2625.0,
            "detail": "45 دقيقة عمل استشاري",
            "minutes": 45,
            "fromEntryIds": [entry_id] if entry_id else []
        }
    ]
}
status, res = request(
    "/staff/billing/drafts",
    method="POST",
    body=draft_payload,
    headers={"Content-Type": "application/json", "X-Viewer-Staff-Id": STAFF_ID}
)
draft_ref = res.get("reference")
log_test("7. POST /staff/billing/drafts", status == 201 and bool(draft_ref), f"(Draft Ref: {draft_ref})")

# 8. Issue Invoice (Convert draft to due)
if draft_ref:
    status, res = request(
        f"/staff/billing/invoices/{draft_ref}/issue",
        method="POST",
        headers={"X-Viewer-Staff-Id": STAFF_ID}
    )
    log_test("8. POST /staff/billing/invoices/{ref}/issue", status == 200 and res.get("status") == "due", f"(Status: {res.get('status')}, DueOn: {res.get('dueOn')})")
else:
    log_test("8. POST /staff/billing/invoices/{ref}/issue", False, "(No draft_ref)")

# 9. Mark Invoice as Paid
if draft_ref:
    status, res = request(
        f"/staff/billing/invoices/{draft_ref}/mark-paid",
        method="POST",
        headers={"X-Viewer-Staff-Id": STAFF_ID}
    )
    log_test("9. POST /staff/billing/invoices/{ref}/mark-paid", status == 200 and res.get("status") == "paid", f"(Status: {res.get('status')}, PaidOn: {res.get('paidOn')})")
else:
    log_test("9. POST /staff/billing/invoices/{ref}/mark-paid", False, "(No draft_ref)")

# 10. Client Portal Invoices List
status, res = request("/client/invoices", headers={"X-Viewer-Client-Id": CLIENT_ID})
log_test("10. GET /client/invoices", status == 200 and "items" in res and "counts" in res, f"(Client Invoices: {len(res.get('items', []))})")

# 11. Client Portal Summary
status, res = request("/client/invoices/summary", headers={"X-Viewer-Client-Id": CLIENT_ID})
log_test("11. GET /client/invoices/summary", status == 200 and "balanceDue" in res, f"(Balance Due: {res.get('balanceDue')}, Currency: {res.get('currency')})")

# 12. Client Portal Single Invoice Detail
status, res = request("/client/invoices/INV-2026-089", headers={"X-Viewer-Client-Id": CLIENT_ID})
log_test("12. GET /client/invoices/INV-2026-089", status == 200 and res.get("reference") == "INV-2026-089", f"(Ref: {res.get('reference')}, Amount: {res.get('amount')})")

print(f"\nAUDIT COMPLETE: {passed} PASSED, {failed} FAILED\n")
if failed > 0:
    sys.exit(1)
