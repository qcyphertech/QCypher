'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Blocks, Users, User, ScrollText, Download, Wallet, Zap, Gift, Sparkles } from 'lucide-react'

const ALL_TABS = [
  { id: 'account',     label: 'Account',      icon: User,       color: '#10b981' },
  { id: 'workspace',   label: 'Workspace',    icon: Blocks,     color: '#2a52a0' },
  { id: 'team',        label: 'Team',         icon: Users,      color: '#a855f7' },
  { id: 'payments',    label: 'Payment Settings', icon: Wallet, color: '#0ea5e9' },
  { id: 'automation',  label: 'Automation',   icon: Zap,        color: '#eab308' },
  { id: 'loyalty',     label: 'Loyalty & Rewards', icon: Gift,  color: '#ec4899' },
  { id: 'upsells',     label: 'Upsell & Bundles', icon: Sparkles, color: '#06b6d4' },
  { id: 'audit',       label: 'Audit Trail',  icon: ScrollText, color: '#f97316' },
] as const

type TabId = typeof ALL_TABS[number]['id']

// ── Desktop: persistent left sidebar, icon-circle rows ──────────────────────
function sidebarItemStyle(isActive: boolean): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '10px 12px', borderRadius: '12px',
    fontSize: '14px', fontWeight: isActive ? 700 : 500,
    color: isActive ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
    background: isActive ? 'hsl(var(--muted))' : 'transparent',
    border: 'none', cursor: 'pointer', textDecoration: 'none',
    width: '100%', textAlign: 'left',
    transition: 'background 0.15s, color 0.15s',
  }
}

function SidebarIcon({ Icon, color }: { Icon: React.ElementType; color: string }) {
  return (
    <div style={{
      width: '30px', height: '30px', borderRadius: '9px', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: `${color}1a`,
    }}>
      <Icon style={{ width: '15px', height: '15px', color }} />
    </div>
  )
}

// Shared nav, reused by both the in-page tabbed settings page and the solo
// /settings/export page — so the two look and behave identically.
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
  const EXPORT = { id: 'export' as const, label: 'Export', icon: Download, color: '#0ea5e9' }
  const items = isAdmin ? [...TABS, EXPORT] : TABS

  return (
    <>
      {/* Desktop sidebar */}
      <nav
        className="hidden md:flex"
        style={{ flexDirection: 'column', gap: '2px', width: '220px', flexShrink: 0 }}
      >
        {items.map(({ id, label, icon: Icon, color }) => {
          const isActive = active === id
          const content = (
            <>
              <SidebarIcon Icon={Icon} color={color} />
              {label}
            </>
          )
          if (id === 'export') {
            return <Link key={id} href="/settings/export" style={sidebarItemStyle(isActive)}>{content}</Link>
          }
          return onTabClick ? (
            <button key={id} onClick={() => onTabClick(id)} style={sidebarItemStyle(isActive)}>{content}</button>
          ) : (
            <Link key={id} href="/settings" style={sidebarItemStyle(isActive)}>{content}</Link>
          )
        })}
      </nav>

      {/* Mobile: horizontal tabs */}
      <div className="flex md:hidden" style={{ gap: '4px', borderBottom: '1px solid hsl(var(--border))', marginBottom: '24px', overflowX: 'auto' }}>
        {items.map(({ id, label, icon: Icon }) => {
          const isActive = active === id
          const mobileStyle: React.CSSProperties = {
            display: 'flex', alignItems: 'center', gap: '7px', flexShrink: 0,
            padding: '10px 14px',
            fontSize: '14px', fontWeight: isActive ? 700 : 500,
            color: isActive ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
            background: 'none', border: 'none', cursor: 'pointer',
            borderBottom: isActive ? '2px solid #2a52a0' : '2px solid transparent',
            marginBottom: '-1px', textDecoration: 'none',
          }
          const content = <><Icon style={{ width: '15px', height: '15px', flexShrink: 0 }} />{label}</>
          if (id === 'export') {
            return <Link key={id} href="/settings/export" style={mobileStyle}>{content}</Link>
          }
          return onTabClick ? (
            <button key={id} onClick={() => onTabClick(id)} style={mobileStyle}>{content}</button>
          ) : (
            <Link key={id} href="/settings" style={mobileStyle}>{content}</Link>
          )
        })}
      </div>
    </>
  )
}

type Props = {
  workspaceContent: React.ReactNode
  teamContent: React.ReactNode
  paymentsContent: React.ReactNode
  automationContent: React.ReactNode
  loyaltyContent: React.ReactNode
  upsellsContent: React.ReactNode
  auditContent: React.ReactNode
  accountContent: React.ReactNode
  // Phase 21 RBAC — only admins (owner role) see Workspace/Team/Payments/Audit;
  // User and Read-only roles only ever see their own Account tab.
  isAdmin?: boolean
}

export function SettingsTabs({ workspaceContent, teamContent, paymentsContent, automationContent, loyaltyContent, upsellsContent, auditContent, accountContent, isAdmin = true }: Props) {
  const [active, setActive] = useState<TabId>(isAdmin ? 'workspace' : 'account')
  const content = { workspace: workspaceContent, team: teamContent, payments: paymentsContent, automation: automationContent, loyalty: loyaltyContent, upsells: upsellsContent, audit: auditContent, account: accountContent }

  return (
    <div className="flex flex-col md:flex-row" style={{ gap: '32px', alignItems: 'flex-start' }}>
      <SettingsMenuBar active={active} onTabClick={setActive} isAdmin={isAdmin} />
      <div style={{ flex: 1, minWidth: 0, width: '100%' }}>{content[active]}</div>
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

// Reusable icon-circle + title/subtitle + right-aligned control row, matching
// the reference layout — used for simple action/summary rows (Theme, Sign
// out, Delete account, etc.) across the settings sub-panels.
export function SettingsRow({
  icon, iconColor = '#2a52a0', label, hint, right, onClick,
}: {
  // A rendered icon element (e.g. <Sun />), not a component reference — this
  // file is a Client Component, and a bare component reference passed as a
  // prop from a Server Component parent can't cross that boundary (Next.js
  // throws "Functions cannot be passed directly to Client Components").
  icon: React.ReactElement
  iconColor?: string
  label: string
  hint?: string
  right?: React.ReactNode
  onClick?: () => void
}) {
  const Wrapper = onClick ? 'button' : 'div'
  return (
    <Wrapper
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '14px',
        padding: '13px 16px', width: '100%',
        background: 'none', border: 'none', textAlign: 'left',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div style={{
        width: '30px', height: '30px', borderRadius: '9px', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: `${iconColor}1a`, color: iconColor,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '15px', fontWeight: 600, color: 'hsl(var(--foreground))' }}>{label}</p>
        {hint && <p style={{ fontSize: '14px', color: 'hsl(var(--muted-foreground))', marginTop: '2px' }}>{hint}</p>}
      </div>
      {right && <div style={{ flexShrink: 0 }}>{right}</div>}
    </Wrapper>
  )
}
