-- Supports QBot multi-step chaining: a single user request ("add a
-- contact and schedule a call with them") can produce several proposed
-- actions. They're inserted together sharing batch_id, ordered by
-- batch_order, and confirmed one at a time — completing one surfaces
-- the next as a new proposedAction rather than requiring the user to
-- re-type anything.
alter table public.crm_bot_actions
  add column batch_id uuid null,
  add column batch_order int not null default 0;

create index crm_bot_actions_batch_idx on public.crm_bot_actions (batch_id, batch_order);
