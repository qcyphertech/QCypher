'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ShieldCheck, Smartphone } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { SectionHeader, PanelSkeleton } from '@/components/admin/AdminPanelUI'

type Factor = { id: string; friendlyName: string; createdAt: string }

// "Add another device" only lives here, not on the pre-verification
// /auth/mfa-challenge page — reaching this panel at all already required
// passing MFA (middleware enforces aal2 for every protected route), so
// enrolling a new device from here can't be used to bypass an existing
// one the way it could from the challenge page. See the comment in
// MfaChallengeForm.tsx for the reasoning.
export function MfaDevicesPanel() {
  const [factors, setFactors] = useState<Factor[] | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.mfa.listFactors().then(({ data }) => {
      setFactors(
        (data?.totp ?? [])
          .filter(f => f.status === 'verified')
          .map(f => ({ id: f.id, friendlyName: f.friendly_name || 'Authenticator app', createdAt: f.created_at })),
      )
    })
  }, [])

  if (factors === null) return <PanelSkeleton />

  return (
    <div className="space-y-3">
      <SectionHeader icon={ShieldCheck} label="Your MFA Devices" count={factors.length} />
      <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] overflow-hidden">
        {factors.length === 0 ? (
          <div className="px-4 py-3 text-[13px] text-[hsl(var(--muted-foreground))]">
            No verified devices — this shouldn&apos;t be possible while you&apos;re signed in. Contact another super admin.
          </div>
        ) : (
          factors.map(f => (
            <div key={f.id} className="px-4 py-3 flex items-center gap-3 border-b border-[hsl(var(--border))] last:border-0">
              <Smartphone className="w-4 h-4 shrink-0 text-[hsl(var(--muted-foreground))]" />
              <div className="min-w-0">
                <p className="text-[14px] font-semibold truncate">{f.friendlyName}</p>
                <p className="text-[12px] text-[hsl(var(--muted-foreground))]">
                  Added {new Date(f.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            </div>
          ))
        )}
        <div className="px-4 py-3 bg-[hsl(var(--muted))]/40">
          <Link
            href="/auth/mfa-setup?next=%2Fadmin"
            className="text-[13px] font-semibold text-[hsl(var(--primary))] hover:underline"
          >
            + Add another device
          </Link>
          {/* Lands back on /admin's default tab, not specifically Security
              — the admin console's tab state is plain useState, not
              URL-driven, so there's no way to deep-link to a tab. */}
        </div>
      </div>
      <p className="text-[12px] text-[hsl(var(--muted-foreground))]">
        Removing a device isn&apos;t self-service yet — contact another super
        admin, who can unenroll it via the Supabase Auth dashboard.
      </p>
    </div>
  )
}
