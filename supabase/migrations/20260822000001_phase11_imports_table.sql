-- Phase 11 (CSV Contact Import) was written against
-- packages/db/migrations/00011_phase11_imports.sql, which was never
-- actually applied to the live database — confirmed 2026-08-16 via a
-- direct query ("Could not find the table 'public.imports' in the
-- schema cache") while triaging TypeScript errors. This means the
-- live `/contacts/import` feature has been completely broken in
-- production: commitImport() in apps/web/src/lib/actions/imports.ts
-- inserts into `imports` before inserting any contacts, so every real
-- import attempt has failed before a single contact was created.
--
-- This migration is the old one, actually applied, with two
-- corrections: `public.get_tenant_id()` (referenced in the original
-- file) doesn't exist live — `public.tenant_id()` is the real function
-- (see docs/risk-register.md Risk #4) — and write access now follows
-- this project's established read_only-role restriction, matching
-- every other tenant-scoped write policy (e.g. contacts' own insert/
-- delete policies).

create table if not exists imports (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  filename        text not null,
  imported_count  int  not null default 0,
  skipped_count   int  not null default 0,
  created_at      timestamptz not null default now(),
  created_by      uuid references auth.users(id) on delete set null
);

create index if not exists imports_tenant_idx on imports(tenant_id);

alter table imports enable row level security;

drop policy if exists "imports: tenant select" on imports;
create policy "imports: tenant select"
  on imports for select
  using (tenant_id = public.tenant_id());

drop policy if exists "imports: tenant insert" on imports;
create policy "imports: tenant insert"
  on imports for insert
  with check (tenant_id = public.tenant_id() and public.user_role() <> 'read_only');

drop policy if exists "imports: tenant delete" on imports;
create policy "imports: tenant delete"
  on imports for delete
  using (tenant_id = public.tenant_id() and public.user_role() <> 'read_only');

-- Import provenance on contacts, referenced by undoImport()/listImports().
alter table contacts add column if not exists import_id uuid references imports(id) on delete set null;

create index if not exists contacts_import_idx on contacts(import_id) where import_id is not null;
