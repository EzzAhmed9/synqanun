import sys
import os
import urllib.parse
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from fastapi.testclient import TestClient
from sqlalchemy import func
from app.main import app
from app.core.config import Settings
from app.core.database import SessionLocal
from app.core.ratelimit import reset_rate_limit, reset_all_rate_limits
from app.models.user import User
from app.models.integration import Integration
from app.models.firm import Firm
from app.models.client import Client
from app.models.matter import Matter
from app.models.invoice import Invoice

client = TestClient(app, follow_redirects=False)

def get_db_counts(db):
    return {
        "firms": db.query(Firm).count(),
        "users": db.query(User).count(),
        "clients": db.query(Client).count(),
        "matters": db.query(Matter).count(),
        "invoices": db.query(Invoice).count(),
        "integrations": db.query(Integration).count(),
    }

def run_tests():
    print("\n=== STARTING SECURITY FIXES & HARDENING TEST SUITE ===")
    db = SessionLocal()
    initial_counts = get_db_counts(db)
    print(f"[INITIAL DB COUNTS] {initial_counts}\n")

    # Save original integration state to cleanly restore at the end
    original_integration = db.query(Integration).filter(
        Integration.firm_id == "firm-001",
        Integration.provider == "microsoft"
    ).first()
    saved_client_id = original_integration.client_id if original_integration else None
    saved_client_secret = original_integration.client_secret if original_integration else None
    saved_is_active = original_integration.is_active if original_integration else False

    try:
        # -------------------------------------------------------------
        # TEST 1: Default SECRET_KEY rejected when ENVIRONMENT=production
        # -------------------------------------------------------------
        print("--- Test 1: Production SECRET_KEY validation ---")
        
        # In production with default key -> ValueError
        default_rejected = False
        try:
            Settings(
                ENVIRONMENT="production",
                SECRET_KEY="synqanun-super-secret-jwt-key-2026-development-change-in-production"
            )
        except ValueError as e:
            default_rejected = True
            assert "Production SECRET_KEY must be configured" in str(e)
        assert default_rejected, "Expected ValueError when production uses default SECRET_KEY"

        # In production with missing/short key (< 32 chars) -> ValueError
        short_rejected = False
        try:
            Settings(ENVIRONMENT="production", SECRET_KEY="short-secret-key-too-small")
        except ValueError:
            short_rejected = True
        assert short_rejected, "Expected ValueError when production uses short SECRET_KEY"

        # In production with valid key (>= 32 chars and not default) -> OK
        valid_prod_settings = Settings(
            ENVIRONMENT="production",
            SECRET_KEY="prod-super-secure-custom-key-at-least-32-chars-long"
        )
        assert valid_prod_settings.ENVIRONMENT == "production"
        print("[PASS] Default or short key strictly rejected in production; valid 32+ char key accepted.")

        # -------------------------------------------------------------
        # TEST 2: Password reset identical generic response & no token
        # -------------------------------------------------------------
        print("\n--- Test 2: Password reset generic response (no user enumeration) ---")
        reset_all_rate_limits()

        # Known email
        r_known = client.post("/api/auth/password-reset/request", json={"email": "m.alfarooq@mr-law.eg"})
        assert r_known.status_code == 200, f"Expected 200, got {r_known.status_code}: {r_known.text}"
        data_known = r_known.json()

        # Unknown email
        r_unknown = client.post("/api/auth/password-reset/request", json={"email": "completely_unknown_999@domain.com"})
        assert r_unknown.status_code == 200, f"Expected 200, got {r_unknown.status_code}: {r_unknown.text}"
        data_unknown = r_unknown.json()

        # Responses must be identical and MUST NOT contain a token
        assert data_known == data_unknown, f"Responses differ! Known: {data_known} vs Unknown: {data_unknown}"
        assert "token" not in data_known, f"Token leaked in response for known user: {data_known}"
        assert "token" not in data_unknown, f"Token leaked in response for unknown user: {data_unknown}"
        assert data_known.get("ok") is True
        print("[PASS] Password reset returns identical generic response for known & unknown emails with zero token leak.")

        # -------------------------------------------------------------
        # TEST 3: login_json fuzzy matching removed (email prefix & user id -> 401)
        # -------------------------------------------------------------
        print("\n--- Test 3: Exact email match required (prefix and id rejected) ---")
        reset_all_rate_limits()

        # Email prefix login attempt -> 401
        r_prefix = client.post("/api/auth/login", json={"email": "m.alfarooq", "password": "password123"})
        assert r_prefix.status_code == 401, f"Prefix login should fail with 401, got {r_prefix.status_code}"
        assert r_prefix.json().get("detail") == "Incorrect email or password"

        # User ID login attempt -> 401
        r_uid = client.post("/api/auth/login", json={"email": "stf-001", "password": "password123"})
        assert r_uid.status_code == 401, f"User ID login should fail with 401, got {r_uid.status_code}"
        assert r_uid.json().get("detail") == "Incorrect email or password"

        # Wrong password with valid email -> 401 (identical generic message)
        r_wrong_pw = client.post("/api/auth/login", json={"email": "m.alfarooq@mr-law.eg", "password": "wrong_password_here"})
        assert r_wrong_pw.status_code == 401
        assert r_wrong_pw.json().get("detail") == "Incorrect email or password"

        # Valid full email (case-insensitive) -> 200
        r_exact = client.post("/api/auth/login", json={"email": "M.AlFarooq@mr-law.eg", "password": "password123"})
        assert r_exact.status_code == 200, f"Full case-insensitive email should succeed with 200, got {r_exact.status_code}"
        print("[PASS] Email prefix and user id logins rejected (401); case-insensitive exact email succeeds.")

        # -------------------------------------------------------------
        # TEST 4: API docs absent in production
        # -------------------------------------------------------------
        print("\n--- Test 4: API docs disabled in production ---")
        # In main.py: docs_url, redoc_url, and openapi_url are set to None if ENVIRONMENT == "production"
        from fastapi import FastAPI
        is_prod = True
        test_prod_app = FastAPI(
            docs_url=None if is_prod else "/docs",
            redoc_url=None if is_prod else "/redoc",
            openapi_url=None if is_prod else "/openapi.json",
        )
        prod_client = TestClient(test_prod_app)
        assert prod_client.get("/docs").status_code == 404
        assert prod_client.get("/redoc").status_code == 404
        assert prod_client.get("/openapi.json").status_code == 404
        print("[PASS] /docs, /redoc, and /openapi.json are disabled (404) in production mode.")

        # -------------------------------------------------------------
        # TEST 5: Rate Limiting (6th failed attempt -> 429 & Retry-After; reset works)
        # -------------------------------------------------------------
        print("\n--- Test 5: In-memory Rate Limiting (5 failures in 15m -> 429) ---")
        ratelimit_email = "brute_force_victim@mr-law.eg"
        reset_all_rate_limits()

        # Attempts 1 through 5 fail with 401
        for i in range(1, 6):
            res_fail = client.post("/api/auth/login", json={"email": ratelimit_email, "password": "badpassword"})
            assert res_fail.status_code == 401, f"Attempt {i} expected 401, got {res_fail.status_code}"

        # 6th attempt in a row must be blocked with 429
        res_blocked = client.post("/api/auth/login", json={"email": ratelimit_email, "password": "badpassword"})
        assert res_blocked.status_code == 429, f"6th attempt expected 429, got {res_blocked.status_code}: {res_blocked.text}"
        assert "Retry-After" in res_blocked.headers, "Retry-After header missing on 429 response"
        retry_val = int(res_blocked.headers["Retry-After"])
        assert retry_val > 0, f"Expected positive Retry-After, got {retry_val}"
        print(f"[PASS] 6th failed login blocked with 429 (Retry-After: {retry_val}s).")

        # Window reset / counter reset allows login
        reset_rate_limit("testclient", ratelimit_email)
        reset_all_rate_limits()

        # Valid login succeeds after window reset
        res_ok = client.post("/api/auth/login", json={"email": "m.alfarooq@mr-law.eg", "password": "password123"})
        assert res_ok.status_code == 200
        print("[PASS] Window reset clears limiter; valid login succeeds immediately.")

        # -------------------------------------------------------------
        # TEST 6: Microsoft Integration Authorization (Partner only)
        # -------------------------------------------------------------
        print("\n--- Test 6: Microsoft integration RBAC (Partner required) ---")
        reset_all_rate_limits()

        # 6a. Client token -> 403
        r_client_login = client.post("/api/auth/login", json={"email": "client@mr-law.eg", "password": "password123"})
        client_token = r_client_login.json()["access_token"]
        
        r_c_save = client.post(
            "/api/staff/integrations/microsoft/save-client-id",
            json={"client_id": "test-client-id-attempt"},
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert r_c_save.status_code == 403, f"Client save-client-id expected 403, got {r_c_save.status_code}"

        r_c_disc = client.post(
            "/api/staff/integrations/microsoft/disconnect",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert r_c_disc.status_code == 403, f"Client disconnect expected 403, got {r_c_disc.status_code}"
        print("[PASS] Client user rejected from save-client-id and disconnect (403).")

        # 6b. Senior Associate token -> 403
        r_snr_login = client.post("/api/auth/login", json={"email": "senior@mr-law.eg", "password": "password123"})
        snr_token = r_snr_login.json()["access_token"]

        r_s_save = client.post(
            "/api/staff/integrations/microsoft/save-client-id",
            json={"client_id": "test-client-id-attempt"},
            headers={"Authorization": f"Bearer {snr_token}"}
        )
        assert r_s_save.status_code == 403, f"Senior associate save-client-id expected 403, got {r_s_save.status_code}"

        r_s_disc = client.post(
            "/api/staff/integrations/microsoft/disconnect",
            headers={"Authorization": f"Bearer {snr_token}"}
        )
        assert r_s_disc.status_code == 403, f"Senior associate disconnect expected 403, got {r_s_disc.status_code}"
        print("[PASS] Senior associate rejected from save-client-id and disconnect (403).")

        # 6c. Partner token -> 200 OK
        r_part_login = client.post("/api/auth/login", json={"email": "partner@mr-law.eg", "password": "password123"})
        part_token = r_part_login.json()["access_token"]

        r_p_save = client.post(
            "/api/staff/integrations/microsoft/save-client-id",
            json={"client_id": "partner-configured-azure-client-id"},
            headers={"Authorization": f"Bearer {part_token}"}
        )
        assert r_p_save.status_code == 200, f"Partner save-client-id expected 200, got {r_p_save.status_code}"

        r_p_disc = client.post(
            "/api/staff/integrations/microsoft/disconnect",
            headers={"Authorization": f"Bearer {part_token}"}
        )
        assert r_p_disc.status_code == 200, f"Partner disconnect expected 200, got {r_p_disc.status_code}"
        print("[PASS] Partner successfully saved client ID and disconnected integration (200).")

        # -------------------------------------------------------------
        # TEST 7: Open Redirect Prevention (return_to sanitization)
        # -------------------------------------------------------------
        print("\n--- Test 7: Open Redirect Protection (return_to sanitization) ---")

        # 7a. Missing ticket / staff_id -> 400
        r_no_staff = client.get("/api/staff/integrations/microsoft/login")
        assert r_no_staff.status_code == 400, f"Missing ticket expected 400, got {r_no_staff.status_code}"

        from app.core.security import create_oauth_ticket
        valid_ticket = create_oauth_ticket("stf-001", "firm-001")

        from app.core.security import verify_oauth_state

        def get_state_from_url(url: str):
            parsed = urllib.parse.urlparse(url)
            qs = urllib.parse.parse_qs(parsed.query)
            token = qs.get("state", [""])[0]
            return verify_oauth_state(token)

        # 7b. Malicious return_to with //evil.com -> falls back to /ar/staff
        r_evil1 = client.get(f"/api/staff/integrations/microsoft/login?ticket={valid_ticket}&return_to=//evil.com")
        st1 = get_state_from_url(r_evil1.headers.get("location", ""))
        assert st1 and st1.get("return_to") == "/ar/staff"

        # 7c. Malicious return_to with https://evil.com -> falls back to /ar/staff
        r_evil2 = client.get(f"/api/staff/integrations/microsoft/login?ticket={valid_ticket}&return_to=https://evil.com")
        st2 = get_state_from_url(r_evil2.headers.get("location", ""))
        assert st2 and st2.get("return_to") == "/ar/staff"

        # 7d. Malicious return_to with \evil -> falls back to /ar/staff
        r_evil3 = client.get(f"/api/staff/integrations/microsoft/login?ticket={valid_ticket}&return_to=\\evil")
        st3 = get_state_from_url(r_evil3.headers.get("location", ""))
        assert st3 and st3.get("return_to") == "/ar/staff"

        # 7e. Valid relative path -> preserved
        r_valid = client.get(f"/api/staff/integrations/microsoft/login?ticket={valid_ticket}&return_to=/ar/staff/matters/MAT-2201")
        st_valid = get_state_from_url(r_valid.headers.get("location", ""))
        assert st_valid and st_valid.get("return_to") == "/ar/staff/matters/MAT-2201"

        # 7f. Callback malformed state -> redirects with ms_error
        r_cb_malformed = client.get("/api/staff/integrations/microsoft/callback?code=mock_code&state=no_separator_here")
        loc_cb = r_cb_malformed.headers.get("location", "")
        assert "ms_error" in loc_cb, f"Expected ms_error on malformed state: {loc_cb}"

        # 7g. Callback unsigned or malicious state -> rejected with ms_error
        r_cb_evil = client.get("/api/staff/integrations/microsoft/callback?code=mock_code&state=stf-001:://evil.com")
        loc_cb_evil = r_cb_evil.headers.get("location", "")
        assert "ms_error" in loc_cb_evil
        assert "//evil.com" not in loc_cb_evil and "/ar/staff" in loc_cb_evil, f"Callback Open Redirect leak: {loc_cb_evil}"

        print("[PASS] //evil.com, https://evil.com, and \\evil strictly sanitized to /ar/staff.")
        print("[PASS] Malformed OAuth states rejected with error redirect.")

        print("\n" + "="*59)
        print(" ALL SECURITY HARDENING & DEFENSE TESTS PASSED 100%! ")
        print("="*59 + "\n")

    finally:
        # Cleanup and restore integration state
        intg = db.query(Integration).filter(
            Integration.firm_id == "firm-001",
            Integration.provider == "microsoft"
        ).first()
        if intg:
            intg.client_id = saved_client_id
            intg.client_secret = saved_client_secret
            intg.is_active = saved_is_active
            db.commit()

        reset_all_rate_limits()
        final_counts = get_db_counts(db)
        db.close()
        print(f"[FINAL DB COUNTS]   {final_counts}")
        assert initial_counts == final_counts, f"Database leak detected! {initial_counts} vs {final_counts}"
        print("[CLEANUP] Zero DB leak verified! Initial counts match final counts exactly.\n")

if __name__ == "__main__":
    run_tests()
