import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient, getTenantId } from '@/lib/supabase/admin'
import { AppShell } from '@/components/layout/AppShell'
import { DEFAULT_SETTINGS, type TenantSettings } from '@/lib/types/settings'
import { getAvailableModuleKeys } from '@/lib/actions/platform-modules'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Invited users (both tenant invites and team-member invites) are
  // authenticated by the magic link alone — this never proves they can log
  // back in on their own. needs_credential_setup forces them through
  // Google-link-or-password before any (app) route renders.
  //
  // The flag is only ever set to true BEFORE a user's first session exists
  // (at invite time, via the Admin API), so a session's own JWT is never
  // falsely "true" — it can only be falsely stale in the other direction,
  // right after completeCredentialSetup() clears it: that session's current
  // JWT still carries the old "true" claim until its next refresh. So the
  // cheap JWT-based value from getUser() is trustworthy whenever it's not
  // true, and only needs a fresh re-check (same admin re-fetch pattern as
  // getTenantId() below) in the one case where it says true — which also
  // covers "just cleared it, JWT hasn't refreshed yet" correctly. This
  // keeps the extra Admin API round-trip off the hot path for every
  // ordinary page load, not just ones for users mid-setup.
  if (user.app_metadata?.needs_credential_setup === true) {
    const { data: { user: freshUser } } = await createAdminClient().auth.admin.getUserById(user.id)
    if (freshUser?.app_metadata?.needs_credential_setup === true) redirect('/auth/complete-signup')
  }

  // RLS-scoped query relies on the JWT's tenant_id claim, which can be
  // stale (set via Admin API after initial sign-in) — getTenantId()
  // re-fetches fresh from the DB when that happens, and the tenant row
  // itself is then read via the admin client so it doesn't hit the same
  // RLS wall. A genuine throw means the account truly has no tenant
  // (super admin) — there's simply no tenant row to show for those.
  let tenant: { is_admin?: boolean; settings?: unknown; name?: string } | null = null
  try {
    const tenantId = await getTenantId(user.id, user.app_metadata)
    const { data } = await createAdminClient().from('tenants').select('is_admin, settings, name').eq('id', tenantId).single()
    tenant = data
  } catch { /* no tenant — leave null */ }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tenantSettings: TenantSettings = { ...DEFAULT_SETTINGS, ...((tenant as any)?.settings ?? {}) }

  // A module the tenant has toggled on doesn't matter if a super admin has
  // pulled it from the platform entirely — force it off regardless of the
  // tenant's own stored preference (which is left untouched in the DB, so
  // it comes back automatically if the module is ever re-enabled).
  const availableModules = await getAvailableModuleKeys()
  const settings: TenantSettings = availableModules
    ? (Object.fromEntries(
        Object.entries(tenantSettings).map(([key, value]) => [key, value && availableModules.has(key)]),
      ) as TenantSettings)
    : tenantSettings

  const businessName = (tenant as { name?: string } | null)?.name ?? ''
  const words = businessName.trim().split(/\s+/).filter(Boolean)
  const initials = words.length >= 2
    ? (words[0][0] + words[1][0]).toUpperCase()
    : (businessName.slice(0, 2).toUpperCase() || (user.email ?? 'U').slice(0, 2).toUpperCase())

  return (
    <AppShell
      isAdmin={(tenant as { is_admin?: boolean } | null)?.is_admin ?? false}
      settings={settings}
      userInitial={initials}>
      {children}
    </AppShell>
  )
}
