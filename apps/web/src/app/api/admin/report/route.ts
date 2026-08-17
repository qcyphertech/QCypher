/**
 * POST /api/admin/report
 * Assembles real numbers for a tenant, calls DeepSeek to write 2-3 warm
 * sentences around those numbers (no invention allowed), then sends via
 * Resend.
 *
 * Switched from Gemini to DeepSeek 2026-08-17: gemini-2.0-flash (the
 * model this route called) was shut down by Google on 2026-06-01, so
 * this integration had been silently broken for ~2.5 months — every
 * call fell through to the plain-data fallback below with no error
 * surfaced anywhere. DeepSeek V4 Flash is also meaningfully cheaper
 * than Gemini's current-generation replacement models.
 *
 * Body: { tenantId: string, recipientEmail: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { assembleReportData } from '@/lib/actions/admin'
import { renderBrandedEmail } from '@/lib/email/brand'
import { isSuperAdminUser } from '@/lib/auth/superadmin'
import { callDeepSeek, deepseekConfigured } from '@/lib/deepseek'

const RESEND_API_KEY  = process.env.RESEND_API_KEY ?? ''
const RESEND_FROM     = process.env.RESEND_FROM_EMAIL ?? 'hello@qcyphertech.com'

function adminSupabase() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

// Admin gate — DB-backed super admin flag, OR the legacy Tenant #0
// (is_admin=true) gating, kept for backward compat.
async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = adminSupabase()
  const { data: { user: fresh } } = await admin.auth.admin.getUserById(user.id)
  if (isSuperAdminUser(fresh)) return user

  const { data: t } = await supabase.from('tenants').select('is_admin').single()
  if (!(t as { is_admin?: boolean } | null)?.is_admin) return null
  return user
}

export async function POST(request: NextRequest) {
  const user = await assertAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { tenantId, recipientEmail } = await request.json() as {
    tenantId: string
    recipientEmail: string
  }
  if (!tenantId || !recipientEmail) {
    return NextResponse.json({ error: 'Missing tenantId or recipientEmail' }, { status: 400 })
  }

  // ── Step 1: Assemble real numbers — pure code, no AI ──────────────────────
  const data = await assembleReportData(tenantId)

  // ── Step 2: AI writes sentences around the pre-computed numbers ───────────
  // The prompt explicitly forbids inventing or estimating any figure.
  // The AI receives only already-computed facts and produces plain language.
  const prompt = `You are writing a short monthly summary for a small business owner.
Use ONLY the exact numbers provided below — do not invent, estimate, or add any figures.
Write 2-3 warm, plain sentences (no bullet points, no headers, no emojis).
Do not mention QCypher by name more than once. Do not make promises about the future.

Facts for ${data.month}:
- Business name: ${data.tenantName}
- Review request texts sent to customers: ${data.reviewsSent}
- Missed calls that received an automatic text-back: ${data.missedCallTexts}
- Online scheduling: ${data.calConnected ? `active (cal.com/${data.calUsername ?? 'connected'})` : 'not connected'}

Write the summary now. Use only these exact numbers.`

  let aiSummary = ''

  if (deepseekConfigured()) {
    try {
      aiSummary = await callDeepSeek(prompt, { maxTokens: 200, temperature: 0.3 })
    } catch {
      aiSummary = ''
    }
  }

  // Fallback if DeepSeek key missing or call failed — pure data summary, no AI
  if (!aiSummary) {
    aiSummary = `This ${data.month}, QCypher sent ${data.reviewsSent} review request${data.reviewsSent !== 1 ? 's' : ''} on your behalf and automatically followed up on ${data.missedCallTexts} missed call${data.missedCallTexts !== 1 ? 's' : ''}. Your online scheduler is ${data.calConnected ? 'active and accepting bookings' : 'not yet connected'}.`
  }

  // ── Step 3: Build email — data table + AI summary ─────────────────────────
  const statRow = (label: string, value: string) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid rgba(26,48,112,0.08);color:#5b6072;font-size:14px;">${label}</td>
      <td style="padding:10px 0;border-bottom:1px solid rgba(26,48,112,0.08);color:#171a2b;font-size:14px;font-weight:700;text-align:right;">${value}</td>
    </tr>
  `

  const emailHtml = renderBrandedEmail({
    bodyHtml: `
      <p style="margin:0 0 4px;font-size:20px;font-weight:800;color:#171a2b;">Your ${data.month} summary</p>
      <p style="margin:0 0 20px;color:#5b6072;">Hi ${data.tenantName} team,</p>
      <p style="margin:0 0 20px;">${aiSummary}</p>
      <table style="width:100%;border-collapse:collapse;background:#f8f9fc;border-radius:12px;padding:4px 20px;margin:0 0 20px;border:1px solid rgba(26,48,112,0.08);">
        <tr><td colspan="2" style="padding:14px 0 6px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#5b6072;">Your ${data.month} numbers</td></tr>
        ${statRow('Review request texts sent', String(data.reviewsSent))}
        ${statRow('Missed-call auto text-backs', String(data.missedCallTexts))}
        ${statRow('Online scheduler', data.calConnected ? 'Active' : 'Not connected')}
        ${statRow('Security &amp; backups', 'Managed by Supabase (daily)')}
      </table>
      <p style="margin:0;">Questions? Reply to this email or call us at <strong>(804) 250-5066</strong>.</p>
      <p style="margin:16px 0 0;color:#5b6072;">— The QCypher Team<br>hello@qcyphertech.com</p>
    `,
  })

  const emailBody = `Hi ${data.tenantName} team,

Here's your QCypher activity summary for ${data.month}.

${aiSummary}

─────────────────────────
YOUR ${data.month.toUpperCase()} NUMBERS
─────────────────────────
Review request texts sent:   ${data.reviewsSent}
Missed-call auto text-backs: ${data.missedCallTexts}
Online scheduler:            ${data.calConnected ? 'Active' : 'Not connected'}
Security & backups:          Managed by Supabase (daily)
─────────────────────────

Questions? Reply to this email or call us at (804) 250-5066.

— The QCypher Team
hello@qcyphertech.com`

  // ── Step 4: Send via Resend ───────────────────────────────────────────────
  if (!RESEND_API_KEY) {
    // Return the assembled content without sending (useful for test/preview)
    return NextResponse.json({ ok: true, preview: true, subject: `Your ${data.month} QCypher Summary`, body: emailBody, data })
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: RESEND_FROM,
      to: [recipientEmail],
      subject: `Your ${data.month} QCypher Summary`,
      html: emailHtml,
      text: emailBody,
    }),
  })

  if (!res.ok) {
    const err = await res.json()
    return NextResponse.json({ error: err.message ?? 'Resend error' }, { status: 500 })
  }

  const sent = await res.json()
  return NextResponse.json({ ok: true, providerId: sent.id, data })
}
