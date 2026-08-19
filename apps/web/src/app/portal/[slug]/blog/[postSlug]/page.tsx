export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import { Zap } from 'lucide-react'
import { PoweredByFooter, BRAND_GRADIENT_BAR } from '@/components/shared/PoweredByFooter'

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

export async function generateMetadata({ params }: { params: { slug: string; postSlug: string } }): Promise<Metadata> {
  const client = db()
  const { data: tenant } = await client.from('tenants').select('id').eq('slug', decodeURIComponent(params.slug)).maybeSingle()
  if (!tenant) return { title: 'Blog' }
  const { data: article } = await client
    .from('blog_articles')
    .select('title, excerpt')
    .eq('tenant_id', tenant.id)
    .eq('slug', params.postSlug)
    .eq('status', 'published')
    .maybeSingle()
  return {
    title: article?.title ?? 'Blog',
    description: article?.excerpt ?? undefined,
    other: { 'ai-assisted': 'true' },
  }
}

export default async function TenantBlogPostPage({ params }: { params: { slug: string; postSlug: string } }) {
  const client = db()
  const { data: tenant } = await client.from('tenants').select('id, name, slug').eq('slug', decodeURIComponent(params.slug)).maybeSingle()
  if (!tenant) notFound()

  const { data: article } = await client
    .from('blog_articles')
    .select('id, title, content, published_at, views_count, disclose_ai_assistance')
    .eq('tenant_id', tenant.id)
    .eq('slug', params.postSlug)
    .eq('status', 'published')
    .maybeSingle()

  if (!article) notFound()

  // Best-effort view count — not gated on success, a lost increment isn't
  // worth failing the page render over.
  await client.from('blog_articles').update({ views_count: (article.views_count ?? 0) + 1 }).eq('id', article.id)

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fc' }}>
      <div style={BRAND_GRADIENT_BAR} />
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '48px 24px' }}>
        <Link href={`/portal/${params.slug}/blog`} style={{ fontSize: '13px', color: '#2a52a0', textDecoration: 'none', fontWeight: 600 }}>
          ← Back to {tenant.name} blog
        </Link>
        <article style={{ position: 'relative', background: '#ffffff', borderRadius: '16px', padding: '40px', marginTop: '20px', border: '1px solid rgba(26,48,112,0.08)', boxShadow: '0 4px 24px rgba(26,48,112,0.06)' }}>
          {article.disclose_ai_assistance && (
            <span style={{
              position: 'absolute', top: '16px', right: '16px',
              display: 'flex', alignItems: 'center', gap: '4px',
              fontSize: '11px', fontWeight: 700, color: '#0c4a6e', background: '#f0f9ff',
              border: '1px solid rgba(14,165,233,0.3)', borderRadius: '999px', padding: '4px 10px',
            }}>
              <Zap size={11} fill="currentColor" strokeWidth={1} /> AI-Assisted
            </span>
          )}
          <p style={{ fontSize: '13px', color: '#8a90a3', margin: '0 0 16px' }}>
            {article.published_at ? new Date(article.published_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''}
          </p>
          {/* AI-generated HTML, reviewed by a super admin before publish (see docs/) */}
          <div
            style={{ color: '#171a2b', fontSize: '16px', lineHeight: 1.75 }}
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
        </article>
      </div>
      <PoweredByFooter />
    </div>
  )
}
