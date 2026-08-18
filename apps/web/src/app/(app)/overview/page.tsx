import { createClient } from '@/lib/supabase/server'
import { getLatestAnalyticsSnapshot } from '@/lib/actions/analytics'
import { OverviewClient } from './OverviewClient'

export const metadata = { title: 'Overview' }
export const dynamic = 'force-dynamic'

export default async function OverviewPage() {
  const supabase = await createClient()

  const [{ data: orders }, { data: expenses }, snapshot] = await Promise.all([
    supabase
      .from('orders')
      .select('payment_status, total_amount, created_at')
      .eq('payment_status', 'paid'),
    supabase
      .from('expenses')
      .select('date, category, amount')
      .order('date', { ascending: false })
      .limit(500),
    getLatestAnalyticsSnapshot().catch(() => null),
  ])

  return (
    <OverviewClient
      orders={(orders as any[]) ?? []}
      expenses={(expenses as any[]) ?? []}
      initialSnapshot={snapshot}
    />
  )
}
