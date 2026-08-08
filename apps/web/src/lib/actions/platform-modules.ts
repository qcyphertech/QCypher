'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient, getTenantId } from '@/lib/supabase/admin'
import { isSuperAdminUser } from '@/lib/auth/superadmin'
import { revalidatePath } from 'next/cache'

export type PlatformModule = {
  key: string
  label: string
  description: string
  icon_key: string
  color: string
  is_available: boolean
  sort_order: number
}

async function requireSuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const admin = createAdminClient()
  const { data: { user: fresh } } = await admin.auth.admin.getUserById(user.id)
  if (!isSuperAdminUser(fresh)) throw new Error('Super admin only')

  return admin
}

export async function listPlatformModules(): Promise<PlatformModule[]> {
  const admin = await requireSuperAdmin()
  const { data } = await admin.from('platform_modules').select('*').order('sort_order')
  return (data ?? []) as PlatformModule[]
}

export async function setModuleAvailability(key: string, is_available: boolean) {
  const admin = await requireSuperAdmin()
  const { error } = await admin
    .from('platform_modules')
    .update({ is_available, updated_at: new Date().toISOString() })
    .eq('key', key)
  if (error) throw new Error(error.message)

  // Every tenant's nav/settings rendering depends on this — invalidate the
  // whole app shell so the change is visible without a hard reload.
  revalidatePath('/dashboard', 'layout')
}

// Read-only, no super-admin gate — every logged-in user's own layout needs
// this to filter their nav against global availability. Fails OPEN (treats
// every module as available) rather than closed if the table can't be read
// for any reason — e.g. this migration hasn't been run in an environment
// yet. Hiding every module app-wide because of a transient/setup error
// would be a much worse failure mode than briefly showing one a super
// admin meant to disable.
//
// Also intersects with this tenant's own explicit grants in
// tenant_module_access, if any exist — a missing row for a given module
// means "granted" (unrestricted), so existing tenants are unaffected until
// a super admin restricts them specifically.
export async function getAvailableModuleKeys(): Promise<Set<string> | null> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase.from('platform_modules').select('key').eq('is_available', true)
    if (error) return null
    const keys = new Set((data ?? []).map((r: { key: string }) => r.key))

    if (user) {
      try {
        const tenantId = await getTenantId(user.id, user.app_metadata)
        const { data: restricted } = await supabase
          .from('tenant_module_access')
          .select('module_key')
          .eq('tenant_id', tenantId)
          .eq('enabled', false)
        for (const row of (restricted ?? []) as { module_key: string }[]) {
          keys.delete(row.module_key)
        }
      } catch { /* no tenant (super admin) — nothing to restrict */ }
    }

    return keys
  } catch {
    return null
  }
}

export type TenantModuleGrant = {
  key: string
  label: string
  description: string
  icon_key: string
  color: string
  platform_available: boolean
  enabled: boolean
}

export async function listTenantModuleAccess(tenantId: string): Promise<TenantModuleGrant[]> {
  const admin = await requireSuperAdmin()
  const [{ data: modules }, { data: overrides }] = await Promise.all([
    admin.from('platform_modules').select('*').order('sort_order'),
    admin.from('tenant_module_access').select('module_key, enabled').eq('tenant_id', tenantId),
  ])
  const overrideMap = new Map((overrides ?? []).map((o: { module_key: string; enabled: boolean }) => [o.module_key, o.enabled]))
  return (modules ?? []).map((m: PlatformModule) => ({
    key: m.key,
    label: m.label,
    description: m.description,
    icon_key: m.icon_key,
    color: m.color,
    platform_available: m.is_available,
    enabled: overrideMap.get(m.key) ?? true,
  }))
}

export async function setTenantModuleAccess(tenantId: string, key: string, enabled: boolean) {
  const admin = await requireSuperAdmin()
  const { error } = await admin
    .from('tenant_module_access')
    .upsert({ tenant_id: tenantId, module_key: key, enabled, updated_at: new Date().toISOString() }, { onConflict: 'tenant_id,module_key' })
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard', 'layout')
}
