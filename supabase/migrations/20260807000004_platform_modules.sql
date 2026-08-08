-- Super-admin-controlled module registry. A module must be globally
-- available here before any tenant admin can toggle it on for their
-- workspace (Settings -> Workspace -> Modules).
create table if not exists platform_modules (
  key           text primary key, -- matches the TenantSettings flag name, e.g. 'show_pipeline'
  label         text not null,
  description   text not null,
  icon_key      text not null, -- lucide-react icon name, mapped client-side
  color         text not null,
  is_available  boolean not null default true,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

insert into platform_modules (key, label, description, icon_key, color, sort_order) values
  ('show_pipeline',  'Pipeline',  'Deal stages and sales pipeline',     'GitBranch',   '#f97316', 1),
  ('show_calendar',  'Calendar',  'Scheduling and event management',   'Calendar',    '#0ea5e9', 2),
  ('show_catalog',   'Catalog',   'Products, services & rentals',      'Package',     '#f59e0b', 3),
  ('show_orders',    'Orders',    'Sales orders and invoicing',        'ShoppingBag', '#10b981', 4),
  ('show_templates', 'Templates', 'SMS and email quick-reply snippets','FileText',    '#a855f7', 5),
  ('show_overview',  'Overview',  'Income & expense summary',          'BarChart2',   '#22c55e', 6)
on conflict (key) do nothing;

alter table platform_modules enable row level security;

drop policy if exists "platform_modules: super admin write" on platform_modules;
create policy "platform_modules: super admin write"
  on platform_modules for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- Any authenticated user can read the registry — needed so every tenant's
-- own nav/settings rendering can filter against global availability, not
-- just super admins.
drop policy if exists "platform_modules: authenticated read" on platform_modules;
create policy "platform_modules: authenticated read"
  on platform_modules for select
  using (auth.role() = 'authenticated');
