import os
import sys
import httpx
from datetime import datetime

sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://127.0.0.1:8000/api"
STAFF_HEADERS = {"X-Viewer-Staff-Id": "stf-001"}
CLIENT_HEADERS = {"X-Viewer-Client-Id": "acct-client-tarek"}

def run_audit():
    print("=" * 70)
    print("SYNQANUN SUITE — MODULE 5: DOCUMENTS & EXPORTS AUDIT")
    print("=" * 70)

    passed_tests = 0
    total_tests = 9

    # 1. Generate Word Pleading Memo
    print("\n[Test 1] Generating Word Pleading Memo (.docx) for MAT-2201...")
    res1 = httpx.post(
        f"{BASE_URL}/staff/documents/generate-word",
        json={
            "matter_reference": "MAT-2201",
            "template_type": "pleading",
            "title": "مذكرة دفاع في دعوى النزاع التجاري لعقد التوزيع الحصري",
            "client_role": "المستأنف ضده",
            "opposing_party": "شركة الشرق الأوسط للتجارة الدولية",
            "court_name": "محكمة استئناف القاهرة - الدائرة التجارية",
            "is_firm_only": False,
        },
        headers=STAFF_HEADERS
    )
    assert res1.status_code == 201, f"Failed: {res1.status_code} {res1.text}"
    doc_word_pleading = res1.json()
    assert doc_word_pleading["kind"] == "docx"
    assert doc_word_pleading["size_bytes"] > 1000
    print(f"✓ Word pleading created: ID={doc_word_pleading['id']} | File={doc_word_pleading['name']} | Size={doc_word_pleading['size_label']}")
    passed_tests += 1

    # 2. Generate Word Retainer Contract
    print("\n[Test 2] Generating Word Retainer Contract (.docx) for MAT-2201...")
    res2 = httpx.post(
        f"{BASE_URL}/staff/documents/generate-word",
        json={
            "matter_reference": "MAT-2201",
            "template_type": "contract",
            "title": "عقد تقديم خدمات وأتعاب قانونية - مسألة MAT-2201",
            "is_firm_only": False,
        },
        headers=STAFF_HEADERS
    )
    assert res2.status_code == 201, f"Failed: {res2.status_code} {res2.text}"
    doc_word_contract = res2.json()
    assert doc_word_contract["kind"] == "docx"
    print(f"✓ Word contract created: ID={doc_word_contract['id']} | File={doc_word_contract['name']}")
    passed_tests += 1

    # 3. Export Excel Client Statement
    print("\n[Test 3] Exporting Excel Client Statement (.xlsx) for MAT-2201...")
    res3 = httpx.post(
        f"{BASE_URL}/staff/documents/export-excel",
        json={
            "export_type": "client_statement",
            "matter_reference": "MAT-2201",
            "is_firm_only": False,
        },
        headers=STAFF_HEADERS
    )
    assert res3.status_code == 201, f"Failed: {res3.status_code} {res3.text}"
    doc_xl_stmt = res3.json()
    assert doc_xl_stmt["kind"] == "xlsx"
    print(f"✓ Excel statement created: ID={doc_xl_stmt['id']} | File={doc_xl_stmt['name']} | Size={doc_xl_stmt['size_label']}")
    passed_tests += 1

    # 4. Export Excel Invoices Ledger
    print("\n[Test 4] Exporting Excel Invoices Ledger (.xlsx) for MAT-2201...")
    res4 = httpx.post(
        f"{BASE_URL}/staff/documents/export-excel",
        json={
            "export_type": "invoices_ledger",
            "matter_reference": "MAT-2201",
            "is_firm_only": False,
        },
        headers=STAFF_HEADERS
    )
    assert res4.status_code == 201, f"Failed: {res4.status_code} {res4.text}"
    doc_xl_ledger = res4.json()
    assert doc_xl_ledger["kind"] == "xlsx"
    print(f"✓ Excel ledger created: ID={doc_xl_ledger['id']} | File={doc_xl_ledger['name']}")
    passed_tests += 1

    # 5. Export Excel Timesheet
    print("\n[Test 5] Exporting Excel Timesheet Report (.xlsx) for MAT-2201...")
    res5 = httpx.post(
        f"{BASE_URL}/staff/documents/export-excel",
        json={
            "export_type": "timesheet",
            "matter_reference": "MAT-2201",
            "is_firm_only": False,
        },
        headers=STAFF_HEADERS
    )
    assert res5.status_code == 201, f"Failed: {res5.status_code} {res5.text}"
    doc_xl_ts = res5.json()
    assert doc_xl_ts["kind"] == "xlsx"
    print(f"✓ Excel timesheet created: ID={doc_xl_ts['id']} | File={doc_xl_ts['name']}")
    passed_tests += 1

    # 6. Test File Streaming Download
    print("\n[Test 6] Testing File Download for Word and Excel files...")
    dl_word_res = httpx.get(f"http://127.0.0.1:8000{doc_word_pleading['download_url']}")
    assert dl_word_res.status_code == 200
    assert "wordprocessingml" in dl_word_res.headers.get("content-type", "")
    assert len(dl_word_res.content) == doc_word_pleading["size_bytes"]

    dl_xl_res = httpx.get(f"http://127.0.0.1:8000{doc_xl_stmt['download_url']}")
    assert dl_xl_res.status_code == 200
    assert "spreadsheetml" in dl_xl_res.headers.get("content-type", "")
    assert len(dl_xl_res.content) == doc_xl_stmt["size_bytes"]
    print(f"✓ File streaming downloads verified (Word: {len(dl_word_res.content)} bytes, Excel: {len(dl_xl_res.content)} bytes)")
    passed_tests += 1

    # 7. List documents for Staff
    print("\n[Test 7] Listing Staff Documents from PostgreSQL...")
    list_staff_res = httpx.get(f"{BASE_URL}/staff/documents?engagement_ref=MAT-2201", headers=STAFF_HEADERS)
    assert list_staff_res.status_code == 200
    staff_docs = list_staff_res.json()["items"]
    assert len(staff_docs) >= 5
    print(f"✓ Staff documents query returned {len(staff_docs)} persisted documents")
    passed_tests += 1

    # 8. List documents for Client
    print("\n[Test 8] Listing Client Documents from PostgreSQL...")
    list_cli_res = httpx.get(f"{BASE_URL}/client/documents?engagement_ref=MAT-2201", headers=CLIENT_HEADERS)
    assert list_cli_res.status_code == 200
    cli_docs = list_cli_res.json()["items"]
    assert len(cli_docs) >= 5
    print(f"✓ Client portal documents query returned {len(cli_docs)} shared documents")
    passed_tests += 1

    # 9. Verify Live Matter Integration
    print("\n[Test 9] Verifying Matter View integration (Staff & Client)...")
    matter_staff_res = httpx.get(f"{BASE_URL}/staff/matters/MAT-2201", headers=STAFF_HEADERS)
    assert matter_staff_res.status_code == 200
    m_data = matter_staff_res.json()
    assert len(m_data["documents"]) >= 5
    assert len(m_data["firmDocuments"]) >= 5

    matter_cli_res = httpx.get(f"{BASE_URL}/client/matters/MAT-2201", headers=CLIENT_HEADERS)
    assert matter_cli_res.status_code == 200
    cli_m_data = matter_cli_res.json()
    assert len(cli_m_data["documents"]) >= 5
    print(f"✓ Matter MAT-2201 reflects all documents live (Staff shared: {len(m_data['documents'])}, Client shared: {len(cli_m_data['documents'])})")
    passed_tests += 1

    print("\n" + "=" * 70)
    print(f"ALL TESTS PASSED: {passed_tests}/{total_tests} (100% SUCCESS)")
    print("=" * 70)

if __name__ == "__main__":
    run_audit()
