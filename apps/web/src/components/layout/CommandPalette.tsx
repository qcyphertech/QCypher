'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Users, Calendar, FileText, Settings, ShieldCheck, ShoppingBag, ArrowRight, Loader2 } from 'lucide-react'
import { searchAll, type SearchResult } from '@/lib/actions/search'

const BASE_COMMANDS = [
  { label: 'Contacts', href: '/contacts', icon: Users },
  { label: 'Orders', href: '/orders', icon: ShoppingBag },
  { label: 'Calendar', href: '/calendar', icon: Calendar },
  { label: 'Templates', href: '/templates', icon: FileText },
  { label: 'Settings', href: '/settings', icon: Settings },
  { label: 'New contact', href: '/contacts/new', icon: Users },
  { label: 'New template', href: '/templates/new', icon: FileText },
]

const TYPE_META: Record<SearchResult['type'], { label: string; icon: React.ElementType; color: string }> = {
  contact:  { label: 'Contacts', icon: Users,       color: '#10b981' },
  order:    { label: 'Orders',   icon: ShoppingBag, color: '#f97316' },
  event:    { label: 'Calendar', icon: Calendar,    color: '#0ea5e9' },
  template: { label: 'Templates', icon: FileText,   color: '#a855f7' },
}

export function CommandPalette({ open, onClose, isAdmin = false }: { open: boolean; onClose: () => void; isAdmin?: boolean }) {
  const commands = isAdmin
    ? [...BASE_COMMANDS, { label: 'Admin panel', href: '/admin', icon: ShieldCheck }]
    : BASE_COMMANDS
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const router = useRouter()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const requestId = useRef(0)

  const filteredCommands = commands.filter(c => c.label.toLowerCase().includes(query.toLowerCase()))

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.trim().length < 2) {
      setResults([])
      setSearching(false)
      return
    }
    setSearching(true)
    const id = ++requestId.current
    debounceRef.current = setTimeout(async () => {
      const data = await searchAll(query)
      if (id === requestId.current) {
        setResults(data)
        setSearching(false)
      }
    }, 250)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        if (!open) return
        onClose()
      }
      if (e.key === 'Escape') onClose()
    },
    [open, onClose],
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleKey])

  useEffect(() => { if (!open) { setQuery(''); setResults([]) } }, [open])

  if (!open) return null

  const grouped = (['contact', 'order', 'event', 'template'] as const)
    .map(type => ({ type, items: results.filter(r => r.type === type) }))
    .filter(g => g.items.length > 0)

  const showCommands = query.trim().length < 2

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-start sm:justify-center sm:pt-24 sm:px-4"
      style={{ background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-xl overflow-hidden"
        style={{
          background: 'hsl(var(--card))',
          border: '1px solid hsl(var(--border))',
          borderRadius: '20px 20px 0 0',
          boxShadow: '0 24px 60px -12px rgba(15,23,42,0.35)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-5" style={{ height: '56px', borderBottom: '1px solid hsl(var(--border))' }}>
          {searching
            ? <Loader2 className="w-4 h-4 flex-shrink-0 animate-spin" style={{ color: 'hsl(var(--muted-foreground))' }} />
            : <Search className="w-4 h-4 flex-shrink-0" style={{ color: 'hsl(var(--muted-foreground))' }} />}
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search contacts, orders, events, templates…"
            className="flex-1 bg-transparent outline-none"
            style={{ fontSize: '15px', color: 'hsl(var(--foreground))' }}
          />
          <kbd
            className="hidden sm:block flex-shrink-0"
            style={{ fontSize: '11px', fontWeight: 700, padding: '3px 7px', borderRadius: '6px', background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }}
          >
            ESC
          </kbd>
        </div>

        <div style={{ maxHeight: '60vh', overflowY: 'auto', padding: '8px' }}>
          {showCommands && (
            <>
              <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))', padding: '8px 12px 4px' }}>
                Jump to
              </p>
              {filteredCommands.map(({ label, href, icon: Icon }) => (
                <ResultRow key={href} icon={Icon} color="hsl(var(--muted-foreground))" title={label} subtitle={undefined}
                  onClick={() => { router.push(href); onClose() }} />
              ))}
              {filteredCommands.length === 0 && <EmptyState text="Type at least 2 characters to search your data" />}
            </>
          )}

          {!showCommands && grouped.map(({ type, items }) => {
            const meta = TYPE_META[type]
            return (
              <div key={type} style={{ marginBottom: '4px' }}>
                <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: meta.color, padding: '8px 12px 4px' }}>
                  {meta.label}
                </p>
                {items.map(r => (
                  <ResultRow key={r.id} icon={meta.icon} color={meta.color} title={r.title} subtitle={r.subtitle}
                    onClick={() => { router.push(r.href); onClose() }} />
                ))}
              </div>
            )
          })}

          {!showCommands && !searching && grouped.length === 0 && (
            <EmptyState text={`No results for "${query}"`} />
          )}
        </div>
      </div>
    </div>
  )
}

function ResultRow({ icon: Icon, color, title, subtitle, onClick }: {
  icon: React.ElementType; color: string; title: string; subtitle?: string; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 text-left transition-colors group"
      style={{ padding: '9px 12px', borderRadius: '12px' }}
      onMouseEnter={e => { e.currentTarget.style.background = 'hsl(var(--muted))' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
    >
      <div style={{
        width: '30px', height: '30px', borderRadius: '9px', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: `${color}18`,
      }}>
        <Icon style={{ width: '14px', height: '14px', color }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '14px', fontWeight: 600, color: 'hsl(var(--foreground))', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</p>
        {subtitle && <p style={{ fontSize: '12px', color: 'hsl(var(--muted-foreground))', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{subtitle}</p>}
      </div>
      <ArrowRight className="w-3.5 h-3.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'hsl(var(--muted-foreground))' }} />
    </button>
  )
}

function EmptyState({ text }: { text: string }) {
  return <p style={{ fontSize: '14px', color: 'hsl(var(--muted-foreground))', padding: '20px 12px', textAlign: 'center' }}>{text}</p>
}
