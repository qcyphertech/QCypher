export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { notFound } from 'next/navigation'
import { getPortalSession } from '@/lib/portal-session'
import { getPortalOrderLines, getPortalQuoteSignature } from '@/lib/actions/portal'
import { createClient as adminClient } from '@supabase/supabase-js'
import { QuoteSignaturePage } from '@/components/orders/QuoteSignaturePage'
import { headers } from 'next/headers'
import { AlreadySigned } from '@/components/portal/AlreadySigned'

export default async function PortalQuotePage({
  params,
}: {
  params: { slug: string; id: string }
}) {
  const session = await getPortalSession(params.slug)
  if (!session) redirect(`/portal/${params.slug}`)

  const lines = await getPortalOrderLines(params.id, session.tenantId, session.contactId)
  if (lines === null) notFound()

  const sig = await getPortalQuoteSignature(params.id, session.tenantId, session.contactId)

  const db = adminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
  const { data: order } = await db
    .from('orders')
    .select('id, order_number, total_amount, discount_type, discount_value, show_discount, created_at, payment_status, signed_at')
    .eq('id', params.id)
    .single()

  if (!order) notFound()

  if (sig || order.signed_at) {
    return (
      <AlreadySigned
        signedBy={sig?.signed_by_name ?? 'Customer'}
        signedAt={sig?.signed_at ?? order.signed_at ?? ''}
        businessName={session.businessName}
        backHref={`/portal/${params.slug}/dashboard`}
      />
    )
  }

  // Generate a portal-scoped quote token for the signQuote() action
  const { generateQuoteToken } = await import('@/lib/actions/quotes')
  const tokenResult = await generateQuoteToken(params.id)
  if (!tokenResult.ok) notFound()

  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

  return (
    <QuoteSignaturePage
      token={tokenResult.token}
      order={{
        id: order.id,
        order_number: order.order_number,
        total_amount: order.total_amount,
        discount_type: order.discount_type,
        discount_value: order.discount_value,
        show_discount: order.show_discount,
        created_at: order.created_at,
        business_name: session.businessName,
        tenant_id: session.tenantId,
        contact_name: session.contactName,
      }}
      lines={lines}
      ip={ip}
      backHref={`/portal/${params.slug}/dashboard`}
    />
  )
}
