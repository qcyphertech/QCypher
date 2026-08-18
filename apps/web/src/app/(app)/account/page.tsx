import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AccountTabs } from '@/components/account/AccountTabs'
import { ProfileForm } from '@/components/account/ProfileForm'
import { SecurityPanel } from '@/components/account/SecurityPanel'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Account' }

export default async function AccountPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const tenantId = user.app_metadata?.tenant_id ?? ''
  const [{ data: profile }, { data: tenant }] = await Promise.all([
    supabase.from('users').select('legal_name, nickname, phone, street, city, state, zip').eq('id', user.id).single(),
    supabase.from('tenants').select('name').eq('id', tenantId).single(),
  ])

  const identities  = user.identities ?? []
  const hasPassword = identities.some(i => i.provider === 'email')
  const hasGoogle   = identities.some(i => i.provider === 'google')

  const signedInAt = user.last_sign_in_at
    ? new Date(user.last_sign_in_at).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
      })
    : 'Unknown'

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-black" style={{ color: 'var(--heading)' }}>Account</h1>
        <p className="text-[15px] mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
          Manage your profile and security settings
        </p>
      </div>

      <AccountTabs
        profile={
          <ProfileForm
            initial={{
              legal_name: (profile as { legal_name?: string } | null)?.legal_name ?? null,
              nickname:   (profile as { nickname?: string }   | null)?.nickname   ?? null,
              phone:      (profile as { phone?: string }      | null)?.phone      ?? null,
              street:     (profile as { street?: string }     | null)?.street     ?? null,
              city:       (profile as { city?: string }       | null)?.city       ?? null,
              state:      (profile as { state?: string }      | null)?.state      ?? null,
              zip:        (profile as { zip?: string }        | null)?.zip        ?? null,
              email:         user.email ?? '',
              business_name: (tenant as { name?: string } | null)?.name ?? null,
            }}
          />
        }
        security={
          <SecurityPanel
            email={user.email ?? ''}
            hasPassword={hasPassword}
            hasGoogle={hasGoogle}
            signedInAt={signedInAt}
          />
        }
      />
    </div>
  )
}
