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

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif', background: '#f8f9fc', color: '#171a2b', minHeight: '100vh' }}>
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(26,48,112,0.10)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', maxWidth: '1060px', margin: '0 auto' }}>
          <Link href="/"><img src="/qcypher-logo-horizontal.png" alt="QCypher Technologies" style={{ height: '44px', width: 'auto' }} /></Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <Link href="/" style={{ fontSize: '15px', fontWeight: 600, color: '#5b6072', textDecoration: 'none' }}>Home</Link>
            <Link href="/pricing" style={{ fontSize: '15px', fontWeight: 600, color: '#5b6072', textDecoration: 'none' }}>Pricing</Link>
            <Link href="/auth/login" style={{ fontSize: '14px', fontWeight: 600, color: '#2a52a0', textDecoration: 'none', padding: '8px 16px', border: '1px solid rgba(26,48,112,0.18)', borderRadius: '10px' }}>Sign in</Link>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: '780px', margin: '0 auto', padding: '56px 24px' }}>
        <h1 style={{ fontSize: '34px', fontWeight: 800, marginBottom: '6px' }}>QCypher Blog</h1>
        <p style={{ color: '#5b6072', fontSize: '16px', marginBottom: '40px' }}>Field service tips, scheduling best practices, and product updates.</p>

        {(!articles || articles.length === 0) ? (
          <p style={{ color: '#5b6072' }}>No articles published yet — check back soon.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {articles.map(a => (
              <Link
                key={a.id}
                href={`/blog/${a.slug}`}
                style={{
                  display: 'block', background: '#ffffff', borderRadius: '16px', padding: '28px',
                  border: '1px solid rgba(26,48,112,0.08)', boxShadow: '0 4px 24px rgba(26,48,112,0.06)',
                  textDecoration: 'none',
                }}
              >
                <p style={{ fontSize: '21px', fontWeight: 700, color: '#171a2b', marginBottom: '8px' }}>{a.title}</p>
                <p style={{ fontSize: '15px', color: '#5b6072', lineHeight: 1.65 }}>{excerptOrStrip(a.content, a.excerpt, a.title)}</p>
                <p style={{ fontSize: '13px', color: '#8a90a3', marginTop: '12px' }}>
                  {a.published_at ? new Date(a.published_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
