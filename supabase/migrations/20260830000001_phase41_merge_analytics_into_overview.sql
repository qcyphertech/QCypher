-- Phase 41 follow-up: the standalone Analytics page was merged into
-- /overview per explicit request. The separate show_analytics module flag
-- no longer has any code referencing it — remove it from the registry and
-- from tenants.settings so it doesn't linger as a dead toggle.

delete from platform_modules where key = 'show_analytics';
delete from tenant_module_access where module_key = 'show_analytics';

update tenants set settings = settings - 'show_analytics';

alter table tenants
  alter column settings set default '{
    "show_pipeline":  true,
    "show_calendar":  true,
    "show_templates": true,
    "show_catalog":   true,
    "show_orders":    true,
    "show_overview":  true,
    "show_crm_bot":   true
  }'::jsonb;
