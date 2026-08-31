import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cleanExcerpt, stripHtmlTitle } from '@/lib/blog-excerpt'

// force-dynamic alone left this route serving a stale cached response in
// production (confirmed: direct Supabase queries and /blog's own listing
// always returned the freshly-published article; this route kept
// returning an older one, for a sustained period, from multiple different
// client IPs/cache-busted query strings — pointing at a platform-level
// cache Next.js wasn't actually bypassing). revalidate=0 + fetchCache +
// an explicit no-store response header close every angle rather than
// relying on force-dynamic's default behavior alone. Also switched off
// .maybeSingle() (a HEAD-adjacent Range-style request) in favor of the
// plain array-and-take-first shape /blog/page.tsx already uses
// successfully, in case that request shape specifically was what was
// getting cached.
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export async function GET() {
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const { data: articles } = await db
    .from('blog_articles')
    .select('title, slug, excerpt, content, published_at')
    .eq('is_qcypher_blog', true)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(1)

  const article = articles?.[0]
  if (!article) {
    return NextResponse.json({ article: null }, { headers: { 'Cache-Control': 'no-store, must-revalidate' } })
  }

  const excerpt = article.excerpt
    ? cleanExcerpt(article.excerpt, article.title)
    : stripHtmlTitle(article.content).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160)

  return NextResponse.json(
    {
      article: {
        title: article.title,
        slug: article.slug,
        excerpt,
        published_at: article.published_at,
      },
    },
    { headers: { 'Cache-Control': 'no-store, must-revalidate' } },
  )
}
