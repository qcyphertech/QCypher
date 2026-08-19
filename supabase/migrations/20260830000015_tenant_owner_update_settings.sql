-- The `tenants` table only had SELECT policies (own row, and super admin
-- read-all) — no UPDATE policy at all. Settings > Workspace's module
-- toggles call updateTenantSettings(), which runs as the tenant owner's
-- own RLS-scoped client, not the service role. With no matching UPDATE
-- policy, Postgres/PostgREST silently affects 0 rows instead of erroring,
-- so every toggle attempt looked like it worked (no error surfaced) but
-- never actually persisted — reported as "unable to toggle a module off."
--
-- Scoped to the tenant's own row and to the owner role, matching the
-- app-level gating that already hides the Workspace settings tab from
-- non-owners (apps/web/src/app/(app)/settings/page.tsx).
drop policy if exists "tenants: owner update own row" on tenants;
create policy "tenants: owner update own row"
  on tenants for update
  using (id = tenant_id() and user_role() = 'owner')
  with check (id = tenant_id() and user_role() = 'owner');
