import { getUpsellAnalyticsSummary, getUpsellAnalyticsByRule } from '@/lib/actions/upsells'
import { UpsellRuleTable } from './UpsellRuleTable'

const card: React.CSSProperties = { borderRadius: '16px', background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', overflow: 'hidden' }

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div style={card} className="px-4 py-3.5">
      <p className="text-[11px] font-bold uppercase tracking-wide mb-1" style={{ color: 'hsl(var(--muted-foreground))' }}>{label}</p>
      <p className="text-[19px] font-bold" style={{ color: 'hsl(var(--foreground))' }}>{value}</p>
    </div>
  )
}

export async function UpsellAnalyticsPanel({ tenantId }: { tenantId: string }) {
  const [summary, byRule] = await Promise.all([
    getUpsellAnalyticsSummary(tenantId),
    getUpsellAnalyticsByRule(tenantId),
  ])

  return (
    <div style={{ maxWidth: '720px' }}>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <StatTile label="Shown (30d)" value={String(summary.shown)} />
        <StatTile label="Accepted" value={`${summary.accepted} (${summary.acceptanceRate}%)`} />
        <StatTile label="Revenue lift" value={`$${summary.revenueLift.toFixed(2)}`} />
        <StatTile label="Top rule" value={summary.topRuleName ?? '—'} />
      </div>

      {byRule.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[hsl(var(--border))] px-4 py-8 text-center text-[14px]" style={{ color: 'hsl(var(--muted-foreground))' }}>
          No data yet.
        </div>
      ) : (
        <>
          <p className="text-[12px] mb-2" style={{ color: 'hsl(var(--muted-foreground))' }}>Click a rule to see individual customer history.</p>
          <UpsellRuleTable tenantId={tenantId} rules={byRule} />
        </>
      )}
    </div>
  )
}
