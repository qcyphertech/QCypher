import { Sparkles } from 'lucide-react'
import type { AnalyticsSnapshot } from '@/lib/actions/analytics'

const PIE_COLORS = ['#4f46e5', '#06b6d4', '#f59e0b', '#ec4899', '#10b981']

function fmtMoney(n: number) {
  return n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(0)}`
}

/** Simple, colorful donut chart — no chart library, just SVG arcs. */
function ServicePieChart({ data }: { data: { name: string; revenue: number }[] }) {
  if (data.length === 0) {
    return <p style={{ fontSize: '13px', color: 'hsl(var(--muted-foreground))', textAlign: 'center', padding: '24px 0' }}>No service revenue recorded yet.</p>
  }
  const total = data.reduce((s, d) => s + d.revenue, 0) || 1
  const r = 42, cx = 50, cy = 50, circ = 2 * Math.PI * r
  let offset = 0

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
      <svg viewBox="0 0 100 100" style={{ width: '128px', height: '128px', flexShrink: 0, transform: 'rotate(-90deg)' }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="16" />
        {data.map((d, i) => {
          const pct = d.revenue / total
          const dash = pct * circ
          const el = (
            <circle
              key={d.name}
              cx={cx} cy={cy} r={r} fill="none"
              stroke={PIE_COLORS[i % PIE_COLORS.length]}
              strokeWidth="16"
              strokeDasharray={`${dash} ${circ - dash}`}
              strokeDashoffset={-offset}
              style={{ filter: `drop-shadow(0 0 4px ${PIE_COLORS[i % PIE_COLORS.length]}55)` }}
            />
          )
          offset += dash
          return el
        })}
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', flex: 1, minWidth: '140px' }}>
        {data.map((d, i) => (
          <div key={d.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
              <span style={{ width: '9px', height: '9px', borderRadius: '3px', background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'hsl(var(--foreground))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
            </div>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'hsl(var(--muted-foreground))', flexShrink: 0 }}>{fmtMoney(d.revenue)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function StatChip({ label, value, color, sub }: { label: string; value: string | number; color: string; sub?: string }) {
  return (
    <div style={{ flex: 1, minWidth: '110px', background: `${color}12`, border: `1px solid ${color}30`, borderRadius: '16px', padding: '14px 16px' }}>
      <p style={{ fontSize: '26px', fontWeight: 900, color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</p>
      <p style={{ fontSize: '12px', fontWeight: 600, color: 'hsl(var(--muted-foreground))', marginTop: '4px' }}>{label}</p>
      {sub && <p style={{ fontSize: '11px', color: 'hsl(var(--muted-foreground))', marginTop: '1px' }}>{sub}</p>}
    </div>
  )
}

function AiNote({ text }: { text: string | null }) {
  if (!text) return null
  return (
    <p style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginTop: '14px', padding: '10px 12px', background: 'rgba(79,70,229,0.06)', border: '1px solid rgba(79,70,229,0.18)', borderRadius: '10px', fontSize: '13px', color: 'hsl(var(--foreground))', lineHeight: 1.5 }}>
      <Sparkles style={{ width: '14px', height: '14px', color: '#6366f1', flexShrink: 0, marginTop: '2px' }} />
      <span>{text}</span>
    </p>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ borderRadius: '20px', background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', padding: '18px 16px' }}>
      <p style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))', marginBottom: '14px' }}>{title}</p>
      {children}
    </div>
  )
}

/** Simple, colorful summary of the analytics_snapshots data — revenue by
 * service (pie), customer health, and jobs completed. Deliberately plain:
 * a handful of big numbers and one chart, not a dense dashboard. Shared by
 * the tenant-facing Overview page and the super-admin cross-tenant panel. */
export function AnalyticsView({ snapshot }: { snapshot: AnalyticsSnapshot }) {
  return (
    <>
      <Card title="Revenue by Service">
        <ServicePieChart data={snapshot.revenue_by_service} />
        <AiNote text={snapshot.revenue_summary} />
      </Card>

      <Card title="Customer Health">
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <StatChip label="Active Customers" value={snapshot.customers_active} color="#4f46e5" />
          <StatChip label="New This Month" value={snapshot.customers_new_month} color="#10b981" />
          <StatChip label="At-Risk (30+ days)" value={snapshot.customers_inactive_30d} color="#ef4444" />
        </div>
        <AiNote text={snapshot.customer_summary} />
      </Card>

      <Card title="Jobs Completed">
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <StatChip label="This Month" value={snapshot.jobs_completed_month} color="#f59e0b" />
        </div>
        <AiNote text={snapshot.job_summary} />
      </Card>
    </>
  )
}
