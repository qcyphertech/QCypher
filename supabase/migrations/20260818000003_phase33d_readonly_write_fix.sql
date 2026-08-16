-- Phase 33d: fixes a pre-existing gap found during Phase 33 QA — the
-- read_only role's write-block (user_role() <> 'read_only') was only ever
-- applied to contacts (Phase 21 RBAC), never to catalog_items or orders.
-- A read_only account could write to both. Unrelated to location scoping;
-- surfaced because this pass tested write policies more thoroughly than
-- any prior phase. Extends each policy from 20260818000002 with the same
-- read_only check contacts already has, preserving every other clause.

drop policy if exists "catalog_items: tenant isolation delete" on catalog_items;
create policy "catalog_items: tenant isolation delete"
  on catalog_items for delete
  using (((tenant_id)::text = (auth.jwt() ->> 'tenant_id'::text)) and (user_role() <> 'read_only'::text) and public.can_view_location_row(location_id));

drop policy if exists "catalog_items: tenant isolation insert" on catalog_items;
create policy "catalog_items: tenant isolation insert"
  on catalog_items for insert
  with check (((tenant_id)::text = (auth.jwt() ->> 'tenant_id'::text)) and (user_role() <> 'read_only'::text) and public.can_view_location_row(location_id));

drop policy if exists "tenant_catalog_items_insert" on catalog_items;
create policy "tenant_catalog_items_insert"
  on catalog_items for insert
  with check (((tenant_id)::text = get_tenant_id()) and (user_role() <> 'read_only'::text) and public.can_view_location_row(location_id));

drop policy if exists "catalog_items: tenant isolation update" on catalog_items;
create policy "catalog_items: tenant isolation update"
  on catalog_items for update
  using (((tenant_id)::text = (auth.jwt() ->> 'tenant_id'::text)) and (user_role() <> 'read_only'::text) and public.can_view_location_row(location_id))
  with check (((tenant_id)::text = (auth.jwt() ->> 'tenant_id'::text)) and (user_role() <> 'read_only'::text) and public.can_view_location_row(location_id));

drop policy if exists "tenant_catalog_items_update" on catalog_items;
create policy "tenant_catalog_items_update"
  on catalog_items for update
  using (((tenant_id)::text = get_tenant_id()) and (user_role() <> 'read_only'::text) and public.can_view_location_row(location_id));

drop policy if exists "orders: tenant isolation delete" on orders;
create policy "orders: tenant isolation delete"
  on orders for delete
  using (((tenant_id)::text = (auth.jwt() ->> 'tenant_id'::text)) and (user_role() <> 'read_only'::text) and public.can_view_location_row(location_id));

drop policy if exists "orders: tenant isolation insert" on orders;
create policy "orders: tenant isolation insert"
  on orders for insert
  with check (((tenant_id)::text = (auth.jwt() ->> 'tenant_id'::text)) and (user_role() <> 'read_only'::text) and public.can_view_location_row(location_id));

drop policy if exists "tenant_orders_insert" on orders;
create policy "tenant_orders_insert"
  on orders for insert
  with check (((tenant_id)::text = get_tenant_id()) and (user_role() <> 'read_only'::text) and public.can_view_location_row(location_id));

drop policy if exists "orders: tenant isolation update" on orders;
create policy "orders: tenant isolation update"
  on orders for update
  using (((tenant_id)::text = (auth.jwt() ->> 'tenant_id'::text)) and (user_role() <> 'read_only'::text) and public.can_view_location_row(location_id))
  with check (((tenant_id)::text = (auth.jwt() ->> 'tenant_id'::text)) and (user_role() <> 'read_only'::text) and public.can_view_location_row(location_id));

drop policy if exists "tenant_orders_update" on orders;
create policy "tenant_orders_update"
  on orders for update
  using (((tenant_id)::text = get_tenant_id()) and (user_role() <> 'read_only'::text) and public.can_view_location_row(location_id));
