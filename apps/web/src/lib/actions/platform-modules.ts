'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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
export async function getAvailableModuleKeys(): Promise<Set<string> | null> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from('platform_modules').select('key').eq('is_available', true)
    if (error) return null
    return new Set((data ?? []).map((r: { key: string }) => r.key))
  } catch {
    return null
  }
}
