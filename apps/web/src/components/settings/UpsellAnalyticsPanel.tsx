import { getUpsellAnalyticsSummary, getUpsellAnalyticsByRule } from '@/lib/actions/upsells'

const card: React.CSSProperties = { borderRadius: '16px', background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', overflow: 'hidden' }

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div style={card} className="px-4 py-3.5">
      <p className="text-[11px] font-bold uppercase tracking-wide mb-1" style={{ color: 'hsl(var(--muted-foreground))' }}>{label}</p>
      <p className="text-[19px] font-bold" style={{ color: 'hsl(var(--foreground))' }}>{value}</p>
    </div>
  )
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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
        <div style={card} className="overflow-x-auto">
          <table className="w-full text-[14px]">
            <thead>
              <tr className="border-b border-[hsl(var(--border))]">
                {['Rule', 'Shown', 'Accepted', 'Acceptance %', 'Revenue Lift', 'Last Shown'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 font-bold text-[12px] uppercase tracking-wide" style={{ color: 'hsl(var(--muted-foreground))' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {byRule.map(r => (
                <tr key={r.ruleId} className="border-b border-[hsl(var(--border))] last:border-0">
                  <td className="px-4 py-2.5 font-semibold" style={{ color: 'hsl(var(--foreground))' }}>{r.ruleName}</td>
                  <td className="px-4 py-2.5" style={{ color: 'hsl(var(--foreground))' }}>{r.shown}</td>
                  <td className="px-4 py-2.5" style={{ color: 'hsl(var(--foreground))' }}>{r.accepted}</td>
                  <td className="px-4 py-2.5" style={{ color: 'hsl(var(--foreground))' }}>{r.acceptanceRate}%</td>
                  <td className="px-4 py-2.5" style={{ color: 'hsl(var(--foreground))' }}>${r.revenueLift.toFixed(2)}</td>
                  <td className="px-4 py-2.5" style={{ color: 'hsl(var(--muted-foreground))' }}>{fmtDate(r.lastShown)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
