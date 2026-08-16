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

## Recommended next step

1. In an isolated branch: bump `@supabase/ssr` to latest (`0.12.4`),
   run `tsc --noEmit` again, and see how much of the 135 clears.
2. Whatever remains after that gets triaged file-by-file for real.
3. Once genuinely near zero, remove `continue-on-error: true` from the
   `typecheck` job in `.github/workflows/ci.yml` so this can't silently
   regress again — mirroring what was already done for `rls-isolation`.

Not done automatically in this session because it's a dependency
upgrade with real (if likely small) regression risk, which is the kind
of change that should be tested and reviewed, not pushed straight to
`main` unattended.
