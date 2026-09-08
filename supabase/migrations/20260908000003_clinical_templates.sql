-- Phase 43 — Clinical Templates (mental/behavioral health documentation).
--
-- COMPLIANCE NOTE, read before any tenant enters real patient data: this
-- table can hold genuine PHI (diagnoses, medications, suicidal/homicidal
-- ideation screening). Supabase only offers a HIPAA BAA on Team plan and
-- above; this project is currently on the Free plan with no BAA in place.
-- Ship this schema/feature, but do not let a clinical tenant use it with
-- real patients until a BAA is signed — see docs/README.md for the
-- tracking note. RLS below is tenant-isolation only, same as every other
-- table in this app; it is not a HIPAA technical-safeguard substitute.
--
-- Templates are fixed (4 hardcoded types), not tenant-customizable — no
-- clinical_templates definitions table. Only filled instances are stored.

create table if not exists clinical_template_instances (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references tenants(id) on delete cascade,
  contact_id     uuid not null references contacts(id) on delete cascade,
  template_type  text not null check (template_type in ('intake', 'progress_note', 'treatment_plan', 'discharge')),
  form_data      jsonb not null,
  status         text not null default 'draft' check (status in ('draft', 'finalized')),
  version        int not null default 1,
  created_by     uuid not null references auth.users(id),
  finalized_by   uuid references auth.users(id),
  finalized_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- One row per edit, appended before the parent row is overwritten — the
-- HIPAA-audit "version history" requirement from the spec. Never updated
-- or deleted once written.
create table if not exists clinical_template_instance_versions (
  id            uuid primary key default gen_random_uuid(),
  instance_id   uuid not null references clinical_template_instances(id) on delete cascade,
  tenant_id     uuid not null references tenants(id) on delete cascade,
  version       int not null,
  form_data     jsonb not null,
  edited_by     uuid not null references auth.users(id),
  edited_at     timestamptz not null default now()
);

alter table clinical_template_instances enable row level security;
alter table clinical_template_instance_versions enable row level security;

drop policy if exists "clinical_template_instances: tenant isolation" on clinical_template_instances;
create policy "clinical_template_instances: tenant isolation"
  on clinical_template_instances for all
  using (tenant_id::text = get_tenant_id())
  with check (tenant_id::text = get_tenant_id());

drop policy if exists "clinical_template_instance_versions: tenant isolation" on clinical_template_instance_versions;
create policy "clinical_template_instance_versions: tenant isolation"
  on clinical_template_instance_versions for all
  using (tenant_id::text = get_tenant_id())
  with check (tenant_id::text = get_tenant_id());

create index if not exists clinical_template_instances_tenant_id_idx on clinical_template_instances(tenant_id);
create index if not exists clinical_template_instances_contact_id_idx on clinical_template_instances(contact_id);
create index if not exists clinical_template_instance_versions_instance_id_idx on clinical_template_instance_versions(instance_id);

-- Hidden platform-wide by default (is_available = false) — this is a
-- specialty, HIPAA-adjacent feature, not something every tenant should see
-- turn up in their nav. A super admin flips it on globally, then uses the
-- per-tenant Modules grant panel to restrict it to only the clinical
-- tenant(s) that actually need it (and that have a BAA in place) once
-- ready — same mechanism as every other platform_modules-gated feature.
insert into platform_modules (key, label, description, icon_key, color, sort_order, is_available) values
  ('show_clinical_templates', 'Clinical Templates', 'Intake, progress notes, treatment plans & discharge summaries', 'ClipboardList', '#0891b2', 10, false)
on conflict (key) do nothing;
