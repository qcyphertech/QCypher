-- Phase 37 v2: CRM in-app bot. Extends v1's chatbot_conversations /
-- chatbot_messages (website-bot-only until now) with bot_type/tenant_id/
-- user_id so both bots share one message log, and adds crm_bot_actions
-- for the confirm-before-execute flow (the bot never writes a contact or
-- event directly — it proposes an action, the tenant approves it, and
-- only then does a server action perform the real insert).

alter table chatbot_conversations
  add column bot_type text not null default 'website',
  add column tenant_id uuid references tenants(id) on delete cascade,
  add column user_id uuid references auth.users(id) on delete set null;

create index chatbot_conversations_tenant_idx on chatbot_conversations (tenant_id);

create table crm_bot_actions (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references chatbot_conversations(id) on delete cascade,
  tenant_id       uuid not null references tenants(id) on delete cascade,
  action_type     text not null, -- 'create_contact', 'schedule_event'
  action_data     jsonb not null,
  status          text not null default 'pending', -- 'pending', 'completed', 'failed'
  error_message   text,
  created_at      timestamptz not null default now(),
  completed_at    timestamptz
);

create index crm_bot_actions_tenant_idx on crm_bot_actions (tenant_id);
create index crm_bot_actions_conversation_idx on crm_bot_actions (conversation_id);

alter table crm_bot_actions enable row level security;

-- Tenant members can read their own tenant's bot action log (e.g. an
-- activity view); all writes go through server actions using the admin
-- client, matching this table's own confirm-before-execute design and
-- every other tenant-writer pattern in this codebase (blog.ts, team.ts).
create policy "crm_bot_actions: tenant read own"
  on crm_bot_actions for select
  using (tenant_id = public.tenant_id() or public.is_super_admin());

-- chatbot_conversations previously had no tenant-scoped read policy
-- (v1 was website-visitor-only, super-admin-read-only). CRM bot
-- conversations need the same tenant-read-own carve-out as their actions.
create policy "chatbot_conversations: tenant read own"
  on chatbot_conversations for select
  using (tenant_id = public.tenant_id());

create policy "chatbot_messages: tenant read own"
  on chatbot_messages for select
  using (
    conversation_id in (
      select id from chatbot_conversations where tenant_id = public.tenant_id()
    )
  );
