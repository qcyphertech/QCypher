import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Download } from 'lucide-react'
import { SettingsMenuBar, SettingsSection } from '@/components/settings/SettingsTabs'
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
        <SettingsSection label="Export" hint="Download a complete copy of your workspace data.">
          <div style={{ borderRadius: '16px', background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(42,82,160,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Download style={{ width: '18px', height: '18px', color: '#2a52a0' }} />
              </div>
              <p style={{ fontSize: '16px', fontWeight: 700 }}>Download a copy of your data</p>
            </div>
            <p style={{ fontSize: '14px', color: 'hsl(var(--muted-foreground))', marginBottom: '20px', lineHeight: 1.6 }}>
              Export all your contacts, their notes, and calendar event counts as a CSV file — readable in Excel,
              Google Sheets, or any spreadsheet app. Audit logs and deleted or archived records aren't included.
            </p>
            <a
              href="/api/export/csv"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                fontSize: '15px', fontWeight: 600, color: '#fff',
                background: '#2a52a0', padding: '11px 20px', borderRadius: '10px',
                textDecoration: 'none',
              }}
            >
              <Download style={{ width: '15px', height: '15px' }} /> Download CSV
            </a>
          </div>
        </SettingsSection>
      </div>
    </div>
  )
}
