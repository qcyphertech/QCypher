import type { Metadata } from 'next'
import { getLatestAnalyticsSnapshot } from '@/lib/actions/analytics'
import { AnalyticsDashboardClient } from '@/components/analytics/AnalyticsDashboardClient'

export const metadata: Metadata = { title: 'Analytics' }
export const dynamic = 'force-dynamic'

export default async function AnalyticsPage() {
  try {
    const snapshot = await getLatestAnalyticsSnapshot()
    return <AnalyticsDashboardClient initialSnapshot={snapshot} />
  } catch {
    // Nav visibility is flag-gated (show_analytics), same as every other
    // module — role enforcement happens here, matching how Settings' own
    // sub-tabs restrict by role without hiding the whole Settings nav item.
    return (
      <div style={{ maxWidth: '480px', margin: '80px auto', textAlign: 'center' }}>
        <p style={{ fontSize: '17px', fontWeight: 700, color: 'hsl(var(--foreground))', marginBottom: '6px' }}>Owner access required</p>
        <p style={{ fontSize: '14px', color: 'hsl(var(--muted-foreground))' }}>
          Analytics shows real revenue figures, so only the workspace owner can view this page.
        </p>
      </div>
    )
  }
}
