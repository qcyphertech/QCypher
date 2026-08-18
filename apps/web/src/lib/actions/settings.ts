'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { DEFAULT_SETTINGS, type TenantSettings } from '@/lib/types/settings'

export async function updateTenantSettings(settings: Partial<TenantSettings>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const tenantId = user?.app_metadata?.tenant_id
  if (!tenantId) throw new Error('No tenant')
  const { data: tenant } = await supabase.from('tenants').select('id, settings').eq('id', tenantId).single()
  if (!tenant) throw new Error('Tenant not found')

  const merged = { ...DEFAULT_SETTINGS, ...(tenant.settings as Record<string, unknown> ?? {}), ...settings }
  const { error } = await supabase
    .from('tenants')
    .update({ settings: merged })
    .eq('id', tenant.id)

  if (error) throw error
  // '/settings' alone doesn't revalidate the (app) route group's shared
  // layout — that's where Sidebar/TopBar read the `settings` prop that
  // controls which nav items show, so a toggle here wouldn't actually
  // update the nav until a hard reload. Revalidating '/dashboard' hits
  // that same shared layout (matches setModuleAvailability's pattern in
  // lib/actions/platform-modules.ts).
  revalidatePath('/settings', 'layout')
  revalidatePath('/dashboard', 'layout')
}
