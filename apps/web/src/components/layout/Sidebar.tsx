'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, GitBranch, Calendar, FileText, Settings, ShieldCheck, Package, ShoppingBag, Wallet } from 'lucide-react'
import { DEFAULT_SETTINGS, type TenantSettings } from '@/lib/types/settings'

const ALL_NAV = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', color: '#818cf8', flag: null },
  { href: '/contacts',  icon: Users,            label: 'Contacts',  color: '#34d399', flag: null },
  { href: '/pipeline',  icon: GitBranch,        label: 'Pipeline',  color: '#fb923c', flag: 'show_pipeline' as const },
  { href: '/calendar',  icon: Calendar,         label: 'Calendar',  color: '#38bdf8', flag: 'show_calendar' as const },
  { href: '/inventory', icon: Package,          label: 'Inventory', color: '#f59e0b', flag: 'show_catalog' as const },
  { href: '/orders',    icon: ShoppingBag,      label: 'Orders',    color: '#10b981', flag: 'show_orders' as const },
  { href: '/payments',  icon: Wallet,           label: 'Payments',  color: '#818cf8', flag: 'show_orders' as const },
  { href: '/templates', icon: FileText,         label: 'Templates', color: '#c084fc', flag: 'show_templates' as const },
  { href: '/settings',  icon: Settings,         label: 'Settings',  color: '#94a3b8', flag: null },
]

export function Sidebar({
  isAdmin = false,
  settings = DEFAULT_SETTINGS,
}: {
  isAdmin?: boolean
  settings?: TenantSettings
}) {
  const pathname = usePathname()
  const active = (href: string) => pathname === href || pathname.startsWith(href + '/')

  const nav = ALL_NAV.filter(item => item.flag === null || settings[item.flag])

  return (
    <aside className="flex-shrink-0 flex flex-col" style={{ background: 'var(--sidebar-bg)', width: '236px' }}>

      <Link href="/dashboard" className="px-5 pt-6 pb-5 flex items-center gap-3 hover:opacity-90 transition-opacity">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#2a52a0,#4a9db5)' }}
        >
          <span className="text-white font-black" style={{ fontSize: '15px' }}>Q</span>
        </div>
        <div>
          <p className="text-white font-black leading-tight" style={{ fontSize: '15px', letterSpacing: '-0.01em' }}>QCypher</p>
          <p className="leading-tight" style={{ fontSize: '15px', color: 'rgba(255,255,255,0.45)', marginTop: '1px' }}>CRM</p>
        </div>
      </Link>

      <p className="px-6 mb-2" style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)' }}>
        Menu
      </p>

      <nav className="flex-1 px-3 space-y-0.5">
        {nav.map(({ href, icon: Icon, label, color }) => {
          const isActive = active(href)
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-xl transition-all"
              style={{
                padding: '10px 14px',
                fontSize: '14.5px',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#fff' : 'var(--sidebar-text)',
                background: isActive ? 'var(--sidebar-active-bg)' : 'transparent',
                borderLeft: isActive ? `3px solid ${color}` : '3px solid transparent',
                marginLeft: '0',
              }}
            >
              <Icon
                className="flex-shrink-0"
                style={{ width: '17px', height: '17px', color: isActive ? color : 'inherit' }}
                strokeWidth={isActive ? 2.5 : 1.8}
              />
              {label}
            </Link>
          )
        })}
      </nav>

      {isAdmin && (
        <div className="px-3 pb-4 pt-3" style={{ borderTop: '1px solid var(--sidebar-border)' }}>
          <Link
            href="/admin"
            className="flex items-center gap-3 rounded-xl transition-all"
            style={{
              padding: '10px 14px',
              fontSize: '14.5px',
              fontWeight: active('/admin') ? 700 : 500,
              color: active('/admin') ? '#fff' : 'var(--sidebar-text)',
              background: active('/admin') ? 'var(--sidebar-active-bg)' : 'transparent',
              borderLeft: active('/admin') ? '3px solid #f472b6' : '3px solid transparent',
            }}
          >
            <ShieldCheck
              className="flex-shrink-0"
              style={{ width: '17px', height: '17px', color: active('/admin') ? '#f472b6' : 'inherit' }}
            />
            Admin
          </Link>
        </div>
      )}
    </aside>
  )
}
