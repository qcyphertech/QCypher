import { notFound } from 'next/navigation'
import { getPaymentRequestByToken, getPaymentRequestOrderLines } from '@/lib/actions/payment-requests'
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
    expires_at: string
    orders: {
      order_number: number | null
      payment_status: string
      discount_type: 'percent' | 'flat' | null
      discount_value: number | null
      show_discount: boolean
      created_at: string
    } | null
    contacts: { first_name: string; last_name: string | null; email: string | null } | null
    tenants: { name: string } | null
  }

  // Treat the order's own payment status as the source of truth in case it
  // was paid through another channel (e.g. manually marked paid). Expiry is
  // enforced here at read time rather than by a separate cron flipping
  // status — the 30-day window only matters at the moment someone tries to
  // pay, and this keeps that check next to where it's used.
  const isExpired = r.status === 'active' && new Date(r.expires_at).getTime() < Date.now()
  const effectiveStatus = r.orders?.payment_status === 'paid' ? 'paid' : isExpired ? 'expired' : r.status

  // Only fetch line items for a link someone can actually still act on —
  // an invalid/expired link doesn't need the extra query.
  const lines = effectiveStatus === 'active' ? await getPaymentRequestOrderLines(r.order_id, r.tenant_id) : []

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
        orderNumber: r.orders?.order_number ?? null,
        orderCreatedAt: r.orders?.created_at ?? null,
        orderDiscountType: r.orders?.discount_type ?? null,
        orderDiscountValue: r.orders?.discount_value ?? null,
        orderShowDiscount: r.orders?.show_discount ?? true,
      }}
      lines={lines as any}
    />
  )
}
