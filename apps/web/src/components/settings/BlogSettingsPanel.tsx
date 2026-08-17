'use client'

import { useEffect, useState, useTransition } from 'react'
import { Sparkles, CheckCircle2, Trash2, ExternalLink } from 'lucide-react'
import {
  listMyBlogArticles, listMyCatalogItems, generateMyBlogDraft,
  publishMyBlogArticle, unpublishMyBlogArticle, discardMyBlogArticle,
  type BlogArticle,
} from '@/lib/actions/blog'
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

export function BlogSettingsPanel({ tenantSlug }: { tenantSlug: string }) {
  const [articles, setArticles] = useState<BlogArticle[]>([])
  const [catalogItems, setCatalogItems] = useState<{ id: string; name: string }[]>([])
  const [catalogItemId, setCatalogItemId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [generating, startTransition] = useTransition()
  const [busyId, setBusyId] = useState<string | null>(null)

  function load() {
    setLoading(true)
    Promise.all([listMyBlogArticles(), listMyCatalogItems()]).then(([a, c]) => {
      setArticles(a); setCatalogItems(c); setLoading(false)
    })
  }
  useEffect(load, [])

  function generate() {
    if (!catalogItemId) return
    setError(null)
    startTransition(async () => {
      try {
        await generateMyBlogDraft(catalogItemId)
        load()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to generate')
      }
    })
  }

  function publish(id: string) {
    setBusyId(id)
    publishMyBlogArticle(id).then(load).finally(() => setBusyId(null))
  }
  function unpublish(id: string) {
    setBusyId(id)
    unpublishMyBlogArticle(id).then(load).finally(() => setBusyId(null))
  }
  function discard(id: string, title: string) {
    if (!confirm(`Discard "${title}"? This can't be undone.`)) return
    setBusyId(id)
    discardMyBlogArticle(id).then(load).finally(() => setBusyId(null))
  }

  const selectCls = 'rounded-xl border border-[hsl(var(--border))] px-3 py-2 text-[15px] bg-transparent outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]'

  if (loading) return <p className="text-[14px] text-[hsl(var(--muted-foreground))]">Loading…</p>

  return (
    <div className="space-y-4">
      {catalogItems.length === 0 ? (
        <p className="text-[14px] text-[hsl(var(--muted-foreground))]">
          Add a service to your catalog first — blog posts are generated from your service descriptions.
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <select value={catalogItemId} onChange={e => setCatalogItemId(e.target.value)} className={selectCls}>
            <option value="">Select a service…</option>
            {catalogItems.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button
            disabled={!catalogItemId || generating}
            onClick={generate}
            className="flex items-center gap-1.5 text-[14px] font-semibold px-4 py-2 rounded-xl bg-accent text-white hover:bg-accent-hover disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" /> {generating ? 'Generating…' : 'Generate blog post'}
          </button>
        </div>
      )}
      {error && <p className="text-[14px] text-red-500">{error}</p>}

      {articles.length === 0 ? (
        <p className="text-[14px] text-[hsl(var(--muted-foreground))]">No blog posts yet.</p>
      ) : (
        <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] shadow-soft overflow-hidden">
          {articles.map(a => (
            <div key={a.id} className="px-4 py-3 border-b border-[hsl(var(--border))] last:border-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${STATUS_STYLE[a.status]}`}>
                      {a.status}
                    </span>
                    <span className="text-[12px] text-[hsl(var(--muted-foreground))]">{fmt(a.published_at ?? a.created_at)}</span>
                    {a.status === 'published' && (
                      <a href={`/portal/${tenantSlug}/blog/${a.slug}`} target="_blank" rel="noopener noreferrer" className="text-[12px] text-accent flex items-center gap-0.5">
                        <ExternalLink className="w-3 h-3" /> View
                      </a>
                    )}
                  </div>
                  <p className="text-[15px] font-semibold">{a.title}</p>
                  <p className="text-[13px] text-[hsl(var(--muted-foreground))] mt-0.5">{cleanExcerpt(a.excerpt ?? '', a.title)}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {a.status !== 'published' ? (
                    <button disabled={busyId === a.id} onClick={() => publish(a.id)} className="flex items-center gap-1 text-[13px] font-semibold px-2.5 py-1.5 rounded-lg bg-accent text-white hover:bg-accent-hover disabled:opacity-50">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Publish
                    </button>
                  ) : (
                    <button disabled={busyId === a.id} onClick={() => unpublish(a.id)} className="text-[13px] font-medium px-2.5 py-1.5 rounded-lg text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]">
                      Unpublish
                    </button>
                  )}
                  <button disabled={busyId === a.id} onClick={() => discard(a.id, a.title)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
