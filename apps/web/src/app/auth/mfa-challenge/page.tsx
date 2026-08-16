import { Suspense } from 'react'
import { MfaChallengeForm } from '@/components/auth/MfaChallengeForm'
import { AuthShell } from '@/components/auth/AuthShell'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Verification code — QCypher CRM' }

export default function MfaChallengePage() {
  return (
    <AuthShell subtitle="Enter your verification code">
      <Suspense fallback={null}>
        <MfaChallengeForm />
      </Suspense>
    </AuthShell>
  )
}
