import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cleanExcerpt } from '@/lib/blog-excerpt'

export const dynamic = 'force-dynamic'

function escapeXml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export async function GET() {
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const { data: articles } = await db
    .from('blog_articles')
    .select('title, slug, excerpt, published_at')
    .eq('is_qcypher_blog', true)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(50)

  const items = (articles ?? []).map(a => `
    <item>
      <title>${escapeXml(a.title)}</title>
      <link>https://www.qcyphertech.com/blog/${a.slug}</link>
      <guid>https://www.qcyphertech.com/blog/${a.slug}</guid>
      <description>${escapeXml(a.excerpt ? cleanExcerpt(a.excerpt, a.title) : '')}</description>
      <pubDate>${a.published_at ? new Date(a.published_at).toUTCString() : ''}</pubDate>
    </item>`).join('')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>QCypher Blog</title>
    <link>https://www.qcyphertech.com/blog</link>
    <description>Field service tips, scheduling best practices, and product updates from QCypher.</description>${items}
  </channel>
</rss>`

  return new NextResponse(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } })
}
