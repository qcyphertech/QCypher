'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Bell } from 'lucide-react'
import {
  getNotifications, getUnreadNotificationCount, markNotificationRead, markAllNotificationsRead,
  type Notification,
} from '@/lib/actions/notifications'

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function NotificationBell() {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loaded, setLoaded] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getUnreadNotificationCount().then(setUnreadCount)
    const interval = setInterval(() => {
      getUnreadNotificationCount().then(setUnreadCount)
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!open) return
    getNotifications().then(list => {
      setNotifications(list)
      setLoaded(true)
    })
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  function handleOpenNotification(n: Notification) {
    setOpen(false)
    if (!n.read_at) {
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x))
      setUnreadCount(c => Math.max(0, c - 1))
      startTransition(() => markNotificationRead(n.id))
    }
    if (n.link) router.push(n.link)
  }

  function handleMarkAllRead() {
    setNotifications(prev => prev.map(n => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })))
    setUnreadCount(0)
    startTransition(() => markAllNotificationsRead())
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)}
        className="hidden sm:flex w-9 h-9 rounded-xl items-center justify-center hover:bg-[hsl(var(--muted))] transition-colors relative">
        <Bell style={{ width: '16px', height: '16px', color: 'hsl(var(--muted-foreground))' }} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: '4px', right: '4px',
            minWidth: '15px', height: '15px', padding: '0 3px', borderRadius: '999px',
            background: '#ef4444', color: '#fff', fontSize: '9px', fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: '340px', maxHeight: '420px',
          overflowY: 'auto', zIndex: 60,
          background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '16px',
          boxShadow: '0 12px 32px rgba(0,0,0,0.16)',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 14px', borderBottom: '1px solid hsl(var(--border))', position: 'sticky', top: 0,
            background: 'hsl(var(--card))',
          }}>
            <p style={{ fontSize: '14px', fontWeight: 800, color: 'hsl(var(--foreground))' }}>Notifications</p>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead}
                style={{ fontSize: '12px', fontWeight: 700, color: '#2a52a0', background: 'none', border: 'none', cursor: 'pointer' }}>
                Mark all read
              </button>
            )}
          </div>

          {!loaded ? (
            <p style={{ padding: '24px 14px', textAlign: 'center', fontSize: '13px', color: 'hsl(var(--muted-foreground))' }}>Loading…</p>
          ) : notifications.length === 0 ? (
            <p style={{ padding: '24px 14px', textAlign: 'center', fontSize: '13px', color: 'hsl(var(--muted-foreground))' }}>
              No notifications yet.
            </p>
          ) : (
            notifications.map(n => (
              <button key={n.id} onClick={() => handleOpenNotification(n)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left', padding: '12px 14px',
                  borderBottom: '1px solid hsl(var(--border))', background: n.read_at ? 'transparent' : 'rgba(42,82,160,0.06)',
                  border: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none', cursor: 'pointer',
                }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  {!n.read_at && (
                    <span style={{ width: '7px', height: '7px', borderRadius: '999px', background: '#2a52a0', flexShrink: 0, marginTop: '5px' }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '13px', fontWeight: n.read_at ? 600 : 800, color: 'hsl(var(--foreground))' }}>
                      {n.title}
                    </p>
                    {n.body && (
                      <p style={{ fontSize: '12.5px', color: 'hsl(var(--muted-foreground))', marginTop: '2px' }}>{n.body}</p>
                    )}
                    <p style={{ fontSize: '11px', color: 'hsl(var(--muted-foreground))', marginTop: '4px' }}>{timeAgo(n.created_at)}</p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
