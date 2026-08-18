'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Search, Sun, Moon, Menu, X,
  LayoutDashboard, Users, Calendar,
  Package, ShoppingBag, FileText, Settings, ShieldCheck, Home, Wallet,
  HelpCircle, LogOut, BarChart2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import { DEFAULT_SETTINGS, type TenantSettings } from '@/lib/types/settings'
import { NotificationBell } from './NotificationBell'

type NavItem = {
  href:  string
  label: string
  icon:  React.ElementType
  color: string
  bg:    string
  flag:  keyof TenantSettings | null
}

const HOME_ITEM: NavItem = {
  href: '/dashboard', label: 'Home', icon: Home,
  color: '#2a52a0', bg: 'rgba(42,82,160,0.12)', flag: null,
}

const PRIMARY_NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, color: '#4a9db5', bg: 'rgba(74,157,181,0.12)',  flag: null },
  { href: '/contacts',  label: 'Contacts',  icon: Users,           color: '#10b981', bg: 'rgba(16,185,129,0.12)', flag: null },
  { href: '/orders',    label: 'Orders',    icon: ShoppingBag,     color: '#f97316', bg: 'rgba(249,115,22,0.12)', flag: 'show_orders' },
  { href: '/calendar',  label: 'Calendar',  icon: Calendar,        color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)', flag: 'show_calendar' },
  { href: '/overview',  label: 'Overview',  icon: BarChart2,       color: '#22c55e', bg: 'rgba(34,197,94,0.12)',  flag: 'show_overview' },
]

const SECONDARY_NAV: NavItem[] = [
  { href: '/inventory', label: 'Inventory', icon: Package,     color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',   flag: 'show_catalog'   },
  { href: '/payments',  label: 'Payments',  icon: Wallet,      color: '#2a52a0', bg: 'rgba(42,82,160,0.12)',   flag: 'show_orders'    },
  { href: '/templates', label: 'Templates', icon: FileText,    color: '#a855f7', bg: 'rgba(168,85,247,0.12)',  flag: 'show_templates' },
  { href: '/support',   label: 'Support',   icon: HelpCircle,  color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)',  flag: null             },
  { href: '/settings',  label: 'Settings',  icon: Settings,    color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', flag: null             },
]

const ADMIN_ITEM: NavItem = {
  href: '/admin', label: 'Admin', icon: ShieldCheck,
  color: '#f472b6', bg: 'rgba(244,114,182,0.12)', flag: null,
}

export function TopBar({
  onOpenCmd,
  dark,
  onToggleDark,
  userInitial = 'U',
  settings = DEFAULT_SETTINGS,
  isAdmin = false,
}: {
  onOpenCmd:    () => void
  dark:         boolean
  onToggleDark: () => void
  userInitial?: string
  settings?:    TenantSettings
  isAdmin?:     boolean
}) {
  const pathname  = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const [exitPrompt, setExitPrompt] = useState(false)

  const active = (href: string) => pathname === href || pathname.startsWith(href + '/')

  const visiblePrimary   = PRIMARY_NAV.filter(i => i.flag === null || settings[i.flag])
  const visibleSecondary = SECONDARY_NAV.filter(i => i.flag === null || settings[i.flag])

  useEffect(() => { setMenuOpen(false) }, [pathname])
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  return (
    <>
      <header
        className="flex-shrink-0 flex items-center gap-3 px-4 md:px-5 border-b"
        style={{
          height: '64px',
          background: 'hsl(var(--card) / 0.85)',
          backdropFilter: 'blur(16px) saturate(180%)',
          WebkitBackdropFilter: 'blur(16px) saturate(180%)',
          borderColor: 'hsl(var(--border))',
        }}
      >
        {/* Logo */}
        <button
          onClick={() => setExitPrompt(true)}
          className="flex items-center gap-2 flex-shrink-0 hover:opacity-90 transition-opacity mr-2 bg-transparent border-0 cursor-pointer p-0"
        >
          <img src="/qcypher-logo.png" alt="QCypher" style={{ height: '38px', width: 'auto', display: 'block', transform: 'translateY(-5px)' }} />
          <span className="hidden sm:block" style={{ fontFamily: 'var(--font-sans)', fontWeight: 900, fontSize: '17px', color: 'var(--heading)', letterSpacing: '-0.03em', lineHeight: 1, marginLeft: '-10px' }}>
            QCypher
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

        {/* Primary nav — desktop, segmented-control style */}
        <nav
          className="hidden md:flex items-center gap-0.5 flex-shrink-0"
          style={{ background: 'hsl(var(--muted) / 0.6)', borderRadius: '14px', padding: '4px' }}
        >
          {visiblePrimary.map(({ href, label, icon: Icon, color }) => {
            const on = active(href)
            return (
              <Link key={href} href={href}
                className="flex items-center gap-1.5 rounded-[10px] text-[14px] transition-all duration-150"
                style={{
                  padding: '7px 14px',
                  fontWeight: on ? 700 : 500,
                  color: on ? '#fff' : 'hsl(var(--muted-foreground))',
                  background: on ? `linear-gradient(135deg,${color},${color}cc)` : 'transparent',
                  boxShadow: on ? `0 2px 10px -2px ${color}88` : 'none',
                }}
              >
                <Icon style={{ width: '15px', height: '15px', flexShrink: 0 }} strokeWidth={on ? 2.5 : 1.8} />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Mobile spacer */}
        <div className="flex-1 md:hidden" />

        {/* Search */}
        <button onClick={onOpenCmd}
          className="flex items-center gap-2.5 rounded-full border transition-all group"
          style={{
            padding: '8px 14px',
            color: 'hsl(var(--muted-foreground))',
            background: 'hsl(var(--muted) / 0.6)',
            borderColor: 'hsl(var(--border))',
            width: '210px',
            marginLeft: 'auto',
          }}
        >
          <Search style={{ width: '14px', height: '14px', flexShrink: 0 }} />
          <span className="flex-1 text-left truncate" style={{ fontSize: '14px', fontWeight: 500 }}>Search…</span>
          <kbd
            className="hidden lg:flex flex-shrink-0 items-center gap-0.5"
            style={{ fontSize: '11px', fontWeight: 700, padding: '2px 6px', borderRadius: '6px', background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }}
          >
            ⌘K
          </kbd>
        </button>

        {/* Right controls */}
        <div className="flex items-center gap-1 flex-shrink-0">
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

          <button onClick={() => setMenuOpen(o => !o)}
            className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-[hsl(var(--muted))] transition-colors"
            aria-label="Menu">
            {menuOpen
              ? <X    style={{ width: '17px', height: '17px', color: 'hsl(var(--foreground))' }} />
              : <Menu style={{ width: '17px', height: '17px', color: 'hsl(var(--muted-foreground))' }} />}
          </button>
        </div>
      </header>

      {/* Backdrop */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40"
          style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)' }}
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Drawer */}
      <aside
        className="fixed top-0 right-0 h-full z-50 flex flex-col"
        style={{
          width: 'min(320px, 85vw)',
          background: 'hsl(var(--card))',
          borderLeft: '1px solid hsl(var(--border))',
          boxShadow: '-8px 0 40px rgba(0,0,0,0.15)',
          transform: menuOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 border-b flex-shrink-0"
          style={{ height: '64px', borderColor: 'hsl(var(--border))' }}>
          <div className="flex items-center gap-2">
            <img src="/qcypher-logo.png" alt="QCypher" style={{ height: '42px', width: 'auto' }} />
            <span className="font-black text-[15px]" style={{ color: 'hsl(var(--foreground))' }}>Menu</span>
          </div>
          <button onClick={() => setMenuOpen(false)}
            className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-[hsl(var(--muted))] transition-colors">
            <X style={{ width: '16px', height: '16px', color: 'hsl(var(--muted-foreground))' }} />
          </button>
        </div>

        {/* Drawer body */}
        <div className="flex-1 overflow-y-auto py-3">
          <div className="px-3">
            <DrawerItem item={HOME_ITEM} active={active('/dashboard')} />
            {visibleSecondary.map(item => (
              <DrawerItem key={item.href} item={item} active={active(item.href)} />
            ))}
          </div>

          {isAdmin && (
            <>
              <div className="mx-5 my-2 h-px" style={{ background: 'hsl(var(--border))' }} />
              <SectionLabel>Admin</SectionLabel>
              <div className="px-3">
                <DrawerItem item={ADMIN_ITEM} active={active('/admin')} />
              </div>
            </>
          )}
        </div>

        {/* Drawer footer */}
        <div className="flex-shrink-0 border-t px-3 py-3"
          style={{ borderColor: 'hsl(var(--border))' }}>
          <LogoutButton />
        </div>
      </aside>
    </>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-5 pt-1 pb-1.5 text-[15px] font-bold uppercase tracking-widest"
      style={{ color: 'hsl(var(--muted-foreground))' }}>
      {children}
    </p>
  )
}

function LogoutButton() {
  const router = useRouter()
  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }
  return (
    <button onClick={handleLogout}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors hover:bg-[hsl(var(--muted))]">
      <span className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: 'rgba(239,68,68,0.1)' }}>
        <LogOut style={{ width: '15px', height: '15px', color: '#ef4444' }} strokeWidth={2} />
      </span>
      <span className="text-[15px] font-semibold" style={{ color: '#ef4444' }}>Sign out</span>
    </button>
  )
}

function DrawerItem({ item, active }: { item: NavItem; active: boolean }) {
  const { href, label, icon: Icon, color, bg } = item
  return (
    <Link href={href}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors hover:bg-[hsl(var(--muted))]"
      style={{ background: active ? bg : 'transparent' }}
    >
      <span className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: active ? color : bg }}>
        <Icon style={{ width: '15px', height: '15px', color: active ? '#fff' : color }} strokeWidth={2} />
      </span>
      <span className="text-[15px] font-semibold" style={{ color: active ? color : 'hsl(var(--foreground))' }}>
        {label}
      </span>
    </Link>
  )
}
