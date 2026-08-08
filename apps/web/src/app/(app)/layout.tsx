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
