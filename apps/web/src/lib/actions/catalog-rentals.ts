'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient, getTenantId } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { logAudit } from './audit'
import { getInventoryTier } from './catalog'

export type CatalogRental = {
  id: string
  tenant_id: string
  catalog_item_id: string
  order_id: string | null
  rented_by: string
  rented_date: string
  due_date: string
  returned_date: string | null
  condition_on_return: 'good' | 'needs_repair' | 'damaged' | null
  notes: string | null
  created_at: string
  catalog_items: { name: string } | null
}

async function requireFullTier() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const tenant_id = await getTenantId(user.id, user.app_metadata)
  const tier = await getInventoryTier()
  if (tier !== 'full') throw new Error('Rental tracking is a Full-tier inventory feature')

  return { admin: createAdminClient(), user, tenant_id }
}

// createRental/returnRental use this instead — getRentals stays viewable
// for read-only accounts, matching "view allowed, write blocked" elsewhere.
async function requireFullTierWriter() {
  const result = await requireFullTier()
  const { data: { user: fresh } } = await result.admin.auth.admin.getUserById(result.user.id)
  const role = (fresh?.app_metadata?.role ?? 'member') as 'owner' | 'member' | 'read_only'
  if (role === 'read_only') throw new Error('Read-only accounts cannot manage rentals')
  return result
}

export async function getRentals(): Promise<CatalogRental[]> {
  const { admin, tenant_id } = await requireFullTier()
  const { data, error } = await admin
    .from('catalog_rentals')
    .select('*, catalog_items(name)')
    .eq('tenant_id', tenant_id)
    .order('due_date')
  if (error) throw error
  return data as CatalogRental[]
}

export async function createRental(input: {
  catalog_item_id: string
  order_id?: string
  due_date: string
  notes?: string
}) {
  const { admin, user, tenant_id } = await requireFullTierWriter()
  const { error } = await admin.from('catalog_rentals').insert({
    tenant_id,
    catalog_item_id: input.catalog_item_id,
    order_id: input.order_id ?? null,
    rented_by: user.id,
    due_date: input.due_date,
    notes: input.notes ?? null,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/inventory')
}

export async function returnRental(id: string, condition: 'good' | 'needs_repair' | 'damaged') {
  const { admin, tenant_id } = await requireFullTierWriter()
  const { data: rental } = await admin.from('catalog_rentals').select('catalog_item_id, catalog_items(name)').eq('id', id).eq('tenant_id', tenant_id).single()
  const { error } = await admin
    .from('catalog_rentals')
    .update({ returned_date: new Date().toISOString(), condition_on_return: condition })
    .eq('id', id)
    .eq('tenant_id', tenant_id)
  if (error) throw new Error(error.message)
  const itemName = (rental as unknown as { catalog_items: { name: string } | null } | null)?.catalog_items?.name
  await logAudit({ action: 'inventory_rental_returned', resource_type: 'inventory', resource_id: id, resource_name: itemName, details: { condition } })
  revalidatePath('/inventory')
}
