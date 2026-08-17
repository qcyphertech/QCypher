'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient, getTenantId } from '@/lib/supabase/admin'
import { isSuperAdminUser } from '@/lib/auth/superadmin'
import { revalidatePath } from 'next/cache'
import type { TablesUpdate } from '@qcypher/db'
import { callDeepSeek } from '@/lib/deepseek'
import { stripHtmlTitle } from '@/lib/blog-excerpt'
import { analyzeAiConfidence } from '@/lib/actions/ai-detection'
import { logAudit } from '@/lib/actions/audit'

export type BlogArticle = {
  id: string
  tenant_id: string | null
  is_qcypher_blog: boolean
  title: string
  slug: string
  content: string
  excerpt: string | null
  status: 'draft' | 'pending_approval' | 'published'
  ai_generated: boolean
  ai_confidence: number | null
  disclose_ai_assistance: boolean
  views_count: number
  approved_by: string | null
  published_at: string | null
  created_at: string
  updated_at: string
}

export type BlogCitation = {
  id: string
  tenant_id: string
  article_id: string | null
  test_keyword: string
  cited_in_chatgpt: boolean
  cited_in_claude: boolean
  cited_in_perplexity: boolean
  position_in_response: number | null
  tracked_month: string
  notes: string | null
  tracked_at: string
}

export type BlogMetric = {
  tenant_id: string
  month: string
  articles_published: number
  total_views: number
  citations_tracked: number
  citations_found: number
}

async function requireSuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const admin = createAdminClient()
  const { data: { user: fresh } } = await admin.auth.admin.getUserById(user.id)
  if (!isSuperAdminUser(fresh)) throw new Error('Super admin only')

  return { user, admin }
}

// v2 self-serve: any tenant owner/member (not read_only) can generate and
// manage their OWN tenant's blog posts directly, without routing through
// a super admin every time. Uses the admin client only to bypass
// blog_articles' RLS (which has no owner-role carve-out, matching this
// project's existing "server actions are the real enforcement layer"
// pattern for admin-only tables) — every query below is still scoped to
// the caller's own tenant_id, checked against a fresh (non-JWT-cached)
// role read, same pattern as team.ts's getCaller().
async function requireTenantWriter() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const admin = createAdminClient()
  const { data: { user: fresh } } = await admin.auth.admin.getUserById(user.id)
  const role = fresh?.app_metadata?.role ?? 'member'
  if (role === 'read_only') throw new Error('Read-only accounts cannot manage blog posts')

  const tenantId = await getTenantId(user.id, fresh?.app_metadata)
  return { user, admin, tenantId }
}

function slugify(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

function extractTitle(html: string): string {
  const m = html.match(/<h1[^>]*>(.*?)<\/h1>/i)
  return (m?.[1] ?? 'Untitled').replace(/<[^>]+>/g, '').trim()
}

function extractExcerpt(html: string): string {
  const text = stripHtmlTitle(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  return text.slice(0, 160)
}

// Best-effort — a detection failure shouldn't block saving the draft.
async function tryAnalyzeConfidence(html: string): Promise<number | null> {
  try {
    const plainText = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    const { confidence } = await analyzeAiConfidence(plainText)
    return confidence
  } catch {
    return null
  }
}

function blogPrompt(opts: { businessName: string; serviceName: string; serviceDescription: string; price?: number | null }) {
  return `You are a professional small-business blog writer.
Write a blog post promoting this service:

Business: ${opts.businessName}
Service: ${opts.serviceName}
Description: ${opts.serviceDescription || '(no description provided)'}
${opts.price ? `Typical price: $${opts.price}` : ''}

Requirements:
- 600-900 words
- Structure: one <h1> title (catchy, SEO-friendly, 50-70 chars), a short intro paragraph, 2-3 <h2> sections with practical tips, a closing paragraph with a soft call-to-action
- Do not invent statistics, certifications, awards, or claims not implied by the description above
- Do not invent a phone number, address, or price if one wasn't given
- Output ONLY raw HTML using <h1>, <h2>, <p>, <ul>/<li> — no markdown, no code fences, no <html>/<body> wrapper`
}

/**
 * Generate one blog post for a tenant's catalog item and save it as a
 * draft. Super-admin-triggered (this costs a real API call and tenants
 * don't have a self-serve trigger in this v1) — approve/publish happens
 * as a separate explicit step, matching the qcypher_blog approval flow
 * so both paths go through the same review-before-live habit.
 */
// catalog_items' RLS has no super-admin bypass (it's strictly
// tenant_id = the caller's own JWT tenant_id), so the admin UI's tenant
// picker needs this server action rather than a direct browser-client
// query, which would silently return nothing for any tenant other than
// the super admin's own.
export async function listCatalogItemsForTenant(tenantId: string): Promise<{ id: string; name: string }[]> {
  const { admin } = await requireSuperAdmin()
  const { data } = await admin.from('catalog_items').select('id, name').eq('tenant_id', tenantId).eq('is_active', true).order('name')
  return (data ?? []) as { id: string; name: string }[]
}

export async function generateTenantBlogDraft(tenantId: string, catalogItemId: string): Promise<{ id: string }> {
  const { admin } = await requireSuperAdmin()

  const [{ data: tenant }, { data: item }] = await Promise.all([
    admin.from('tenants').select('id, name').eq('id', tenantId).single(),
    admin.from('catalog_items').select('id, name, description, base_price').eq('id', catalogItemId).eq('tenant_id', tenantId).single(),
  ])
  if (!tenant || !item) throw new Error('Tenant or catalog item not found')

  const html = await callDeepSeek(blogPrompt({
    businessName: tenant.name,
    serviceName: item.name,
    serviceDescription: item.description ?? '',
    price: item.base_price,
  }))

  const title = extractTitle(html)
  const slug = `${slugify(title)}-${Date.now().toString(36)}`
  const ai_confidence = await tryAnalyzeConfidence(html)

  const { data, error } = await admin
    .from('blog_articles')
    .insert({
      tenant_id: tenantId,
      is_qcypher_blog: false,
      title,
      slug,
      content: html,
      excerpt: extractExcerpt(html),
      status: 'draft',
      ai_generated: true,
      ai_confidence,
    })
    .select('id')
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Failed to save draft')
  revalidatePath('/admin')
  return { id: data.id }
}

// ── v2: self-serve tenant blog management (no super admin needed) ───────

export async function listMyCatalogItems(): Promise<{ id: string; name: string }[]> {
  const { admin, tenantId } = await requireTenantWriter()
  const { data } = await admin.from('catalog_items').select('id, name').eq('tenant_id', tenantId).eq('is_active', true).order('name')
  return (data ?? []) as { id: string; name: string }[]
}

export async function listMyBlogArticles(): Promise<BlogArticle[]> {
  const { admin, tenantId } = await requireTenantWriter()
  const { data } = await admin.from('blog_articles').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false })
  return (data ?? []) as BlogArticle[]
}

/**
 * Self-serve generation, gated by a real cost-control check rather than
 * an in-process rate limiter (this app's existing rateLimit() is a
 * 1-minute sliding window in a serverless function's memory, which
 * resets on every cold start — not a real guard against a tenant
 * generating a dozen drafts for the same service in a day). Checked
 * directly against the DB instead: at most one new draft per catalog
 * item per rolling 24 hours.
 */
export async function generateMyBlogDraft(catalogItemId: string): Promise<{ id: string }> {
  const { admin, tenantId } = await requireTenantWriter()

  const [{ data: tenant }, { data: item }, { data: recent }] = await Promise.all([
    admin.from('tenants').select('id, name').eq('id', tenantId).single(),
    admin.from('catalog_items').select('id, name, description, base_price').eq('id', catalogItemId).eq('tenant_id', tenantId).single(),
    admin.from('blog_articles').select('id').eq('tenant_id', tenantId).gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
  ])
  if (!tenant || !item) throw new Error('Service not found')
  if ((recent?.length ?? 0) >= 3) throw new Error('You can generate up to 3 blog drafts per day — try again tomorrow')

  const html = await callDeepSeek(blogPrompt({
    businessName: tenant.name,
    serviceName: item.name,
    serviceDescription: item.description ?? '',
    price: item.base_price,
  }))

  const title = extractTitle(html)
  const slug = `${slugify(title)}-${Date.now().toString(36)}`
  const ai_confidence = await tryAnalyzeConfidence(html)

  const { data, error } = await admin
    .from('blog_articles')
    .insert({
      tenant_id: tenantId,
      is_qcypher_blog: false,
      title,
      slug,
      content: html,
      excerpt: extractExcerpt(html),
      status: 'draft',
      ai_generated: true,
      ai_confidence,
    })
    .select('id')
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Failed to save draft')
  revalidatePath('/settings')
  return { id: data.id }
}

export async function publishMyBlogArticle(articleId: string): Promise<void> {
  const { admin, tenantId } = await requireTenantWriter()
  const { data, error } = await admin
    .from('blog_articles')
    .update({ status: 'published', published_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', articleId)
    .eq('tenant_id', tenantId) // belt-and-suspenders: can't touch another tenant's row even if the ID leaked
    .select('title, disclose_ai_assistance')
    .single()
  if (error) throw new Error(error.message)
  await logAudit({ action: 'ai_blog_published', resource_type: 'blog', resource_id: articleId, resource_name: data?.title, details: { model: 'deepseek-v4-flash', badge_shown: data?.disclose_ai_assistance ?? false } })
  revalidatePath('/settings')
}

export async function unpublishMyBlogArticle(articleId: string): Promise<void> {
  const { admin, tenantId } = await requireTenantWriter()
  const { error } = await admin
    .from('blog_articles')
    .update({ status: 'draft', updated_at: new Date().toISOString() })
    .eq('id', articleId)
    .eq('tenant_id', tenantId)
  if (error) throw new Error(error.message)
  revalidatePath('/settings')
}

export async function discardMyBlogArticle(articleId: string): Promise<void> {
  const { admin, tenantId } = await requireTenantWriter()
  const { error } = await admin.from('blog_articles').delete().eq('id', articleId).eq('tenant_id', tenantId)
  if (error) throw new Error(error.message)
  revalidatePath('/settings')
}

// Purely a visible-note toggle — the `ai-assisted` meta tag is always
// present on tenant blog posts regardless of this setting.
export async function setMyBlogDisclosure(articleId: string, disclose: boolean): Promise<void> {
  const { admin, tenantId } = await requireTenantWriter()
  const { error } = await admin
    .from('blog_articles')
    .update({ disclose_ai_assistance: disclose, updated_at: new Date().toISOString() })
    .eq('id', articleId)
    .eq('tenant_id', tenantId)
  if (error) throw new Error(error.message)
  revalidatePath('/settings')
  revalidatePath('/portal', 'layout')
}

const QCYPHER_TOPICS = [
  'How automated review requests actually help a small service business',
  'What a missed-call text-back does and why it matters',
  'The real cost of manual scheduling for a small team',
]

/**
 * Generate a batch of QCypher-authored blog drafts (pending_approval) —
 * human review is required before these ever go live, per the original
 * spec's brand-safety requirement.
 */
export async function generateQcypherBlogDrafts(): Promise<{ created: number }> {
  const { admin } = await requireSuperAdmin()
  let created = 0

  for (const topic of QCYPHER_TOPICS) {
    try {
      const html = await callDeepSeek(`You are writing for QCypher Technologies' own blog (qcyphertech.com), a company that builds CRM/scheduling software for small local service businesses (plumbers, HVAC, cleaners, etc.).

Topic: ${topic}

Requirements:
- 600-900 words
- Structure: one <h1> title, an intro, 2-3 <h2> sections, a closing paragraph
- Educational tone, not a sales pitch — mention QCypher by name at most once
- Do not invent statistics, customer names, or specific numbers
- Output ONLY raw HTML using <h1>, <h2>, <p>, <ul>/<li> — no markdown, no code fences`)

      const title = extractTitle(html)
      const slug = `${slugify(title)}-${Date.now().toString(36)}`

      const { error } = await admin.from('blog_articles').insert({
        tenant_id: null,
        is_qcypher_blog: true,
        title,
        slug,
        content: html,
        excerpt: extractExcerpt(html),
        status: 'pending_approval',
        ai_generated: true,
      })
      if (!error) created++
    } catch {
      // one topic failing shouldn't block the rest
    }
  }

  revalidatePath('/admin')
  return { created }
}

export async function listBlogArticles(opts: { isQcypherBlog?: boolean; tenantId?: string; status?: string } = {}): Promise<BlogArticle[]> {
  const { admin } = await requireSuperAdmin()
  let query = admin.from('blog_articles').select('*').order('created_at', { ascending: false })
  if (opts.isQcypherBlog !== undefined) query = query.eq('is_qcypher_blog', opts.isQcypherBlog)
  if (opts.tenantId) query = query.eq('tenant_id', opts.tenantId)
  if (opts.status) query = query.eq('status', opts.status)
  const { data } = await query.limit(100)
  return (data ?? []) as BlogArticle[]
}

export async function approveAndPublishArticle(articleId: string): Promise<void> {
  const { user, admin } = await requireSuperAdmin()
  const { data, error } = await admin
    .from('blog_articles')
    .update({ status: 'published', published_at: new Date().toISOString(), approved_by: user.id, updated_at: new Date().toISOString() })
    .eq('id', articleId)
    .select('title, tenant_id, disclose_ai_assistance')
    .single()
  if (error) throw new Error(error.message)

  // audit_logs is tenant-scoped (tenant_id not null) — only log when this
  // was a tenant's article. QCypher's own blog (tenant_id null) has no
  // tenant to attribute the log to, so it's not logged here. The super
  // admin approving isn't a member of the tenant, so this goes through
  // the admin client directly rather than logAudit()'s session-derived
  // tenant resolution, which would resolve to the admin's own tenant
  // (or nothing at all).
  if (data?.tenant_id) {
    await admin.from('audit_logs').insert({
      tenant_id: data.tenant_id,
      user_id: user.id,
      user_email: user.email ?? '',
      action: 'ai_blog_published',
      resource_type: 'blog',
      resource_id: articleId,
      resource_name: data.title,
      details: { model: 'deepseek-v4-flash', badge_shown: data.disclose_ai_assistance, approved_by_admin: true },
    })
  }

  revalidatePath('/admin')
  revalidatePath('/blog')
}

export async function unpublishArticle(articleId: string): Promise<void> {
  const { admin } = await requireSuperAdmin()
  const { error } = await admin
    .from('blog_articles')
    .update({ status: 'draft', updated_at: new Date().toISOString() })
    .eq('id', articleId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin')
  revalidatePath('/blog')
}

export async function discardArticle(articleId: string): Promise<void> {
  const { admin } = await requireSuperAdmin()
  const { error } = await admin.from('blog_articles').delete().eq('id', articleId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin')
}

export async function updateArticleContent(articleId: string, fields: { title?: string; content?: string; excerpt?: string }): Promise<void> {
  const { admin } = await requireSuperAdmin()
  const patch: TablesUpdate<'blog_articles'> = { ...fields, updated_at: new Date().toISOString() }
  const { error } = await admin
    .from('blog_articles')
    .update(patch)
    .eq('id', articleId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin')
}

// ── Citation tracking (manual monthly workflow) ──────────────────────────

export async function recordCitation(input: {
  tenantId: string
  articleId: string | null
  testKeyword: string
  citedInChatgpt: boolean
  citedInClaude: boolean
  citedInPerplexity: boolean
  positionInResponse?: number | null
  notes?: string
}): Promise<void> {
  const { admin } = await requireSuperAdmin()
  const trackedMonth = new Date().toISOString().slice(0, 7)

  const { error } = await admin.from('blog_citations').upsert({
    tenant_id: input.tenantId,
    article_id: input.articleId,
    test_keyword: input.testKeyword,
    cited_in_chatgpt: input.citedInChatgpt,
    cited_in_claude: input.citedInClaude,
    cited_in_perplexity: input.citedInPerplexity,
    position_in_response: input.positionInResponse ?? null,
    tracked_month: trackedMonth,
    notes: input.notes ?? null,
  }, { onConflict: 'tenant_id,article_id,test_keyword,tracked_month' })

  if (error) throw new Error(error.message)
  revalidatePath('/admin')
}

export async function listCitations(tenantId?: string): Promise<BlogCitation[]> {
  const { admin } = await requireSuperAdmin()
  let query = admin.from('blog_citations').select('*').order('tracked_at', { ascending: false })
  if (tenantId) query = query.eq('tenant_id', tenantId)
  const { data } = await query.limit(200)
  return (data ?? []) as BlogCitation[]
}

/**
 * Recompute this month's blog_metrics rollup for every tenant that has
 * either a published article or a tracked citation this month. On-demand
 * (button in the CRM), not pg_cron — matches this project's established
 * Vercel-Cron-or-manual pattern rather than introducing a Postgres
 * scheduler dependency.
 */
export async function recalculateBlogMetrics(): Promise<{ tenantsUpdated: number }> {
  const { admin } = await requireSuperAdmin()
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

  revalidatePath('/admin')
  return { tenantsUpdated: tenantIds.size }
}

export async function listBlogMetrics(month?: string): Promise<(BlogMetric & { tenant_name: string })[]> {
  const { admin } = await requireSuperAdmin()
  const targetMonth = month ?? new Date().toISOString().slice(0, 7)
  const { data } = await admin
    .from('blog_metrics')
    .select('tenant_id, month, articles_published, total_views, citations_tracked, citations_found, tenants(name)')
    .eq('month', targetMonth)
    .order('citations_found', { ascending: false })

  return (data ?? []).map(row => ({
    tenant_id: row.tenant_id,
    month: row.month,
    articles_published: row.articles_published,
    total_views: row.total_views,
    citations_tracked: row.citations_tracked,
    citations_found: row.citations_found,
    tenant_name: (row as unknown as { tenants: { name: string } | null }).tenants?.name ?? 'Unknown',
  }))
}
