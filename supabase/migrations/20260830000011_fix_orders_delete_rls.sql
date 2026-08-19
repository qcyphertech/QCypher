-- The only DELETE policy orders had used the root-level auth.jwt() ->>
-- 'tenant_id' claim, which doesn't exist — tenant_id lives under
-- app_metadata (same class of bug already fixed for job_photos this
-- session). Unlike SELECT/UPDATE, which each also have a second,
-- working get_tenant_id()-based policy that ORs in and masks the
-- broken one, DELETE had no working policy at all — nobody could ever
-- delete an order, confirmed dormant because no deleteOrder action
-- exists yet in the app. Adds one matching the working
-- tenant_orders_update pattern; the draft-only restriction lives in
-- the server action itself (apps/web/src/lib/actions/orders.ts), same
-- as how other order business rules aren't encoded in RLS here.
CREATE POLICY "tenant_orders_delete" ON orders
  FOR DELETE USING (
    (tenant_id)::text = get_tenant_id()
    AND user_role() <> 'read_only'
    AND can_view_location_row(location_id)
  );
