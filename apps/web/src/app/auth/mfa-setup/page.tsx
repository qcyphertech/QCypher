import { Suspense } from 'react'
import { MfaSetupForm } from '@/components/auth/MfaSetupForm'
import { AuthShell } from '@/components/auth/AuthShell'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Set up two-factor authentication — QCypher CRM' }

export default function MfaSetupPage() {
  return (
    <AuthShell subtitle="Set up two-factor authentication">
      <Suspense fallback={null}>
        <MfaSetupForm />
      </Suspense>
    </AuthShell>
  )
}
