/**
 * POST /api/send
 * Sends a quick-reply template via Resend (email) or Telnyx (SMS).
 * Runs server-side only — API keys are never exposed to the client.
 * Logs every send attempt to send_log for audit trail.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
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

  const { templateId, contactId, preview: _preview, subject: _subject, channel: _channel } = await request.json() as {
    templateId: string
    contactId: string
    preview: string
    subject?: string
    channel?: string
  }
  const channel = (_channel === 'sms' ? 'sms' : 'email') as 'email' | 'sms'
  let preview = _preview

  if (!templateId || !contactId || !preview) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Fetch template, contact, and tenant name (for the email header) — RLS
  // ensures template/contact belong to the caller's tenant
  const [{ data: template }, { data: contact }, { data: tenant }] = await Promise.all([
    supabase.from('templates').select('*').eq('id', templateId).single(),
    supabase.from('contacts').select('*').eq('id', contactId).single(),
    supabase.from('tenants').select('name').eq('id', tenantId).single(),
  ])

  if (!template || !contact) {
    return NextResponse.json({ error: 'Template or contact not found' }, { status: 404 })
  }

  const recipient = channel === 'sms' ? contact.phone : contact.email
  if (!recipient) {
    return NextResponse.json({ error: `Contact has no ${channel === 'sms' ? 'phone number' : 'email address'}` }, { status: 422 })
  }

  // The client already interpolates {{variables}} in the subject the same
  // way it does the body (see QuickSendButton.tsx) and sends the result
  // here — falls back to the raw template subject only if the caller
  // didn't provide one, so a subject with unresolved {{tags}} never goes
  // out literally.
  const subject = channel === 'email' ? (_subject ?? template.subject) : null

  // Insert queued log entry
  const { data: logEntry } = await supabase
    .from('send_log')
    .insert({
      tenant_id:   tenantId,
      contact_id:  contactId,
      template_id: templateId,
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
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from:    RESEND_FROM,
          to:      [recipient],
          subject: subject ?? '(no subject)',
          html,
          text:    preview,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message ?? 'Resend error')
      providerId = data.id
    }

    if (logId) {
      await supabase.from('send_log').update({ status: 'sent', provider_id: providerId, sent_at: new Date().toISOString() }).eq('id', logId)
    }

    const label = channel === 'sms' ? 'SMS' : 'Email'
    await supabase.from('interactions').insert({
      tenant_id:   tenantId,
      contact_id:  contactId,
      type:        'note',
      body:        `${label} sent: "${template.name ?? template.subject ?? 'message'}" — ${preview.slice(0, 100)}${preview.length > 100 ? '…' : ''}`,
      occurred_at: new Date().toISOString(),
    })

    return NextResponse.json({ ok: true, providerId })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    if (logId) {
      await supabase.from('send_log').update({ status: 'failed', error: msg }).eq('id', logId)
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
