/**
 * POST /api/send
 * Sends a quick-reply template via Resend (email) or Telnyx (SMS).
 * Runs server-side only — API keys are never exposed to the client.
 * Logs every send attempt to send_log for audit trail.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit, LIMITS } from '@/lib/rate-limit'
import { getIp } from '@/lib/get-ip'
import { sendSms } from '@/lib/telnyx'
import { renderNeutralEmail } from '@/lib/email/neutral'

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? ''
const RESEND_FROM    = process.env.RESEND_FROM_EMAIL ?? 'noreply@example.com'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // Rate limit
  const rl = rateLimit(`send:${getIp(request)}`, LIMITS.send)
  if (!rl.ok) {
    return NextResponse.json({ error: 'Too many requests' }, {
      status: 429,
      headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
    })
  }

  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const tenantId = user.app_metadata?.tenant_id ?? user.user_metadata?.tenant_id
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Free-form compose (no template), BCC-self, and send-a-test-to-self are
  // admin-only capabilities — a member/read_only account can send from a
  // template but can't rewrite the outgoing subject/body wholesale or
  // redirect a copy to an arbitrary inbox. Re-check role against a fresh
  // admin lookup rather than trusting the session's app_metadata, same
  // pattern used elsewhere (see requireClinicalWriter in clinical-templates.ts).
  const admin = createAdminClient()
  const { data: { user: fresh } } = await admin.auth.admin.getUserById(user.id)
  const isOwner = (fresh?.app_metadata?.role ?? 'member') === 'owner'

  const {
    templateId, contactId, preview: _preview, subject: _subject, channel: _channel,
    bccSelf, testOnly,
  } = await request.json() as {
    templateId?: string
    contactId: string
    preview: string
    subject?: string
    channel?: string
    bccSelf?: boolean
    testOnly?: boolean
  }
  const channel = (_channel === 'sms' ? 'sms' : 'email') as 'email' | 'sms'
  let preview = _preview

  if (!contactId || !preview) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (!templateId && !isOwner) {
    return NextResponse.json({ error: 'Only an account owner can send a custom (non-template) message' }, { status: 403 })
  }
  if ((bccSelf || testOnly) && !isOwner) {
    return NextResponse.json({ error: 'Only an account owner can BCC themselves or send a test copy' }, { status: 403 })
  }

  // templateId is optional — a free-form message (custom subject + body,
  // no template picked) still goes through this same route. RLS ensures
  // template/contact belong to the caller's tenant.
  const [{ data: template }, { data: contact }, { data: tenant }] = await Promise.all([
    templateId ? supabase.from('templates').select('*').eq('id', templateId).single() : Promise.resolve({ data: null }),
    supabase.from('contacts').select('*').eq('id', contactId).single(),
    supabase.from('tenants').select('name, settings').eq('id', tenantId).single(),
  ])

  if (!contact || (templateId && !template)) {
    return NextResponse.json({ error: 'Template or contact not found' }, { status: 404 })
  }

  // Owner-configurable outgoing-mail addresses, set in Settings →
  // Notifications. bccEmail falls back to the owner's login email;
  // testEmail falls back to bccEmail, then the login email, so setting
  // just one field still gets you a working test-send target.
  const tenantSettings = (tenant?.settings as Record<string, unknown> | null) ?? {}
  const replyTo   = (tenantSettings.reply_to_email as string | undefined) || undefined
  const bccEmail  = (tenantSettings.bcc_email as string | undefined) || user.email || ''
  const testEmail = (tenantSettings.test_email as string | undefined) || bccEmail

  let recipient = channel === 'sms' ? contact.phone : contact.email
  if (channel === 'email' && testOnly) {
    if (!testEmail) return NextResponse.json({ error: 'No email address on file to send a test to — set one in Settings first' }, { status: 422 })
    recipient = testEmail
  }
  if (!recipient) {
    return NextResponse.json({ error: `Contact has no ${channel === 'sms' ? 'phone number' : 'email address'}` }, { status: 422 })
  }

  // The client already interpolates {{variables}} in the subject the same
  // way it does the body (see QuickSendButton.tsx) and sends the result
  // here — falls back to the raw template subject only if the caller
  // didn't provide one, so a subject with unresolved {{tags}} never goes
  // out literally.
  const subject = channel === 'email' ? (_subject ?? template?.subject ?? null) : null

  // Insert queued log entry
  const { data: logEntry } = await supabase
    .from('send_log')
    .insert({
      tenant_id:   tenantId,
      contact_id:  contactId,
      template_id: templateId ?? null,
      channel,
      recipient,
      subject,
      body:        preview,
      status:      'queued',
    })
    .select('id')
    .single()

  const logId = logEntry?.id

  try {
    let providerId: string | undefined

    if (channel === 'sms') {
      const result = await sendSms({ to: recipient, body: preview })
      if ('error' in result) throw new Error(result.error)
      providerId = result.id
    } else {
      if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not configured')
      const businessName = (tenant as { name?: string } | null)?.name ?? 'Your business'
      const html = renderNeutralEmail({
        senderName: businessName,
        bodyHtml: `<div style="white-space:pre-wrap;">${preview.replace(/[&<>]/g, (c: string) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!))}</div>`,
      })
      // A test send should look exactly like what the contact would get —
      // no "[TEST]" marker in the actual subject/body, so it's a true
      // preview. The send_log row below is still tagged for the audit
      // trail, since that's internal-only.
      const resendBody: Record<string, unknown> = {
        from:    RESEND_FROM,
        to:      [recipient],
        subject: subject ?? '(no subject)',
        html,
        text:    preview,
      }
      // Resend requires a verified sending domain, so the technical
      // "From" stays QCypher's — reply_to is the real lever a tenant has
      // over where their customer's reply ends up.
      if (replyTo) resendBody.reply_to = [replyTo]
      // Never double up when the send already targets the tenant's own
      // inbox (a test send) or when they're BCCing themselves on a note
      // they're already the recipient of.
      if (bccSelf && !testOnly && bccEmail && bccEmail.toLowerCase() !== recipient.toLowerCase()) {
        resendBody.bcc = [bccEmail]
      }
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(resendBody),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message ?? 'Resend error')
      providerId = data.id
    }

    // send_log has no client-facing UPDATE policy (it's an audit trail —
    // inserts and reads only), so this status transition has to go
    // through the admin client rather than the user-session `supabase`
    // client, which RLS would silently no-op (0 rows affected, no error).
    if (logId) {
      await admin.from('send_log').update({ status: 'sent', provider_id: providerId, sent_at: new Date().toISOString() }).eq('id', logId)
    }

    // A test send goes to the tenant's own inbox, not the contact's — it
    // isn't something that happened to/for the contact, so it doesn't
    // belong in their interaction history.
    if (!testOnly) {
      const label = channel === 'sms' ? 'SMS' : 'Email'
      const messageLabel = template?.name ?? template?.subject ?? subject ?? 'message'
      await supabase.from('interactions').insert({
        tenant_id:   tenantId,
        contact_id:  contactId,
        type:        'note',
        body:        `${label} sent: "${messageLabel}" — ${preview.slice(0, 100)}${preview.length > 100 ? '…' : ''}`,
        occurred_at: new Date().toISOString(),
      })
    }

    return NextResponse.json({ ok: true, providerId })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    if (logId) {
      await admin.from('send_log').update({ status: 'failed', error: msg }).eq('id', logId)
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
