'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'

type Order = {
  id: string
  total_amount: number
  payment_status: string
  notes: string | null
  created_at: string
  paid_at: string | null
  contact: { id: string; first_name: string; last_name: string | null } | null
}

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  draft:    { bg: 'var(--badge-inactive-bg)', color: 'var(--badge-inactive-text)' },
  pending:  { bg: 'var(--badge-lead-bg)',     color: 'var(--badge-lead-text)'     },
  paid:     { bg: 'var(--badge-green-bg)',    color: 'var(--badge-green-text)'    },
  refunded: { bg: 'var(--badge-red-bg)',      color: 'var(--badge-red-text)'      },
}

const STATUS_OPTIONS = [
  { value: 'all',      label: 'All statuses' },
  { value: 'draft',    label: 'Draft' },
  { value: 'pending',  label: 'Pending' },
  { value: 'paid',     label: 'Paid' },
  { value: 'refunded', label: 'Refunded' },
]

function orderLabel(order: Order) {
  return order.notes || `Order #${order.id.slice(-6).toUpperCase()}`
}

export function PaymentsTable({ orders }: { orders: Order[] }) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return orders.filter(o => {
      if (status !== 'all' && o.payment_status !== status) return false
      if (dateFrom && new Date(o.created_at) < new Date(dateFrom)) return false
      if (dateTo && new Date(o.created_at) > new Date(dateTo + 'T23:59:59')) return false
      if (q) {
        const customerName = o.contact ? `${o.contact.first_name} ${o.contact.last_name ?? ''}`.toLowerCase() : ''
        const label = orderLabel(o).toLowerCase()
        const orderNum = `#${o.id.slice(-6).toUpperCase()}`.toLowerCase()
        if (!customerName.includes(q) && !label.includes(q) && !orderNum.includes(q)) return false
      }
      return true
    })
  }, [orders, search, status, dateFrom, dateTo])

  const inputCls = 'rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-[15px]'

  return (
    <div className="space-y-4">
      {/* Search + filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'hsl(var(--muted-foreground))' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search customer or order…"
            className={`${inputCls} w-full pl-9`}
            style={{ color: 'hsl(var(--foreground))' }}
          />
        </div>
        <select value={status} onChange={e => setStatus(e.target.value)} className={inputCls} style={{ color: 'hsl(var(--foreground))' }}>
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={inputCls} style={{ color: 'hsl(var(--foreground))' }} />
        <span style={{ color: 'hsl(var(--muted-foreground))' }}>to</span>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={inputCls} style={{ color: 'hsl(var(--foreground))' }} />
        {(search || status !== 'all' || dateFrom || dateTo) && (
          <button
            onClick={() => { setSearch(''); setStatus('all'); setDateFrom(''); setDateTo('') }}
            className="text-[15px] font-semibold px-3 py-2 rounded-xl hover:bg-[hsl(var(--muted))] transition-colors"
            style={{ color: 'hsl(var(--muted-foreground))' }}
          >
            Clear
          </button>
        )}
      </div>

      <p className="text-[13px]" style={{ color: 'hsl(var(--muted-foreground))' }}>
        {filtered.length} of {orders.length} payment{orders.length === 1 ? '' : 's'}
      </p>

      {/* Table */}
      <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: 'hsl(var(--muted))', borderBottom: '1px solid hsl(var(--border))' }}>
                {[
                  { label: 'Order', hideOnMobile: false },
                  { label: 'Customer', hideOnMobile: false },
                  { label: 'Amount', hideOnMobile: true },
                  { label: 'Status', hideOnMobile: false },
                  { label: 'Date', hideOnMobile: true },
                  { label: 'Paid', hideOnMobile: true },
                ].map(({ label, hideOnMobile }) => (
                  <th key={label} className={`px-5 py-3 text-left text-[15px] font-bold uppercase tracking-wide ${hideOnMobile ? 'hidden sm:table-cell' : ''}`}
                    style={{ color: 'hsl(var(--muted-foreground))' }}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-[15px]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    No payments match your filters.
                  </td>
                </tr>
              ) : filtered.map(o => {
                const s = STATUS_STYLE[o.payment_status] ?? STATUS_STYLE.draft
                return (
                  <tr key={o.id} className="border-b border-[hsl(var(--border))] last:border-0 hover:bg-[hsl(var(--muted))] transition-colors">
                    <td className="px-5 py-3.5">
                      <Link href={`/orders/${o.id}`} className="text-[15px] font-bold hover:text-[#1a3070] transition-colors" style={{ color: 'hsl(var(--foreground))' }}>
                        {orderLabel(o)}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-[15px]" style={{ color: 'hsl(var(--foreground))' }}>
                      {o.contact ? (
                        <Link href={`/contacts/${o.contact.id}`} className="hover:text-[#1a3070] transition-colors">
                          {o.contact.first_name} {o.contact.last_name ?? ''}
                        </Link>
                      ) : <span style={{ color: 'hsl(var(--muted-foreground))' }}>—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-[15px] font-bold hidden sm:table-cell" style={{ color: 'hsl(var(--foreground))' }}>
                      ${Number(o.total_amount).toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5">
                      {o.contact ? (
                        <Link href={`/contacts/${o.contact.id}#payments`}
                          className="text-[15px] font-bold px-2.5 py-1 rounded-full capitalize hover:opacity-80 transition-opacity"
                          style={s} title="View payments for this customer">
                          {o.payment_status}
                        </Link>
                      ) : (
                        <span className="text-[15px] font-bold px-2.5 py-1 rounded-full capitalize" style={s}>{o.payment_status}</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-[15px] hidden sm:table-cell" style={{ color: 'hsl(var(--muted-foreground))' }}>
                      {new Date(o.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3.5 text-[15px] hidden sm:table-cell" style={{ color: 'hsl(var(--muted-foreground))' }}>
                      {o.paid_at ? new Date(o.paid_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
