import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { OrderDetail } from '@/components/orders/OrderDetail'
import type { Order, OrderLineItem } from '@/lib/actions/orders'
import { getJobPhotos } from '@/lib/actions/photos'
import { getQuoteSignature } from '@/lib/actions/quotes'
import { getOrderActivity } from '@/lib/actions/audit'

export const metadata: Metadata = { title: 'Order' }

export default async function OrderPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const tenantId = user?.app_metadata?.tenant_id ?? ''

  const [{ data: order }, { data: lines }, { data: catalogItems }, { data: contacts }, { data: tenant }, photos, signature, activity] = await Promise.all([
    supabase
      .from('orders')
      .select('*, contact:contacts(id, first_name, last_name, email, phone)')
      .eq('id', params.id)
      .single(),
    supabase
      .from('order_line_items')
      .select('*')
      .eq('order_id', params.id)
      .order('created_at'),
    supabase
      .from('catalog_items')
      .select('id, name, base_price, billing_unit, item_type, is_rentable')
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('contacts')
      .select('id, first_name, last_name')
      .order('first_name'),
    supabase
      .from('tenants')
      .select('name')
      .single(),
    getJobPhotos(params.id).catch(() => []),
    getQuoteSignature(params.id).catch(() => null),
    getOrderActivity(params.id).catch(() => []),
  ])

  if (!order) notFound()

  const t = tenant as { name?: string } | null
  const sig = signature as { signed_by_name: string; signed_at: string } | null
  return (
    <OrderDetail
      order={order as unknown as Order}
      lines={(lines ?? []) as unknown as OrderLineItem[]}
      catalogItems={catalogItems ?? []}
      contacts={contacts ?? []}
      businessName={t?.name ?? ''}
      initialPhotos={photos}
      tenantId={tenantId}
      signedBy={sig?.signed_by_name ?? null}
      signedAt={sig?.signed_at ?? null}
      activity={activity}
    />
  )
}
