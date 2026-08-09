const RESEND_API_KEY = process.env.RESEND_API_KEY ?? ''
const RESEND_FROM = process.env.RESEND_FROM_EMAIL ?? 'noreply@example.com'

// Thin fire-and-forget wrapper around the raw Resend fetch call used
// throughout the app (see api/contact/route.ts) — swallows failures so a
// notification email never breaks the action that triggered it.
export async function sendEmail(opts: { to: string | string[]; subject: string; html: string; text?: string }) {
  if (!RESEND_API_KEY) return
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
      // Still best-effort (never throws — a notification email should
      // never break the action that triggered it), but log so silent
      // delivery failures (e.g. an unverified sending domain) show up in
      // server logs instead of vanishing with no trace.
      console.error('[sendEmail] Resend error', res.status, JSON.stringify(err))
    }
  } catch (e) {
    console.error('[sendEmail] fetch failed', e instanceof Error ? e.message : e)
  }
}
