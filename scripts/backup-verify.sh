#!/usr/bin/env bash
# ============================================================
# QCypher CRM — Backup + Restore Verification Script
#
# Runs a full pg_dump → upload → restore → spot-check cycle.
# Exits non-zero on any failure so CI can gate on it.
#
# Required env vars (set in .env.local or CI secrets):
#   SUPABASE_DB_URL    postgres connection string (from Supabase dashboard → Settings → Database)
#   R2_BUCKET          Cloudflare R2 bucket name
#   R2_ENDPOINT        R2 endpoint URL  (e.g. https://<account>.r2.cloudflarestorage.com)
#   R2_ACCESS_KEY_ID   R2 access key
#   R2_SECRET_ACCESS_KEY
#
# Optional:
#   RESTORE_DB_URL     Connection string for a scratch DB to restore into.
#                      If unset, restore step is skipped (dump-only verification).
#
# Dependencies: pg_dump, psql, aws CLI (configured for R2), gzip
# ============================================================

set -euo pipefail

log() { echo "[$(date -u +%H:%M:%S)] $*"; }
die() { echo "FATAL: $*" >&2; exit 1; }

: "${SUPABASE_DB_URL:?SUPABASE_DB_URL must be set}"
: "${R2_BUCKET:?R2_BUCKET must be set}"
: "${R2_ENDPOINT:?R2_ENDPOINT must be set}"
: "${R2_ACCESS_KEY_ID:?R2_ACCESS_KEY_ID must be set}"
: "${R2_SECRET_ACCESS_KEY:?R2_SECRET_ACCESS_KEY must be set}"

TIMESTAMP=$(date -u +%Y%m%dT%H%M%SZ)
DUMP_FILE="/tmp/qcypher-backup-${TIMESTAMP}.sql.gz"
S3_KEY="backups/qcypher-${TIMESTAMP}.sql.gz"

# ── 1. Dump ──────────────────────────────────────────────────────────────
log "Dumping database..."
pg_dump \
  --no-owner \
  --no-acl \
  --schema=public \
  "$SUPABASE_DB_URL" \
  | gzip > "$DUMP_FILE"

DUMP_SIZE=$(du -sh "$DUMP_FILE" | cut -f1)
log "Dump complete: $DUMP_FILE ($DUMP_SIZE)"

# Sanity: dump must contain our core tables. Decompress once into a temp
# file rather than piping zcat into grep per table — with `pipefail` on,
# `zcat f | grep -q pattern` reports failure even when grep *finds* the
# pattern, because grep -q exits the instant it matches and closes the
# pipe, so zcat gets SIGPIPE and pipefail surfaces that as the pipeline's
# exit status instead of grep's success. Confirmed this was producing a
# false "missing table" on a verifiably complete dump.
DUMP_SQL="/tmp/qcypher-dump-check-${TIMESTAMP}.sql"
zcat "$DUMP_FILE" > "$DUMP_SQL"
for table in tenants contacts interactions events templates send_log; do
  if ! grep -q "CREATE TABLE public.${table}" "$DUMP_SQL"; then
    rm -f "$DUMP_SQL"
    die "Dump missing table: $table"
  fi
done
rm -f "$DUMP_SQL"
log "Table presence check: PASS"

# ── 2. Upload to R2 ──────────────────────────────────────────────────────
log "Uploading to R2: s3://${R2_BUCKET}/${S3_KEY}"
AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" \
AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" \
  aws s3 cp "$DUMP_FILE" "s3://${R2_BUCKET}/${S3_KEY}" \
    --endpoint-url "$R2_ENDPOINT" \
    --no-progress

log "Upload complete"

# ── 3. Verify upload round-trip ───────────────────────────────────────────
log "Verifying upload integrity..."
REMOTE_SIZE=$(
  AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" \
  AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" \
    aws s3api head-object \
      --bucket "$R2_BUCKET" \
      --key "$S3_KEY" \
      --endpoint-url "$R2_ENDPOINT" \
      --query ContentLength \
      --output text
)
LOCAL_SIZE=$(stat -f%z "$DUMP_FILE" 2>/dev/null || stat -c%s "$DUMP_FILE")
if [ "$REMOTE_SIZE" != "$LOCAL_SIZE" ]; then
  die "Size mismatch: local=$LOCAL_SIZE remote=$REMOTE_SIZE"
fi
log "Upload integrity check: PASS ($LOCAL_SIZE bytes)"

# ── 4. Restore into scratch DB (optional) ────────────────────────────────
if [ -n "${RESTORE_DB_URL:-}" ]; then
  log "Restoring into scratch DB..."
  RESTORE_FILE="/tmp/qcypher-restore-${TIMESTAMP}.sql"
  zcat "$DUMP_FILE" > "$RESTORE_FILE"

  psql "$RESTORE_DB_URL" -f "$RESTORE_FILE" -q

  # Spot-check: all 6 core tables exist and are selectable
  for table in tenants contacts interactions events templates send_log; do
    COUNT=$(psql "$RESTORE_DB_URL" -tAc "SELECT COUNT(*) FROM public.${table}" 2>/dev/null || echo "ERROR")
    if [ "$COUNT" = "ERROR" ]; then
      die "Restore spot-check failed for table: $table"
    fi
    log "  $table: $COUNT rows"
  done

  rm -f "$RESTORE_FILE"
  log "Restore verification: PASS"
else
  log "RESTORE_DB_URL not set — skipping live restore check (upload-only verification)"
fi

# ── 5. Cleanup ────────────────────────────────────────────────────────────
rm -f "$DUMP_FILE"

# Prune backups older than 30 days from R2. Best-effort: the backup
# itself is already dumped, uploaded, and integrity-verified by this
# point, so a pruning hiccup (transient R2 API issue, unexpected --query
# output shape, etc.) should not turn a successful backup into a failed
# CI run. Errors here are logged, not fatal — `set +e`/`set -e` bracket
# this whole block so nothing inside it can trip the script's overall
# exit code.
log "Pruning R2 backups older than 30 days..."
set +e
CUTOFF=$(date -u -v-30d +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -d '30 days ago' +%Y-%m-%dT%H:%M:%SZ)
RAW_LIST=$(
  AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" \
  AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" \
    aws s3api list-objects-v2 \
      --bucket "$R2_BUCKET" \
      --prefix "backups/" \
      --endpoint-url "$R2_ENDPOINT" \
      --query "Contents[?LastModified<='${CUTOFF}'].Key" \
      --output text 2>&1
)
log "  Prune query raw output: ${RAW_LIST}"
echo "$RAW_LIST" \
| tr '\t' '\n' \
| grep -v '^$' \
| grep -v '^None$' \
| while read -r key; do
    log "  Deleting old backup: $key"
    AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" \
    AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" \
      aws s3 rm "s3://${R2_BUCKET}/${key}" --endpoint-url "$R2_ENDPOINT"
  done
set -e

log "Backup verification complete: OK"
log "Backup stored at: s3://${R2_BUCKET}/${S3_KEY}"
