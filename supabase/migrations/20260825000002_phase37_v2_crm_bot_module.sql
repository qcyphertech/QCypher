-- Register show_crm_bot in the platform module registry — AppLayout
-- intersects TenantSettings against platform_modules' available keys,
-- so a TenantSettings flag with no matching row here gets force-hidden
-- for every tenant regardless of their own setting.
insert into platform_modules (key, label, description, icon_key, color, sort_order) values
  ('show_crm_bot', 'CRM Assistant', 'In-app AI assistant for how-to questions and quick actions', 'Bot', '#6366f1', 7)
on conflict (key) do nothing;
