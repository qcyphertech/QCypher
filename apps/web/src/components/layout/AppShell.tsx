'use client'

import { useState } from 'react'
import { TopBar } from './TopBar'
import { BottomNav } from './BottomNav'
import { CommandPalette } from './CommandPalette'
import { NoBottomOverscroll } from './NoBottomOverscroll'
import { CrmBotWidget } from './CrmBotWidget'
import { useTheme } from '@/hooks/useTheme'
import { DEFAULT_SETTINGS, type TenantSettings } from '@/lib/types/settings'

export function AppShell({
  children,
  isAdmin = false,
  settings = DEFAULT_SETTINGS,
  userInitial = 'U',
}: {
  children:       React.ReactNode
  isAdmin?:       boolean
  settings?:      TenantSettings
  userInitial?:   string
}) {
  const [cmdOpen, setCmdOpen] = useState(false)
  const { dark, toggle } = useTheme()

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      {/* Fixed top bar */}
      <div className="fixed top-0 inset-x-0 z-50 print:hidden">
        <TopBar
          onOpenCmd={() => setCmdOpen(true)}
          dark={dark}
          onToggleDark={toggle}
          userInitial={userInitial}
          settings={settings}
          isAdmin={isAdmin}
        />
      </div>

      {/* Scrollable page content — offset by header height (64px) + bottom nav (mobile) */}
      <main className="pt-[64px] pb-20 md:pb-6 px-4 md:px-6 print:pt-0 print:pb-0 print:px-0">
        {children}
      </main>

      <BottomNav settings={settings} />

      {settings.show_crm_bot && <CrmBotWidget dark={dark} />}

      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} isAdmin={isAdmin} />
      <NoBottomOverscroll />
    </div>
  )
}
