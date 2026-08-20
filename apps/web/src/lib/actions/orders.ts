'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { logAudit } from '@/lib/actions/audit'
import { adjustCatalogQuantity } from '@/lib/actions/catalog'

export type DiscountType = 'percent' | 'flat'

export type Order = {
  id: string
  tenant_id: string
  order_number: number | null
  customer_id: string | null
  payment_status: 'draft' | 'pending' | 'paid' | 'refunded'
  job_status: 'en_route' | 'in_progress' | 'completed' | null
  total_amount: number
  discount_type: DiscountType | null
  discount_value: number | null
  show_discount: boolean
  notes: string | null
  created_at: string
  updated_at: string
  contact?: { first_name: string; last_name: string | null; email: string | null } | null
}

export type OrderLineItem = {
  id: string
  tenant_id: string
  order_id: string
  catalog_item_id: string | null
  item_name_snapshot: string
  description_snapshot: string | null
  quantity: number
  unit_price: number
  discount_type: DiscountType | null
  discount_value: number | null
  show_discount: boolean
  billing_unit_snapshot: 'flat' | 'hourly' | 'daily' | 'weekly' | 'monthly'
  rental_status: 'reserved' | 'active' | 'returned' | 'overdue' | null
  rental_start_date: string | null
  rental_end_date: string | null
  actual_return_date: string | null
  created_at: string
  updated_at: string
}

export async function getOrders() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('orders')
    .select('*, contact:contacts(first_name, last_name, email)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as Order[]
}

export async function getOrder(id: string) {
  const supabase = await createClient()
  const [{ data: order, error: oErr }, { data: lines, error: lErr }] = await Promise.all([
    supabase
      .from('orders')
      .select('*, contact:contacts(first_name, last_name, email)')
      .eq('id', id)
      .single(),
    supabase
      .from('order_line_items')
      .select('*')
      .eq('order_id', id)
      .order('created_at'),
  ])
  if (oErr) throw oErr
  if (lErr) throw lErr
  return { order: order as Order, lines: lines as OrderLineItem[] }
}

export async function createOrder(input: {
  customer_id?: string
  notes?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const tenant_id = user.app_metadata?.tenant_id
  if (!tenant_id) throw new Error('No tenant')

  const { data, error } = await supabase
    .from('orders')
    .insert({ ...input, tenant_id })
    .select('id, order_number')
    .single()
  if (error) throw error
  await logAudit({
    action: 'order_created',
    resource_type: 'order',
    resource_id: data.id,
    resource_name: `Order #${String(data.order_number ?? 0).padStart(4, '0')}`,
  })
  revalidatePath('/orders')
  if (input.customer_id) revalidatePath(`/contacts/${input.customer_id}`)
  return data.id as string
}

// Draft-only by design — an order that's been sent, signed, or paid has
// real downstream state (a customer may have seen it, a payment may
// exist) that deleting shouldn't silently erase. A tenant who needs to
// undo further along than that should cancel/refund instead, not delete.
export async function deleteOrder(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()

  const { data: order, error: fetchErr } = await supabase
    .from('orders')
    .select('id, payment_status')
    .eq('id', id)
    .single()
  if (fetchErr || !order) return { ok: false, error: 'Order not found' }
  if (order.payment_status !== 'draft') return { ok: false, error: 'Only draft orders can be deleted' }

  // Best-effort: clean up any job photo files in storage before the row
  // (and its job_photos rows) cascade-delete — otherwise the files
  // themselves become orphaned, since storage isn't foreign-keyed to
  // the table that references it.
  const { data: photos } = await supabase.from('job_photos').select('storage_path').eq('order_id', id)
  if (photos && photos.length > 0) {
    await supabase.storage.from('job-photos').remove(photos.map(p => p.storage_path))
  }

  const { error } = await supabase.from('orders').delete().eq('id', id)
  if (error) return { ok: false, error: error.message }

  revalidatePath('/orders')
  return { ok: true }
}

export async function updateOrderStatus(id: string, payment_status: Order['payment_status']) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('orders')
    .update({ payment_status })
    .eq('id', id)
    .select('order_number')
    .single()
  if (error) throw error
  await logAudit({
    action: 'order_status_changed',
    resource_type: 'order',
    resource_id: id,
    resource_name: `Order #${String(data?.order_number ?? 0).padStart(4, '0')}`,
    details: { payment_status },
  })
  revalidatePath('/orders')
  revalidatePath(`/orders/${id}`)
}

export async function updateOrderCustomer(id: string, customer_id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('orders')
    .update({ customer_id })
    .eq('id', id)
  if (error) throw error
  revalidatePath('/orders')
  revalidatePath(`/orders/${id}`)
}

export async function updateJobStatus(id: string, job_status: Order['job_status']) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('orders')
    .update({ job_status })
    .eq('id', id)
    .select('order_number')
    .single()
  if (error) throw error
  await logAudit({
    action: 'job_status_changed',
    resource_type: 'order',
    resource_id: id,
    resource_name: `Order #${String(data?.order_number ?? 0).padStart(4, '0')}`,
    details: { job_status },
  })
  revalidatePath(`/orders/${id}`)
}

export async function addLineItem(input: {
  order_id: string
  catalog_item_id?: string
  item_name_snapshot: string
  description_snapshot?: string
  quantity: number
  unit_price: number
  discount_type?: DiscountType | null
  discount_value?: number | null
  show_discount?: boolean
  billing_unit_snapshot: OrderLineItem['billing_unit_snapshot']
  rental_status?: OrderLineItem['rental_status']
  rental_start_date?: string
  rental_end_date?: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const tenant_id = user.app_metadata?.tenant_id
  if (!tenant_id) throw new Error('No tenant')

  const { data: order } = await supabase.from('orders').select('signed_at').eq('id', input.order_id).single()
  // Next.js redacts thrown Server Action error messages in production — this
  // one is shown directly to the user (AddLineItemModal), so it returns as
  // data instead of throwing.
  if (order?.signed_at) return { ok: false, error: 'Quote is signed and locked — line items cannot be modified' }

  const { error } = await supabase
    .from('order_line_items')
    .insert({ ...input, tenant_id })
  if (error) return { ok: false, error: error.message }

  // Phase 42 — deduct stock for tracked items. Best-effort: a failure here
  // shouldn't undo the line item itself, which already saved successfully.
  if (input.catalog_item_id) {
    await adjustCatalogQuantity(input.catalog_item_id, tenant_id, -input.quantity).catch(() => {})
  }

  revalidatePath(`/orders/${input.order_id}`)
  return { ok: true }
}

export async function updateLineItem(input: {
  id: string
  order_id: string
  item_name_snapshot: string
  description_snapshot?: string | null
  quantity: number
  unit_price: number
  billing_unit_snapshot: OrderLineItem['billing_unit_snapshot']
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const tenant_id = user?.app_metadata?.tenant_id
  const { data: order } = await supabase.from('orders').select('signed_at').eq('id', input.order_id).single()
  if (order?.signed_at) return { ok: false, error: 'Quote is signed and locked — line items cannot be modified' }

  // Read the current quantity/link first so a changed quantity (or a line
  // item that no longer references a catalog item) reconciles stock by the
  // difference rather than double-deducting the full new amount.
  const { data: existing } = await supabase.from('order_line_items').select('catalog_item_id, quantity').eq('id', input.id).single()

  const { error } = await supabase
    .from('order_line_items')
    .update({
      item_name_snapshot: input.item_name_snapshot,
      description_snapshot: input.description_snapshot ?? null,
      quantity: input.quantity,
      unit_price: input.unit_price,
      billing_unit_snapshot: input.billing_unit_snapshot,
    })
    .eq('id', input.id)
  if (error) return { ok: false, error: error.message }

  if (tenant_id && existing?.catalog_item_id) {
    const qtyDiff = existing.quantity - input.quantity // positive = fewer used now, restore stock
    await adjustCatalogQuantity(existing.catalog_item_id, tenant_id, qtyDiff).catch(() => {})
  }

  revalidatePath(`/orders/${input.order_id}`)
  return { ok: true }
}

// Every field on this page already saves itself the moment it changes —
// this doesn't persist anything new. It exists because tenants used to
// explicit "Save" buttons kept asking whether their changes had actually
// stuck; touching updated_at gives them a real, truthful confirmation
// instead of a save button that would otherwise have nothing to do.
export async function saveOrderDraft(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('orders')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath(`/orders/${id}`)
  return { ok: true }
}

function validateDiscount(discount_type: DiscountType | null, discount_value: number | null): string | null {
  if (!discount_type) return null
  if (discount_value == null || discount_value < 0) return 'Discount amount is required'
  if (discount_type === 'percent' && discount_value > 100) return 'Percentage discount can\'t exceed 100%'
  return null
}

export async function updateLineItemDiscount(input: {
  id: string
  order_id: string
  discount_type: DiscountType | null
  discount_value: number | null
  show_discount: boolean
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { data: order } = await supabase.from('orders').select('signed_at').eq('id', input.order_id).single()
  if (order?.signed_at) return { ok: false, error: 'Quote is signed and locked — line items cannot be modified' }

  const validationError = validateDiscount(input.discount_type, input.discount_value)
  if (validationError) return { ok: false, error: validationError }

  const { error } = await supabase
    .from('order_line_items')
    .update({
      discount_type: input.discount_type,
      discount_value: input.discount_type ? input.discount_value : null,
      show_discount: input.show_discount,
    })
    .eq('id', input.id)
  if (error) return { ok: false, error: error.message }
  revalidatePath(`/orders/${input.order_id}`)
  return { ok: true }
}

export async function updateOrderDiscount(input: {
  id: string
  discount_type: DiscountType | null
  discount_value: number | null
  show_discount: boolean
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()

  const validationError = validateDiscount(input.discount_type, input.discount_value)
  if (validationError) return { ok: false, error: validationError }

  const { error } = await supabase
    .from('orders')
    .update({
      discount_type: input.discount_type,
      discount_value: input.discount_type ? input.discount_value : null,
      show_discount: input.show_discount,
    })
    .eq('id', input.id)
  if (error) return { ok: false, error: error.message }
  revalidatePath(`/orders/${input.id}`)
  return { ok: true }
}

export async function removeLineItem(id: string, order_id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const tenant_id = user?.app_metadata?.tenant_id
  const { data: order } = await supabase.from('orders').select('signed_at').eq('id', order_id).single()
  if (order?.signed_at) throw new Error('Quote is signed and locked — line items cannot be modified')

  const { data: existing } = await supabase.from('order_line_items').select('catalog_item_id, quantity').eq('id', id).single()

  const { error } = await supabase.from('order_line_items').delete().eq('id', id)
  if (error) throw error

  if (tenant_id && existing?.catalog_item_id) {
    await adjustCatalogQuantity(existing.catalog_item_id, tenant_id, existing.quantity).catch(() => {})
  }

  revalidatePath(`/orders/${order_id}`)
}

export async function returnRental(line_item_id: string, order_id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('order_line_items')
    .update({
      rental_status: 'returned',
      actual_return_date: new Date().toISOString().split('T')[0],
    })
    .eq('id', line_item_id)
  if (error) throw error
  revalidatePath(`/orders/${order_id}`)
}

export async function extendRental(input: {
  line_item_id: string
  order_id: string
  previous_end_date: string
  new_end_date: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const tenant_id = user.app_metadata?.tenant_id
  if (!tenant_id) throw new Error('No tenant')

  // Write audit row first, then update
  const { error: auditErr } = await supabase.from('rental_extensions').insert({
    tenant_id,
    order_line_item_id: input.line_item_id,
    previous_end_date: input.previous_end_date,
    new_end_date: input.new_end_date,
    extended_by: user.id,
  })
  if (auditErr) throw auditErr

  const { error } = await supabase
    .from('order_line_items')
    .update({ rental_end_date: input.new_end_date })
    .eq('id', input.line_item_id)
  if (error) throw error
  revalidatePath(`/orders/${input.order_id}`)
}
