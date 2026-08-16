'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const BTN_BG = 'linear-gradient(135deg, #1a3070 0%, #2a52a0 60%, #4a9db5 100%)'
const CARD   = 'rgba(255,255,255,0.05)'
const BORDER = 'rgba(74,157,181,0.22)'
const INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(74,157,181,0.28)',
  borderRadius: '12px',
  padding: '11px 14px',
  fontSize: '20px',
  letterSpacing: '0.3em',
  textAlign: 'center',
  color: '#e8f0fa',
  outline: 'none',
}
const BTN_PRIMARY: React.CSSProperties = {
  width: '100%',
  background: BTN_BG,
  border: 'none',
  borderRadius: '12px',
  padding: '13px',
  fontSize: '15px',
  fontWeight: 700,
  color: '#fff',
  cursor: 'pointer',
  boxShadow: '0 4px 20px rgba(42,82,160,0.45)',
}
const CARD_STYLE: React.CSSProperties = {
  background: CARD,
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: `1px solid ${BORDER}`,
  borderRadius: '20px',
  padding: '32px',
  boxShadow: '0 8px 48px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
}

export function MfaChallengeForm() {
  const [code, setCode]       = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const supabase = createClient()
  const router   = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/dashboard'

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError(null)

    const { data: factors, error: listError } = await supabase.auth.mfa.listFactors()
    if (listError || !factors) { setError('Could not load your MFA factor. Try signing in again.'); setLoading(false); return }
    const factor = factors.totp.find(f => f.status === 'verified')
    if (!factor) { setError('No verified MFA factor found. Contact an admin.'); setLoading(false); return }

    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: factor.id })
    if (challengeError || !challenge) { setError(challengeError?.message ?? 'Could not start verification.'); setLoading(false); return }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: factor.id,
      challengeId: challenge.id,
      code,
    })
    if (verifyError) { setError('Invalid code. Try again.'); setLoading(false); return }

    router.push(next)
    router.refresh()
  }

  return (
    <div style={CARD_STYLE}>
      <p style={{ fontSize: '14px', color: 'rgba(148,180,220,0.75)', marginBottom: '22px', textAlign: 'center' }}>
        Enter the 6-digit code from your authenticator app.
      </p>
      <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <input
          id="mfa-code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          required
          maxLength={6}
          value={code}
          onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
          placeholder="000000"
          style={INPUT_STYLE}
          autoFocus
        />
        {error && <p style={{ fontSize: '14px', color: '#f87171', background: 'rgba(248,113,113,0.1)', borderRadius: '10px', padding: '10px 14px' }}>{error}</p>}
        <button type="submit" disabled={loading || code.length !== 6} style={{ ...BTN_PRIMARY, opacity: loading || code.length !== 6 ? 0.6 : 1 }}>
          {loading ? 'Verifying…' : 'Verify'}
        </button>
      </form>
      <p style={{ textAlign: 'center', marginTop: '18px', fontSize: '13px', color: 'rgba(148,180,220,0.5)' }}>
        Lost your device? Contact another super admin to reset your MFA.
      </p>
    </div>
  )
}
