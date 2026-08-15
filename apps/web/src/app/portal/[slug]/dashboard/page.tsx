export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { notFound } from 'next/navigation'
import { getPortalSession } from '@/lib/portal-session'
import { getPortalOrders } from '@/lib/actions/portal'
import { getCustomerLoyalty, getLoyaltySettings } from '@/lib/actions/loyalty'
import { PortalDashboard } from '@/components/portal/PortalDashboard'

export default async function PortalDashboardPage({ params }: { params: { slug: string } }) {
  const session = await getPortalSession(params.slug)
  if (!session) redirect(`/portal/${params.slug}`)

  const [orders, loyalty, loyaltySettings] = await Promise.all([
    getPortalOrders(session.tenantId, session.contactId),
    getCustomerLoyalty(session.tenantId, session.contactId),
    getLoyaltySettings(session.tenantId),
  ])

  const quotes = orders.filter(o => o.payment_status === 'draft' || o.payment_status === 'pending')
  const invoices = orders.filter(o => o.payment_status === 'pending' && o.signed_at)
  const history = orders.filter(o => o.payment_status === 'paid')

  return (
    <PortalDashboard
      session={session}
      quotes={orders.filter(o => o.payment_status === 'draft')}
      invoices={orders.filter(o => o.payment_status === 'pending')}
      history={history}
      loyalty={loyaltySettings.tier_program_enabled ? loyalty : null}
      loyaltySettings={loyaltySettings}
    />
  )
}
