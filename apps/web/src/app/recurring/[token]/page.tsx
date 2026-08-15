import { notFound } from 'next/navigation'
import { getRecurringOrderByToken } from '@/lib/actions/recurring-jobs'
import { RecurringJobConfirmCard } from '@/components/recurring/RecurringJobConfirmCard'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Confirm Appointment' }

// Public route (no auth) — same stateless-token model as /pay/[token].
export default async function RecurringConfirmPage({ params }: { params: { token: string } }) {
  const order = await getRecurringOrderByToken(params.token)
  if (!order) notFound()

  const o = order as unknown as {
    id: string; total_amount: number; payment_status: string; scheduled_date: string; scheduled_time: string | null
    confirm_token_expires_at: string | null; customer_response: string | null; reschedule_to_date: string | null
    recurring_jobs: { title: string; description: string | null } | null
    contacts: { first_name: string; last_name: string | null; email: string | null } | null
    tenants: { name: string } | null
  }

  // Expiry (and payment) are checked here purely to pick the initial screen —
  // respondToRecurringOrder re-checks both server-side on every submit, so
  // this can't be bypassed by an out-of-date client render.
  const isExpired = !!o.confirm_token_expires_at && new Date(o.confirm_token_expires_at).getTime() < Date.now()

  return (
    <RecurringJobConfirmCard
      appointment={{
        token: params.token,
        title: o.recurring_jobs?.title ?? 'Appointment',
        description: o.recurring_jobs?.description ?? null,
        scheduledDate: o.scheduled_date,
        scheduledTime: o.scheduled_time,
        amount: Number(o.total_amount),
        businessName: o.tenants?.name ?? 'this business',
        customerName: `${o.contacts?.first_name ?? ''} ${o.contacts?.last_name ?? ''}`.trim(),
        alreadyResponded: o.customer_response,
        isExpired,
        isPaid: o.payment_status === 'paid',
      }}
    />
  )
}
