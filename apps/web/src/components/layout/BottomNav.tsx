'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, ShoppingBag, Calendar, BarChart2 } from 'lucide-react'
import { DEFAULT_SETTINGS, type TenantSettings } from '@/lib/types/settings'

const ALL_TABS = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Home',     color: '#4a9db5', flag: null                    },
  { href: '/contacts',  icon: Users,            label: 'Contacts', color: '#10b981', flag: null                    },
  { href: '/orders',    icon: ShoppingBag,      label: 'Orders',   color: '#f97316', flag: 'show_orders' as const },
  { href: '/calendar',  icon: Calendar,         label: 'Calendar', color: '#0ea5e9', flag: 'show_calendar' as const },
  { href: '/overview',  icon: BarChart2,        label: 'Overview', color: '#22c55e', flag: 'show_overview' as const },
]

export function BottomNav({ settings = DEFAULT_SETTINGS }: { settings?: TenantSettings }) {
  const pathname = usePathname()
  const tabs = ALL_TABS.filter(t => t.flag === null || settings[t.flag])

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 flex md:hidden print:hidden justify-center pointer-events-none"
      style={{ paddingBottom: 'max(14px, env(safe-area-inset-bottom))', paddingLeft: '14px', paddingRight: '14px' }}
    >
      <div
        className="pointer-events-auto flex items-center gap-1"
        style={{
          background: 'hsl(var(--card) / 0.82)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          border: '1px solid hsl(var(--border))',
          borderRadius: '999px',
          padding: '6px',
          boxShadow: '0 8px 30px -8px rgba(15,23,42,0.28), 0 2px 8px rgba(15,23,42,0.08)',
        }}
      >
        {tabs.map(({ href, icon: Icon, label, color }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-1.5 transition-all duration-200"
              style={{
                padding: active ? '9px 16px' : '9px 14px',
                borderRadius: '999px',
                background: active ? color : 'transparent',
                boxShadow: active ? `0 4px 14px -2px ${color}66` : 'none',
              }}
            >
              <Icon
                className="w-[18px] h-[18px] flex-shrink-0"
                strokeWidth={active ? 2.4 : 1.8}
                style={{ color: active ? '#fff' : 'hsl(var(--muted-foreground))' }}
              />
              <span
                className="text-[12px] font-bold overflow-hidden transition-all duration-200"
                style={{
                  color: '#fff',
                  maxWidth: active ? '80px' : '0px',
                  opacity: active ? 1 : 0,
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
