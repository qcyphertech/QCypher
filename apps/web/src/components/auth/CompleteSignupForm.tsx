'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PasswordInput } from '@/components/auth/PasswordInput'
import { completeCredentialSetup } from '@/lib/actions/onboarding'

const TEAL   = '#4a9db5'
const BTN_BG = 'linear-gradient(135deg, #1a3070 0%, #2a52a0 60%, #4a9db5 100%)'
const BORDER = 'rgba(74,157,181,0.22)'
const LABEL: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 700,
  color: 'rgba(148,180,220,0.9)',
  marginBottom: '7px',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
}

export function CompleteSignupForm({ email, tenantName }: { email: string; tenantName: string }) {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const supabase = createClient()

  async function handleGoogle() {
    setLoading(true); setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/confirm` },
    })
    if (error) { setError(error.message); setLoading(false) }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match.'); return }
    if (password.length < 8)  { setError('Password must be at least 8 characters.'); return }
    setLoading(true); setError(null)

    const { error: pwError } = await supabase.auth.updateUser({ password })
    if (pwError) { setError(pwError.message); setLoading(false); return }

    try {
      await completeCredentialSetup()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong finishing setup.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  const card: React.CSSProperties = {
    background: 'rgba(255,255,255,0.05)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: `1px solid ${BORDER}`,
    borderRadius: '20px',
    padding: '32px',
    boxShadow: '0 8px 48px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
  }

  return (
    <div style={card}>
      <p style={{ textAlign: 'center', fontWeight: 800, fontSize: '19px', color: '#e8f0fa', marginBottom: '6px' }}>
        You're joining {tenantName || 'your team'}
      </p>
      <p style={{ textAlign: 'center', fontSize: '14px', color: 'rgba(148,180,220,0.75)', lineHeight: 1.6, marginBottom: '26px' }}>
        Finish setting up <strong style={{ color: TEAL }}>{email}</strong> with Google or a password before continuing — this step can't be skipped.
      </p>

      {/* Google */}
      <button
        type="button"
        onClick={handleGoogle}
        disabled={loading}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
          background: 'rgba(255,255,255,0.07)', border: `1px solid ${BORDER}`,
          borderRadius: '12px', padding: '12px',
          fontSize: '15px', fontWeight: 600, color: '#e8f0fa',
          cursor: 'pointer', opacity: loading ? 0.5 : 1, marginBottom: '22px',
        }}
      >
        <GoogleIcon />
        Continue with Google
      </button>

      {/* Divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '22px' }}>
        <div style={{ flex: 1, height: '1px', background: BORDER }} />
        <span style={{ fontSize: '13px', color: 'rgba(148,180,220,0.5)', fontWeight: 500 }}>or create a password</span>
        <div style={{ flex: 1, height: '1px', background: BORDER }} />
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div>
          <label htmlFor="password" style={LABEL}>Password</label>
          <PasswordInput id="password" required value={password}
            onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters" />
        </div>
        <div>
          <label htmlFor="confirm" style={LABEL}>Confirm password</label>
          <PasswordInput id="confirm" required value={confirm}
            onChange={e => setConfirm(e.target.value)} placeholder="••••••••" />
        </div>
        {error && (
          <p style={{ fontSize: '14px', color: '#f87171', background: 'rgba(248,113,113,0.1)', borderRadius: '10px', padding: '10px 14px' }}>
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%', background: BTN_BG, border: 'none', borderRadius: '12px',
            padding: '13px', fontSize: '15px', fontWeight: 700, color: '#fff',
            cursor: 'pointer', boxShadow: '0 4px 20px rgba(42,82,160,0.45)',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? 'Setting up…' : 'Set password & continue'}
        </button>
      </form>
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
