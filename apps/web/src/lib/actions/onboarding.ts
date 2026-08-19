'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAudit } from '@/lib/actions/audit'

export type OnboardingContext = {
  email: string
  tenantName: string
  needsSetup: boolean
}

export async function getOnboardingContext(): Promise<OnboardingContext> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const admin = createAdminClient()
  const { data: { user: fresh } } = await admin.auth.admin.getUserById(user.id)
  const tenantId = fresh?.app_metadata?.tenant_id as string | undefined

  let tenantName = ''
  if (tenantId) {
    const { data: tenant } = await admin.from('tenants').select('name').eq('id', tenantId).single()
    tenantName = (tenant as { name?: string } | null)?.name ?? ''
  }

  return {
    email: user.email ?? '',
    tenantName,
    needsSetup: fresh?.app_metadata?.needs_credential_setup === true,
  }
}

// Clears the flag that gates every (app) route through /auth/complete-signup.
// Called either right after the invitee sets a password, or from
// /auth/confirm once a Google OAuth round-trip lands them back with a
// linked google identity.
export async function completeCredentialSetup(method: 'google' | 'password'): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const admin = createAdminClient()
  const { data: { user: fresh } } = await admin.auth.admin.getUserById(user.id)

  // updateUserById replaces app_metadata wholesale (same convention already
  // used in api/team/invite and api/admin/invite) — spread the existing
  // fresh metadata so tenant_id/role aren't dropped.
  await admin.auth.admin.updateUserById(user.id, {
    app_metadata: { ...fresh?.app_metadata, needs_credential_setup: false },
  })

  await logAudit({ action: 'credentials_set', resource_type: 'auth', details: { method } })
}
