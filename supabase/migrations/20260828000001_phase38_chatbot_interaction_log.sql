-- Phase 38+: anonymous audit trail for the public website chatbot.
-- audit_logs can't hold these (tenant_id/user_id are both not null there,
-- scoped by RLS to an authenticated tenant member) — an anonymous site
-- visitor has neither. This table intentionally carries no visitor
-- identity at all: no user_id, no IP, no name/email (that's chatbot_leads,
-- a separate opt-in table for visitors who choose to book a call).

create table if not exists chatbot_interaction_logs (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid references tenants(id) on delete set null,
  conversation_id uuid references chatbot_conversations(id) on delete set null,
  action          text not null default 'ai_chatbot_interaction',
  message_count   int not null,
  label_shown     boolean not null default true,
  created_at      timestamptz not null default now()
);

create index if not exists chatbot_interaction_logs_created_idx
  on chatbot_interaction_logs (created_at desc);
create index if not exists chatbot_interaction_logs_tenant_created_idx
  on chatbot_interaction_logs (tenant_id, created_at desc);

alter table chatbot_interaction_logs enable row level security;

-- Written only by the service-role client from the website-bot API route
-- (an anonymous visitor has no session to satisfy a member-scoped insert
-- policy). No RLS policies are defined, so both anon and authenticated
-- roles are denied by default — reads go through a super-admin-gated
-- server action using the admin client, matching audit_logs' access model.
