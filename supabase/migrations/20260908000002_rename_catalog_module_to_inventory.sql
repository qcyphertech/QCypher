-- User-facing rename only — key stays 'show_catalog' (matches the
-- TenantSettings flag and every existing tenant_module_access override
-- row) since this is display label, not identity.
update platform_modules set label = 'Inventory', updated_at = now() where key = 'show_catalog';
