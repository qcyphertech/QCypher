'use client'

import { useState, useTransition } from 'react'
import { RefreshCw } from 'lucide-react'
import { refreshMyAnalytics, type AnalyticsSnapshot } from '@/lib/actions/analytics'
import { AnalyticsView, BLUE, TEAL } from '@/components/analytics/AnalyticsView'

export function AnalyticsDashboardClient({ initialSnapshot }: { initialSnapshot: AnalyticsSnapshot | null }) {
  const [snapshot, setSnapshot] = useState(initialSnapshot)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleRefresh() {
    setError(null)
    startTransition(async () => {
      try {
        const result = await refreshMyAnalytics()
        if (result.ok) setSnapshot(result.snapshot)
        else setError(result.error)
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
        <AnalyticsView snapshot={snapshot} />
      )}
    </div>
  )
}
