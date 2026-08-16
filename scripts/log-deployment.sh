#!/usr/bin/env bash
# ============================================================
# QCypher CRM — Deployment Log
#
# Records a row in deployment_log for every production deploy — the
# evidence trail behind docs/change-management-policy.md's "what every
# deployment should record" section. Deploys here are manual
# (pnpm exec next build, then `vercel --prod --yes`), not triggered by
# CI, so this is a wrapper you run alongside that, not a GitHub Action.
#
# Usage:
#   bash scripts/log-deployment.sh ["migration_file"] ["notes"]
#
# Env vars (read from apps/web/.env.local if not already exported):
#   NEXT_PUBLIC_SUPABASE_URL
#   SUPABASE_SERVICE_ROLE_KEY
#   DEPLOYED_BY   optional override; defaults to `git config user.name`
# ============================================================

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/apps/web/.env.local"

if [ -z "${NEXT_PUBLIC_SUPABASE_URL:-}" ] && [ -f "$ENV_FILE" ]; then
  NEXT_PUBLIC_SUPABASE_URL=$(grep -m1 "^NEXT_PUBLIC_SUPABASE_URL=" "$ENV_FILE" | cut -d= -f2-)
fi
if [ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ] && [ -f "$ENV_FILE" ]; then
  SUPABASE_SERVICE_ROLE_KEY=$(grep -m1 "^SUPABASE_SERVICE_ROLE_KEY=" "$ENV_FILE" | cut -d= -f2-)
fi

: "${NEXT_PUBLIC_SUPABASE_URL:?NEXT_PUBLIC_SUPABASE_URL must be set (or present in apps/web/.env.local)}"
: "${SUPABASE_SERVICE_ROLE_KEY:?SUPABASE_SERVICE_ROLE_KEY must be set (or present in apps/web/.env.local)}"

MIGRATION_FILE="${1:-}"
NOTES="${2:-}"
DEPLOYED_BY="${DEPLOYED_BY:-$(git config user.name 2>/dev/null || echo unknown)}"
COMMIT_HASH="$(git -C "$ROOT" rev-parse HEAD)"
COMMIT_MESSAGE="$(git -C "$ROOT" log -1 --pretty=%s)"

PAYLOAD=$(python3 - "$DEPLOYED_BY" "$COMMIT_HASH" "$COMMIT_MESSAGE" "$MIGRATION_FILE" "$NOTES" <<'EOF'
import json, sys
deployed_by, commit_hash, commit_message, migration_file, notes = sys.argv[1:6]
body = {
    "deployed_by": deployed_by,
    "commit_hash": commit_hash,
    "commit_message": commit_message,
}
if migration_file:
    body["migration_applied"] = migration_file
if notes:
    body["notes"] = notes
print(json.dumps(body))
EOF
)

RESPONSE=$(curl -sS -X POST "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/deployment_log" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "$PAYLOAD")

echo "Deployment logged:"
echo "$RESPONSE" | python3 -m json.tool
