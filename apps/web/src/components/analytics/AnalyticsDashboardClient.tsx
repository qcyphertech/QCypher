'use client'

import { useState, useTransition } from 'react'
import { RefreshCw, DollarSign, Users, ShoppingBag, Sparkles } from 'lucide-react'
import { refreshMyAnalytics, type AnalyticsSnapshot } from '@/lib/actions/analytics'

const BLUE = '#2a52a0'
const TEAL = '#4a9db5'

function fmtMoney(n: number) {
  return n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(0)}`
}

function StatCard({ label, value, sub, icon: Icon, accent }: { label: string; value: string | number; sub?: string; icon: React.ElementType; accent: string }) {
  return (
    <div style={{ background: 'hsl(var(--card))', border: `1px solid ${accent}30`, borderRadius: '16px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0, background: `${accent}18`, border: `1px solid ${accent}35`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon style={{ width: '18px', height: '18px', color: accent }} strokeWidth={2.5} />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: `${accent}cc`, marginBottom: '4px' }}>{label}</p>
          <p style={{ fontSize: '24px', fontWeight: 900, lineHeight: 1, color: 'hsl(var(--foreground))', letterSpacing: '-0.02em' }}>{value}</p>
          {sub && <p style={{ fontSize: '12px', marginTop: '4px', color: 'hsl(var(--muted-foreground))', fontWeight: 500 }}>{sub}</p>}
        </div>
      </div>
    </div>
  )
}

function Section({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '16px', padding: '22px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, transparent, ${accent}88, transparent)` }} />
      <p style={{ fontSize: '15px', fontWeight: 800, color: 'hsl(var(--foreground))', marginBottom: '14px', letterSpacing: '-0.01em' }}>{title}</p>
      {children}
    </div>
  )
}

function AiNote({ text }: { text: string | null }) {
  if (!text) return null
  return (
    <p style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginTop: '14px', padding: '10px 12px', background: `${TEAL}0d`, border: `1px solid ${TEAL}25`, borderRadius: '10px', fontSize: '13px', color: 'hsl(var(--foreground))', lineHeight: 1.5 }}>
      <Sparkles style={{ width: '14px', height: '14px', color: TEAL, flexShrink: 0, marginTop: '2px' }} />
      <span>{text}</span>
    </p>
  )
}

function MonthlyTrendChart({ data }: { data: { month: string; revenue: number }[] }) {
  const max = Math.max(...data.map(d => d.revenue), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '110px' }}>
      {data.map(({ month, revenue }, i) => {
        const pct = Math.max((revenue / max) * 100, revenue > 0 ? 6 : 2)
        return (
          <div key={`${month}-${i}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <div style={{
              width: '100%', borderRadius: '5px 5px 2px 2px', height: `${pct}%`, minHeight: '3px',
              background: revenue > 0 ? `linear-gradient(180deg, ${BLUE}, ${TEAL})` : 'hsl(var(--muted))',
            }} title={`${month}: ${fmtMoney(revenue)}`} />
            <span style={{ fontSize: '10px', fontWeight: 600, color: 'hsl(var(--muted-foreground))' }}>{month}</span>
          </div>
        )
      })}
    </div>
  )
}

function ServiceBreakdown({ data }: { data: { name: string; revenue: number }[] }) {
  if (data.length === 0) return <p style={{ fontSize: '13px', color: 'hsl(var(--muted-foreground))' }}>No paid line items yet this year.</p>
  const max = Math.max(...data.map(d => d.revenue), 1)
  const colors = [BLUE, TEAL, '#7b68b0', '#f59e0b', '#10b981']
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {data.map((s, i) => (
        <div key={s.name}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '3px' }}>
            <span style={{ fontWeight: 600, color: 'hsl(var(--foreground))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
            <span style={{ fontWeight: 700, color: 'hsl(var(--muted-foreground))', flexShrink: 0, marginLeft: '8px' }}>{fmtMoney(s.revenue)}</span>
          </div>
          <div style={{ height: '6px', borderRadius: '4px', background: 'hsl(var(--muted))', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(s.revenue / max) * 100}%`, background: colors[i % colors.length], borderRadius: '4px' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export function AnalyticsDashboardClient({ initialSnapshot }: { initialSnapshot: AnalyticsSnapshot | null }) {
  const [snapshot, setSnapshot] = useState(initialSnapshot)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleRefresh() {
    setError(null)
    startTransition(async () => {
      try {
        const fresh = await refreshMyAnalytics()
        setSnapshot(fresh)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Refresh failed')
      }
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <p style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: TEAL, marginBottom: '4px' }}>REPORTING</p>
          <h1 style={{ fontSize: '26px', fontWeight: 900, color: 'var(--heading)', letterSpacing: '-0.03em' }}>Analytics</h1>
          <p style={{ fontSize: '13px', color: 'hsl(var(--muted-foreground))', marginTop: '4px' }}>
            {snapshot ? `Updated ${new Date(snapshot.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} · refreshes weekly, or on demand once per day` : 'No snapshot yet'}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={pending}
          style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '14px', fontWeight: 700, padding: '10px 16px', borderRadius: '10px', border: 'none', cursor: 'pointer', background: BLUE, color: '#fff', opacity: pending ? 0.6 : 1 }}
        >
          <RefreshCw style={{ width: '15px', height: '15px' }} className={pending ? 'animate-spin' : ''} />
          {pending ? 'Refreshing…' : 'Refresh Now'}
        </button>
      </div>

      {error && (
        <p style={{ fontSize: '13px', color: '#c0392b', background: 'rgba(192,57,43,0.08)', border: '1px solid rgba(192,57,43,0.25)', borderRadius: '10px', padding: '10px 14px' }}>
          {error}
        </p>
      )}

      {!snapshot ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '16px' }}>
          <p style={{ fontSize: '15px', fontWeight: 700, color: 'hsl(var(--foreground))', marginBottom: '6px' }}>No analytics yet</p>
          <p style={{ fontSize: '13px', color: 'hsl(var(--muted-foreground))' }}>Click &ldquo;Refresh Now&rdquo; to generate your first snapshot — it updates automatically every Monday after that.</p>
        </div>
      ) : (
        <>
          <Section title="Revenue Overview" accent={TEAL}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '18px' }}>
              <StatCard label="Revenue (YTD)" value={fmtMoney(snapshot.revenue_ytd)} icon={DollarSign} accent="#10b981" />
              <StatCard label="Revenue (MTD)" value={fmtMoney(snapshot.revenue_mtd)} icon={DollarSign} accent={BLUE} />
              <StatCard
                label="Growth vs Last Month"
                value={snapshot.revenue_growth_percent !== null ? `${snapshot.revenue_growth_percent > 0 ? '+' : ''}${snapshot.revenue_growth_percent}%` : '—'}
                sub={snapshot.revenue_growth_percent === null ? 'no prior month data' : undefined}
                icon={ShoppingBag} accent={snapshot.revenue_growth_percent !== null && snapshot.revenue_growth_percent < 0 ? '#ef4444' : '#10b981'}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }} className="lg:grid-cols-3">
              <div className="lg:col-span-2">
                <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))', marginBottom: '8px' }}>Last 12 months</p>
                <MonthlyTrendChart data={snapshot.revenue_monthly_trend} />
              </div>
              <div>
                <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))', marginBottom: '8px' }}>Top services (YTD)</p>
                <ServiceBreakdown data={snapshot.revenue_by_service} />
              </div>
            </div>
            <AiNote text={snapshot.revenue_summary} />
          </Section>

          <Section title="Customer Health" accent={BLUE}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
              <StatCard label="Active Customers" value={snapshot.customers_active} icon={Users} accent={BLUE} />
              <StatCard label="New This Month" value={snapshot.customers_new_month} icon={Users} accent="#10b981" />
              <StatCard label="Inactive 30+ Days" value={snapshot.customers_inactive_30d} sub="at-risk" icon={Users} accent="#ef4444" />
              <StatCard
                label="Retention"
                value={snapshot.retention_rate_percent !== null ? `${snapshot.retention_rate_percent}%` : '—'}
                sub={snapshot.retention_rate_percent === null ? 'available after next refresh' : 'vs. prior snapshot'}
                icon={Users} accent={TEAL}
              />
            </div>
            <AiNote text={snapshot.customer_summary} />
          </Section>

          <Section title="Job Metrics" accent="#f97316">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
              <StatCard label="Jobs Completed" value={snapshot.jobs_completed_month} sub="this month" icon={ShoppingBag} accent="#f97316" />
            </div>
            <p style={{ fontSize: '12px', color: 'hsl(var(--muted-foreground))', marginTop: '10px' }}>
              Average completion time, on-time rate, and quality score aren&apos;t shown yet — they need a completion timestamp and review-rating data this app doesn&apos;t track today.
            </p>
            <AiNote text={snapshot.job_summary} />
          </Section>
        </>
      )}
    </div>
  )
}
