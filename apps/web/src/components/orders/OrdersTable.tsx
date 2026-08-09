'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Filter } from 'lucide-react'

type Order = {
  id: string
  order_number: number | null
  total_amount: number
  payment_status: string
  created_at: string
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

export function OrdersTable({ orders }: { orders: Order[] }) {
  const [orderQuery, setOrderQuery] = useState('')
  const [customerQuery, setCustomerQuery] = useState('')
  const [amountQuery, setAmountQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const hasFilters = !!(orderQuery || customerQuery || amountQuery || status !== 'all' || dateFrom || dateTo)

  const filtered = useMemo(() => {
    const oq = orderQuery.trim().toLowerCase()
    const cq = customerQuery.trim().toLowerCase()
    const aq = amountQuery.trim().toLowerCase()
    return orders.filter(o => {
      if (status !== 'all' && o.payment_status !== status) return false
      if (dateFrom && new Date(o.created_at) < new Date(dateFrom)) return false
      if (dateTo && new Date(o.created_at) > new Date(dateTo + 'T23:59:59')) return false
      const orderNum = `#${String(o.order_number ?? 0).padStart(4, '0')}`.toLowerCase()
      const customerName = o.contact ? `${o.contact.first_name} ${o.contact.last_name ?? ''}`.toLowerCase() : ''
      if (oq && !orderNum.includes(oq)) return false
      if (cq && !customerName.includes(cq)) return false
      if (aq && !Number(o.total_amount).toFixed(2).includes(aq)) return false
      return true
    })
  }, [orders, orderQuery, customerQuery, amountQuery, status, dateFrom, dateTo])

  const headerLabelCls = 'text-[15px] font-bold uppercase tracking-wide'
  const headerFilterCls = 'mt-1.5 w-full rounded border border-[hsl(var(--border))] bg-[hsl(var(--card))] pl-6 pr-2 py-1 text-[13px] font-normal normal-case tracking-normal'
  const filterIconCls = 'w-3 h-3 absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none'

  return (
    <div className="space-y-4">
      {hasFilters && (
        <div className="flex justify-end">
          <button
            onClick={() => { setOrderQuery(''); setCustomerQuery(''); setAmountQuery(''); setStatus('all'); setDateFrom(''); setDateTo('') }}
            className="text-[15px] font-semibold px-3 py-2 rounded-xl hover:bg-[hsl(var(--muted))] transition-colors"
            style={{ color: 'hsl(var(--muted-foreground))' }}
          >
            Clear filters
          </button>
        </div>
      )}

      <p className="text-[13px]" style={{ color: 'hsl(var(--muted-foreground))' }}>
        {filtered.length} of {orders.length} order{orders.length === 1 ? '' : 's'}
      </p>

      <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: 'hsl(var(--muted))', borderBottom: '1px solid hsl(var(--border))' }}>
                <th className="px-5 py-3 text-left align-top" style={{ color: 'hsl(var(--muted-foreground))', minWidth: '150px' }}>
                  <span className={headerLabelCls}>Order</span>
                  <div className="relative">
                    <Filter className={filterIconCls} />
                    <input value={orderQuery} onChange={e => setOrderQuery(e.target.value)}
                      placeholder="Filter…"
                      className={headerFilterCls} style={{ color: 'hsl(var(--foreground))' }} />
                  </div>
                </th>
                <th className="px-5 py-3 text-left align-top" style={{ color: 'hsl(var(--muted-foreground))', minWidth: '150px' }}>
                  <span className={headerLabelCls}>Customer</span>
                  <div className="relative">
                    <Filter className={filterIconCls} />
                    <input value={customerQuery} onChange={e => setCustomerQuery(e.target.value)}
                      placeholder="Filter…"
                      className={headerFilterCls} style={{ color: 'hsl(var(--foreground))' }} />
                  </div>
                </th>
                <th className="px-5 py-3 text-left align-top hidden sm:table-cell" style={{ color: 'hsl(var(--muted-foreground))', minWidth: '120px' }}>
                  <span className={headerLabelCls}>Total</span>
                  <div className="relative">
                    <Filter className={filterIconCls} />
                    <input value={amountQuery} onChange={e => setAmountQuery(e.target.value)}
                      placeholder="Filter…"
                      className={headerFilterCls} style={{ color: 'hsl(var(--foreground))' }} />
                  </div>
                </th>
                <th className="px-5 py-3 text-left align-top" style={{ color: 'hsl(var(--muted-foreground))', minWidth: '150px' }}>
                  <span className={headerLabelCls}>Status</span>
                  <div className="relative">
                    <Filter className={filterIconCls} />
                    <select value={status} onChange={e => setStatus(e.target.value)}
                      className={`${headerFilterCls} appearance-none`} style={{ color: 'hsl(var(--foreground))' }}>
                      {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </th>
                <th className="px-5 py-3 text-left align-top hidden sm:table-cell" style={{ color: 'hsl(var(--muted-foreground))', minWidth: '220px' }}>
                  <span className={headerLabelCls}>Date</span>
                  <div className="flex items-center gap-1 mt-1.5">
                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                      className="w-full rounded border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-1.5 py-1 text-[13px] font-normal normal-case tracking-normal"
                      style={{ color: 'hsl(var(--foreground))' }} />
                    <span className="text-[13px] flex-shrink-0" style={{ color: 'hsl(var(--muted-foreground))' }}>–</span>
                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                      className="w-full rounded border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-1.5 py-1 text-[13px] font-normal normal-case tracking-normal"
                      style={{ color: 'hsl(var(--foreground))' }} />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-[15px]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    No orders match your filters.
                  </td>
                </tr>
              ) : filtered.map(o => {
                const s = STATUS_STYLE[o.payment_status] ?? STATUS_STYLE.draft
                return (
                  <tr key={o.id} className="border-b border-[hsl(var(--border))] last:border-0 hover:bg-[hsl(var(--muted))] transition-colors">
                    <td className="px-5 py-3.5">
                      <Link href={`/orders/${o.id}`}
                        className="text-[15px] font-bold hover:text-[#1a3070] transition-colors"
                        style={{ color: 'hsl(var(--foreground))' }}>
                        #{String(o.order_number ?? 0).padStart(4, '0')}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-[15px]" style={{ color: 'hsl(var(--foreground))' }}>
                      {o.contact ? `${o.contact.first_name} ${o.contact.last_name ?? ''}`.trim() : <span style={{ color: 'hsl(var(--muted-foreground))' }}>—</span>}
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
                        <span className="text-[15px] font-bold px-2.5 py-1 rounded-full capitalize"
                          style={s}>{o.payment_status}</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-[15px] hidden sm:table-cell" style={{ color: 'hsl(var(--muted-foreground))' }}>
                      {new Date(o.created_at).toLocaleDateString()}
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
