'use client'

import { useEffect, useState, useTransition } from 'react'
import { RefreshCw } from 'lucide-react'
import { getAnalyticsSnapshotForTenant, refreshAnalyticsForTenant, type AnalyticsSnapshot } from '@/lib/actions/analytics'
import { AnalyticsView } from '@/components/analytics/AnalyticsView'
import type { TenantSummary } from '@/lib/actions/admin-console'

export function AnalyticsPanel({ tenants }: { tenants: TenantSummary[] }) {
  const [tenantId, setTenantId] = useState('')
  const [snapshot, setSnapshot] = useState<AnalyticsSnapshot | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (!tenantId) { setSnapshot(null); return }
    setLoading(true)
    setError(null)
    getAnalyticsSnapshotForTenant(tenantId)
      .then(setSnapshot)
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false))
  }, [tenantId])

  function handleRefresh() {
    if (!tenantId) return
    setError(null)
    startTransition(async () => {
      try {
        const result = await refreshAnalyticsForTenant(tenantId)
        if (result.ok) setSnapshot(result.snapshot)
        else setError(result.error)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Refresh failed')
      }
    })
  }

  const selectCls = 'rounded-xl border border-[hsl(var(--border))] px-3 py-2 text-[14px] bg-transparent outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Analytics</h2>
      </div>
      <p className="text-[13px] text-[hsl(var(--muted-foreground))] -mt-2">
        View any tenant&apos;s revenue, customer health, and job metrics — the same data they see on their own <code>/dashboard/analytics</code> page.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <select value={tenantId} onChange={e => setTenantId(e.target.value)} className={selectCls}>
          <option value="">Select a tenant…</option>
          {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        {tenantId && (
          <button
            onClick={handleRefresh}
            disabled={pending}
            className="flex items-center gap-1.5 text-[13px] font-semibold px-3 py-1.5 rounded-lg bg-accent text-white hover:bg-accent-hover disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${pending ? 'animate-spin' : ''}`} />
            {pending ? 'Refreshing…' : 'Refresh Now'}
          </button>
        )}
      </div>

      {error && (
        <p style={{ fontSize: '13px', color: '#c0392b', background: 'rgba(192,57,43,0.08)', border: '1px solid rgba(192,57,43,0.25)', borderRadius: '10px', padding: '10px 14px' }}>
          {error}
        </p>
      )}

      {!tenantId ? (
        <p className="text-[14px] text-[hsl(var(--muted-foreground))] py-8 text-center">Select a tenant to view their analytics.</p>
      ) : loading ? (
        <p className="text-[14px] text-[hsl(var(--muted-foreground))] py-8 text-center">Loading…</p>
      ) : !snapshot ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '16px' }}>
          <p style={{ fontSize: '15px', fontWeight: 700, color: 'hsl(var(--foreground))', marginBottom: '6px' }}>No analytics yet for this tenant</p>
          <p style={{ fontSize: '13px', color: 'hsl(var(--muted-foreground))' }}>Click &ldquo;Refresh Now&rdquo; to generate their first snapshot.</p>
        </div>
      ) : (
        <>
          <p style={{ fontSize: '13px', color: 'hsl(var(--muted-foreground))' }}>
            Updated {new Date(snapshot.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
            {snapshot.refresh_type === 'auto' ? ' · weekly auto-refresh' : ' · manual refresh'}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <AnalyticsView snapshot={snapshot} />
          </div>
        </>
      )}
    </div>
  )
}
