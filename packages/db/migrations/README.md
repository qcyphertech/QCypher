# Archived — not the active migration directory

**This directory is historical, not live.** It was superseded by
[`supabase/migrations/`](../../../supabase/migrations) at the repo root
around 2026-08-09; nothing has been added here since (`00034_tenant_payment_accounts.sql`
is the last file). New migrations go in `supabase/migrations/` with a
date-prefixed filename, applied via the Supabase SQL Editor + `supabase
migration repair` — see any recent file there for the pattern.

**Why this exists at all:** these 34 files document real schema
decisions from earlier phases, and at least one code comment
(`apps/web/src/app/(app)/contacts/page.tsx`) points into this directory
for context. Deleting it would lose that history and break the
reference for a smaller win than just being clear about which directory
is current.

**Do not treat this directory as ground truth for the live schema.**
Found during a 2026-08-16 gap assessment (see
`docs/risk-register.md` Risk #4): this directory defines
`auth.tenant_id()`, a function that does not exist in the live
database — `public.tenant_id()` is what's actually deployed. If you're
debugging RLS or writing a new policy, check the live database or
`supabase/migrations/`, not this folder.
