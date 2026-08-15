'use client'

// Shared footer for standalone token-link pages (/pay/[token], /q/[token],
// /recurring/[token]) — same "Powered by QCypher Technologies" treatment as
// the transactional email footer (lib/email/neutral.ts), so the branding is
// consistent whether the customer lands here from a link or an email.
const LOGO_URL = 'https://www.qcyphertech.com/qcypher-logo-full.png'
const QCYPHER_URL = 'https://www.qcyphertech.com'

export function PoweredByFooter() {
  return (
    <div style={{ background: '#f8f9fc', padding: '20px 32px', textAlign: 'center', borderTop: '1px solid rgba(26,48,112,0.08)' }}>
      <a href={QCYPHER_URL} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'inline-block' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={LOGO_URL} alt="QCypher Technologies" width={88} style={{ width: '88px', maxWidth: '100%', height: 'auto', display: 'inline-block', marginBottom: '6px', opacity: 0.85 }} />
      </a>
      <p style={{ margin: 0, fontSize: '12px', color: '#5b6072' }}>
        Powered by{' '}
        <a href={QCYPHER_URL} target="_blank" rel="noopener noreferrer" style={{ color: '#2a52a0', textDecoration: 'none', fontWeight: 600 }}>
          QCypher Technologies
        </a>
      </p>
    </div>
  )
}

export const BRAND_GRADIENT_BAR: React.CSSProperties = {
  height: '4px',
  background: 'linear-gradient(90deg,#2a52a0,#4a9db5,#00a87a)',
}
