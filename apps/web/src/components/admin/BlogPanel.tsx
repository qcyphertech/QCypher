'use client'

import { useEffect, useState, useTransition } from 'react'
import { FileText, Sparkles, CheckCircle2, Trash2, Eye, RefreshCw, BarChart3 } from 'lucide-react'
import {
  listBlogArticles, generateTenantBlogDraft, generateQcypherBlogDrafts,
  approveAndPublishArticle, unpublishArticle, discardArticle,
  recordCitation, listCitations, recalculateBlogMetrics, listBlogMetrics,
  listCatalogItemsForTenant,
  type BlogArticle, type BlogCitation, type BlogMetric,
} from '@/lib/actions/blog'
import { SectionHeader, EmptyState, PanelSkeleton } from '@/components/admin/AdminPanelUI'
import type { TenantSummary } from '@/lib/actions/admin-console'
import { cleanExcerpt } from '@/lib/blog-excerpt'

const STATUS_STYLE: Record<BlogArticle['status'], string> = {
  draft: 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]',
  pending_approval: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  published: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
}

function fmt(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function confidenceCls(score: number) {
  if (score >= 70) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  if (score >= 40) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
  return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
}

type SubTab = 'qcypher' | 'tenants' | 'citations' | 'analytics'

export function BlogPanel({ tenants }: { tenants: TenantSummary[] }) {
  const [subTab, setSubTab] = useState<SubTab>('qcypher')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Blog</h2>
      </div>
      <div className="flex gap-1 p-1 rounded-2xl bg-[hsl(var(--muted))]/60 w-fit">
        {([
          { id: 'qcypher', label: 'QCypher Drafts' },
          { id: 'tenants', label: 'Tenant Blogs' },
          { id: 'citations', label: 'Citation Tracking' },
          { id: 'analytics', label: 'Analytics' },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            className={`text-[13px] font-medium px-3 py-1.5 rounded-xl transition-all ${
              subTab === t.id ? 'bg-[hsl(var(--card))] shadow-sm' : 'text-[hsl(var(--muted-foreground))]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {subTab === 'qcypher' && <QcypherDrafts />}
      {subTab === 'tenants' && <TenantBlogs tenants={tenants} />}
      {subTab === 'citations' && <CitationTracking tenants={tenants} />}
      {subTab === 'analytics' && <Analytics tenants={tenants} />}
    </div>
  )
}

function ArticleRow({ article, onChange }: { article: BlogArticle; onChange: () => void }) {
  const [pending, startTransition] = useTransition()

  function publish() {
    startTransition(async () => { await approveAndPublishArticle(article.id); onChange() })
  }
  function unpublish() {
    startTransition(async () => { await unpublishArticle(article.id); onChange() })
  }
  function discard() {
    if (!confirm(`Discard "${article.title}"? This can't be undone.`)) return
    startTransition(async () => { await discardArticle(article.id); onChange() })
  }

  return (
    <div className="px-4 py-3 border-b border-[hsl(var(--border))] last:border-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${STATUS_STYLE[article.status]}`}>
              {article.status.replace('_', ' ')}
            </span>
            <span className="text-[12px] text-[hsl(var(--muted-foreground))]">{fmt(article.published_at ?? article.created_at)}</span>
            {article.ai_confidence !== null && (
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${confidenceCls(article.ai_confidence)}`}>
                {article.ai_confidence}% AI-detected
              </span>
            )}
          </div>
          <p className="text-[15px] font-semibold">{article.title}</p>
          <p className="text-[13px] text-[hsl(var(--muted-foreground))] mt-0.5">{cleanExcerpt(article.excerpt ?? '', article.title)}</p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {article.status !== 'published' && (
            <button disabled={pending} onClick={publish} className="flex items-center gap-1 text-[13px] font-semibold px-2.5 py-1.5 rounded-lg bg-accent text-white hover:bg-accent-hover disabled:opacity-50">
              <CheckCircle2 className="w-3.5 h-3.5" /> Publish
            </button>
          )}
          {article.status === 'published' && (
            <button disabled={pending} onClick={unpublish} className="text-[13px] font-medium px-2.5 py-1.5 rounded-lg text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]">
              Unpublish
            </button>
          )}
          <button disabled={pending} onClick={discard} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

function QcypherDrafts() {
  const [articles, setArticles] = useState<BlogArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, startTransition] = useTransition()

  function load() {
    setLoading(true)
    listBlogArticles({ isQcypherBlog: true }).then(a => { setArticles(a); setLoading(false) })
  }
  useEffect(load, [])

  function generate() {
    startTransition(async () => { await generateQcypherBlogDrafts(); load() })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <SectionHeader icon={FileText} label="QCypher blog articles" count={articles.length} accent />
        <button
          disabled={generating}
          onClick={generate}
          className="flex items-center gap-1.5 text-[13px] font-semibold px-3 py-1.5 rounded-lg bg-accent text-white hover:bg-accent-hover disabled:opacity-50"
        >
          <Sparkles className="w-3.5 h-3.5" /> {generating ? 'Generating…' : 'Generate drafts'}
        </button>
      </div>
      {loading ? <PanelSkeleton /> : articles.length === 0 ? (
        <EmptyState icon={FileText} message="No QCypher blog drafts yet." />
      ) : (
        <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] shadow-soft overflow-hidden">
          {articles.map(a => <ArticleRow key={a.id} article={a} onChange={load} />)}
        </div>
      )}
    </div>
  )
}

function TenantBlogs({ tenants }: { tenants: TenantSummary[] }) {
  const [tenantId, setTenantId] = useState('')
  const [catalogItems, setCatalogItems] = useState<{ id: string; name: string }[]>([])
  const [catalogItemId, setCatalogItemId] = useState('')
  const [articles, setArticles] = useState<BlogArticle[]>([])
  const [loading, setLoading] = useState(false)
  const [generating, startTransition] = useTransition()

  useEffect(() => {
    if (!tenantId) { setArticles([]); setCatalogItems([]); return }
    setLoading(true)
    listBlogArticles({ tenantId }).then(a => { setArticles(a); setLoading(false) })
    listCatalogItemsForTenant(tenantId).then(setCatalogItems)
  }, [tenantId])

  function generate() {
    if (!tenantId || !catalogItemId) return
    startTransition(async () => {
      await generateTenantBlogDraft(tenantId, catalogItemId)
      listBlogArticles({ tenantId }).then(setArticles)
    })
  }

  const selectCls = 'rounded-xl border border-[hsl(var(--border))] px-3 py-2 text-[14px] bg-transparent outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]'

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select value={tenantId} onChange={e => { setTenantId(e.target.value); setCatalogItemId('') }} className={selectCls}>
          <option value="">Select a tenant…</option>
          {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select value={catalogItemId} onChange={e => setCatalogItemId(e.target.value)} disabled={!tenantId} className={selectCls}>
          <option value="">Select a service…</option>
          {catalogItems.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button
          disabled={!tenantId || !catalogItemId || generating}
          onClick={generate}
          className="flex items-center gap-1.5 text-[13px] font-semibold px-3 py-1.5 rounded-lg bg-accent text-white hover:bg-accent-hover disabled:opacity-50"
        >
          <Sparkles className="w-3.5 h-3.5" /> {generating ? 'Generating…' : 'Generate draft'}
        </button>
      </div>

      {!tenantId ? (
        <EmptyState icon={FileText} message="Select a tenant to see or generate their blog articles." />
      ) : loading ? <PanelSkeleton /> : articles.length === 0 ? (
        <EmptyState icon={FileText} message="No blog articles for this tenant yet." />
      ) : (
        <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] shadow-soft overflow-hidden">
          {articles.map(a => <ArticleRow key={a.id} article={a} onChange={() => listBlogArticles({ tenantId }).then(setArticles)} />)}
        </div>
      )}
    </div>
  )
}

function CitationTracking({ tenants }: { tenants: TenantSummary[] }) {
  const [tenantId, setTenantId] = useState('')
  const [keyword, setKeyword] = useState('')
  const [chatgpt, setChatgpt] = useState(false)
  const [claude, setClaude] = useState(false)
  const [perplexity, setPerplexity] = useState(false)
  const [position, setPosition] = useState('')
  const [notes, setNotes] = useState('')
  const [citations, setCitations] = useState<BlogCitation[]>([])
  const [saving, startTransition] = useTransition()

  function loadCitations() { listCitations().then(setCitations) }
  useEffect(loadCitations, [])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || !keyword.trim()) return
    startTransition(async () => {
      await recordCitation({
        tenantId, articleId: null, testKeyword: keyword.trim(),
        citedInChatgpt: chatgpt, citedInClaude: claude, citedInPerplexity: perplexity,
        positionInResponse: position ? Number(position) : null,
        notes: notes.trim() || undefined,
      })
      setKeyword(''); setChatgpt(false); setClaude(false); setPerplexity(false); setPosition(''); setNotes('')
      loadCitations()
    })
  }

  const inputCls = 'rounded-xl border border-[hsl(var(--border))] px-3 py-2 text-[14px] bg-transparent outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]'
  const tenantName = (id: string) => tenants.find(t => t.id === id)?.name ?? id

  return (
    <div className="space-y-5">
      <form onSubmit={submit} className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] shadow-soft p-4 space-y-3">
        <p className="text-[13px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">Log a citation check</p>
        <div className="flex flex-wrap gap-2">
          <select value={tenantId} onChange={e => setTenantId(e.target.value)} required className={inputCls}>
            <option value="">Tenant…</option>
            {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder='Keyword tested, e.g. "best plumber Austin"' required className={`${inputCls} flex-1 min-w-[200px]`} />
          <input value={position} onChange={e => setPosition(e.target.value)} type="number" min={1} max={10} placeholder="Position" className={`${inputCls} w-24`} />
        </div>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-1.5 text-[14px]"><input type="checkbox" checked={chatgpt} onChange={e => setChatgpt(e.target.checked)} /> ChatGPT</label>
          <label className="flex items-center gap-1.5 text-[14px]"><input type="checkbox" checked={claude} onChange={e => setClaude(e.target.checked)} /> Claude</label>
          <label className="flex items-center gap-1.5 text-[14px]"><input type="checkbox" checked={perplexity} onChange={e => setPerplexity(e.target.checked)} /> Perplexity</label>
        </div>
        <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)" className={`${inputCls} w-full`} />
        <button disabled={saving} type="submit" className="text-[13px] font-semibold px-4 py-2 rounded-lg bg-accent text-white hover:bg-accent-hover disabled:opacity-50">
          {saving ? 'Saving…' : 'Log citation'}
        </button>
      </form>

      <div>
        <SectionHeader icon={Eye} label="Recent citation checks" count={citations.length} />
        {citations.length === 0 ? (
          <EmptyState icon={Eye} message="No citations logged yet this month." />
        ) : (
          <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] shadow-soft overflow-hidden">
            {citations.map(c => (
              <div key={c.id} className="px-4 py-3 border-b border-[hsl(var(--border))] last:border-0 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold truncate">{tenantName(c.tenant_id)} — &ldquo;{c.test_keyword}&rdquo;</p>
                  <p className="text-[13px] text-[hsl(var(--muted-foreground))] mt-0.5">
                    {[c.cited_in_chatgpt && 'ChatGPT', c.cited_in_claude && 'Claude', c.cited_in_perplexity && 'Perplexity'].filter(Boolean).join(', ') || 'Not cited'}
                    {c.position_in_response ? ` · position ${c.position_in_response}` : ''} · {fmt(c.tracked_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Analytics({ tenants }: { tenants: TenantSummary[] }) {
  const [metrics, setMetrics] = useState<(BlogMetric & { tenant_name: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [recalculating, startTransition] = useTransition()

  function load() {
    setLoading(true)
    listBlogMetrics().then(m => { setMetrics(m); setLoading(false) })
  }
  useEffect(load, [])

  function recalc() {
    startTransition(async () => { await recalculateBlogMetrics(); load() })
  }

  const totals = metrics.reduce((acc, m) => ({
    articles: acc.articles + m.articles_published,
    citationsFound: acc.citationsFound + m.citations_found,
    citationsTracked: acc.citationsTracked + m.citations_tracked,
  }), { articles: 0, citationsFound: 0, citationsTracked: 0 })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SectionHeader icon={BarChart3} label="This month" accent />
        <button disabled={recalculating} onClick={recalc} className="flex items-center gap-1.5 text-[13px] font-medium px-3 py-1.5 rounded-lg text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] disabled:opacity-50">
          <RefreshCw className={`w-3.5 h-3.5 ${recalculating ? 'animate-spin' : ''}`} /> Recalculate
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] p-4">
          <p className="text-[12px] text-[hsl(var(--muted-foreground))] uppercase tracking-wide">Blogs published</p>
          <p className="text-2xl font-bold mt-1">{totals.articles}</p>
        </div>
        <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] p-4">
          <p className="text-[12px] text-[hsl(var(--muted-foreground))] uppercase tracking-wide">Citations found</p>
          <p className="text-2xl font-bold mt-1">{totals.citationsFound}</p>
        </div>
        <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] p-4">
          <p className="text-[12px] text-[hsl(var(--muted-foreground))] uppercase tracking-wide">Keywords tracked</p>
          <p className="text-2xl font-bold mt-1">{totals.citationsTracked}</p>
        </div>
      </div>

      {loading ? <PanelSkeleton /> : metrics.length === 0 ? (
        <EmptyState icon={BarChart3} message='No metrics yet this month — click "Recalculate" after publishing or logging citations.' />
      ) : (
        <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] shadow-soft overflow-hidden">
          <div className="grid grid-cols-4 gap-2 px-4 py-2 text-[12px] font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))] border-b border-[hsl(var(--border))]">
            <span>Tenant</span><span>Published</span><span>Citations found</span><span>Tracked</span>
          </div>
          {metrics.map(m => (
            <div key={m.tenant_id} className="grid grid-cols-4 gap-2 px-4 py-2.5 text-[14px] border-b border-[hsl(var(--border))] last:border-0">
              <span className="font-medium truncate">{m.tenant_name}</span>
              <span>{m.articles_published}</span>
              <span>{m.citations_found}</span>
              <span>{m.citations_tracked}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
