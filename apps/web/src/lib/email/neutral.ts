// Modern, sleek HTML shell for emails a TENANT sends to THEIR OWN
// customers (quotes, portal sign-in links, quick-reply templates,
// payment receipts). The tenant's business name is the primary,
// emphasized identity — this should still read as coming from their
// business — but every send carries a "Powered by QCypher
// Technologies" footer (logo, linked) so both the tenant and their
// customer see the platform underneath. Uses QCypher's own palette
// (indigo #2a52a0, cyan #4a9db5, mint #00a87a) so tenant-sent mail
// feels consistent with QCypher-sent mail (see brand.ts) rather than
// looking like an unrelated generic template.

const LOGO_URL = 'https://www.qcyphertech.com/qcypher-logo-full.png'
const QCYPHER_URL = 'https://www.qcyphertech.com'

type NeutralEmailOptions = {
  /** The tenant's business name — emphasized as the email's header */
  senderName: string
  /** Main HTML content — headings, paragraphs, lists. Keep it simple inline HTML. */
  bodyHtml: string
  /** Optional call-to-action button below the body */
  cta?: { label: string; href: string }
}

export function renderNeutralEmail({ senderName, bodyHtml, cta }: NeutralEmailOptions): string {
  const ctaHtml = cta ? `
    <div style="text-align:center;margin:32px 0 8px;">
      <a href="${cta.href}" style="display:inline-block;padding:14px 32px;border-radius:10px;background:linear-gradient(135deg,#2a52a0,#4a9db5);color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;">
        ${cta.label}
      </a>
    </div>
  ` : ''

  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="margin:0;padding:0;background:#f8f9fc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
    <div style="padding:40px 20px;">
      <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(26,48,112,0.10);border:1px solid rgba(26,48,112,0.08);">
        <div style="height:4px;background:linear-gradient(90deg,#2a52a0,#4a9db5,#00a87a);"></div>
        <div style="padding:36px 40px 4px;">
          <p style="margin:0;font-size:23px;font-weight:800;color:#171a2b;letter-spacing:-0.01em;">${senderName}</p>
        </div>
        <div style="padding:16px 40px 8px;color:#1a202c;font-size:15px;line-height:1.75;">
          ${bodyHtml}
          ${ctaHtml}
        </div>
        <div style="background:#f8f9fc;padding:24px 40px;text-align:center;border-top:1px solid rgba(26,48,112,0.08);margin-top:24px;">
          <a href="${QCYPHER_URL}" style="text-decoration:none;display:inline-block;">
            <img src="${LOGO_URL}" alt="QCypher Technologies" width="96" style="width:96px;max-width:100%;height:auto;display:inline-block;margin-bottom:8px;opacity:0.85;">
          </a>
          <p style="margin:0;font-size:12px;color:#5b6072;">
            Powered by <a href="${QCYPHER_URL}" style="color:#2a52a0;text-decoration:none;font-weight:600;">QCypher Technologies</a>
          </p>
        </div>
      </div>
    </div>
  </body>
</html>
`.trim()
}
