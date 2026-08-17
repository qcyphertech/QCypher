'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { DEFAULT_SETTINGS, type TenantSettings } from '@/lib/types/settings'

export async function updateTenantSettings(settings: Partial<TenantSettings>) {
  const supabase = await createClient()
  const { data: tenant } = await supabase.from('tenants').select('id, settings').single()
  if (!tenant) throw new Error('Tenant not found')

  const merged = { ...DEFAULT_SETTINGS, ...(tenant.settings as Record<string, unknown> ?? {}), ...settings }
  const { error } = await supabase
    .from('tenants')
    .update({ settings: merged })
    .eq('id', tenant.id)

  if (error) throw error
  revalidatePath('/settings', 'layout')
}
