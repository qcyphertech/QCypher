'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient, getTenantId } from '@/lib/supabase/admin'
import { isSuperAdminUser } from '@/lib/auth/superadmin'
import { revalidatePath } from 'next/cache'
import { logAudit } from './audit'

export type CatalogItem = {
  id: string
  tenant_id: string
  name: string
  description: string | null
  item_type: 'good' | 'service' | 'rental'
  is_rentable: boolean
  base_price: number
  billing_unit: 'flat' | 'hourly' | 'daily' | 'weekly' | 'monthly'
  rental_price: number | null
  rental_billing_unit: 'flat' | 'hourly' | 'daily' | 'weekly' | 'monthly'
  is_active: boolean
  taxable: boolean
  requires_deposit: boolean
  deposit_amount: number | null
  quantity: number | null
  unit_of_measure: string | null
  reorder_point: number | null
  expiry_date: string | null
  image_url: string | null
  created_at: string
  updated_at: string
}

export type InventoryTier = 'lite' | 'full'

// Verifies the caller is authenticated and resolves their tenant_id from the DB.
// Using the admin client for tenant_id ensures we always get the current value
// even when the user's JWT was issued before app_metadata.tenant_id was set.
async function getAuthedTenant() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const tenant_id = await getTenantId(user.id, user.app_metadata)
  const admin = createAdminClient()
  return { admin, user, tenant_id }
}

// Every write below runs through the admin (service-role) client, which
// bypasses catalog_items' own RLS read_only check entirely — so unlike a
// normal RLS-scoped write, read-only enforcement has to happen here
// explicitly, same pattern as requireTenantWriter() in lib/actions/blog.ts.
async function getAuthedTenantWriter() {
  const { admin, user, tenant_id } = await getAuthedTenant()
  const { data: { user: fresh } } = await admin.auth.admin.getUserById(user.id)
  const role = (fresh?.app_metadata?.role ?? 'member') as 'owner' | 'member' | 'read_only'
  if (role === 'read_only') throw new Error('Read-only accounts cannot manage inventory')
  return { admin, user, tenant_id }
}

// Phase 42 — Lite/Full inventory tier. Stored directly on `tenants` (not
// the platform_modules/tenant_module_access system used for other feature
// toggles): that system defaults every module to "granted unless a super
// admin restricts it," which is backwards for a tier a tenant shouldn't
// have until explicitly granted. A plain column keeps the same
// "super-admin sets it, tenant just reads it" shape without inverting
// that shared default for every other module.
export async function getInventoryTier(): Promise<InventoryTier> {
  const { admin, tenant_id } = await getAuthedTenant()
  const { data } = await admin.from('tenants').select('inventory_tier').eq('id', tenant_id).single()
  return (data?.inventory_tier as InventoryTier) ?? 'lite'
}

// Super-admin only — reads an arbitrary tenant's tier (getInventoryTier()
// above only ever reads the caller's own).
export async function getTenantInventoryTierAdmin(tenantId: string): Promise<InventoryTier> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const admin = createAdminClient()
  const { data: { user: fresh } } = await admin.auth.admin.getUserById(user.id)
  if (!isSuperAdminUser(fresh)) throw new Error('Super admin only')

  const { data } = await admin.from('tenants').select('inventory_tier').eq('id', tenantId).single()
  return (data?.inventory_tier as InventoryTier) ?? 'lite'
}

// Super-admin only — the actual tier control (apps/web/src/components/admin/InventoryTierPanel.tsx).
export async function setTenantInventoryTier(tenantId: string, tier: InventoryTier) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const admin = createAdminClient()
  const { data: { user: fresh } } = await admin.auth.admin.getUserById(user.id)
  if (!isSuperAdminUser(fresh)) throw new Error('Super admin only')

  const { error } = await admin.from('tenants').update({ inventory_tier: tier }).eq('id', tenantId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin')
  revalidatePath('/dashboard', 'layout')
}

export async function getCatalogItems() {
  const { admin, tenant_id } = await getAuthedTenant()
  const { data, error } = await admin
    .from('catalog_items')
    .select('*')
    .eq('tenant_id', tenant_id)
    .order('name')
  if (error) throw error
  return data as CatalogItem[]
}

type CatalogItemInput = {
  name: string
  description?: string
  item_type: 'good' | 'service' | 'rental'
  is_rentable?: boolean
  base_price: number
  billing_unit: 'flat' | 'hourly' | 'daily' | 'weekly' | 'monthly'
  rental_price?: number
  rental_billing_unit?: 'flat' | 'hourly' | 'daily' | 'weekly' | 'monthly'
  taxable?: boolean
  requires_deposit?: boolean
  deposit_amount?: number
  quantity?: number
  unit_of_measure?: string
  reorder_point?: number
  expiry_date?: string
  image_url?: string
}

const FULL_TIER_FIELDS = ['unit_of_measure', 'reorder_point', 'expiry_date', 'image_url'] as const

// Full-tier fields are stripped server-side for a Lite tenant regardless of
// what the client sends — the UI already hides these fields for Lite, but
// this is the actual enforcement point (a client can't just POST around it).
function stripToTier<T extends Record<string, unknown>>(input: T, tier: InventoryTier): T {
  if (tier === 'full') return input
  const copy = { ...input }
  for (const f of FULL_TIER_FIELDS) delete copy[f]
  return copy
}

export async function createCatalogItem(input: CatalogItemInput) {
  try {
    const { admin, tenant_id } = await getAuthedTenantWriter()
    const tier = await getInventoryTier()
    const payload = stripToTier(input, tier)
    const { data, error } = await admin.from('catalog_items').insert({ ...payload, tenant_id }).select('id').single()
    if (error) throw new Error(error.message ?? 'Failed to create item')
    await logAudit({ action: 'inventory_item_created', resource_type: 'inventory', resource_id: data.id, resource_name: input.name })
    revalidatePath('/inventory')
  } catch (e) {
    console.error('[createCatalogItem]', e)
    throw e
  }
}

export async function updateCatalogItem(id: string, input: Partial<CatalogItemInput & { is_active: boolean }>) {
  try {
    const { admin, tenant_id } = await getAuthedTenantWriter()
    const tier = await getInventoryTier()
    const payload = stripToTier(input, tier)
    const { error } = await admin
      .from('catalog_items')
      .update(payload)
      .eq('id', id)
      .eq('tenant_id', tenant_id)
    if (error) throw new Error(error.message ?? 'Failed to update item')
    await logAudit({ action: 'inventory_item_updated', resource_type: 'inventory', resource_id: id, resource_name: input.name })
    revalidatePath('/inventory')
  } catch (e) {
    console.error('[updateCatalogItem]', e)
    throw e
  }
}

export async function deactivateCatalogItem(id: string) {
  return updateCatalogItem(id, { is_active: false })
}

export async function activateCatalogItem(id: string) {
  return updateCatalogItem(id, { is_active: true })
}

// Order line items call this to auto-deduct stock — delta is negative to
// consume, positive to restore (e.g. a line item's quantity was reduced,
// or the line item was removed entirely). Only stock-tracked items
// (quantity IS NOT NULL — services aren't) are touched; called with the
// admin client directly since it always runs from another server action
// that has already resolved tenant_id, not a user-facing entry point.
export async function adjustCatalogQuantity(catalog_item_id: string, tenant_id: string, delta: number) {
  if (delta === 0) return
  const admin = createAdminClient()
  const { data: item } = await admin.from('catalog_items').select('name, quantity').eq('id', catalog_item_id).eq('tenant_id', tenant_id).single()
  if (!item || item.quantity === null) return // not stock-tracked

  const newQty = Math.max(0, item.quantity + delta)
  await admin.from('catalog_items').update({ quantity: newQty }).eq('id', catalog_item_id).eq('tenant_id', tenant_id)
  await logAudit({
    action: 'inventory_qty_changed', resource_type: 'inventory', resource_id: catalog_item_id, resource_name: item.name,
    details: { from: item.quantity, to: newQty, delta },
  })
}

export async function deleteCatalogItem(id: string) {
  const { admin, tenant_id } = await getAuthedTenantWriter()
  const { data: item } = await admin.from('catalog_items').select('name').eq('id', id).eq('tenant_id', tenant_id).single()
  const { error } = await admin.from('catalog_items').delete().eq('id', id).eq('tenant_id', tenant_id)
  if (error) throw new Error(error.message ?? 'Failed to delete item')
  await logAudit({ action: 'inventory_item_deleted', resource_type: 'inventory', resource_id: id, resource_name: item?.name })
  revalidatePath('/inventory')
}
