-- Phase 33c: extends the read-only location isolation from Phase 33b to
-- writes. A non-owner user can no longer insert/update a row with a
-- location_id they aren't assigned to, nor edit/delete an existing row at
-- a location they can't see. Reuses public.can_view_location_row() from
-- 20260818000001 — same safety properties (NULL location unrestricted,
-- owner/super-admin bypass, inert for tenants with zero locations) apply
-- symmetrically to writes.
--
-- Every existing INSERT/UPDATE/DELETE policy on contacts/orders/
-- catalog_items/recurring_jobs is extended in place — original tenant-check
-- expressions preserved verbatim (confirmed live via pg_policies), only
-- ANDing the location predicate onto whichever of USING/CHECK each policy
-- already has, exactly the same technique used for SELECT in the prior
-- migration.

-- ── catalog_items ────────────────────────────────────────────────────────

drop policy if exists "catalog_items: tenant isolation delete" on catalog_items;
create policy "catalog_items: tenant isolation delete"
  on catalog_items for delete
  using (((tenant_id)::text = (auth.jwt() ->> 'tenant_id'::text)) and public.can_view_location_row(location_id));

drop policy if exists "catalog_items: tenant isolation insert" on catalog_items;
create policy "catalog_items: tenant isolation insert"
  on catalog_items for insert
  with check (((tenant_id)::text = (auth.jwt() ->> 'tenant_id'::text)) and public.can_view_location_row(location_id));

drop policy if exists "tenant_catalog_items_insert" on catalog_items;
create policy "tenant_catalog_items_insert"
  on catalog_items for insert
  with check (((tenant_id)::text = get_tenant_id()) and public.can_view_location_row(location_id));

drop policy if exists "catalog_items: tenant isolation update" on catalog_items;
create policy "catalog_items: tenant isolation update"
  on catalog_items for update
  using (((tenant_id)::text = (auth.jwt() ->> 'tenant_id'::text)) and public.can_view_location_row(location_id))
  with check (((tenant_id)::text = (auth.jwt() ->> 'tenant_id'::text)) and public.can_view_location_row(location_id));

drop policy if exists "tenant_catalog_items_update" on catalog_items;
create policy "tenant_catalog_items_update"
  on catalog_items for update
  using (((tenant_id)::text = get_tenant_id()) and public.can_view_location_row(location_id));

-- ── contacts ─────────────────────────────────────────────────────────────

drop policy if exists "contacts: tenant isolation delete" on contacts;
create policy "contacts: tenant isolation delete"
  on contacts for delete
  using ((tenant_id = tenant_id()) and (user_role() <> 'read_only'::text) and public.can_view_location_row(location_id));

drop policy if exists "contacts: tenant isolation insert" on contacts;
create policy "contacts: tenant isolation insert"
  on contacts for insert
  with check ((tenant_id = tenant_id()) and (user_role() <> 'read_only'::text) and public.can_view_location_row(location_id));

drop policy if exists "contacts: tenant isolation update" on contacts;
create policy "contacts: tenant isolation update"
  on contacts for update
  using ((tenant_id = tenant_id()) and (user_role() <> 'read_only'::text) and public.can_view_location_row(location_id))
  with check ((tenant_id = tenant_id()) and (user_role() <> 'read_only'::text) and public.can_view_location_row(location_id));

-- ── orders ───────────────────────────────────────────────────────────────

drop policy if exists "orders: tenant isolation delete" on orders;
create policy "orders: tenant isolation delete"
  on orders for delete
  using (((tenant_id)::text = (auth.jwt() ->> 'tenant_id'::text)) and public.can_view_location_row(location_id));

drop policy if exists "orders: tenant isolation insert" on orders;
create policy "orders: tenant isolation insert"
  on orders for insert
  with check (((tenant_id)::text = (auth.jwt() ->> 'tenant_id'::text)) and public.can_view_location_row(location_id));

drop policy if exists "tenant_orders_insert" on orders;
create policy "tenant_orders_insert"
  on orders for insert
  with check (((tenant_id)::text = get_tenant_id()) and public.can_view_location_row(location_id));

drop policy if exists "orders: tenant isolation update" on orders;
create policy "orders: tenant isolation update"
  on orders for update
  using (((tenant_id)::text = (auth.jwt() ->> 'tenant_id'::text)) and public.can_view_location_row(location_id))
  with check (((tenant_id)::text = (auth.jwt() ->> 'tenant_id'::text)) and public.can_view_location_row(location_id));

drop policy if exists "tenant_orders_update" on orders;
create policy "tenant_orders_update"
  on orders for update
  using (((tenant_id)::text = get_tenant_id()) and public.can_view_location_row(location_id));

-- ── recurring_jobs ───────────────────────────────────────────────────────
-- Already owner/super-admin-only, so can_view_location_row is effectively
-- always true here — added for symmetry/consistency, not because it
-- changes current behavior.

drop policy if exists "recurring_jobs: tenant owner write" on recurring_jobs;
create policy "recurring_jobs: tenant owner write"
  on recurring_jobs for all
  using (is_super_admin() or ((tenant_id = tenant_id()) and (user_role() = 'owner'::text) and public.can_view_location_row(location_id)))
  with check (is_super_admin() or ((tenant_id = tenant_id()) and (user_role() = 'owner'::text) and public.can_view_location_row(location_id)));
