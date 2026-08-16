'use server'

import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient, getTenantId } from '@/lib/supabase/admin'
import { logAudit } from '@/lib/actions/audit'
import { revalidatePath } from 'next/cache'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

export type TenantLocation = {
  id: string
  tenant_id: string
  location_name: string
  location_code: string
  address: string | null
  phone: string | null
  timezone: string
  is_active: boolean
  created_at: string
}

async function requireOwnerCaller() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const adm = createAdminClient()
  const { data: { user: fresh } } = await adm.auth.admin.getUserById(user.id)
  const role = (fresh?.app_metadata?.role ?? 'member') as string
  if (role !== 'owner') throw new Error('Only account admins can manage locations')

  const tenantId = await getTenantId(user.id, user.app_metadata)
  return { userId: user.id, tenantId, admin: adm }
}

export async function getLocations(tenantId: string): Promise<TenantLocation[]> {
  const db = admin()
  const { data } = await db.from('tenant_locations').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: true })
  return (data ?? []) as TenantLocation[]
}

export async function createLocation(input: Omit<TenantLocation, 'id' | 'tenant_id' | 'created_at'>): Promise<{ ok: true } | { ok: false; error: string }> {
  const { tenantId, admin: adm } = await requireOwnerCaller()
  const { data, error } = await adm.from('tenant_locations').insert({ ...input, tenant_id: tenantId }).select('id').single()
  if (error) return { ok: false, error: error.message }
  await logAudit({ action: 'location_created', resource_type: 'location', resource_id: data.id, resource_name: input.location_name })
  revalidatePath('/settings')
  return { ok: true }
}

async function _updateLocation(id: string, tenantId: string, adm: ReturnType<typeof createAdminClient>, input: Partial<Omit<TenantLocation, 'id' | 'tenant_id' | 'created_at'>>) {
  return adm.from('tenant_locations').update({ ...input, updated_at: new Date().toISOString() }).eq('id', id).eq('tenant_id', tenantId)
}

export async function updateLocation(id: string, input: Partial<Omit<TenantLocation, 'id' | 'tenant_id' | 'created_at'>>): Promise<{ ok: true } | { ok: false; error: string }> {
  const { tenantId, admin: adm } = await requireOwnerCaller()
  const { error } = await _updateLocation(id, tenantId, adm, input)
  if (error) return { ok: false, error: error.message }
  await logAudit({ action: 'location_updated', resource_type: 'location', resource_id: id, resource_name: input.location_name })
  revalidatePath('/settings')
  return { ok: true }
}

export async function toggleLocationActive(id: string, isActive: boolean): Promise<{ ok: true } | { ok: false; error: string }> {
  const { tenantId, admin: adm } = await requireOwnerCaller()
  const { data: loc } = await adm.from('tenant_locations').select('location_name').eq('id', id).maybeSingle()
  const { error } = await _updateLocation(id, tenantId, adm, { is_active: isActive })
  if (error) return { ok: false, error: error.message }
  await logAudit({ action: isActive ? 'location_activated' : 'location_paused', resource_type: 'location', resource_id: id, resource_name: loc?.location_name })
  revalidatePath('/settings')
  return { ok: true }
}
