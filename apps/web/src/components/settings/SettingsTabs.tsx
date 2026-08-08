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
  const TABS = isAdmin ? ALL_TABS : ALL_TABS.filter(t => t.id === 'account')
  const [active, setActive] = useState<TabId>(isAdmin ? 'workspace' : 'account')

  const content = { workspace: workspaceContent, team: teamContent, audit: auditContent, account: accountContent }

  return (
    <div>
      {/* Tab bar */}
      <div style={{
        display: 'flex', gap: '4px',
        borderBottom: '1px solid hsl(var(--border))',
        marginBottom: '32px',
      }}>
        {TABS.map(({ id, label, icon: Icon }) => {
          const isActive = active === id
          return (
            <button
              key={id}
              onClick={() => setActive(id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '7px',
                padding: '10px 16px',
                fontSize: '14px', fontWeight: isActive ? 700 : 500,
                color: isActive ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
                background: 'none', border: 'none', cursor: 'pointer',
                borderBottom: isActive ? '2px solid #2a52a0' : '2px solid transparent',
                marginBottom: '-1px',
                transition: 'color 0.15s',
              }}
            >
              <Icon style={{ width: '15px', height: '15px', flexShrink: 0 }} />
              {label}
            </button>
          )
        })}
        {isAdmin && (
          <Link
            href="/settings/export"
            style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              padding: '10px 16px',
              fontSize: '14px', fontWeight: 500,
              color: 'hsl(var(--muted-foreground))',
              borderBottom: '2px solid transparent',
              marginBottom: '-1px',
              textDecoration: 'none',
              transition: 'color 0.15s',
            }}
          >
            <Download style={{ width: '15px', height: '15px', flexShrink: 0 }} />
            Export
          </Link>
        )}
      </div>

      {/* Active tab content */}
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
