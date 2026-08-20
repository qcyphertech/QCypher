'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DEFAULT_SETTINGS, type TenantSettings } from '@/lib/types/settings'
import { HOME_ITEM, PRIMARY_NAV, SECONDARY_NAV, ADMIN_ITEM, type NavItem } from './navItems'

// Mobile-only bottom sheet, opened from BottomNav's hamburger button.
// Sheets up from the bottom (drag-handle, rounded top) instead of the
// old right-side slide-in drawer, and sits above the bottom pill (z-50
// vs the pill's z-40) so it's never partially covered by it.
export function MobileMenuSheet({
  open,
  onClose,
  isAdmin = false,
  isSuperAdmin = false,
  settings = DEFAULT_SETTINGS,
}: {
  open: boolean
  onClose: () => void
  isAdmin?: boolean
  isSuperAdmin?: boolean
  settings?: TenantSettings
}) {
  const pathname = usePathname()
  const router = useRouter()
  const active = (href: string) => pathname === href || pathname.startsWith(href + '/')
  const visiblePrimary = PRIMARY_NAV.filter(i => i.href !== '/dashboard' && (i.flag === null || settings[i.flag]))
  const visibleSecondary = SECONDARY_NAV.filter(i => i.flag === null || settings[i.flag])

  useEffect(() => { onClose() }, [pathname]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <div className="md:hidden">
      {open && (
        <div
          className="fixed inset-0 z-[45] print:hidden"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}
          onClick={onClose}
        />
      )}

      <div
        className="fixed inset-x-0 bottom-0 z-50 flex flex-col print:hidden"
        style={{
          maxHeight: '78vh',
          background: 'hsl(var(--card))',
          borderTop: '1px solid hsl(var(--border))',
          borderRadius: '20px 20px 0 0',
          boxShadow: '0 -12px 40px rgba(0,0,0,0.25)',
          transform: open ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        <div className="flex-shrink-0 flex justify-center pt-2.5 pb-1">
          <button onClick={onClose} aria-label="Close menu" className="w-9 h-1 rounded-full" style={{ background: 'hsl(var(--border))' }} />
        </div>

        <div className="flex-1 overflow-y-auto pb-safe px-3 py-2">
          <SheetItem item={HOME_ITEM} active={active('/dashboard')} />
          {visiblePrimary.map(item => (
            <SheetItem key={item.href} item={item} active={active(item.href)} />
          ))}

          <div className="mx-2 my-2 h-px" style={{ background: 'hsl(var(--border))' }} />

          {visibleSecondary.map(item => (
            <SheetItem key={item.href} item={item} active={active(item.href)} />
          ))}

          {(isAdmin || isSuperAdmin) && (
            <>
              <div className="mx-2 my-2 h-px" style={{ background: 'hsl(var(--border))' }} />
              <SheetItem item={ADMIN_ITEM} active={active('/admin')} />
            </>
          )}

          <div className="mx-2 my-2 h-px" style={{ background: 'hsl(var(--border))' }} />

          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors hover:bg-[hsl(var(--muted))]">
            <span className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(239,68,68,0.1)' }}>
              <LogOut style={{ width: '15px', height: '15px', color: '#ef4444' }} strokeWidth={2} />
            </span>
            <span className="text-[15px] font-semibold" style={{ color: '#ef4444' }}>Sign out</span>
          </button>
        </div>
      </div>
    </div>
  )
}

function SheetItem({ item, active }: { item: NavItem; active: boolean }) {
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
