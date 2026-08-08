import { createClient } from '@/lib/supabase/server'
import { ThemeToggle } from '@/components/settings/ThemeToggle'
import { SignOutButton } from '@/components/settings/SignOutButton'
import { ModuleToggles } from '@/components/settings/ModuleToggles'
import { MissedCallSetup } from '@/components/settings/MissedCallSetup'
import { ProfileForm } from '@/components/account/ProfileForm'
import { SecurityPanel } from '@/components/account/SecurityPanel'
import { TeamPanel } from '@/components/settings/TeamPanel'
import { RequestActionsPanel } from '@/components/settings/RequestActionsPanel'
import { AuditTrailPanel } from '@/components/settings/AuditTrailPanel'
import { ExportDeletePanel } from '@/components/settings/ExportDeletePanel'
import { SettingsTabs, SettingsSection } from '@/components/settings/SettingsTabs'
import { getTeamMembers, getPendingInvites } from '@/lib/actions/team'
import { getAvailableModuleKeys } from '@/lib/actions/platform-modules'
import { getDeletionStatus, type DeletionStatus } from '@/lib/actions/account-deletion'
import { createAdminClient, getTenantId } from '@/lib/supabase/admin'
import { DEFAULT_SETTINGS, type TenantSettings } from '@/lib/types/settings'
import { Sun, Download, ChevronRight } from 'lucide-react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Settings' }

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Phase 21 RBAC — 'owner' = Admin, 'member' = User, 'read_only' = Read-only.
  const role = (user.app_metadata?.role as 'owner' | 'member' | 'read_only' | undefined) ?? 'member'
  const isAdmin = role === 'owner'
  const isReadOnly = role === 'read_only'

  // The RLS-scoped tenant query below relies on the JWT's tenant_id
  // claim, which can be stale (set via Admin API after initial sign-in) —
  // fetch the real tenant_id first (with a DB fallback) and read the
  // tenant row via the admin client so the page reflects the true saved
  // state rather than a possibly-stale RLS view. A tenantless account
  // (super admin) simply has no tenant row to show.
  let tenantId: string | null = null
  try { tenantId = await getTenantId(user.id, user.app_metadata) } catch { /* no tenant */ }

  const DEFAULT_DELETION_STATUS: DeletionStatus = { status: 'active', deletionRequestedAt: null, deletionScheduledAt: null }

  const [{ data: tenant }, { data: profile }, members, pendingInvites, availableModuleKeys, deletionStatus] = await Promise.all([
    tenantId
      ? createAdminClient().from('tenants').select('name, slug, settings, telnyx_number').eq('id', tenantId).single()
      : Promise.resolve({ data: null }),
    supabase.from('users')
      .select('legal_name, nickname, phone, street, city, state, zip')
      .eq('id', user.id)
      .single(),
    isAdmin ? getTeamMembers().catch(() => []) : Promise.resolve([]),
    isAdmin ? getPendingInvites().catch(() => []) : Promise.resolve([]),
    getAvailableModuleKeys(),
    isAdmin ? getDeletionStatus().catch(() => DEFAULT_DELETION_STATUS) : Promise.resolve(DEFAULT_DELETION_STATUS),
  ])

  const settings: TenantSettings = { ...DEFAULT_SETTINGS, ...(tenant?.settings ?? {}) }
  const identities  = user.identities ?? []
  const hasPassword = identities.some(i => i.provider === 'email')
  const hasGoogle   = identities.some(i => i.provider === 'google')
  const signedInAt  = user.last_sign_in_at
    ? new Date(user.last_sign_in_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Unknown'

  // ── Tab content blocks (server-rendered, passed as props) ──────────────────

  const workspaceTab = (
    <div style={{ maxWidth: '640px' }}>
      <SettingsSection label="Appearance">
        <div style={{ borderRadius: '16px', background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', gap: '12px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '10px', flexShrink: 0, background: 'rgba(42,82,160,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sun style={{ width: '15px', height: '15px', color: '#2a52a0' }} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '15px', fontWeight: 600, color: 'hsl(var(--foreground))' }}>Theme</p>
              <p style={{ fontSize: '14px', color: 'hsl(var(--muted-foreground))', marginTop: '2px' }}>Light or dark mode</p>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </SettingsSection>

      <SettingsSection label="Modules" hint="Toggle features on or off — hidden modules keep their data.">
        <ModuleToggles settings={settings} availableModules={availableModuleKeys ? [...availableModuleKeys] : undefined} />
      </SettingsSection>

      <SettingsSection label="Automations">
        <MissedCallSetup currentNumber={(tenant as any)?.telnyx_number ?? null} />
      </SettingsSection>
    </div>
  )

  const teamTab = (
    <div style={{ maxWidth: '640px' }}>
      <SettingsSection label="Team" hint="Invite colleagues to your workspace. They'll see the same contacts, orders, and inventory.">
        <TeamPanel members={members} pending={pendingInvites} currentUserId={user.id} />
      </SettingsSection>
      <SettingsSection label="Account & Billing" hint="Plan changes require QCypher's approval.">
        <RequestActionsPanel />
      </SettingsSection>
    </div>
  )

  const auditTab = (
    <div>
      <SettingsSection label="Audit Trail" hint="Who did what, and when. Logs are kept for 90 days.">
        <AuditTrailPanel members={members} />
      </SettingsSection>
    </div>
  )

  const accountTab = (
    <div style={{ maxWidth: '640px' }}>
      <SettingsSection label="Profile">
        <ProfileForm
          initial={{
            business_name: tenant?.name ?? null,
            legal_name:    (profile as any)?.legal_name ?? null,
            nickname:      (profile as any)?.nickname   ?? null,
            phone:         (profile as any)?.phone      ?? null,
            street:        (profile as any)?.street     ?? null,
            city:          (profile as any)?.city       ?? null,
            state:         (profile as any)?.state      ?? null,
            zip:           (profile as any)?.zip        ?? null,
            email:         user.email ?? '',
          }}
          readOnly={isReadOnly}
        />
      </SettingsSection>

      <SettingsSection label="Security">
        <SecurityPanel
          email={user.email ?? ''}
          hasPassword={hasPassword}
          hasGoogle={hasGoogle}
          signedInAt={signedInAt}
          readOnly={isReadOnly}
        />
      </SettingsSection>

      {isAdmin && (
        <SettingsSection label="Export & Delete" hint="Download your data or permanently delete your account.">
          <Link
            href="/settings/export"
            style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              borderRadius: '16px', background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))',
              padding: '16px 20px', marginBottom: '20px', textDecoration: 'none',
            }}
          >
            <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'rgba(42,82,160,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Download style={{ width: '16px', height: '16px', color: '#2a52a0' }} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '15px', fontWeight: 700, color: 'hsl(var(--foreground))' }}>Download a copy of your data</p>
              <p style={{ fontSize: '14px', color: 'hsl(var(--muted-foreground))', marginTop: '2px' }}>Export your contacts, notes, and calendar as a CSV file</p>
            </div>
            <ChevronRight style={{ width: '16px', height: '16px', color: 'hsl(var(--muted-foreground))', flexShrink: 0 }} />
          </Link>
          <ExportDeletePanel initial={deletionStatus} />
        </SettingsSection>
      )}

      <div style={{ borderRadius: '16px', background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', overflow: 'hidden' }}>
        <SignOutButton />
      </div>
    </div>
  )

  return (
    <div style={{ paddingBottom: '64px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 900, color: 'var(--heading)', letterSpacing: '-0.03em' }}>
          Settings
        </h1>
        <p style={{ fontSize: '14px', color: 'hsl(var(--muted-foreground))', marginTop: '4px' }}>
          Manage your workspace and account
        </p>
      </div>

      <SettingsTabs
        workspaceContent={workspaceTab}
        teamContent={teamTab}
        auditContent={auditTab}
        accountContent={accountTab}
        isAdmin={isAdmin}
      />
    </div>
  )
}
