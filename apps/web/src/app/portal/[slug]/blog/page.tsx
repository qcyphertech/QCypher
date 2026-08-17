export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import { PoweredByFooter, BRAND_GRADIENT_BAR } from '@/components/shared/PoweredByFooter'

export const metadata: Metadata = { title: 'Blog' }

function excerptOrStrip(html: string, excerpt: string | null) {
  if (excerpt) return excerpt
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160)
}

export default async function TenantBlogListPage({ params }: { params: { slug: string } }) {
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const { data: tenant } = await db.from('tenants').select('id, name, slug').eq('slug', decodeURIComponent(params.slug)).maybeSingle()
  if (!tenant) notFound()

  const { data: articles } = await db
    .from('blog_articles')
    .select('id, title, slug, excerpt, content, published_at')
    .eq('tenant_id', tenant.id)
    .eq('status', 'published')
    .order('published_at', { ascending: false })

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fc' }}>
      <div style={BRAND_GRADIENT_BAR} />
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '48px 24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#171a2b', marginBottom: '4px' }}>{tenant.name} — Blog</h1>
        <p style={{ color: '#5b6072', fontSize: '15px', marginBottom: '32px' }}>Tips, updates, and guides from {tenant.name}.</p>

        {(!articles || articles.length === 0) ? (
          <p style={{ color: '#5b6072' }}>No articles published yet — check back soon.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {articles.map(a => (
              <Link
                key={a.id}
                href={`/portal/${params.slug}/blog/${a.slug}`}
                style={{
                  display: 'block', background: '#ffffff', borderRadius: '16px', padding: '24px',
                  border: '1px solid rgba(26,48,112,0.08)', boxShadow: '0 4px 24px rgba(26,48,112,0.06)',
                  textDecoration: 'none',
                }}
              >
                <p style={{ fontSize: '19px', fontWeight: 700, color: '#171a2b', marginBottom: '6px' }}>{a.title}</p>
                <p style={{ fontSize: '14px', color: '#5b6072', lineHeight: 1.6 }}>{excerptOrStrip(a.content, a.excerpt)}</p>
                <p style={{ fontSize: '12px', color: '#8a90a3', marginTop: '10px' }}>
                  {a.published_at ? new Date(a.published_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
      <PoweredByFooter />
    </div>
  )
}
