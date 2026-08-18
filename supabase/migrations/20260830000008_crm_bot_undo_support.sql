-- Supports QBot "undo that": completed actions now record enough to
-- reverse themselves (the created record's id, or the prior values for
-- an in-place update) instead of only the inputs that created them.
alter table public.crm_bot_actions
  add column result_data jsonb null;
