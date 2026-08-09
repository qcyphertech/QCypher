const RESEND_API_KEY = process.env.RESEND_API_KEY ?? ''
const RESEND_FROM = process.env.RESEND_FROM_EMAIL ?? 'noreply@example.com'

// Wrapper around the raw Resend fetch call used throughout the app (see
// api/contact/route.ts). Never throws — a notification email should never
// break the action that triggered it — but callers on a user-facing send
// path (e.g. "email this payment link") should check the returned result
// rather than assume success, since a delivery failure (unverified sending
// domain, bad recipient, etc.) would otherwise vanish silently.
export async function sendEmail(opts: { to: string | string[]; subject: string; html: string; text?: string }): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!RESEND_API_KEY) return { ok: false, error: 'Email not configured' }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: Array.isArray(opts.to) ? opts.to : [opts.to],
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      console.error('[sendEmail] Resend error', res.status, JSON.stringify(err))
      return { ok: false, error: (err as { message?: string }).message ?? `Email delivery failed (${res.status})` }
    }
    return { ok: true }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Email send failed'
    console.error('[sendEmail] fetch failed', message)
    return { ok: false, error: message }
  }
}
