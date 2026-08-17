'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient, getTenantId } from '@/lib/supabase/admin'
import { isSuperAdminUser } from '@/lib/auth/superadmin'
import { revalidatePath } from 'next/cache'
import type { Json } from '@qcypher/db'

export type StaffLocationAssignment = {
  id: string
  user_id: string
  location_id: string
  role: 'manager' | 'technician' | 'admin'
  is_primary_location: boolean
  can_schedule_cross_location: boolean
  location_name: string
}

async function requireOwnerCaller(targetTenantId?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const admin = createAdminClient()
  const { data: { user: fresh } } = await admin.auth.admin.getUserById(user.id)
  const role = (fresh?.app_metadata?.role ?? 'member') as string
  const isSuperAdmin = isSuperAdminUser(fresh)

  const tenantId = targetTenantId ?? await getTenantId(user.id, user.app_metadata)
  if (!isSuperAdmin) {
    if (role !== 'owner') throw new Error('Only account admins can manage staff-location assignments')
    const ownTenantId = await getTenantId(user.id, user.app_metadata)
    if (ownTenantId !== tenantId) throw new Error('Forbidden')
  }

  return { userId: user.id, tenantId, admin }
}

async function logAssignmentAudit(userId: string, tenantId: string, action: 'staff_location_assigned' | 'staff_location_unassigned', targetUserId: string, details?: Record<string, unknown>) {
  const admin = createAdminClient()
  const { data: { user: caller } } = await admin.auth.admin.getUserById(userId)
  await admin.from('audit_logs').insert({
    tenant_id: tenantId,
    user_id: userId,
    user_email: caller?.email ?? '',
    action,
    resource_type: 'team',
    resource_id: targetUserId,
    details: (details ?? null) as Json | null,
  })
}

export async function getStaffLocationAssignments(tenantId: string): Promise<StaffLocationAssignment[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('staff_location_assignments')
    .select('id, user_id, location_id, role, is_primary_location, can_schedule_cross_location, tenant_locations(location_name)')
    .eq('tenant_id', tenantId)

  return ((data ?? []) as any[]).map(r => ({
    id: r.id,
    user_id: r.user_id,
    location_id: r.location_id,
    role: r.role,
    is_primary_location: r.is_primary_location,
    can_schedule_cross_location: r.can_schedule_cross_location,
    location_name: r.tenant_locations?.location_name ?? '—',
  }))
}

export async function setStaffLocationAssignment(input: {
  userId: string
  locationId: string
  role?: 'manager' | 'technician' | 'admin'
  isPrimaryLocation?: boolean
  canScheduleCrossLocation?: boolean
  tenantId?: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { userId: callerId, tenantId, admin } = await requireOwnerCaller(input.tenantId)

  const { error } = await admin.from('staff_location_assignments').upsert({
    tenant_id: tenantId,
    user_id: input.userId,
    location_id: input.locationId,
    role: input.role ?? 'technician',
    is_primary_location: input.isPrimaryLocation ?? true,
    can_schedule_cross_location: input.canScheduleCrossLocation ?? false,
  }, { onConflict: 'user_id, location_id' })

  if (error) return { ok: false, error: error.message }
  await logAssignmentAudit(callerId, tenantId, 'staff_location_assigned', input.userId, { location_id: input.locationId })
  revalidatePath('/settings')
  return { ok: true }
}

export async function removeStaffLocationAssignment(userId: string, locationId: string, tenantId?: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { userId: callerId, tenantId: resolvedTenantId, admin } = await requireOwnerCaller(tenantId)

  const { error } = await admin
    .from('staff_location_assignments')
    .delete()
    .eq('tenant_id', resolvedTenantId)
    .eq('user_id', userId)
    .eq('location_id', locationId)

  if (error) return { ok: false, error: error.message }
  await logAssignmentAudit(callerId, resolvedTenantId, 'staff_location_unassigned', userId, { location_id: locationId })
  revalidatePath('/settings')
  return { ok: true }
}
