'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { PasswordInput } from '@/components/auth/PasswordInput'

const TEAL        = '#4a9db5'
const BTN_BG      = 'linear-gradient(135deg, #1a3070 0%, #2a52a0 60%, #4a9db5 100%)'
const CARD        = 'rgba(255,255,255,0.05)'
const BORDER      = 'rgba(74,157,181,0.22)'
const INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(74,157,181,0.28)',
  borderRadius: '12px',
  padding: '11px 14px',
  fontSize: '15px',
  color: '#e8f0fa',
  outline: 'none',
}
const LABEL_STYLE: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 700,
  color: 'rgba(148,180,220,0.9)',
  marginBottom: '7px',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
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

type Mode = 'password' | 'magic'

export function LoginForm() {
  const [mode, setMode]       = useState<Mode>('password')
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]       = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const supabase = createClient()
  const router   = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams.get('error') === 'auth_failed') {
      const linkType = searchParams.get('type')
      setError(
        linkType === 'invite' || linkType === 'signup'
          ? 'This invite link has expired. Please contact the business that invited you and ask them to resend it.'
          : 'That link is invalid or has expired. Please request a new one.',
      )
    }
  }, [searchParams])

  async function handleGoogle() {
    setLoading(true); setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/confirm` },
    })
    if (error) { setError(error.message); setLoading(false) }
  }

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false) }
    else {
      const { logAudit } = await import('@/lib/actions/audit')
      logAudit({ action: 'login', resource_type: 'auth' })
      router.push('/dashboard')
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/confirm` },
    })
    if (error) { setError(error.message); setLoading(false) }
    else { setSent(true); setLoading(false) }
  }

  if (sent) {
    return (
      <div style={{ ...CARD_STYLE, textAlign: 'center' }}>
        <div style={{
          width: '56px', height: '56px', borderRadius: '16px', margin: '0 auto 16px',
          background: BTN_BG, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px',
        }}>✉️</div>
        <p style={{ fontWeight: 700, color: '#e8f0fa', fontSize: '17px', marginBottom: '6px' }}>Check your email</p>
        <p style={{ fontSize: '15px', color: 'rgba(148,180,220,0.75)' }}>
          We sent a magic link to <strong style={{ color: TEAL }}>{email}</strong>
        </p>
      </div>
    )
  }

  return (
    <div style={CARD_STYLE}>

      {/* ── Google (top) ── */}
      <button
        type="button"
        onClick={handleGoogle}
        disabled={loading}
        style={{
          width: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
          background: 'rgba(255,255,255,0.07)',
          border: `1px solid ${BORDER}`,
          borderRadius: '12px',
          padding: '12px',
          fontSize: '15px', fontWeight: 600,
          color: '#e8f0fa',
          cursor: 'pointer',
          opacity: loading ? 0.5 : 1,
          marginBottom: '22px',
        }}
      >
        <GoogleIcon />
        Continue with Google
      </button>

      {/* Divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '22px' }}>
        <div style={{ flex: 1, height: '1px', background: BORDER }} />
        <span style={{ fontSize: '13px', color: 'rgba(148,180,220,0.5)', fontWeight: 500 }}>or sign in with email</span>
        <div style={{ flex: 1, height: '1px', background: BORDER }} />
      </div>

      {/* ── Mode toggle ── */}
      <div style={{
        display: 'flex', background: 'rgba(0,0,0,0.25)', borderRadius: '12px',
        padding: '4px', gap: '4px', marginBottom: '24px', border: `1px solid ${BORDER}`,
      }}>
        {(['password', 'magic'] as Mode[]).map(m => (
          <button
            key={m}
            type="button"
            onClick={() => { setMode(m); setError(null) }}
            style={{
              flex: 1, borderRadius: '9px', padding: '9px',
              fontSize: '14px', fontWeight: 600, border: 'none', cursor: 'pointer',
              background: mode === m ? BTN_BG : 'transparent',
              color: mode === m ? '#fff' : 'rgba(148,180,220,0.65)',
              boxShadow: mode === m ? '0 2px 12px rgba(42,82,160,0.4)' : 'none',
            }}
          >
            {m === 'password' ? 'Password' : 'Magic link'}
          </button>
        ))}
      </div>

      {/* ── Password form ── */}
      {mode === 'password' ? (
        <form onSubmit={handlePasswordLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label htmlFor="email" style={LABEL_STYLE}>Email</label>
            <input id="email" type="email" required value={email}
              onChange={e => setEmail(e.target.value)} placeholder="you@example.com" style={INPUT_STYLE} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '7px' }}>
              <span style={LABEL_STYLE}>Password</span>
              <Link href="/auth/forgot-password" style={{ fontSize: '13px', color: TEAL, textDecoration: 'none', fontWeight: 600 }}>
                Forgot password?
              </Link>
            </div>
            <PasswordInput id="password" required value={password}
              onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          {error && <p style={{ fontSize: '14px', color: '#f87171', background: 'rgba(248,113,113,0.1)', borderRadius: '10px', padding: '10px 14px' }}>{error}</p>}
          <button type="submit" disabled={loading} style={{ ...BTN_PRIMARY, opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleMagicLink} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label htmlFor="email-magic" style={LABEL_STYLE}>Email</label>
            <input id="email-magic" type="email" required value={email}
              onChange={e => setEmail(e.target.value)} placeholder="you@example.com" style={INPUT_STYLE} />
          </div>
          {error && <p style={{ fontSize: '14px', color: '#f87171', background: 'rgba(248,113,113,0.1)', borderRadius: '10px', padding: '10px 14px' }}>{error}</p>}
          <button type="submit" disabled={loading} style={{ ...BTN_PRIMARY, opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Sending…' : 'Send magic link'}
          </button>
        </form>
      )}

      {/* ── Sign up link ── */}
      <p style={{ textAlign: 'center', marginTop: '22px', fontSize: '14px', color: 'rgba(148,180,220,0.65)' }}>
        Don&apos;t have an account?{' '}
        <Link href="/auth/signup" style={{ color: TEAL, fontWeight: 700, textDecoration: 'none' }}>
          Create one
        </Link>
      </p>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
      <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.96L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}
