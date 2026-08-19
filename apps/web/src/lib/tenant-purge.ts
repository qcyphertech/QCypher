import type { createAdminClient } from '@/lib/supabase/admin'

// Shared by the daily grace-period cron (api/cron/purge-deleted-accounts) and
// the super-admin immediate-delete action (lib/actions/admin-console.ts) —
// same hard-delete behavior either way, just triggered on a different
// schedule. Deliberately does NOT delete/anonymize auth users — same scope
// reduction as the cron always had; revisit if legal requires it.
export async function purgeTenantData(
  admin: ReturnType<typeof createAdminClient>,
  tenantId: string,
  tenantName: string,
  executedBy: string,
) {
  await admin.from('interactions').delete().eq('tenant_id', tenantId)
  await admin.from('events').delete().eq('tenant_id', tenantId)
  await admin.from('contacts').delete().eq('tenant_id', tenantId)

  await admin
    .from('tenants')
    .update({
      status: 'deleted',
      deleted_at: new Date().toISOString(),
      deletion_requested_at: null,
      deletion_scheduled_at: null,
    })
    .eq('id', tenantId)

  await admin.from('audit_logs').insert({
    tenant_id: tenantId,
    user_id: executedBy === 'system' ? null : executedBy,
    user_email: executedBy,
    action: 'account_deleted',
    resource_type: 'account',
    resource_id: tenantId,
    resource_name: tenantName,
    details: { executed_by: executedBy },
  })
}
