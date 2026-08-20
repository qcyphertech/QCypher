'use client'

import { useState } from 'react'
import { TopBar } from './TopBar'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'
import { MobileMenuSheet } from './MobileMenuSheet'
import { CommandPalette } from './CommandPalette'
import { NoBottomOverscroll } from './NoBottomOverscroll'
import { CrmBotWidget } from './CrmBotWidget'
import { useTheme } from '@/hooks/useTheme'
import { DEFAULT_SETTINGS, type TenantSettings } from '@/lib/types/settings'

export function AppShell({
  children,
  isAdmin = false,
  isSuperAdmin = false,
  settings = DEFAULT_SETTINGS,
  userInitial = 'U',
}: {
  children:       React.ReactNode
  isAdmin?:       boolean
  isSuperAdmin?:  boolean
  settings?:      TenantSettings
  userInitial?:   string
}) {
  const [cmdOpen, setCmdOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const { dark, toggle } = useTheme()

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      {/* Desktop collapsible sidebar */}
      <Sidebar isAdmin={isAdmin} isSuperAdmin={isSuperAdmin} settings={settings} />

      {/* Fixed top bar — spans the full viewport width and sits above
          everything else in the app, including in-page modals (most of
          which are z-50, tying the header, or z-[9999] for a couple of
          full-screen viewers) — see .app-header-fixed. The sidebar starts
          below it (top: 64px) instead of sharing the same top line. */}
      <div className="app-header-fixed fixed top-0 inset-x-0 print:hidden">
        <TopBar
          onOpenCmd={() => setCmdOpen(true)}
          dark={dark}
          onToggleDark={toggle}
          userInitial={userInitial}
        />
      </div>

      {/* Scrollable page content — offset by header height (64px) + bottom nav
          (mobile) + sidebar width (desktop, via app-main-offset) */}
      <main className="app-main-offset pt-[64px] pb-20 md:pb-6 print:pt-0 print:pb-0 print:px-0">
        {children}
      </main>

      <BottomNav settings={settings} menuOpen={menuOpen} onOpenMenu={() => setMenuOpen(o => !o)} />

      {settings.show_crm_bot && <CrmBotWidget dark={dark} />}

      <MobileMenuSheet open={menuOpen} onClose={() => setMenuOpen(false)} isAdmin={isAdmin} isSuperAdmin={isSuperAdmin} settings={settings} />
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} isAdmin={isAdmin} isSuperAdmin={isSuperAdmin} />
      <NoBottomOverscroll />
    </div>
  )
}
