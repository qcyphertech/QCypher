'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// Handles ALL Supabase auth email flows:
//   1. Hash fragment (#access_token=…&type=recovery) — implicit/legacy
//   2. Query token_hash + type — newer PKCE email flow
//   3. Query code — PKCE OAuth / magic-link (fallback from server callback)
export default function ConfirmPage() {
  const router = useRouter()
  const ranRef = useRef(false)

  useEffect(() => {
    // OAuth/OTP codes are single-use — React can invoke effects twice
    // (StrictMode, fast back-forward navigation), and a second exchange
    // attempt with the same code fails even though the first succeeded,
    // producing a false "invalid or expired" error after a real login.
    if (ranRef.current) return
    ranRef.current = true

    const supabase = createClient()

    async function handle() {
      // A second load of this page (Safari's background tab-preview reload,
      // a duplicate redirect, etc.) arrives with the SAME single-use code —
      // the first exchange already consumed it and established a session,
      // so a retry fails even though the user is already logged in. Treat
      // an existing session as success rather than re-running the exchange.
      const { data: { session: existingSession } } = await supabase.auth.getSession()
      if (existingSession) {
        const recoveryHint = window.location.hash.includes('type=recovery') || window.location.search.includes('type=recovery')
        router.replace(recoveryHint ? '/auth/reset-password' : '/dashboard')
        return
      }

      // Parse both hash fragment and query string
      const hash   = window.location.hash.substring(1)
      const hashParams  = new URLSearchParams(hash)
      const queryParams = new URLSearchParams(window.location.search)

      const accessToken  = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')
      const hashType     = hashParams.get('type')

      const tokenHash  = queryParams.get('token_hash')
      const queryType  = queryParams.get('type')
      const code       = queryParams.get('code')

      // 1. Hash fragment (implicit flow) — common for older Supabase email templates
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        if (!error && hashType === 'recovery') {
          router.replace('/auth/reset-password')
        } else if (!error) {
          router.replace('/dashboard')
        } else {
          router.replace(`/auth/login?error=auth_failed${hashType ? `&type=${hashType}` : ''}`)
        }
        return
      }

      // 2. token_hash flow (PKCE email)
      if (tokenHash && queryType) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: queryType as 'recovery' | 'email' | 'signup',
        })
        if (!error) {
          router.replace(queryType === 'recovery' ? '/auth/reset-password' : '/dashboard')
        } else {
          router.replace(`/auth/login?error=auth_failed&type=${queryType}`)
        }
        return
      }

      // 3. PKCE code flow
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
          router.replace(queryType === 'recovery' ? '/auth/reset-password' : '/dashboard')
        } else {
          router.replace(`/auth/login?error=auth_failed${queryType ? `&type=${queryType}` : ''}`)
        }
        return
      }

      router.replace('/auth/login?error=auth_failed')
    }

    handle()
  }, [router])

  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(145deg, #0e1f45 0%, #1a3070 50%, #112040 100%)',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: '50%',
          border: '3px solid rgba(74,157,181,0.3)',
          borderTopColor: '#4a9db5',
          margin: '0 auto 16px',
          animation: 'spin 0.8s linear infinite',
        }} />
        <p style={{ color: 'rgba(148,180,220,0.8)', fontSize: '15px' }}>Verifying…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    </main>
  )
}
