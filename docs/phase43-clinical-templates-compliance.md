# Phase 43 — Clinical Templates: Compliance & Deferred Decisions

Shipped: 4 fixed clinical templates (Intake, Progress Note, Treatment Plan,
Discharge), CRM integration at `/clinical-templates`, patient auto-fill,
version history, one-way finalize/lock, print-to-PDF. Hidden platform-wide
by default (`platform_modules.show_clinical_templates.is_available =
false`) until the item below is resolved.

## Blocking — must resolve before any tenant enters real patient data

**Supabase HIPAA BAA.** This project is on the Supabase Free plan. Supabase
only offers a signed Business Associate Agreement on Team plan and above,
plus a separate paid HIPAA add-on. Storing real diagnoses, medications, or
suicidal/homicidal ideation screening data without a BAA in place is a
genuine compliance exposure for both QCypher and the clinical tenant — not
a formality to backfill later.

**To unblock:**
1. Upgrade the Supabase project to Team plan (or above).
2. Purchase/enable the HIPAA add-on and get the BAA countersigned.
3. Only then: a super admin flips `show_clinical_templates` on globally
   (Admin → Modules) and grants it to the specific clinical tenant (Admin →
   that tenant → Modules panel) — it stays off for every other tenant by
   default.

Nothing else below matters until this is done.

## Decisions made (per the original scoping conversation), documented here since they shaped the schema

- **CRM form interface, not fillable PDF** — a filled form is a normal DB
  row you can audit and version; a PDF form's data would live outside your
  control.
- **Auto-fill, always editable** — patient name/phone pull from the CRM
  contact on create, but nothing is locked from further editing pre-finalize.
- **Clinician-only, no patient portal access** — deliberately deferred, not
  just unbuilt. A psychiatric progress note is often clinically inappropriate
  to hand a patient directly; if a "Phase 44" patient-facing view is ever
  wanted, it needs its own clinical/legal review, not just a portal route.
- **Fixed templates, not customizable** — no `clinical_templates`
  definitions table exists; the 4 templates are hardcoded in
  `apps/web/src/lib/clinical-template-defs.ts`. A clinician editing a
  clinical form's own fields is a much bigger QA/liability surface than a
  CRM message template ever was.
- **Version history is immutable** — every edit appends the *previous*
  state to `clinical_template_instance_versions` before overwriting.
  Finalizing is one-way; there's no "unfinalize" button. Re-opening a
  finalized clinical record should be a deliberate, separately-audited
  action if it's ever needed — not a toggle a clinician can hit by mistake.

## Not resolved — needs a decision, not code, before it can be built

**7-year audit retention vs. the existing account-deletion flow.** QCypher
already has `purge-deleted-accounts` (a cron that permanently deletes a
tenant's data on request/schedule) and `purge-audit-logs` for its own
retention window. Neither currently special-cases clinical rows. HIPAA's
7-year retention requirement and QCypher's existing "you can delete your
account and everything in it" flow are in direct tension — if a clinical
tenant deletes their account, does clinical documentation legally need to
survive that for 7 years anyway? That's a policy call for the practice's
own compliance/legal counsel, not something to default silently one way or
the other in a cron job. **Do not enable this feature for a real clinical
tenant until this is explicitly answered.**

**Encryption/access controls beyond RLS.** The tables use the same
tenant-isolation RLS pattern as every other table in this app. HIPAA's
Security Rule expects more than that in practice — audited break-glass
access, key management, etc. Worth a real security review once the BAA
conversation with Supabase clarifies what's covered by their side of the
shared-responsibility model versus what QCypher needs to add.

**Patient portal access (deferred "Phase 44").** Not scoped, not built.
Needs its own clinical-appropriateness review before it's even worth
scoping.
