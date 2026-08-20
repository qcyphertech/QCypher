'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { DEFAULT_SETTINGS, type TenantSettings } from '@/lib/types/settings'
import { HOME_ITEM, PRIMARY_NAV, SECONDARY_NAV, ADMIN_ITEM, type NavItem } from './navItems'

// Desktop-only (hidden on mobile — BottomNav + MobileMenuSheet cover
// navigation there). Icon-only rail below 1280px that expands on hover
// (see .qc-sidebar in globals.css), permanently expanded at 1280px+.
export function Sidebar({
  isAdmin = false,
  isSuperAdmin = false,
  settings = DEFAULT_SETTINGS,
}: {
  isAdmin?:      boolean
  isSuperAdmin?: boolean
  settings?:     TenantSettings
}) {
  const pathname = usePathname()
  const router = useRouter()
  const active = (href: string) => pathname === href || pathname.startsWith(href + '/')

  const visibleSecondary = SECONDARY_NAV.filter(i => i.flag === null || settings[i.flag])
  const visiblePrimary   = PRIMARY_NAV.filter(i => i.flag === null || settings[i.flag])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <aside
      className="qc-sidebar hidden md:flex fixed top-0 left-0 h-full flex-col z-40 print:hidden overflow-hidden"
      style={{
        background: '#081540',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        transition: 'width 0.15s ease',
      }}
    >
      {/* Logo */}
      <Link href="/dashboard" className="flex items-center gap-2 flex-shrink-0 px-4" style={{ height: '64px' }}>
        <img src="/qcypher-logo.png" alt="QCypher" style={{ height: '32px', width: 'auto', flexShrink: 0 }} />
        <span className="qc-sidebar-label font-black text-[15px] whitespace-nowrap" style={{ color: '#fff' }}>
          QCypher
        </span>
      </Link>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-3 space-y-0.5">
        <SidebarItem item={HOME_ITEM} active={active('/dashboard')} />
        {visiblePrimary.filter(i => i.href !== '/dashboard').map(item => (
          <SidebarItem key={item.href} item={item} active={active(item.href)} />
        ))}

        <div className="my-2 mx-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />

        {visibleSecondary.map(item => (
          <SidebarItem key={item.href} item={item} active={active(item.href)} />
        ))}

        {(isAdmin || isSuperAdmin) && (
          <>
            <div className="my-2 mx-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <SidebarItem item={ADMIN_ITEM} active={active('/admin')} />
          </>
        )}
      </nav>

      <div className="flex-shrink-0 px-3 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-2 py-2 rounded-xl transition-colors hover:bg-white/5">
          <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(239,68,68,0.14)' }}>
            <LogOut style={{ width: '14px', height: '14px', color: '#f87171' }} strokeWidth={2} />
          </span>
          <span className="qc-sidebar-label text-[13.5px] font-semibold whitespace-nowrap" style={{ color: '#f87171' }}>
            Sign out
          </span>
        </button>
      </div>
    </aside>
  )
}

function SidebarItem({ item, active }: { item: NavItem; active: boolean }) {
  const { href, label, icon: Icon, color } = item
  return (
    <Link href={href}
      className="flex items-center gap-3 px-2 py-2 rounded-xl transition-colors"
      style={{ background: active ? 'rgba(255,255,255,0.08)' : 'transparent' }}
    >
      <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: active ? color : 'rgba(255,255,255,0.06)' }}>
        <Icon style={{ width: '15px', height: '15px', color: active ? '#fff' : 'rgba(255,255,255,0.65)' }} strokeWidth={2} />
      </span>
      <span className="qc-sidebar-label text-[13.5px] font-semibold whitespace-nowrap"
        style={{ color: active ? '#fff' : 'rgba(255,255,255,0.7)' }}>
        {label}
      </span>
    </Link>
  )
}
