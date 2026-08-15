'use client'

import type { PortalSession } from '@/lib/actions/portal'
import Link from 'next/link'

type Order = {
  id: string
  payment_status: string
  total_amount: number
  created_at: string
  signed_at: string | null
  paid_at: string | null
  notes: string | null
}

const fmt = (n: number) => `$${Number(n).toFixed(2)}`
const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h2 className="text-[13px] font-semibold uppercase tracking-widest text-gray-400">{title}</h2>
      {children}
    </div>
  )
}

function OrderCard({
  order,
  href,
  badge,
  badgeColor,
  cta,
}: {
  order: Order
  href: string
  badge: string
  badgeColor: string
  cta: string
}) {
  return (
    <Link
      href={href}
      className="block bg-white rounded-2xl border border-gray-200 shadow-sm px-5 py-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span
              className="text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full"
              style={{ background: badgeColor + '20', color: badgeColor }}
            >
              {badge}
            </span>
          </div>
          <p className="text-[15px] font-semibold text-gray-900">{fmt(order.total_amount)}</p>
          <p className="text-[13px] text-gray-400 mt-0.5">{fmtDate(order.created_at)}</p>
          {order.notes && (
            <p className="text-[13px] text-gray-500 mt-1 truncate">{order.notes}</p>
          )}
        </div>
        <div className="flex-shrink-0">
          <span className="text-[13px] font-semibold text-blue-600">{cta} →</span>
        </div>
      </div>
    </Link>
  )
}

function StatTile({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 px-4 py-3.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1">{label}</p>
      <p className="text-[19px] font-bold" style={{ color: accent }}>{value}</p>
    </div>
  )
}

function HistoryCard({ order }: { order: Order }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 px-5 py-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[15px] font-semibold text-gray-900">{fmt(order.total_amount)}</p>
          <p className="text-[13px] text-gray-400">
            {order.paid_at ? `Paid ${fmtDate(order.paid_at)}` : fmtDate(order.created_at)}
          </p>
          {order.notes && <p className="text-[13px] text-gray-500 mt-0.5 truncate">{order.notes}</p>}
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
          Paid
        </span>
      </div>
    </div>
  )
}

export function PortalDashboard({
  session,
  quotes,
  invoices,
  history,
}: {
  session: PortalSession
  quotes: Order[]
  invoices: Order[]
  history: Order[]
}) {
  const hasAnything = quotes.length + invoices.length + history.length > 0
  const invoicesDueTotal = invoices.reduce((sum, o) => sum + Number(o.total_amount), 0)
  const totalPaid = history.reduce((sum, o) => sum + Number(o.total_amount), 0)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <p className="text-[13px] text-gray-400">{session.businessName}</p>
            <p className="text-[16px] font-bold text-gray-900">Hi, {session.contactName.split(' ')[0]}</p>
          </div>
          <form action={`/portal/${session.tenantSlug}/logout`} method="POST">
            <button type="submit" className="text-[13px] text-gray-500 hover:text-gray-700">
              Sign out
            </button>
          </form>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-8">
        {hasAnything && (
          <div className="grid grid-cols-3 gap-3">
            <StatTile label="Open quotes" value={String(quotes.length)} accent="#f59e0b" />
            <StatTile label="Due now" value={fmt(invoicesDueTotal)} accent="#3b82f6" />
            <StatTile label="Total paid" value={fmt(totalPaid)} accent="#059669" />
          </div>
        )}

        {!hasAnything && (
          <div className="text-center py-12 text-gray-400 text-[15px]">
            No quotes or invoices yet.
          </div>
        )}

        {quotes.length > 0 && (
          <Section title="Quotes awaiting approval">
            {quotes.map(o => (
              <OrderCard
                key={o.id}
                order={o}
                href={`/portal/${session.tenantSlug}/quote/${o.id}`}
                badge="Quote"
                badgeColor="#f59e0b"
                cta="Review & approve"
              />
            ))}
          </Section>
        )}

        {invoices.length > 0 && (
          <Section title="Invoices due">
            {invoices.map(o => (
              <OrderCard
                key={o.id}
                order={o}
                href={`/portal/${session.tenantSlug}/invoice/${o.id}`}
                badge="Invoice"
                badgeColor="#3b82f6"
                cta="Pay now"
              />
            ))}
          </Section>
        )}

        {history.length > 0 && (
          <Section title="Payment history">
            {history.map(o => (
              <HistoryCard key={o.id} order={o} />
            ))}
          </Section>
        )}
      </div>
    </div>
  )
}
