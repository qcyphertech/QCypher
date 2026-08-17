'use client'

import { useEffect, useState } from 'react'

export const THEME_STORAGE_KEY = 'qc-theme'

export function useTheme() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    // The blocking script in RootLayout (app/layout.tsx) already applies
    // the class before paint on every full page load — this just syncs
    // React's state to match it. Falls back to localStorage directly (and
    // self-heals the class) in case that script didn't run for any reason.
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    const isDark = stored ? stored === 'dark' : document.documentElement.classList.contains('dark')
    setDark(isDark)
    document.documentElement.classList.toggle('dark', isDark)
  }, [])

  function toggle() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem(THEME_STORAGE_KEY, next ? 'dark' : 'light')
  }

  return { dark, toggle }
}
