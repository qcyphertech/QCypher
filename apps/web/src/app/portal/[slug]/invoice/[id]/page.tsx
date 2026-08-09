export const dynamic = 'force-dynamic'

import { redirect, notFound } from 'next/navigation'
import { getPortalSession } from '@/lib/portal-session'
import { getPortalOrderLines } from '@/lib/actions/portal'
import { createClient as adminClient } from '@supabase/supabase-js'
import { InvoicePayPage } from '@/components/portal/InvoicePayPage'

export default async function PortalInvoicePage({
  params,
}: {
  params: { slug: string; id: string }
}) {
  const session = await getPortalSession(params.slug)
  if (!session) redirect(`/portal/${params.slug}`)

  const lines = await getPortalOrderLines(params.id, session.tenantId, session.contactId)
  if (lines === null) notFound()

  const db = adminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
  const { data: order } = await db
    .from('orders')
    .select('id, order_number, total_amount, created_at, payment_status, paid_at, helcim_transaction_id, notes')
    .eq('id', params.id)
    .single()

  if (!order) notFound()

  return (
    <InvoicePayPage
      order={order}
      lines={lines}
      session={session}
      backHref={`/portal/${params.slug}/dashboard`}
    />
  )
}
