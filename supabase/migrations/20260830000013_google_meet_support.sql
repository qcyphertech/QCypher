-- tenant_integrations RLS used the broken auth.jwt() ->> 'tenant_id' root-claim
-- pattern (this app's JWTs only carry tenant_id under app_metadata), same bug
-- fixed elsewhere this session for job_photos/orders. Left unnoticed here
-- because reads/writes against this table have so far only ever happened via
-- the OAuth callback routes' own request context, not been load-bearing for
-- a user-facing feature — the new Google Meet link generation depends on it
-- working correctly.
drop policy if exists "tenant_own_integrations" on tenant_integrations;
create policy "tenant_own_integrations" on tenant_integrations
  using ((tenant_id)::text = get_tenant_id())
  with check ((tenant_id)::text = get_tenant_id());

-- Tracks the companion Google Calendar event created solely to mint a
-- Google Meet link, so it can be cleaned up if the QCypher event is deleted.
alter table public.events
  add column gcal_meet_event_id text null;
