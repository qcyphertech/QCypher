import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'
import { renderNeutralEmail } from '@/lib/email/neutral'

// Self-serve: customer enters their email, gets a magic link if their email
// matches a contact record for this tenant.
export async function POST(req: NextRequest) {
  const { email, tenantSlug } = await req.json()
  if (!email || !tenantSlug) {
    return NextResponse.json({ ok: false, error: 'Missing fields' }, { status: 400 })
  }

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  // Resolve tenant
  const { data: tenant } = await db
    .from('tenants')
    .select('id, name, slug')
    .eq('slug', tenantSlug)
    .maybeSingle()

  if (!tenant) {
    // Don't reveal whether the tenant exists
    return NextResponse.json({ ok: true })
  }

  // Resolve contact by email within this tenant
  const { data: contact } = await db
    .from('contacts')
    .select('id, first_name, email')
    .eq('tenant_id', tenant.id)
    .ilike('email', email.trim())
    .maybeSingle()

  // Always return ok:true to avoid email enumeration
  if (!contact) return NextResponse.json({ ok: true })

  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  await db.from('portal_magic_links').insert({
    tenant_id: tenant.id,
    contact_id: contact.id,
    token,
    expires_at: expiresAt,
  })

  const appUrl = process.env.APP_URL ?? 'https://www.qcyphertech.com'
  const link = `${appUrl}/portal/${tenantSlug}/auth?token=${token}`

  const html = renderNeutralEmail({
    senderName: tenant.name,
    bodyHtml: `
      <p style="margin:0 0 20px;font-size:20px;font-weight:800;color:#1a202c;">Your client portal sign-in link</p>
      <p style="margin:0 0 16px;">Hi ${contact.first_name ?? 'there'},</p>
      <p style="margin:0;">Click below to sign in. This link expires in 24 hours and can only be used once.</p>
    `,
    cta: { label: 'Sign in to portal', href: link },
  })

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${tenant.name} <${process.env.RESEND_FROM_EMAIL ?? 'hello@qcyphertech.com'}>`,
      to: [contact.email!],
      subject: `${tenant.name} — your portal sign-in link`,
      html,
      text: [
        `Hi ${contact.first_name ?? 'there'},`,
        '',
        `Here is your sign-in link for ${tenant.name}'s client portal:`,
        link,
        '',
        `This link expires in 24 hours and can only be used once.`,
        `If you did not request this, you can safely ignore it.`,
        '',
        `— ${tenant.name}`,
      ].join('\n'),
    }),
  })

  return NextResponse.json({ ok: true })
}
