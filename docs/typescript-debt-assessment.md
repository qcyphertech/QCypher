# TypeScript Error Debt — Honest Assessment

Run 2026-08-16 as part of Phase 35 QA (`pnpm --filter web exec tsc --noEmit`).
Documented rather than blind-fixed — see reasoning below.

## The number

**135 errors across ~30 files.** `typecheck` in `.github/workflows/ci.yml`
has `continue-on-error: true`, so none of this currently blocks CI or
deploys — it's silent debt, not a gap that was ever claimed closed.

## Breakdown by error code

| Code | Count | Meaning |
|---|---|---|
| TS2339 | 53 | Property does not exist on type (mostly `never`) |
| TS2345 | 33 | Argument not assignable to parameter |
| TS2353 | 16 | Object literal has unknown properties |
| TS2322 | 9 | Type not assignable |
| TS7031 | 8 | Implicit `any` on destructured parameter |
| TS7006 | 5 | Implicit `any` on parameter |
| TS2698 | 5 | Spread from non-object type |
| other | 6 | Misc |

## Likely root cause (not yet confirmed by a fix)

`apps/web/src/lib/supabase/server.ts` and `src/middleware.ts` — the two
places that construct the typed Supabase client — themselves have
implicit-`any` errors on their own `cookiesToSet`/`CookieOptions`
parameters. That's the same shape of error you'd expect if
`createServerClient<Database>(...)`'s generic isn't binding cleanly,
which would explain the pattern seen everywhere else: `.from('orders')`,
`.from('photos')`, `.from('settings')` etc. resolving rows to `never`
instead of their real row type (TS2339/TS2345/TS2353 on those tables
specifically — `orders.ts` alone has 11).

The dependency versions are skewed:
- `@supabase/ssr`: pinned `^0.5.0`, resolved `0.5.2` (installed)
- `@supabase/ssr` latest on npm: `0.12.4` — **7 minor versions behind**
- `@supabase/supabase-js`: `^2.45.0`, resolved `2.110.3` (installed) —
  far ahead of what `0.5.2` was built/tested against
  (`0.5.2`'s own peer range is `@supabase/supabase-js: ^2.43.4`, so this
  is within the declared peer range, but a large gap in practice)

This version skew between an old `@supabase/ssr` and a much newer
`@supabase/supabase-js` is the most likely single root cause, not 30
unrelated bugs.

## Why this isn't fixed in this pass

Per this project's own standard for TypeScript debt: fix if the fix is
small and scoped, document precisely (not guess-fix) if it's large and
the root cause isn't confirmed. 135 errors across 30 files, with a
plausible-but-unconfirmed single root cause pointing at a **dependency
version bump**, is exactly the case for documenting rather than acting:

- Bumping `@supabase/ssr` from `0.5.2` to `0.12.4` is a real dependency
  change with its own changelog/breaking-change risk across 6+ minor
  versions — not something to do blindly inside an unrelated SOC 2 prep
  session, and not reversible as cheaply as a pure type-only edit.
- If the version bump *doesn't* fully resolve it, the remaining errors
  would need per-file triage anyway — better to do that triage once,
  after the likely root cause is ruled in or out, than to hand-patch 30
  files now and have most of the diff be noise if the bump fixes it.

## Update 2026-08-16: theory confirmed, PR open

Tested on `chore/bump-supabase-ssr`
([PR #2](https://github.com/qcyphertech/QCypher/pull/2)): bumping
`@supabase/ssr` to `0.12.4` (and `@supabase/supabase-js` to match its
peer requirement) drops `tsc --noEmit` from **135 to 62 errors** with
**zero application code changes**. Every `never`-typed table error
(`orders.ts`, `photos.ts`, `settings.ts`, etc.) and the implicit-`any`
cookie handler errors in `server.ts`/`middleware.ts` are gone —
confirming the version-skew theory below. `next build` completes
cleanly with the same route output.

Opened as a PR rather than pushed directly to `main`: this bumps the
client library that handles auth cookies on every request via
`middleware.ts`, and a clean build/typecheck doesn't fully exercise
live login/MFA/session flows. Recommend a manual click-through
(login, MFA challenge, a few authenticated pages) before or right
after merging.

**Remaining 62 errors are a different, unrelated category** — Json vs.
`Record<string, unknown>` type mismatches and excess-property checks on
`.update()`/`.insert()` calls — not fixed by this bump, need their own
file-by-file triage.

## Update 2026-08-16 (later same day): triaged 62 → 30, found 3 real bugs

File-by-file triage of the remaining errors turned up more than type
noise. Full detail in `docs/risk-register.md` Risk #1 and Risk #4, but
the headline: **3 genuinely broken production features**, all masked
before because the pre-bump `@supabase/ssr` typing wasn't strict
enough to catch a required field missing from an insert/table
reference — the stricter post-bump checking is what surfaced them,
not something this triage went looking for.

1. **The `imports` table didn't exist live at all** — `/contacts/import`
   (linked from the Contacts page, not dead code) has been unable to
   import a single contact since it shipped. Fixed with a new
   migration, applied and verified with a real insert/delete
   round-trip.
2. **`AddInteractionForm.tsx`** inserted into `interactions` without
   `tenant_id` (`not null`, no default) — every note/call/email/visit
   log attempt failed, silently, because the insert's error was never
   even checked.
3. **`PipelineBoard.tsx`** had the identical missing-`tenant_id` bug
   creating pipeline deals.

All three fixed the same session. 20 more type-only fixes (Json casts,
`TablesUpdate<>` types replacing loose `Record<string, unknown>`)
brought the count to **30 errors remaining**, all in a handful of
files (`src/app/page.tsx`, `pricing`/`about` pages, `CalendarView.tsx`,
a couple of admin panels) — real but lower-priority than what's
already fixed, since none of the remaining ones map to a similarly
confirmed broken feature. Next pass: check each remaining error the
same way — don't assume "just a type" without verifying.

## Update 2026-08-16 (final): 30 → 0, CI now blocking

Finished the triage. Found 2 more real bugs in the same session,
same root cause (the version bump's stricter checking surfacing a
pre-existing gap, not something newly broken):

4. **`/api/send/route.ts`** inserted into both `send_log` and
   `interactions` without `tenant_id` — every quick-reply template
   send (email or SMS) left zero audit trail. The message itself still
   sent (neither insert's error was checked), but nothing recorded it
   happened.
5. **`MfaSetupForm.tsx`**'s stale-unverified-factor cleanup used
   `listFactors().totp`, which the SDK types (and behaves) as
   verified-only — `.all` is what actually includes unverified
   factors. Anyone who abandoned an MFA enrollment partway and tried
   again would have hit Supabase's "pending factor" rejection forever,
   since the cleanup could never find the stale factor.

**Total: 5 real production bugs found and fixed** via this triage,
none of which were being looked for — all surfaced because the
dependency bump made TypeScript strict enough to catch what was always
broken at runtime. See `docs/risk-register.md` Risk #1 and Risk #4.

The remaining ~25 errors were genuinely type-only (event handler
`EventTarget` typing, a `number[][]` vs `number[]` typo, Json casts,
a couple of local type definitions missing a field) — fixed with no
behavior change, verified via a clean `next build` after each batch.

**`tsc --noEmit` now reports 0 errors.** `continue-on-error: true` has
been removed from the `typecheck` job in `.github/workflows/ci.yml` —
confirmed via a real CI run that it passes and is genuinely blocking,
mirroring what was already done for `rls-isolation`. This debt is
closed, not just reduced — a regression will now fail CI, not go
silent again.

## Recommended next step

1. Review and merge [PR #2](https://github.com/qcyphertech/QCypher/pull/2)
   (the `@supabase/ssr` bump) if not already done — this whole
   assessment traces back to that.
2. `security-audit`'s findings haven't been triaged the same way —
   worth the same file-by-file treatment before flipping it to
   blocking too.
