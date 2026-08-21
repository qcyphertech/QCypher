'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { returnRental, type CatalogRental } from '@/lib/actions/catalog-rentals'
import { Key, Filter, ArrowUpRight } from 'lucide-react'

const CONDITIONS = [
  { value: 'good', label: 'Good' },
  { value: 'needs_repair', label: 'Needs repair' },
  { value: 'damaged', label: 'Damaged' },
] as const

type Urgency = 'overdue' | 'soon' | 'ontrack' | 'returned'

function urgencyOf(r: CatalogRental): Urgency {
  if (r.returned_date) return 'returned'
  const daysLeft = Math.ceil((new Date(r.due_date).getTime() - Date.now()) / 86400000)
  if (daysLeft < 0) return 'overdue'
  if (daysLeft <= 2) return 'soon'
  return 'ontrack'
}

const URGENCY_META: Record<Urgency, { label: string; bg: string; color: string }> = {
  overdue:  { label: 'Overdue',   bg: 'var(--badge-red-bg)',    color: 'var(--badge-red-text)' },
  soon:     { label: 'Due soon',  bg: 'var(--badge-amber-bg)',  color: 'var(--badge-amber-text)' },
  ontrack:  { label: 'On track',  bg: 'var(--badge-green-bg)',  color: 'var(--badge-green-text)' },
  returned: { label: 'Returned',  bg: 'var(--badge-inactive-bg)', color: 'var(--badge-inactive-text)' },
}

const STATUS_OPTIONS = [
  { value: 'all',      label: 'All statuses' },
  { value: 'overdue',  label: 'Overdue' },
  { value: 'soon',     label: 'Due soon' },
  { value: 'ontrack',  label: 'On track' },
  { value: 'returned', label: 'Returned' },
]

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function contactName(r: CatalogRental) {
  const c = r.orders?.contact
  return c ? `${c.first_name} ${c.last_name ?? ''}`.trim() : ''
}

// Full inventory tier only — the page that renders this already gated on
// tier === 'full' before importing/rendering it.
export function RentalsPanel({ rentals }: { rentals: CatalogRental[] }) {
  const [isPending, startTransition] = useTransition()
  const [returningId, setReturningId] = useState<string | null>(null)
  const [itemQuery, setItemQuery] = useState('')
  const [contactQuery, setContactQuery] = useState('')
  const [orderQuery, setOrderQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [rentedFrom, setRentedFrom] = useState('')
  const [rentedTo, setRentedTo] = useState('')
  const [dueFrom, setDueFrom] = useState('')
  const [dueTo, setDueTo] = useState('')

  function handleReturn(id: string, condition: typeof CONDITIONS[number]['value']) {
    startTransition(async () => {
      await returnRental(id, condition)
      setReturningId(null)
    })
  }

  const filtered = useMemo(() => {
    const iq = itemQuery.trim().toLowerCase()
    const cq = contactQuery.trim().toLowerCase()
    const oq = orderQuery.trim().toLowerCase()
    return rentals.filter(r => {
      const urgency = urgencyOf(r)
      if (status !== 'all' && urgency !== status) return false
      if (iq && !(r.catalog_items?.name ?? '').toLowerCase().includes(iq)) return false
      if (cq && !contactName(r).toLowerCase().includes(cq)) return false
      if (oq) {
        const num = r.orders?.order_number ? String(r.orders.order_number).padStart(4, '0') : ''
        if (!num.includes(oq)) return false
      }
      if (rentedFrom && new Date(r.rented_date) < new Date(rentedFrom)) return false
      if (rentedTo && new Date(r.rented_date) > new Date(`${rentedTo}T23:59:59`)) return false
      if (dueFrom && new Date(r.due_date) < new Date(dueFrom)) return false
      if (dueTo && new Date(r.due_date) > new Date(`${dueTo}T23:59:59`)) return false
      return true
    })
  }, [rentals, itemQuery, contactQuery, orderQuery, status, rentedFrom, rentedTo, dueFrom, dueTo])

  const hasFilters = !!(itemQuery || contactQuery || orderQuery || status !== 'all' || rentedFrom || rentedTo || dueFrom || dueTo)

  if (rentals.length === 0) {
    return (
      <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] p-12 flex flex-col items-center gap-3 text-center">
        <Key className="w-8 h-8" style={{ color: 'hsl(var(--muted-foreground))' }} />
        <p className="text-[15px]" style={{ color: 'hsl(var(--muted-foreground))' }}>No rentals yet</p>
      </div>
    )
  }

  const headerLabelCls = 'text-[15px] font-bold uppercase tracking-wide'
  const headerFilterCls = 'mt-1.5 w-full rounded border border-[hsl(var(--border))] bg-[hsl(var(--card))] pl-6 pr-2 py-1 text-[13px] font-normal normal-case tracking-normal'
  const filterIconCls = 'w-3 h-3 absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none'
  const headerColor = 'hsl(var(--muted-foreground))'

  return (
    <div className="space-y-3">
      {hasFilters && (
        <div className="flex items-center justify-between">
          <p className="text-[13px]" style={{ color: 'hsl(var(--muted-foreground))' }}>
            {filtered.length} of {rentals.length} rental{rentals.length === 1 ? '' : 's'}
          </p>
          <button
            onClick={() => {
              setItemQuery(''); setContactQuery(''); setOrderQuery(''); setStatus('all')
              setRentedFrom(''); setRentedTo(''); setDueFrom(''); setDueTo('')
            }}
            className="text-[15px] font-semibold px-3 py-1.5 rounded-xl hover:bg-[hsl(var(--muted))] transition-colors"
            style={{ color: 'hsl(var(--muted-foreground))' }}
          >
            Clear filters
          </button>
        </div>
      )}

      <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr style={{ background: 'hsl(var(--muted))', borderBottom: '1px solid hsl(var(--border))' }}>
              <th className="px-5 py-3 text-left align-top" style={{ color: headerColor, minWidth: '160px' }}>
                <span className={headerLabelCls}>Item</span>
                <div className="relative">
                  <Filter className={filterIconCls} />
                  <input value={itemQuery} onChange={e => setItemQuery(e.target.value)} placeholder="Filter…"
                    className={headerFilterCls} style={{ color: 'hsl(var(--foreground))' }} />
                </div>
              </th>
              <th className="px-5 py-3 text-left align-top" style={{ color: headerColor, minWidth: '150px' }}>
                <span className={headerLabelCls}>Contact</span>
                <div className="relative">
                  <Filter className={filterIconCls} />
                  <input value={contactQuery} onChange={e => setContactQuery(e.target.value)} placeholder="Filter…"
                    className={headerFilterCls} style={{ color: 'hsl(var(--foreground))' }} />
                </div>
              </th>
              <th className="px-5 py-3 text-left align-top" style={{ color: headerColor, minWidth: '120px' }}>
                <span className={headerLabelCls}>Order</span>
                <div className="relative">
                  <Filter className={filterIconCls} />
                  <input value={orderQuery} onChange={e => setOrderQuery(e.target.value)} placeholder="#0000"
                    className={headerFilterCls} style={{ color: 'hsl(var(--foreground))' }} />
                </div>
              </th>
              <th className="px-5 py-3 text-left align-top" style={{ color: headerColor, minWidth: '190px' }}>
                <span className={headerLabelCls}>Rented</span>
                <div className="flex items-center gap-1 mt-1.5">
                  <input type="date" value={rentedFrom} onChange={e => setRentedFrom(e.target.value)}
                    className="w-full rounded border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-1.5 py-1 text-[13px] font-normal normal-case tracking-normal"
                    style={{ color: 'hsl(var(--foreground))' }} />
                  <span style={{ color: headerColor }}>–</span>
                  <input type="date" value={rentedTo} onChange={e => setRentedTo(e.target.value)}
                    className="w-full rounded border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-1.5 py-1 text-[13px] font-normal normal-case tracking-normal"
                    style={{ color: 'hsl(var(--foreground))' }} />
                </div>
              </th>
              <th className="px-5 py-3 text-left align-top" style={{ color: headerColor, minWidth: '190px' }}>
                <span className={headerLabelCls}>Due back</span>
                <div className="flex items-center gap-1 mt-1.5">
                  <input type="date" value={dueFrom} onChange={e => setDueFrom(e.target.value)}
                    className="w-full rounded border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-1.5 py-1 text-[13px] font-normal normal-case tracking-normal"
                    style={{ color: 'hsl(var(--foreground))' }} />
                  <span style={{ color: headerColor }}>–</span>
                  <input type="date" value={dueTo} onChange={e => setDueTo(e.target.value)}
                    className="w-full rounded border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-1.5 py-1 text-[13px] font-normal normal-case tracking-normal"
                    style={{ color: 'hsl(var(--foreground))' }} />
                </div>
              </th>
              <th className="px-5 py-3 text-left align-top" style={{ color: headerColor, minWidth: '150px' }}>
                <span className={headerLabelCls}>Status</span>
                <div className="relative">
                  <Filter className={filterIconCls} />
                  <select value={status} onChange={e => setStatus(e.target.value)}
                    className={`${headerFilterCls} appearance-none`} style={{ color: 'hsl(var(--foreground))' }}>
                    {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </th>
              <th className="px-5 py-3 align-top" />
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => {
              const urgency = urgencyOf(r)
              const meta = URGENCY_META[urgency]
              const name = contactName(r)
              return (
                <tr key={r.id} className="border-b border-[hsl(var(--border))] last:border-0 hover:bg-[hsl(var(--muted))] transition-colors">
                  <td className="px-5 py-3.5">
                    <span className="text-[15px] font-bold" style={{ color: 'hsl(var(--foreground))' }}>
                      {r.catalog_items?.name ?? 'Item'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-[15px]" style={{ color: name ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))' }}>
                      {name || '—'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    {r.order_id && r.orders?.order_number ? (
                      <Link href={`/orders/${r.order_id}`}
                        className="inline-flex items-center gap-1 text-[15px] font-bold"
                        style={{ color: '#2a52a0' }}>
                        #{String(r.orders.order_number).padStart(4, '0')}
                        <ArrowUpRight className="w-3 h-3" />
                      </Link>
                    ) : (
                      <span className="text-[15px]" style={{ color: 'hsl(var(--muted-foreground))' }}>—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-[15px]" style={{ color: 'hsl(var(--muted-foreground))' }}>{fmtDate(r.rented_date)}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-[15px] font-semibold" style={{ color: urgency === 'overdue' ? 'var(--badge-red-text)' : 'hsl(var(--foreground))' }}>
                      {fmtDate(r.due_date)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-[15px] font-bold px-2 py-0.5 rounded-full" style={{ background: meta.bg, color: meta.color }}>
                      {r.returned_date && r.condition_on_return
                        ? `Returned, ${r.condition_on_return === 'good' ? 'good' : r.condition_on_return === 'needs_repair' ? 'needs repair' : 'damaged'}`
                        : meta.label}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    {!r.returned_date && (
                      returningId === r.id ? (
                        <div className="flex items-center gap-1.5 justify-end">
                          {CONDITIONS.map(c => (
                            <button key={c.value} disabled={isPending} onClick={() => handleReturn(r.id, c.value)}
                              className="text-[13px] font-semibold px-2.5 py-1.5 rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]">
                              {c.label}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="flex justify-end">
                          <button onClick={() => setReturningId(r.id)}
                            className="text-[15px] font-semibold px-3 py-1.5 rounded-lg text-white whitespace-nowrap"
                            style={{ background: 'linear-gradient(135deg,#2a52a0,#4a9db5)' }}>
                            Mark returned
                          </button>
                        </div>
                      )
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>
        {filtered.length === 0 && (
          <p className="text-center py-10 text-[15px]" style={{ color: 'hsl(var(--muted-foreground))' }}>
            No rentals match your filters
          </p>
        )}
      </div>
    </div>
  )
}
