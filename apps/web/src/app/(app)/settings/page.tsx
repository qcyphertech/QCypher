import { createClient } from '@/lib/supabase/server'
import { ThemeToggle } from '@/components/settings/ThemeToggle'
import { SignOutButton } from '@/components/settings/SignOutButton'
import { ModuleToggles } from '@/components/settings/ModuleToggles'
import { InventoryToggles } from '@/components/settings/InventoryToggles'
import { getInventoryTier } from '@/lib/actions/catalog'
import { MissedCallSetup } from '@/components/settings/MissedCallSetup'
import { ProfileForm } from '@/components/account/ProfileForm'
import { SecurityPanel } from '@/components/account/SecurityPanel'
import { TeamPanel } from '@/components/settings/TeamPanel'
import { RequestActionsPanel } from '@/components/settings/RequestActionsPanel'
import { AuditTrailPanel } from '@/components/settings/AuditTrailPanel'
import { ExportDeletePanel } from '@/components/settings/ExportDeletePanel'
import { SettingsTabs, SettingsSection, SettingsRow } from '@/components/settings/SettingsTabs'
import { PaymentAccountPanel } from '@/components/settings/PaymentAccountPanel'
import { AutomationSettingsPanel } from '@/components/settings/AutomationSettingsPanel'
import { LoyaltyRewardsPanel } from '@/components/settings/LoyaltyRewardsPanel'
import { ReferQCypherPanel } from '@/components/settings/ReferQCypherPanel'
import { BlogSettingsPanel } from '@/components/settings/BlogSettingsPanel'
import { getTeamMembers, getPendingInvites } from '@/lib/actions/team'
import { getAvailableModuleKeys } from '@/lib/actions/platform-modules'
import { getDeletionStatus, type DeletionStatus } from '@/lib/actions/account-deletion'
import { getPaymentAccountStatus } from '@/lib/actions/payment-accounts'
import { getWorkflowSettings, type WorkflowSettings } from '@/lib/actions/workflow-settings'
import { getLoyaltySettings, type LoyaltySettings } from '@/lib/actions/loyalty'
import { getMyTenantReferrals } from '@/lib/actions/tenant-referrals'
import { UpsellRulesPanel } from '@/components/settings/UpsellRulesPanel'
import { UpsellAnalyticsPanel } from '@/components/settings/UpsellAnalyticsPanel'
import { getUpsellRules } from '@/lib/actions/upsells'
import { LocationsPanel } from '@/components/settings/LocationsPanel'
import { getLocations } from '@/lib/actions/locations'
import { getStaffLocationAssignments } from '@/lib/actions/staff-locations'
import { createAdminClient, getTenantId } from '@/lib/supabase/admin'
import { DEFAULT_SETTINGS, type TenantSettings } from '@/lib/types/settings'
import { Sun } from 'lucide-react'
import { redirect } from 'next/navigation'
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

  const paymentAccount = isAdmin ? await getPaymentAccountStatus().catch(() => null) : null
  const DEFAULT_WORKFLOW_SETTINGS: WorkflowSettings = {
    invoice_reminder_enabled: true, invoice_reminder_days: 3,
    invoice_escalate_enabled: true, invoice_escalate_days: 10,
    review_request_enabled: true, review_request_days: 1,
    review_reminder_enabled: true, review_reminder_days: 7,
    google_review_url: null,
  }
  const workflowSettings = isAdmin ? await getWorkflowSettings().catch(() => DEFAULT_WORKFLOW_SETTINGS) : DEFAULT_WORKFLOW_SETTINGS
  const loyaltySettings: LoyaltySettings | null = isAdmin && tenantId ? await getLoyaltySettings(tenantId).catch(() => null) : null
  const myReferrals = isAdmin ? await getMyTenantReferrals().catch(() => []) : []
  const [upsellRules, catalogItemsForUpsells] = isAdmin && tenantId ? await Promise.all([
    getUpsellRules(tenantId).catch(() => []),
    createAdminClient().from('catalog_items').select('id, name, base_price').eq('tenant_id', tenantId).eq('is_active', true).order('name').then(r => r.data ?? []),
  ]) : [[], []]
  const locations = isAdmin && tenantId ? await getLocations(tenantId).catch(() => []) : []
  const staffAssignments = isAdmin && tenantId && locations.length > 0 ? await getStaffLocationAssignments(tenantId).catch(() => []) : []
  const inventoryTier = tenantId ? await getInventoryTier().catch(() => 'lite' as const) : 'lite' as const

  const settings: TenantSettings = { ...DEFAULT_SETTINGS, ...(tenant?.settings as Record<string, unknown> ?? {}) }
  const identities  = user.identities ?? []
  const hasPassword = identities.some(i => i.provider === 'email')
  const hasGoogle   = identities.some(i => i.provider === 'google')
  const signedInAt  = user.last_sign_in_at
    ? new Date(user.last_sign_in_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Unknown'

  // ── Tab content blocks (server-rendered, passed as props) ──────────────────

  const workspaceTab = (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <SettingsSection label="Appearance">
        <div style={{ borderRadius: '16px', background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', overflow: 'hidden' }}>
          <SettingsRow icon={<Sun style={{ width: '15px', height: '15px' }} />} iconColor="#2a52a0" label="Theme" hint="Light or dark mode" right={<ThemeToggle />} />
        </div>
      </SettingsSection>

      <SettingsSection label="Modules" hint="Toggle features on or off — hidden modules keep their data.">
        <ModuleToggles settings={settings} availableModules={availableModuleKeys ? [...availableModuleKeys] : undefined} />
      </SettingsSection>

      {inventoryTier === 'full' && (
        <SettingsSection label="Inventory (Full)" hint="Optional inventory features — only available on your Full inventory tier.">
          <InventoryToggles settings={settings} />
        </SettingsSection>
      )}

      <SettingsSection label="Automations">
        <MissedCallSetup currentNumber={(tenant as any)?.telnyx_number ?? null} />
      </SettingsSection>
    </div>
  )

  const teamTab = (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <SettingsSection label="Team" hint="Invite colleagues to your workspace. They'll see the same contacts, orders, and inventory.">
        <TeamPanel members={members} pending={pendingInvites} currentUserId={user.id} locations={locations.filter(l => l.is_active).map(l => ({ id: l.id, location_name: l.location_name }))} staffAssignments={staffAssignments} />
      </SettingsSection>
      <SettingsSection label="Account & Billing" hint="Plan changes require QCypher's approval.">
        <RequestActionsPanel />
      </SettingsSection>
    </div>
  )

  const paymentsTab = (
    <PaymentAccountPanel account={paymentAccount} />
  )

  const blogTab = (
    <div>
      <SettingsSection label="Blog" hint="Generate an AI-written blog post from one of your services, then publish it to your customer portal.">
        {tenant?.slug && <BlogSettingsPanel tenantSlug={tenant.slug} />}
      </SettingsSection>
    </div>
  )

  const automationTab = (
    <div>
      <SettingsSection label="Automation" hint="Automatic invoice reminders and review requests — sent daily.">
        <AutomationSettingsPanel initial={workflowSettings} />
      </SettingsSection>
    </div>
  )

  const loyaltyTab = (
    <div>
      <SettingsSection label="Loyalty & Rewards" hint="Reward repeat customers with tier discounts and referral credit, redeemable at checkout.">
        {loyaltySettings && <LoyaltyRewardsPanel initial={loyaltySettings} />}
      </SettingsSection>
      <SettingsSection label="Refer QCypher" hint="Earn $50 for every service business you refer to QCypher.">
        <ReferQCypherPanel initial={myReferrals} />
      </SettingsSection>
    </div>
  )

  const upsellsTab = (
    <div>
      <SettingsSection label="Upsell Rules" hint="Suggest add-ons at bundle pricing while building a quote or invoice.">
        <UpsellRulesPanel initial={upsellRules} catalogItems={catalogItemsForUpsells as { id: string; name: string; base_price: number }[]} />
      </SettingsSection>
      {tenantId && (
        <SettingsSection label="Performance">
          <UpsellAnalyticsPanel tenantId={tenantId} />
        </SettingsSection>
      )}
    </div>
  )

  const locationsTab = (
    <div>
      <SettingsSection label="Locations" hint="Organize contacts and jobs across multiple business locations.">
        <LocationsPanel initial={locations} />
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
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
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
        <SettingsSection label="Delete Account" hint="Permanently delete your account and all its data.">
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
        paymentsContent={paymentsTab}
        automationContent={automationTab}
        loyaltyContent={loyaltyTab}
        upsellsContent={upsellsTab}
        locationsContent={locationsTab}
        blogContent={blogTab}
        auditContent={auditTab}
        accountContent={accountTab}
        isAdmin={isAdmin}
      />
    </div>
  )
}
