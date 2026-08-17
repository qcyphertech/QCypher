export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const { data: article } = await db()
    .from('blog_articles')
    .select('title, excerpt')
    .eq('is_qcypher_blog', true)
    .eq('slug', params.slug)
    .eq('status', 'published')
    .maybeSingle()
  if (!article) return { title: 'Blog — QCypher Technologies' }
  return { title: `${article.title} — QCypher Technologies`, description: article.excerpt ?? undefined }
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const client = db()
  const { data: article } = await client
    .from('blog_articles')
    .select('id, title, content, excerpt, published_at, updated_at, views_count')
    .eq('is_qcypher_blog', true)
    .eq('slug', params.slug)
    .eq('status', 'published')
    .maybeSingle()

  if (!article) notFound()

  await client.from('blog_articles').update({ views_count: (article.views_count ?? 0) + 1 }).eq('id', article.id)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: article.title,
    description: article.excerpt ?? undefined,
    datePublished: article.published_at ?? undefined,
    dateModified: article.updated_at ?? undefined,
    author: { '@type': 'Organization', name: 'QCypher Technologies' },
    publisher: { '@type': 'Organization', name: 'QCypher Technologies', url: 'https://www.qcyphertech.com' },
    mainEntityOfPage: `https://www.qcyphertech.com/blog/${params.slug}`,
  }

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif', background: '#f8f9fc', color: '#171a2b', minHeight: '100vh' }}>
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(26,48,112,0.10)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', maxWidth: '1060px', margin: '0 auto' }}>
          <Link href="/"><img src="/qcypher-logo-horizontal.png" alt="QCypher Technologies" style={{ height: '44px', width: 'auto' }} /></Link>
          <Link href="/blog" style={{ fontSize: '15px', fontWeight: 600, color: '#5b6072', textDecoration: 'none' }}>← All articles</Link>
        </div>
      </header>

      <div style={{ maxWidth: '740px', margin: '0 auto', padding: '48px 24px' }}>
        <article style={{ background: '#ffffff', borderRadius: '16px', padding: '44px', border: '1px solid rgba(26,48,112,0.08)', boxShadow: '0 4px 24px rgba(26,48,112,0.06)' }}>
          <p style={{ fontSize: '13px', color: '#8a90a3', marginBottom: '20px' }}>
            {article.published_at ? new Date(article.published_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''}
          </p>
          {/* AI-generated, reviewed and approved by a QCypher super admin before publish */}
          <div
            style={{ color: '#171a2b', fontSize: '17px', lineHeight: 1.8 }}
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
        </article>
      </div>
    </div>
  )
}
