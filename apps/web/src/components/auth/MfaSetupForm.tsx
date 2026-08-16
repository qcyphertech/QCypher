'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const TEAL   = '#4a9db5'
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

export function MfaSetupForm() {
  const [qrCode, setQrCode]     = useState<string | null>(null)
  const [secret, setSecret]     = useState<string | null>(null)
  const [factorId, setFactorId] = useState<string | null>(null)
  const [code, setCode]         = useState('')
  const [loading, setLoading]   = useState(false)
  const [initError, setInitError] = useState<string | null>(null)
  const [verifyError, setVerifyError] = useState<string | null>(null)
  const supabase = createClient()
  const router   = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/dashboard'

  useEffect(() => {
    async function init() {
      // Clean up any stale unverified factor from a previous abandoned
      // attempt — Supabase rejects a second enroll() while one is pending.
      const { data: factors } = await supabase.auth.mfa.listFactors()
      const stale = factors?.totp.find(f => f.status === 'unverified')
      if (stale) {
        await supabase.auth.mfa.unenroll({ factorId: stale.id })
      }

      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' })
      if (error || !data) {
        setInitError(error?.message ?? 'Could not start MFA setup.')
        return
      }
      setFactorId(data.id)
      setQrCode(data.totp.qr_code)
      setSecret(data.totp.secret)
    }
    init()
  }, [supabase])

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    if (!factorId) return
    setLoading(true); setVerifyError(null)

    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId })
    if (challengeError || !challenge) { setVerifyError(challengeError?.message ?? 'Could not start verification.'); setLoading(false); return }

    const { error: verifyErr } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code,
    })
    if (verifyErr) { setVerifyError('Invalid code. Try again.'); setLoading(false); return }

    router.push(next)
    router.refresh()
  }

  if (initError) {
    return (
      <div style={CARD_STYLE}>
        <p style={{ fontSize: '14px', color: '#f87171' }}>{initError}</p>
      </div>
    )
  }

  return (
    <div style={CARD_STYLE}>
      <p style={{ fontSize: '14px', color: 'rgba(148,180,220,0.75)', marginBottom: '18px', textAlign: 'center' }}>
        Your account has access to every tenant&apos;s data, so two-factor
        authentication is required. Scan this code with Google Authenticator,
        Authy, or any TOTP app.
      </p>

      {qrCode ? (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '18px' }}>
          <div style={{ background: '#fff', padding: '12px', borderRadius: '12px' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrCode} alt="Scan with your authenticator app" width={180} height={180} />
          </div>
        </div>
      ) : (
        <p style={{ textAlign: 'center', color: 'rgba(148,180,220,0.6)', marginBottom: '18px' }}>Loading…</p>
      )}

      {secret && (
        <p style={{ fontSize: '12px', color: 'rgba(148,180,220,0.6)', textAlign: 'center', marginBottom: '22px', wordBreak: 'break-all' }}>
          Can&apos;t scan? Enter this key manually: <span style={{ color: TEAL, fontFamily: 'monospace' }}>{secret}</span>
        </p>
      )}

      <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <input
          id="mfa-setup-code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          required
          maxLength={6}
          value={code}
          onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
          placeholder="000000"
          style={INPUT_STYLE}
          disabled={!factorId}
        />
        {verifyError && <p style={{ fontSize: '14px', color: '#f87171', background: 'rgba(248,113,113,0.1)', borderRadius: '10px', padding: '10px 14px' }}>{verifyError}</p>}
        <button type="submit" disabled={loading || !factorId || code.length !== 6} style={{ ...BTN_PRIMARY, opacity: loading || !factorId || code.length !== 6 ? 0.6 : 1 }}>
          {loading ? 'Verifying…' : 'Enable two-factor authentication'}
        </button>
      </form>
    </div>
  )
}
