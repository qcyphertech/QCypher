#!/usr/bin/env python3
"""
QCypher CRM — Super-Admin Access Review

Lists every account with is_super_admin=true, their MFA status, and
last sign-in — the actual data a periodic access review needs to
confirm the super-admin list is still correct (docs/risk-register.md
Risk #3's last open item). Run this, read the output, and record the
outcome in evidence/access-control/ (see that folder's README).

Usage: python3 scripts/review-super-admins.py
Reads NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY from the
environment, falling back to apps/web/.env.local if not set.

Uses curl via subprocess rather than urllib — this machine's Python.org
build doesn't ship a working default cert bundle (SSLCertVerificationError
against a plain urllib.request call, confirmed 2026-08-16), while curl
uses the system cert store correctly. Avoids depending on `certifi` as
an extra dependency for a one-off internal script.
"""
import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path


def load_env_fallback(name: str) -> str | None:
    env_file = Path(__file__).resolve().parent.parent / "apps/web/.env.local"
    if not env_file.exists():
        return None
    for line in env_file.read_text().splitlines():
        if line.startswith(f"{name}="):
            return line.split("=", 1)[1]
    return None


SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or load_env_fallback("NEXT_PUBLIC_SUPABASE_URL")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or load_env_fallback("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SERVICE_KEY:
    print("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set "
          "(or present in apps/web/.env.local)", file=sys.stderr)
    sys.exit(1)


def api_get(path: str):
    result = subprocess.run(
        ["curl", "-sS", f"{SUPABASE_URL}{path}",
         "-H", f"apikey: {SERVICE_KEY}",
         "-H", f"Authorization: Bearer {SERVICE_KEY}"],
        capture_output=True, text=True, check=True,
    )
    return json.loads(result.stdout)


def main():
    print(f"=== Super-Admin Access Review — {datetime.now(timezone.utc).strftime('%Y-%m-%d')} ===\n")

    users = api_get("/auth/v1/admin/users?per_page=1000").get("users", [])
    admins = [u for u in users if u.get("app_metadata", {}).get("is_super_admin")]

    if not admins:
        print("No super-admin accounts found — unexpected, investigate.")
        sys.exit(1)

    print(f"{len(admins)} super-admin account(s):\n")

    flags = []
    for u in admins:
        # Per-user MFA factor status — confirmed working via
        # GET /admin/users/{id}/factors (2026-08-16), unlike the main
        # listUsers response, which doesn't include factor data at all.
        try:
            factors = api_get(f"/auth/v1/admin/users/{u['id']}/factors")
            verified = [f for f in factors if f.get("status") == "verified"]
        except Exception:
            verified = None

        print(f"  {u['email']}")
        print(f"    Created:      {u.get('created_at', '?')}")
        print(f"    Last sign-in: {u.get('last_sign_in_at', 'never')}")
        print(f"    Provider:     {u.get('app_metadata', {}).get('provider', '?')}")
        if verified is None:
            print("    MFA:          COULD NOT CHECK (API error)")
            flags.append(f"{u['email']}: MFA status could not be checked")
        elif verified:
            names = ", ".join(f.get("friendly_name") or "unnamed device" for f in verified)
            print(f"    MFA:          ✅ {len(verified)} verified device(s) — {names}")
        else:
            print("    MFA:          ❌ NO VERIFIED FACTOR")
            flags.append(f"{u['email']}: NO MFA ENROLLED — required for super admins")
        print()

    if flags:
        print("⚠️  FLAGS REQUIRING ACTION:")
        for f in flags:
            print(f"  - {f}")
        print()

    print("For each account above, also confirm manually during this review:")
    print("  [ ] This person still needs super-admin access (not just any access)")
    print("  [ ] Last sign-in is recent / expected for this person's role")
    print()
    print("Record the outcome (reviewer, date, findings) in evidence/access-control/")
    print("  filename pattern: YYYY-MM-DD-super-admin-review.md")


if __name__ == "__main__":
    main()
