# Staff Security Onboarding & Training

For QCypher's team — currently Thomas (CTO) and Felix (CEO), both with
super-admin access. Written as a real checklist to actually run through,
not a generic security-awareness slideshow. Every item here points to a
real control already built into this app, not an aspirational policy.

## New team member checklist

Run through this before granting any production access, and have the
person check off each item themselves — this list doubles as the
evidence record (see `evidence/access-control/`).

- [ ] **Read `docs/README.md`** and skim every doc it links to. The
      important ones for day-to-day work: `change-management-policy.md`
      (how deploys actually happen here) and
      `INCIDENT_RESPONSE_PLAYBOOK.md` (what to do if something goes
      wrong — read this *before* you need it, not during an incident).
- [ ] **Set a password manager.** Every credential this checklist
      generates (Supabase DB password, R2 tokens, GitHub secrets, etc.)
      should live there, not in a note, a Slack DM, or memory.
- [ ] **GitHub account 2FA enabled.** This repo has no branch protection
      requiring PR review (see `change-management-policy.md` for why —
      it's a deliberate trade-off, not an oversight), so a compromised
      GitHub account with push access is a direct path to production.
- [ ] **If granted super-admin access**: enroll in MFA immediately —
      `middleware.ts` enforces this and will block every route until
      you do. Visit `/auth/mfa-setup` while logged in, scan the QR code
      with an authenticator app (Google Authenticator, Authy, 1Password,
      etc.), and confirm with a real code. There is currently no
      self-service recovery if you lose the device — see "Lost your MFA
      device" below.
- [ ] **Understand the account tiers.** Tenant-level roles
      (`owner`/`member`/`read_only`) are separate from platform-level
      super-admin status. Super admin means you can read *every*
      tenant's data — treat that access accordingly, and don't request
      it if a lower tier covers what you actually need to do.
- [ ] **Know where secrets live and don't.** `.env.local` is gitignored
      and never committed. `scripts/secret-audit.sh` checks for
      server-only secrets leaking into client-bundled code and hardcoded
      credentials — read its output if a deploy or CI run flags
      something, don't just re-run and ignore it.
- [ ] **Know the deploy process.** Build locally
      (`pnpm exec next build`) before every `vercel --prod` deploy — a
      failed local build should never reach production. Log the
      deployment with `scripts/log-deployment.sh` (see
      `change-management-policy.md`).

## Ongoing practices (apply to every task, not just onboarding)

- **Least privilege by default.** Use the access tier that covers the
  task, not the broadest one available. `service_role` (which bypasses
  RLS entirely) is for server-side provisioning code and one-off admin
  scripts only — never for routine querying, even when it would be more
  convenient.
- **Verify before trusting historical docs or old migration files.**
  This isn't hypothetical — `packages/db/migrations/` (now archived,
  see its README) defines a function that doesn't exist in the live
  database, and following it led to a real failed migration attempt
  during the 2026-08-16 gap assessment. When in doubt, check the live
  database or `supabase/migrations/`, not memory or an old file.
- **Report anomalies immediately, even uncertain ones.** The incident
  response playbook's clock starts at detection, and detection lag
  costs you part of the response window (see "The clock" in
  `INCIDENT_RESPONSE_PLAYBOOK.md`). A false alarm costs a few minutes;
  a late report costs response time you can't get back.
- **Treat every finding this repo's automation surfaces as real until
  ruled out.** The weekly ZAP scan, nightly backup/restore check, and
  RLS isolation tests have each caught genuine issues in the past (see
  `docs/risk-register.md` for the list) — they are not decorative.

## Lost your MFA device

There is currently no self-service MFA recovery. If you lose access to
your authenticator app:

1. Contact the other super admin directly (not over an unverified
   channel — confirm it's really them, since "I lost my MFA device,
   please help me back in" is exactly what a social-engineering attempt
   looks like).
2. The other super admin unenrolls your TOTP factor via Supabase's
   Auth dashboard (Authentication → Users → find the account → remove
   MFA factor), or via `supabase.auth.admin` if a script is written for
   this later — no such script exists yet.
3. Sign in again; `middleware.ts` will route you back through
   `/auth/mfa-setup` since you no longer have a verified factor.

This is a real gap for a 2-person team (if both lose access
simultaneously, recovery requires direct Supabase support). Acceptable
for now given team size; revisit if the team grows.

## Recurring review

- **Quarterly**, alongside the risk register review
  (`docs/risk-register.md`): confirm the super-admin list is still
  correct (only people who currently need it), and that this checklist
  still matches reality.
- **Whenever a new integration, tool, or access tier is added**: update
  this doc in the same change, not as a follow-up that may never
  happen.

## What this document deliberately does not cover

- Formal annual security-awareness training modules — out of proportion
  for a 2-person team; this checklist + the linked docs are the
  training.
- Physical security — remote-only team, no office (confirmed still
  accurate as of the 2026-08-16 gap assessment).
- Background checks / HR onboarding — not a security control this repo
  can document; handle outside this doc if ever needed.
