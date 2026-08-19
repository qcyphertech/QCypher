'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Filter, Package, RefreshCw, Wrench, Mail, CheckCircle2,
  MessageSquare, Send, Star, TrendingUp, Link2,
} from 'lucide-react'
import type { AuditAction } from '@/lib/actions/audit'

export type ActivityLog = {
  id: string
  user_email: string
  action: AuditAction
  resource_type: string
  resource_id: string | null
  resource_name: string | null
  details: Record<string, unknown> | null
  created_at: string
}

// One row per action this timeline knows how to render — a label
// builder (has access to details so it can say "sent to jane@..." not
// just "payment link sent"), an icon, and a color group. Anything with
// an action not listed here still renders with a generic fallback
// rather than being silently dropped, so a future action type doesn't
// need this file touched to at least show up.
const META: Partial<Record<AuditAction, {
  label: (d: Record<string, unknown>) => string
  icon: React.ComponentType<{ className?: string }>
  tone: 'neutral' | 'success' | 'info'
}>> = {
  order_created:          { label: () => 'Order created', icon: Package, tone: 'neutral' },
  order_status_changed:   { label: d => `Marked as ${d.payment_status ?? 'updated'}`, icon: RefreshCw, tone: 'info' },
  job_status_changed:     { label: d => `Job status: ${String(d.job_status ?? 'updated').replace('_', ' ')}`, icon: Wrench, tone: 'info' },
  quote_sent:             { label: d => d.recipient_email ? `Quote emailed to ${d.recipient_email}` : 'Quote emailed to customer', icon: Mail, tone: 'info' },
  quote_approved:         { label: d => d.signed_by ? `Quote signed by ${d.signed_by}` : 'Quote signed', icon: CheckCircle2, tone: 'success' },
  quote_change_requested: { label: () => 'Customer requested changes to the quote', icon: MessageSquare, tone: 'neutral' },
  payment_link_created:   { label: () => 'Payment link created', icon: Link2, tone: 'neutral' },
  payment_link_sent:      {
    label: d => {
      const to = d.recipient_email ?? d.recipient_phone
      const via = d.via === 'sms' ? 'text' : 'email'
      return to ? `Payment link sent via ${via} to ${to}` : `Payment link sent via ${via}`
    },
    icon: Send, tone: 'info',
  },
  payment_link_paid:      { label: () => 'Payment received', icon: CheckCircle2, tone: 'success' },
  review_request_sent:    { label: () => 'Review request sent to customer', icon: Star, tone: 'neutral' },
  review_reminder_sent:   { label: () => 'Review reminder sent to customer', icon: Star, tone: 'neutral' },
  upsell_accepted:        { label: () => 'Customer accepted an upsell', icon: TrendingUp, tone: 'success' },
}

const TONE_STYLE: Record<string, { bg: string; color: string }> = {
  neutral: { bg: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' },
  info:    { bg: 'rgba(42,82,160,0.10)', color: '#2a52a0' },
  success: { bg: 'rgba(16,185,129,0.12)', color: '#059669' },
}

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'All activity' },
  { value: 'order_created,order_status_changed,job_status_changed', label: 'Order updates' },
  { value: 'quote_sent,quote_approved,quote_change_requested', label: 'Quotes' },
  { value: 'payment_link_created,payment_link_sent,payment_link_paid', label: 'Payments' },
  { value: 'review_request_sent,review_reminder_sent', label: 'Reviews' },
]

function fmt(iso: string) {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export function ActivityTimeline({ activity, showOrderLink = false }: { activity: ActivityLog[]; showOrderLink?: boolean }) {
  const [type, setType] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const hasFilters = type !== 'all' || !!dateFrom || !!dateTo

  const filtered = useMemo(() => {
    const types = type === 'all' ? null : new Set(type.split(','))
    return activity.filter(a => {
      if (types && !types.has(a.action)) return false
      if (dateFrom && new Date(a.created_at) < new Date(dateFrom)) return false
      if (dateTo && new Date(a.created_at) > new Date(dateTo + 'T23:59:59')) return false
      return true
    })
  }, [activity, type, dateFrom, dateTo])

  const filterCls = 'rounded border border-[hsl(var(--border))] bg-[hsl(var(--card))] pl-7 pr-2 py-1.5 text-[13px] font-normal'
  const filterIconCls = 'w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none'

  if (activity.length === 0) {
    return (
      <p className="text-[14px] py-4" style={{ color: 'hsl(var(--muted-foreground))' }}>
        No order activity yet.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative w-[180px]">
          <Filter className={filterIconCls} style={{ color: 'hsl(var(--muted-foreground))' }} />
          <select value={type} onChange={e => setType(e.target.value)}
            className={`${filterCls} w-full appearance-none`} style={{ color: 'hsl(var(--foreground))' }}>
            {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          className={filterCls} style={{ color: 'hsl(var(--foreground))' }} />
        <span className="text-[13px]" style={{ color: 'hsl(var(--muted-foreground))' }}>–</span>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
          className={filterCls} style={{ color: 'hsl(var(--foreground))' }} />
        {hasFilters && (
          <button onClick={() => { setType('all'); setDateFrom(''); setDateTo('') }}
            className="text-[13px] font-semibold px-2 py-1.5 rounded-lg hover:bg-[hsl(var(--muted))] transition-colors"
            style={{ color: 'hsl(var(--muted-foreground))' }}>
            Clear
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="text-[14px] py-4" style={{ color: 'hsl(var(--muted-foreground))' }}>
          No activity matches your filters.
        </p>
      ) : (
        <ol className="space-y-0">
          {filtered.map((a, i) => {
            const meta = META[a.action]
            const Icon = meta?.icon ?? RefreshCw
            const tone = TONE_STYLE[meta?.tone ?? 'neutral']
            const label = meta ? meta.label(a.details ?? {}) : a.action.replace(/_/g, ' ')
            return (
              <li key={a.id} className="flex gap-3 pb-4 relative">
                {i < filtered.length - 1 && (
                  <span className="absolute left-[15px] top-8 bottom-0 w-px" style={{ background: 'hsl(var(--border))' }} />
                )}
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10"
                  style={{ background: tone.bg, color: tone.color }}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0 pt-1">
                  <p className="text-[14px] font-medium" style={{ color: 'hsl(var(--foreground))' }}>
                    {label}
                    {showOrderLink && a.resource_name && (
                      <>
                        {' — '}
                        <Link href={`/orders/${a.resource_id}`} className="hover:underline" style={{ color: '#2a52a0' }}>
                          {a.resource_name}
                        </Link>
                      </>
                    )}
                  </p>
                  <p className="text-[12.5px]" style={{ color: 'hsl(var(--muted-foreground))' }}>{fmt(a.created_at)}</p>
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
