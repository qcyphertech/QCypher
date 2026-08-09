'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type Order = {
  id: string
  tenant_id: string
  order_number: number | null
  customer_id: string | null
  payment_status: 'draft' | 'pending' | 'paid' | 'refunded'
  job_status: 'en_route' | 'in_progress' | 'completed' | null
  total_amount: number
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
    .select('id')
    .single()
  if (error) throw error
  revalidatePath('/orders')
  return data.id as string
}

export async function updateOrderStatus(id: string, payment_status: Order['payment_status']) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('orders')
    .update({ payment_status })
    .eq('id', id)
  if (error) throw error
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
  const { error } = await supabase
    .from('orders')
    .update({ job_status })
    .eq('id', id)
  if (error) throw error
  revalidatePath(`/orders/${id}`)
}

export async function addLineItem(input: {
  order_id: string
  catalog_item_id?: string
  item_name_snapshot: string
  description_snapshot?: string
  quantity: number
  unit_price: number
  billing_unit_snapshot: OrderLineItem['billing_unit_snapshot']
  rental_status?: OrderLineItem['rental_status']
  rental_start_date?: string
  rental_end_date?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const tenant_id = user.app_metadata?.tenant_id
  if (!tenant_id) throw new Error('No tenant')

  const { data: order } = await supabase.from('orders').select('signed_at').eq('id', input.order_id).single()
  if (order?.signed_at) throw new Error('Quote is signed and locked — line items cannot be modified')

  const { error } = await supabase
    .from('order_line_items')
    .insert({ ...input, tenant_id })
  if (error) throw error
  revalidatePath(`/orders/${input.order_id}`)
}

export async function removeLineItem(id: string, order_id: string) {
  const supabase = await createClient()
  const { data: order } = await supabase.from('orders').select('signed_at').eq('id', order_id).single()
  if (order?.signed_at) throw new Error('Quote is signed and locked — line items cannot be modified')

  const { error } = await supabase.from('order_line_items').delete().eq('id', id)
  if (error) throw error
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
