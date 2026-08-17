import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Monthly blog_metrics rollup, automated — v2 addition. Same aggregation
// logic as recalculateBlogMetrics() in lib/actions/blog.ts (duplicated
// rather than imported: that file is 'use server', so every export is a
// client-callable action, and this needs to run unauthenticated except
// for CRON_SECRET, not exposed as something a browser could invoke).
// No pg_cron — this project deliberately uses Vercel Cron + CRON_SECRET
// for every scheduled job (see purge-audit-logs for the same pattern).
export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const month = new Date().toISOString().slice(0, 7)
  const monthStart = `${month}-01T00:00:00.000Z`

  const [{ data: articles }, { data: citations }] = await Promise.all([
    admin.from('blog_articles').select('tenant_id, views_count, published_at').eq('is_qcypher_blog', false).gte('published_at', monthStart),
    admin.from('blog_citations').select('tenant_id, cited_in_chatgpt, cited_in_claude, cited_in_perplexity').eq('tracked_month', month),
  ])

  const tenantIds = new Set<string>()
  const byTenant: Record<string, { articles: number; views: number; tracked: number; found: number }> = {}

  for (const a of articles ?? []) {
    if (!a.tenant_id) continue
    tenantIds.add(a.tenant_id)
    byTenant[a.tenant_id] ??= { articles: 0, views: 0, tracked: 0, found: 0 }
    byTenant[a.tenant_id].articles++
    byTenant[a.tenant_id].views += a.views_count ?? 0
  }
  for (const c of citations ?? []) {
    tenantIds.add(c.tenant_id)
    byTenant[c.tenant_id] ??= { articles: 0, views: 0, tracked: 0, found: 0 }
    byTenant[c.tenant_id].tracked++
    if (c.cited_in_chatgpt || c.cited_in_claude || c.cited_in_perplexity) byTenant[c.tenant_id].found++
  }

  for (const tenantId of tenantIds) {
    const m = byTenant[tenantId]
    await admin.from('blog_metrics').upsert({
      tenant_id: tenantId,
      month,
      articles_published: m.articles,
      total_views: m.views,
      citations_tracked: m.tracked,
      citations_found: m.found,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'tenant_id,month' })
  }

  return NextResponse.json({ ok: true, tenantsUpdated: tenantIds.size, month })
}
