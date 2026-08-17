'use client'

import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'

// Was previously a second, independent theme implementation — its own
// useState synced only from document.documentElement.classList.contains
// on its own mount, same bug useTheme() had (see that hook's comments)
// plus a real desync risk: toggling here vs. toggling via TopBar (which
// uses useTheme() directly) each had their own React state unaware of
// the other, so this button's Sun/Moon icon could show the wrong state
// after toggling from the other control. Now shares the same hook/state
// source as every other theme-aware consumer (TopBar, CrmBotWidget).
export function ThemeToggle() {
  const { dark, toggle } = useTheme()

  return (
    <button
      onClick={toggle}
      className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] transition-colors"
    >
      {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  )
}
