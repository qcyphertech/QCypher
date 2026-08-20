'use client'

import Link from 'next/link'
import { Search, Sun, Moon } from 'lucide-react'
import { useState } from 'react'
import { DEFAULT_SETTINGS, type TenantSettings } from '@/lib/types/settings'
import { NotificationBell } from './NotificationBell'

// Logo + "CRM" badge live here, flush left like the marketing site's nav
// bar — always visible (mobile, collapsed sidebar, expanded sidebar alike),
// since the sidebar itself no longer carries its own copy. A 3-column grid
// (logo / search / right controls) keeps the search bar at the header's
// true center regardless of how wide the logo or right controls are.
export function TopBar({
  onOpenCmd,
  dark,
  onToggleDark,
  userInitial = 'U',
}: {
  onOpenCmd:    () => void
  dark:         boolean
  onToggleDark: () => void
  userInitial?: string
  settings?:    TenantSettings
  isAdmin?:     boolean
}) {
  const [exitPrompt, setExitPrompt] = useState(false)

  return (
    <header
      className="flex-shrink-0 grid items-center gap-3 pl-4 pr-4 md:pl-5 md:pr-5 border-b"
      style={{
        height: '64px',
        gridTemplateColumns: '1fr auto 1fr',
        background: 'hsl(var(--card) / 0.85)',
        backdropFilter: 'blur(16px) saturate(180%)',
        WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        borderColor: 'hsl(var(--border))',
      }}
    >
      <button
        onClick={() => setExitPrompt(true)}
        className="flex items-center gap-2.5 flex-shrink-0 hover:opacity-90 transition-opacity bg-transparent border-0 cursor-pointer p-0"
      >
        {/* Mobile: icon only, no wordmark/pill text — no inline `display`
            here deliberately: an inline style would override sm:hidden's
            display:none at wider viewports regardless of the media query,
            since inline styles always win over stylesheet rules. */}
        <img src="/qcypher-logo.png" alt="QCypher" className="h-[30px] sm:hidden" style={{ width: 'auto' }} />
        {/* sm+: full wordmark, swapped by theme, plus the CRM badge */}
        <img
          src={dark ? '/qcypher-logo-footer.png' : '/qcypher-logo-horizontal.png'}
          alt="QCypher"
          className="hidden sm:block h-[34px]"
          style={{ width: 'auto' }}
        />
        <span
          className="hidden sm:inline-flex items-center"
          style={{
            fontFamily: 'var(--font-space-grotesk)',
            fontWeight: 700,
            fontSize: '11px',
            letterSpacing: '0.06em',
            padding: '4px 10px 4px 8px',
            borderRadius: '999px',
            color: 'var(--heading)',
            background: 'rgba(74,157,181,0.14)',
          }}
        >
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00a87a', display: 'inline-block', marginRight: '5px' }} />
          CRM
        </span>
      </button>

      {/* Exit confirmation dialog */}
      {exitPrompt && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setExitPrompt(false)}
        >
          <div
            className="rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4"
            style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-center mb-4">
              <img src="/qcypher-logo.png" alt="QCypher" style={{ height: '72px', width: 'auto', display: 'block' }} />
            </div>
            <h2 className="text-[17px] font-bold mb-1" style={{ color: 'hsl(var(--foreground))' }}>
              Leave QCypher CRM?
            </h2>
            <p className="text-[15px] mb-5" style={{ color: 'hsl(var(--muted-foreground))' }}>
              You&apos;ll be taken to the QCypher homepage. Any unsaved changes will be lost.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setExitPrompt(false)}
                className="flex-1 py-2.5 rounded-xl text-[15px] font-semibold transition-colors"
                style={{ background: 'hsl(var(--muted))', color: 'hsl(var(--foreground))' }}
              >
                Stay here
              </button>
              <Link
                href="/"
                className="flex-1 py-2.5 rounded-xl text-[15px] font-semibold text-white text-center transition-opacity hover:opacity-90"
                style={{ background: 'linear-gradient(135deg,#1a3070,#4a9db5)' }}
                onClick={() => setExitPrompt(false)}
              >
                Go to homepage
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <button onClick={onOpenCmd}
        className="flex items-center gap-2.5 rounded-full border transition-all group flex-shrink-0 w-[120px] sm:w-[210px]"
        style={{
          padding: '8px 14px',
          color: 'hsl(var(--muted-foreground))',
          background: 'hsl(var(--muted) / 0.6)',
          borderColor: 'hsl(var(--border))',
        }}
      >
        <Search style={{ width: '14px', height: '14px', flexShrink: 0 }} />
        <span className="flex-1 text-left truncate" style={{ fontSize: '14px', fontWeight: 500 }}>Search…</span>
      </button>

      {/* Right controls */}
      <div className="flex items-center gap-1 flex-shrink-0 justify-self-end">
        <button onClick={onToggleDark}
          className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-[hsl(var(--muted))] transition-colors"
          title={dark ? 'Light mode' : 'Dark mode'}>
          {dark
            ? <Sun  style={{ width: '16px', height: '16px', color: '#f59e0b' }} />
            : <Moon style={{ width: '16px', height: '16px', color: 'hsl(var(--muted-foreground))' }} />}
        </button>

        <NotificationBell />

        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-black flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#1a3070,#4a9db5)', fontSize: '12px', letterSpacing: '-0.02em' }}>
          {userInitial}
        </div>
      </div>
    </header>
  )
}
