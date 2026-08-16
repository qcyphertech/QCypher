'use client'

import { useState } from 'react'
import { getUpsellDrilldown } from '@/lib/actions/upsells'

const card: React.CSSProperties = { borderRadius: '16px', background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', overflow: 'hidden' }

type RuleRow = {
  ruleId: string
  ruleName: string
  shown: number
  accepted: number
  acceptanceRate: number
  revenueLift: number
  lastShown: string | null
}

type DrilldownRow = { contactName: string; shownAt: string; accepted: boolean; shownIn: string }

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export function UpsellRuleTable({ tenantId, rules }: { tenantId: string; rules: RuleRow[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [drilldown, setDrilldown] = useState<DrilldownRow[]>([])
  const [loading, setLoading] = useState(false)

  async function toggleRow(ruleId: string) {
    if (expandedId === ruleId) { setExpandedId(null); return }
    setExpandedId(ruleId)
    setLoading(true)
    const rows = await getUpsellDrilldown(tenantId, ruleId)
    setDrilldown(rows)
    setLoading(false)
  }

  return (
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
          {rules.map(r => (
            <>
              <tr
                key={r.ruleId}
                onClick={() => toggleRow(r.ruleId)}
                className="border-b border-[hsl(var(--border))] last:border-0 cursor-pointer hover:bg-[hsl(var(--muted))]"
              >
                <td className="px-4 py-2.5 font-semibold" style={{ color: 'hsl(var(--foreground))' }}>{r.ruleName}</td>
                <td className="px-4 py-2.5" style={{ color: 'hsl(var(--foreground))' }}>{r.shown}</td>
                <td className="px-4 py-2.5" style={{ color: 'hsl(var(--foreground))' }}>{r.accepted}</td>
                <td className="px-4 py-2.5" style={{ color: 'hsl(var(--foreground))' }}>{r.acceptanceRate}%</td>
                <td className="px-4 py-2.5" style={{ color: 'hsl(var(--foreground))' }}>${r.revenueLift.toFixed(2)}</td>
                <td className="px-4 py-2.5" style={{ color: 'hsl(var(--muted-foreground))' }}>{fmtDate(r.lastShown)}</td>
              </tr>
              {expandedId === r.ruleId && (
                <tr key={`${r.ruleId}-detail`}>
                  <td colSpan={6} className="px-4 py-3 bg-[hsl(var(--muted))]">
                    {loading ? (
                      <p className="text-[13px]" style={{ color: 'hsl(var(--muted-foreground))' }}>Loading…</p>
                    ) : drilldown.length === 0 ? (
                      <p className="text-[13px]" style={{ color: 'hsl(var(--muted-foreground))' }}>No impressions yet.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {drilldown.map((d, i) => (
                          <div key={i} className="flex items-center justify-between text-[13px]">
                            <span style={{ color: 'hsl(var(--foreground))' }}>{d.contactName}</span>
                            <span className="flex items-center gap-2">
                              <span className={d.accepted ? 'text-emerald-600' : 'text-[hsl(var(--muted-foreground))]'}>
                                {d.accepted ? 'Accepted' : 'Declined/Ignored'}
                              </span>
                              <span style={{ color: 'hsl(var(--muted-foreground))' }}>· {d.shownIn === 'portal_checkout' ? 'Checkout' : 'Quote/Order'} · {fmtDateTime(d.shownAt)}</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  )
}
