import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isSuperAdminUser } from '@/lib/auth/superadmin'
import { callDeepSeek } from '@/lib/deepseek'
import { sendEmail } from '@/lib/email/send'
import { renderBrandedEmail } from '@/lib/email/brand'
import { slugify, extractTitle, extractExcerpt, QCYPHER_TOPIC_POOL, qcypherBlogPrompt, pickWeeklyTopic } from '@/lib/blog-content'
import { revalidatePath } from 'next/cache'

// Weekly: generates one QCypher-authored blog post and publishes it
// straight away, then emails every super admin a "just went live"
// notice. This used to stop at pending_approval for a manual review
// (a deliberate brand-safety gate) — the owner has since opted into
// fully automatic posting, so the scheduled run now publishes on its own.
//
// `?draft=1` is a manual-only escape hatch (still requires CRON_SECRET)
// to put a run back in the review queue instead of publishing it.
export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const publishNow = request.nextUrl.searchParams.get('draft') !== '1'

  const admin = createAdminClient()
  const appUrl = process.env.APP_URL ?? 'https://www.qcyphertech.com'
  const topic = pickWeeklyTopic(QCYPHER_TOPIC_POOL)

  const html = await callDeepSeek(qcypherBlogPrompt(topic))
  const title = extractTitle(html)
  const slug = `${slugify(title)}-${Date.now().toString(36)}`
  const now = new Date().toISOString()

  const { data, error } = await admin
    .from('blog_articles')
    .insert({
      tenant_id: null,
      is_qcypher_blog: true,
      title,
      slug,
      content: html,
      excerpt: extractExcerpt(html),
      status: publishNow ? 'published' : 'pending_approval',
      published_at: publishNow ? now : null,
      ai_generated: true,
    })
    .select('id')
    .single()

  if (error || !data) {
    return NextResponse.json({ ok: false, error: error?.message ?? 'Failed to save draft' }, { status: 500 })
  }

  const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const superAdminEmails = users.filter(isSuperAdminUser).map(u => u.email ?? '').filter(Boolean)

  if (superAdminEmails.length) {
    await sendEmail({
      to: superAdminEmails,
      subject: publishNow ? `QCypher blog post published: ${title}` : `New QCypher blog draft ready for review: ${title}`,
      html: renderBrandedEmail({
        bodyHtml: `
          <p style="margin:0 0 4px;font-size:20px;font-weight:800;">${publishNow ? 'A new post just went live' : "This week's blog draft is ready"}</p>
          <p style="margin:16px 0 0;"><strong>${title}</strong></p>
          <p style="margin:8px 0 0;color:#718096;">Topic: ${topic}</p>
          <p style="margin:16px 0 0;">${publishNow ? 'It\'s live on the blog now.' : 'Review and approve it from the Admin Console before it goes live — nothing publishes automatically.'}</p>
        `,
        cta: publishNow ? { label: 'View post', href: `${appUrl}/blog/${slug}` } : { label: 'Review in Admin Console', href: `${appUrl}/admin` },
      }),
    })
  }

  revalidatePath('/admin')
  if (publishNow) {
    revalidatePath('/blog')
    revalidatePath('/')
    revalidatePath('/sitemap.xml')
  }
  return NextResponse.json({ ok: true, id: data.id, title, topic, published: publishNow })
}
