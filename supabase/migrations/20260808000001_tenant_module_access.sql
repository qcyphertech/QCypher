-- Per-tenant module grants, layered under the platform-wide toggle
-- (platform_modules.is_available). A missing row for a tenant+module
-- means "granted" — this keeps every existing tenant working unchanged
-- until a super admin explicitly restricts a specific account.
create table if not exists tenant_module_access (
  tenant_id  uuid not null references tenants(id) on delete cascade,
  module_key text not null,
  enabled    boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (tenant_id, module_key)
);

alter table tenant_module_access enable row level security;

drop policy if exists "tenant_module_access: super admin write" on tenant_module_access;
create policy "tenant_module_access: super admin write"
  on tenant_module_access for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- A tenant's own layout/settings rendering needs to read its own grants.
drop policy if exists "tenant_module_access: tenant read own" on tenant_module_access;
create policy "tenant_module_access: tenant read own"
  on tenant_module_access for select
  using (tenant_id = public.tenant_id() or public.is_super_admin());
