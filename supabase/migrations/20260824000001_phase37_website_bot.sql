-- Phase 37 v1: QCypher.com website chatbot only (scoped down from the
-- full "two bots + function calling + admin KB" spec — see chat history).
-- All writes go through server routes using the service role; no RLS
-- policy grants public/anon insert or select, matching this project's
-- server-action-as-enforcement-layer pattern for every other bot-owned
-- table.

create table chatbot_conversations (
  id            uuid primary key default gen_random_uuid(),
  visitor_email text,
  visitor_name  text,
  status        text not null default 'active', -- 'active', 'escalated', 'closed'
  started_at    timestamptz not null default now(),
  ended_at      timestamptz
);

create table chatbot_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references chatbot_conversations(id) on delete cascade,
  role            text not null, -- 'user', 'assistant'
  content         text not null,
  created_at      timestamptz not null default now()
);

create index chatbot_messages_conversation_idx on chatbot_messages (conversation_id);

create table chatbot_leads (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid references chatbot_conversations(id) on delete set null,
  email           text not null,
  name            text not null,
  phone           text,
  message         text,
  created_at      timestamptz not null default now()
);

create index chatbot_leads_email_idx on chatbot_leads (email);

alter table chatbot_conversations enable row level security;
alter table chatbot_messages enable row level security;
alter table chatbot_leads enable row level security;

-- Read-only visibility for super admins reviewing bot activity (write
-- access stays service-role-only via the API routes).
create policy "chatbot_conversations: super admin read"
  on chatbot_conversations for select
  using (public.is_super_admin());

create policy "chatbot_messages: super admin read"
  on chatbot_messages for select
  using (public.is_super_admin());

create policy "chatbot_leads: super admin read"
  on chatbot_leads for select
  using (public.is_super_admin());
