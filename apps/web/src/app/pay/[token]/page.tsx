import { notFound } from 'next/navigation'
import { getPaymentRequestByToken } from '@/lib/actions/payment-requests'
import { PayRequestCard } from '@/components/invoice/PayRequestCard'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Pay Invoice' }

// Public route (no auth) — the token is the auth, same model as a hosted
// payment link. Mirrors /invoice/[id]/pay but for tenant-admin-issued
// payment requests scoped to a customer's order/job.
export default async function PayRequestPage({ params }: { params: { token: string } }) {
  const request = await getPaymentRequestByToken(params.token)
  if (!request) notFound()

  const r = request as unknown as {
    token: string; order_id: string; tenant_id: string; contact_id: string; amount: number; status: string
    orders: { payment_status: string } | null
    contacts: { first_name: string; last_name: string | null; email: string | null } | null
    tenants: { name: string } | null
  }

  // Treat the order's own payment status as the source of truth in case it
  // was paid through another channel (e.g. manually marked paid).
  const effectiveStatus = r.orders?.payment_status === 'paid' ? 'paid' : r.status

  return (
    <PayRequestCard
      request={{
        token: r.token,
        orderId: r.order_id,
        tenantId: r.tenant_id,
        contactId: r.contact_id,
        amount: Number(r.amount),
        status: effectiveStatus,
        businessName: r.tenants?.name ?? 'this business',
        customerName: `${r.contacts?.first_name ?? ''} ${r.contacts?.last_name ?? ''}`.trim(),
        customerEmail: r.contacts?.email ?? '',
      }}
    />
  )
}
