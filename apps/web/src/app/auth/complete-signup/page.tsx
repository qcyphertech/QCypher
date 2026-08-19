import { redirect } from 'next/navigation'
import { getOnboardingContext } from '@/lib/actions/onboarding'
import { CompleteSignupForm } from '@/components/auth/CompleteSignupForm'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Finish setting up your account — QCypher CRM' }

// Deliberately not built on AuthShell — that shell's logo links back to "/",
// which would give an invitee stuck here an escape route. This page has no
// navigation away on purpose: the caller (the (app) layout's server-side
// redirect gate) only sends people here who still need to finish setup.
export default async function CompleteSignupPage() {
  const ctx = await getOnboardingContext()
  if (!ctx.needsSetup) redirect('/dashboard')

  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      background: 'linear-gradient(145deg, #0e1f45 0%, #1a3070 50%, #112040 100%)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `
          linear-gradient(rgba(42,82,160,0.08) 1px, transparent 1px),
          linear-gradient(90deg, rgba(42,82,160,0.08) 1px, transparent 1px)
        `,
        backgroundSize: '48px 48px',
      }} />
      <div style={{
        position: 'absolute', width: '500px', height: '500px', borderRadius: '50%', pointerEvents: 'none',
        background: 'radial-gradient(circle, rgba(42,82,160,0.18) 0%, transparent 70%)',
        top: '-100px', left: '-100px',
      }} />
      <div style={{
        position: 'absolute', width: '400px', height: '400px', borderRadius: '50%', pointerEvents: 'none',
        background: 'radial-gradient(circle, rgba(74,157,181,0.14) 0%, transparent 70%)',
        bottom: '-80px', right: '-80px',
      }} />

      <div style={{ width: '100%', maxWidth: '420px', position: 'relative', zIndex: 1 }}>
        <div style={{
          display: 'block',
          background: 'radial-gradient(ellipse 85% 80% at 50% 50%, #ffffff 0%, rgba(255,255,255,0.92) 30%, rgba(220,235,255,0.5) 60%, transparent 100%)',
          borderRadius: '28px',
          padding: '20px 28px',
          margin: '0 auto 24px',
          width: 'fit-content',
        }}>
          <img
            src="/qcypher-logo-full.png"
            alt="QCypher Technologies"
            style={{ height: '80px', width: 'auto', margin: '0 auto', display: 'block' }}
          />
        </div>

        <CompleteSignupForm email={ctx.email} tenantName={ctx.tenantName} />
      </div>
    </main>
  )
}
