'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Sun, Blocks, Zap, Users, User, Shield, LogOut, ScrollText, Download } from 'lucide-react'

const ALL_TABS = [
  { id: 'workspace', label: 'Workspace',   icon: Blocks     },
  { id: 'team',      label: 'Team',        icon: Users      },
  { id: 'audit',     label: 'Audit Trail', icon: ScrollText },
  { id: 'account',   label: 'Account',     icon: User       },
] as const

type TabId = typeof ALL_TABS[number]['id']

const itemStyle = (isActive: boolean): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', gap: '7px',
  padding: '10px 16px',
  fontSize: '14px', fontWeight: isActive ? 700 : 500,
  color: isActive ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
  background: 'none', border: 'none', cursor: 'pointer',
  borderBottom: isActive ? '2px solid #2a52a0' : '2px solid transparent',
  marginBottom: '-1px',
  textDecoration: 'none',
  transition: 'color 0.15s',
})

// Shared menu bar rendering, reused by both the in-page tabs (settings/page.tsx)
// and the solo /settings/export page — so the two look and behave identically,
// down to the same hover/active treatment on every item.
export function SettingsMenuBar({
  active, onTabClick, isAdmin = true,
}: {
  active: TabId | 'export'
  // Present when used inside the tabbed /settings page (in-page switching).
  // Absent on the solo /settings/export page, where Workspace/Team/Audit/
  // Account instead link back to /settings.
  onTabClick?: (id: TabId) => void
  isAdmin?: boolean
}) {
  const TABS = isAdmin ? ALL_TABS : ALL_TABS.filter(t => t.id === 'account')

  return (
    <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid hsl(var(--border))', marginBottom: '32px' }}>
      {TABS.map(({ id, label, icon: Icon }) => {
        const isActive = active === id
        const content = <><Icon style={{ width: '15px', height: '15px', flexShrink: 0 }} />{label}</>
        return onTabClick ? (
          <button key={id} onClick={() => onTabClick(id)} style={itemStyle(isActive)}>{content}</button>
        ) : (
          <Link key={id} href="/settings" style={itemStyle(isActive)}>{content}</Link>
        )
      })}
      {isAdmin && (
        <Link href="/settings/export" style={itemStyle(active === 'export')}>
          <Download style={{ width: '15px', height: '15px', flexShrink: 0 }} />
          Export
        </Link>
      )}
    </div>
  )
}

type Props = {
  workspaceContent: React.ReactNode
  teamContent: React.ReactNode
  auditContent: React.ReactNode
  accountContent: React.ReactNode
  // Phase 21 RBAC — only admins (owner role) see Workspace/Team/Audit; User
  // and Read-only roles only ever see their own Account tab.
  isAdmin?: boolean
}

export function SettingsTabs({ workspaceContent, teamContent, auditContent, accountContent, isAdmin = true }: Props) {
  const [active, setActive] = useState<TabId>(isAdmin ? 'workspace' : 'account')
  const content = { workspace: workspaceContent, team: teamContent, audit: auditContent, account: accountContent }

  return (
    <div>
      <SettingsMenuBar active={active} onTabClick={setActive} isAdmin={isAdmin} />
      <div>{content[active]}</div>
    </div>
  )
}

// Section wrapper used inside each tab
export function SettingsSection({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '36px' }}>
      <div style={{ marginBottom: '12px', paddingLeft: '2px' }}>
        <p style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))' }}>
          {label}
        </p>
        {hint && (
          <p style={{ fontSize: '13px', color: 'hsl(var(--muted-foreground))', marginTop: '3px' }}>{hint}</p>
        )}
      </div>
      {children}
    </div>
  )
}
