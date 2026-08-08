import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SettingsMenuBar, SettingsSection } from '@/components/settings/SettingsTabs'
import { ExportSelector } from '@/components/settings/ExportSelector'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Export Data' }

export default async function ExportDataPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Phase 21 RBAC — only owners (Admin tier) can export account data.
  const role = (user.app_metadata?.role as 'owner' | 'member' | 'read_only' | undefined) ?? 'member'
  if (role !== 'owner') redirect('/settings')

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

      <SettingsMenuBar active="export" />

      <div style={{ maxWidth: '640px' }}>
        <SettingsSection label="Export" hint="Choose what to include, then download a copy of your workspace data.">
          <div style={{
            borderRadius: '18px', background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))',
            overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}>
            {/* Branded header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '20px 24px', borderBottom: '1px solid hsl(var(--border))',
              background: 'linear-gradient(135deg, rgba(42,82,160,0.06), rgba(74,157,181,0.06))',
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/qcypher-logo.png" alt="QCypher" style={{ height: '30px', width: 'auto', display: 'block' }} />
              <div>
                <p style={{ fontSize: '15px', fontWeight: 700, color: 'hsl(var(--foreground))' }}>Data export</p>
                <p style={{ fontSize: '13px', color: 'hsl(var(--muted-foreground))' }}>CSV file, readable in Excel, Sheets, or any spreadsheet app</p>
              </div>
            </div>

            <div style={{ padding: '24px' }}>
              <ExportSelector />
              <p style={{ fontSize: '13px', color: 'hsl(var(--muted-foreground))', marginTop: '16px' }}>
                Audit logs and deleted or archived records aren't included.
              </p>
            </div>
          </div>
        </SettingsSection>
      </div>
    </div>
  )
}
