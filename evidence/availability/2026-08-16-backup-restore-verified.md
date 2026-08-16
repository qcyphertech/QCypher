# Nightly Backup + Restore — First Verified Success

**Run:** https://github.com/qcyphertech/QCypher/actions/runs/31967917529
**Date:** 2026-08-16 19:33 UTC
**Conclusion:** success

## What this run actually did

1. `pg_dump --schema=public` of the live Supabase database (Postgres
   17.6), gzipped.
2. Uploaded to Cloudflare R2 (`qcypher-backups` bucket), byte-size
   verified against the local file.
3. Restored the same dump into a disposable `postgres:17` service
   container (not the production DB).
4. Spot-checked row counts on 6 core tables against the source.
5. Pruned backups older than 30 days (best-effort, non-fatal).

## Context

This workflow existed before 2026-08-16 but had never once succeeded —
missing all 5 required secrets, then a `pg_dump`/server version
mismatch, then a `pipefail` false-negative, then a schema-dependency
bug in the restore path (`extensions.gen_random_bytes()` on 3 tables).
All fixed the same day; see `docs/risk-register.md` Risk #2 for the
full history. This is the first run where every step — dump, upload,
restore, verify — genuinely succeeded end to end, not just the
non-restore portion of the pipeline.

One earlier same-day run failed
(https://github.com/qcyphertech/QCypher/actions/runs/31966113656) —
included here rather than omitted, since a Type II observation window
is about the real pattern including failures, not a cherry-picked
success list.

## Next expected evidence

This workflow runs nightly (`cron: '0 3 * * *'` — 03:00 UTC daily). Future
entries in this folder should show a consistent pattern of nightly
success, not just this first one.
