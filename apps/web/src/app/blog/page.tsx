export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { cleanExcerpt, stripHtmlTitle } from '@/lib/blog-excerpt'

export const metadata: Metadata = {
  title: 'Blog — QCypher Technologies',
  description: 'Field service tips, scheduling best practices, and product updates from QCypher.',
  alternates: { types: { 'application/rss+xml': '/blog/rss.xml' } },
}

function excerptOrStrip(html: string, excerpt: string | null, title: string) {
  if (excerpt) return cleanExcerpt(excerpt, title)
  return stripHtmlTitle(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160)
}

function formatDate(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''
}

function readingTime(html: string) {
  const words = html.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 200))
}

export default async function BlogListPage() {
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const { data: articles } = await db
    .from('blog_articles')
    .select('id, title, slug, excerpt, content, published_at')
    .eq('is_qcypher_blog', true)
    .eq('status', 'published')
    .order('published_at', { ascending: false })

  const [featured, ...rest] = articles ?? []

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif', background: '#f7f8fc', color: '#171a2b', minHeight: '100vh' }}>
      <style>{`
        .blog-card { transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease; }
        .blog-card:hover { transform: translateY(-3px); box-shadow: 0 20px 44px rgba(13,36,84,0.12); border-color: rgba(13,109,255,0.25) !important; }
        .blog-row { transition: background .15s ease; }
        .blog-row:hover { background: rgba(13,109,255,0.04); }
        .blog-row:hover .blog-row-title { color: #0d6dff; }
        @media (max-width: 720px) {
          .blog-hero h1 { font-size: 40px !important; }
          .blog-featured-title { font-size: 26px !important; }
        }
      `}</style>

      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(13,36,84,0.10)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 32px', width: '100%' }}>
          <Link href="/"><img src="/qcypher-logo-horizontal.png" alt="QCypher Technologies" style={{ height: '40px', width: 'auto' }} /></Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <Link href="/" style={{ fontSize: '15px', fontWeight: 600, color: '#5b6072', textDecoration: 'none' }}>Home</Link>
            <Link href="/auth/login" style={{ fontSize: '14px', fontWeight: 700, color: '#fff', textDecoration: 'none', padding: '10px 18px', borderRadius: '10px', background: 'linear-gradient(135deg,#1a3070,#0d6dff)' }}>Sign in</Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <div className="blog-hero" style={{
        background: 'linear-gradient(155deg, #0B1640 0%, #1a3070 45%, #2B5FA8 85%, #17C9E8 130%)',
        padding: '76px 32px 88px', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(ellipse 55% 65% at 82% 20%, rgba(23,201,232,0.20) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{ maxWidth: '860px', margin: '0 auto', position: 'relative' }}>
          <span style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#ff7a1a', display: 'block', marginBottom: '16px' }}>
            QCypher Blog
          </span>
          <h1 style={{ fontSize: 'clamp(34px, 5vw, 56px)', fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.02em', color: '#fff', marginBottom: '16px', maxWidth: '14ch' }}>
            Field notes for service businesses
          </h1>
          <p style={{ fontSize: '17px', color: 'rgba(255,255,255,0.75)', lineHeight: 1.6, maxWidth: '54ch' }}>
            Scheduling, reviews, and the small operational habits that move the needle for plumbers, HVAC techs, cleaners, and every trade in between.
          </p>
        </div>
      </div>

      {/* CONTENT */}
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0 32px 96px' }}>
        {!featured ? (
          <div style={{
            marginTop: '-44px', position: 'relative', background: '#fff', borderRadius: '20px',
            border: '1px solid rgba(13,36,84,0.08)', boxShadow: '0 20px 50px rgba(13,36,84,0.10)',
            padding: '48px 32px', textAlign: 'center',
          }}>
            <p style={{ color: '#5b6072', fontSize: '16px' }}>No articles published yet — check back soon.</p>
          </div>
        ) : (
          <>
            {/* Featured — latest post */}
            <Link
              href={`/blog/${featured.slug}`}
              className="blog-card"
              style={{
                display: 'block', marginTop: '-44px', position: 'relative',
                background: '#fff', borderRadius: '20px', padding: '40px',
                border: '1px solid rgba(13,36,84,0.08)', boxShadow: '0 20px 50px rgba(13,36,84,0.10)',
                textDecoration: 'none',
              }}
            >
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 800,
                letterSpacing: '0.08em', textTransform: 'uppercase', color: '#0d6dff',
                background: 'rgba(13,109,255,0.08)', border: '1px solid rgba(13,109,255,0.18)',
                borderRadius: '999px', padding: '5px 12px', marginBottom: '18px',
              }}>
                Latest
              </span>
              <p className="blog-featured-title" style={{ fontSize: '30px', fontWeight: 800, color: '#0d2454', letterSpacing: '-0.01em', lineHeight: 1.15, marginBottom: '14px' }}>
                {featured.title}
              </p>
              <p style={{ fontSize: '16px', color: '#5b6072', lineHeight: 1.7, marginBottom: '22px', maxWidth: '68ch' }}>
                {excerptOrStrip(featured.content, featured.excerpt, featured.title)}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#8a90a3', fontWeight: 600 }}>
                <span>{formatDate(featured.published_at)}</span>
                <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: '#c7ccd6' }} />
                <span>{readingTime(featured.content)} min read</span>
                <span style={{ marginLeft: 'auto', color: '#0d6dff', fontWeight: 700 }}>Read article →</span>
              </div>
            </Link>

            {/* Rest — compact list */}
            {rest.length > 0 && (
              <div style={{ marginTop: '48px' }}>
                <p style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8a90a3', marginBottom: '4px' }}>
                  More articles
                </p>
                <div style={{ borderTop: '1px solid rgba(13,36,84,0.08)' }}>
                  {rest.map((a) => (
                    <Link
                      key={a.id}
                      href={`/blog/${a.slug}`}
                      className="blog-row"
                      style={{
                        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '24px',
                        padding: '22px 8px', borderBottom: '1px solid rgba(13,36,84,0.08)',
                        textDecoration: 'none', borderRadius: '10px',
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <p className="blog-row-title" style={{ fontSize: '17px', fontWeight: 700, color: '#171a2b', marginBottom: '4px', transition: 'color .15s ease' }}>
                          {a.title}
                        </p>
                        <p style={{ fontSize: '14px', color: '#5b6072', lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>
                          {excerptOrStrip(a.content, a.excerpt, a.title)}
                        </p>
                      </div>
                      <span style={{ flexShrink: 0, fontSize: '13px', color: '#8a90a3', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {formatDate(a.published_at)}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
