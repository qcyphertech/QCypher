import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cleanExcerpt, stripHtmlTitle } from '@/lib/blog-excerpt'

export const dynamic = 'force-dynamic'

export async function GET() {
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const { data: article } = await db
    .from('blog_articles')
    .select('title, slug, excerpt, content, published_at')
    .eq('is_qcypher_blog', true)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!article) return NextResponse.json({ article: null })

  const excerpt = article.excerpt
    ? cleanExcerpt(article.excerpt, article.title)
    : stripHtmlTitle(article.content).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160)

  return NextResponse.json({
    article: {
      title: article.title,
      slug: article.slug,
      excerpt,
      published_at: article.published_at,
    },
  })
}
