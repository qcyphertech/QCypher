'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Users, Calendar, FileText, ShieldCheck, ShoppingBag, Building2, Loader2 } from 'lucide-react'
import { searchAll, type SearchResult } from '@/lib/actions/search'

const BASE_COMMANDS = [
  { label: 'Contacts', href: '/contacts', icon: Users },
  { label: 'Orders', href: '/orders', icon: ShoppingBag },
  { label: 'Calendar', href: '/calendar', icon: Calendar },
  { label: 'Templates', href: '/templates', icon: FileText },
  { label: 'New contact', href: '/contacts/new', icon: Users },
  { label: 'New template', href: '/templates/new', icon: FileText },
]

const ADMIN_COMMANDS = [
  { label: 'Admin panel', href: '/admin', icon: ShieldCheck },
]

const TYPE_META: Record<SearchResult['type'], { label: string; icon: React.ElementType; color: string }> = {
  contact:  { label: 'Contact',  icon: Users,       color: '#10b981' },
  order:    { label: 'Order',    icon: ShoppingBag, color: '#f97316' },
  event:    { label: 'Event',    icon: Calendar,    color: '#0ea5e9' },
  template: { label: 'Template', icon: FileText,    color: '#a855f7' },
  tenant:   { label: 'Tenant',   icon: Building2,    color: '#2a52a0' },
}

type Row = { title: string; subtitle: string; href: string; icon: React.ElementType; color: string; typeLabel: string }

// Plain input + a real results dropdown — a prior version used inline
// ghost-text autocomplete (typed selection auto-overwritten on keystroke),
// which made Backspace behave unpredictably (it had to fight the browser's
// own selection semantics) and only ever surfaced a single best guess.
// This shows every match up to a handful per type, arrow-key navigable,
// with plain native backspace/editing on the input itself.
export function CommandPalette({ open, onClose, isAdmin = false, isSuperAdmin = false }: {
  open: boolean
  onClose: () => void
  isAdmin?: boolean
  isSuperAdmin?: boolean
}) {
  const commands = isAdmin || isSuperAdmin ? [...BASE_COMMANDS, ...ADMIN_COMMANDS] : BASE_COMMANDS

  const [typed, setTyped] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [highlighted, setHighlighted] = useState(0)
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const requestId = useRef(0)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (typed.trim().length < 2) {
      setResults([])
      setSearching(false)
      return
    }
    setSearching(true)
    const id = ++requestId.current
    debounceRef.current = setTimeout(async () => {
      const data = await searchAll(typed)
      if (id === requestId.current) {
        setResults(data)
        setSearching(false)
      }
    }, 200)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [typed])

  const q = typed.trim().toLowerCase()
  const matchedCommands = q ? commands.filter(c => c.label.toLowerCase().includes(q)) : commands

  const rows: Row[] = q
    ? [
        ...results.map(r => {
          const meta = TYPE_META[r.type]
          return { title: r.title, subtitle: r.subtitle, href: r.href, icon: meta.icon, color: meta.color, typeLabel: meta.label }
        }),
        ...matchedCommands.map(c => ({ title: c.label, subtitle: '', href: c.href, icon: c.icon, color: 'hsl(var(--muted-foreground))', typeLabel: 'Go to' })),
      ]
    : commands.map(c => ({ title: c.label, subtitle: '', href: c.href, icon: c.icon, color: 'hsl(var(--muted-foreground))', typeLabel: 'Go to' }))

  useEffect(() => { setHighlighted(0) }, [typed, results.length])

  function go(row: Row) {
    router.push(row.href)
    onClose()
  }

  function handleInputKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlighted(i => Math.min(i + 1, rows.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setHighlighted(i => Math.max(i - 1, 0)) }
    if (e.key === 'Enter') { e.preventDefault(); if (rows[highlighted]) go(rows[highlighted]) }
  }

  const handleGlobalKey = useCallback(
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
    window.addEventListener('keydown', handleGlobalKey)
    return () => window.removeEventListener('keydown', handleGlobalKey)
  }, [handleGlobalKey])

  useEffect(() => { if (!open) { setTyped(''); setResults([]) } }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4"
      style={{ background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-xl overflow-hidden"
        style={{
          background: 'hsl(var(--card))',
          border: '1px solid hsl(var(--border))',
          borderRadius: '20px',
          boxShadow: '0 24px 60px -12px rgba(15,23,42,0.35)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-5" style={{ height: '58px' }}>
          {searching
            ? <Loader2 className="w-4 h-4 flex-shrink-0 animate-spin" style={{ color: 'hsl(var(--muted-foreground))' }} />
            : <Search className="w-4 h-4 flex-shrink-0" style={{ color: 'hsl(var(--muted-foreground))' }} />}
          <input
            ref={inputRef}
            autoFocus
            value={typed}
            onChange={e => setTyped(e.target.value)}
            onKeyDown={handleInputKey}
            placeholder={isSuperAdmin ? 'Search tenants…' : 'Search contacts, orders, events, templates…'}
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

        {rows.length > 0 && (
          <div style={{ borderTop: '1px solid hsl(var(--border))', maxHeight: '320px', overflowY: 'auto' }}>
            {rows.map((row, i) => (
              <div
                key={`${row.typeLabel}-${row.href}-${i}`}
                className="flex items-center gap-3 px-5 cursor-pointer transition-colors"
                style={{ height: '52px', background: i === highlighted ? 'hsl(var(--muted))' : 'transparent' }}
                onClick={() => go(row)}
                onMouseEnter={() => setHighlighted(i)}
              >
                <div style={{
                  width: '28px', height: '28px', borderRadius: '9px', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: `${row.color}18`,
                }}>
                  <row.icon style={{ width: '14px', height: '14px', color: row.color }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: row.color, marginRight: '8px' }}>
                      {row.typeLabel}
                    </span>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'hsl(var(--foreground))' }}>{row.title}</span>
                  </div>
                  {row.subtitle && (
                    <p style={{ fontSize: '12px', color: 'hsl(var(--muted-foreground))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {row.subtitle}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {q.length >= 2 && !searching && results.length === 0 && matchedCommands.length === 0 && (
          <p style={{ fontSize: '14px', color: 'hsl(var(--muted-foreground))', padding: '16px 20px', borderTop: '1px solid hsl(var(--border))' }}>
            No results for &ldquo;{typed}&rdquo;
          </p>
        )}
      </div>
    </div>
  )
}
