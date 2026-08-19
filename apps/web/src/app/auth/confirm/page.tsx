'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { completeCredentialSetup } from '@/lib/actions/onboarding'

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

    // Invited users land here still flagged needs_credential_setup — the
    // (app) layout's redirect gate would just bounce them straight back to
    // /auth/complete-signup. The one case that should clear the flag from
    // here is a Google OAuth round-trip: reaching this page with a linked
    // google identity IS "signed up via Google", so there's nothing left to
    // gate. A plain magic-link/email session does NOT satisfy the
    // requirement — leave the flag alone and let the gate redirect them.
    async function clearSetupFlagIfGoogleLinked() {
      const { data: { user } } = await supabase.auth.getUser()
      const needsSetup = user?.app_metadata?.needs_credential_setup === true
      const hasGoogle = user?.identities?.some(i => i.provider === 'google') ?? false
      if (needsSetup && hasGoogle) {
        try { await completeCredentialSetup('google') } catch { /* gate will just redirect again — not fatal */ }
      }
    }

    async function finishSuccess(recoveryHint: boolean) {
      if (recoveryHint) { router.replace('/auth/reset-password'); return }
      await clearSetupFlagIfGoogleLinked()
      router.replace('/dashboard')
    }

    async function handle() {
      // A second load of this page (Safari's background tab-preview reload,
      // a duplicate redirect, etc.) arrives with the SAME single-use code —
      // the first exchange already consumed it and established a session,
      // so a retry fails even though the user is already logged in. Treat
      // an existing session as success rather than re-running the exchange.
      const { data: { session: existingSession } } = await supabase.auth.getSession()
      if (existingSession) {
        const recoveryHint = window.location.hash.includes('type=recovery') || window.location.search.includes('type=recovery')
        await finishSuccess(recoveryHint)
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
        if (!error) {
          await finishSuccess(hashType === 'recovery')
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
          await finishSuccess(queryType === 'recovery')
        } else {
          router.replace(`/auth/login?error=auth_failed&type=${queryType}`)
        }
        return
      }

      // 3. PKCE code flow
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
          await finishSuccess(queryType === 'recovery')
          return
        }

        // Admin-issued links (invite, or a resend of one) are never
        // initiated from this browser, so there's no code_verifier on hand
        // for the PKCE exchange above — it fails on the very first genuine
        // click, not because the link actually expired. Supabase still
        // accepts the same value as a one-time OTP token in that case, so
        // retry that way before giving up. A real "invalid or expired" only
        // surfaces once this also fails (e.g. token TTL passed, or reused).
        const { error: otpError } = await supabase.auth.verifyOtp({
          token_hash: code,
          type: (queryType as 'invite' | 'recovery' | 'email' | 'signup') || 'invite',
        })
        if (!otpError) {
          await finishSuccess(queryType === 'recovery')
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
