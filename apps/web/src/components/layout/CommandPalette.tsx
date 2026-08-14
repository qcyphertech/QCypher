'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Users, Calendar, FileText, ShieldCheck, ShoppingBag, CornerDownLeft, Loader2 } from 'lucide-react'
import { searchAll, type SearchResult } from '@/lib/actions/search'

const BASE_COMMANDS = [
  { label: 'Contacts', href: '/contacts', icon: Users },
  { label: 'Orders', href: '/orders', icon: ShoppingBag },
  { label: 'Calendar', href: '/calendar', icon: Calendar },
  { label: 'Templates', href: '/templates', icon: FileText },
  { label: 'New contact', href: '/contacts/new', icon: Users },
  { label: 'New template', href: '/templates/new', icon: FileText },
]

const TYPE_META: Record<SearchResult['type'], { label: string; icon: React.ElementType; color: string }> = {
  contact:  { label: 'Contact',  icon: Users,       color: '#10b981' },
  order:    { label: 'Order',    icon: ShoppingBag, color: '#f97316' },
  event:    { label: 'Event',    icon: Calendar,    color: '#0ea5e9' },
  template: { label: 'Template', icon: FileText,    color: '#a855f7' },
}

type Candidate = { title: string; href: string; icon: React.ElementType; color: string; typeLabel: string }

// Inline ghost-text autocomplete — no results dropdown. The input shows
// the user's typed text plus the best match's remaining characters as a
// native browser text SELECTION (the classic address-bar technique): a
// keystroke naturally overwrites the selected tail, so we don't need to
// hand-track "typed vs suggested" state separately.
export function CommandPalette({ open, onClose, isAdmin = false }: { open: boolean; onClose: () => void; isAdmin?: boolean }) {
  const commands = isAdmin
    ? [...BASE_COMMANDS, { label: 'Admin panel', href: '/admin', icon: ShieldCheck }]
    : BASE_COMMANDS

  const [typed, setTyped] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
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

  // Best single candidate: live data match wins over a static nav command.
  const candidate: Candidate | null = useMemo(() => {
    const q = typed.trim().toLowerCase()
    if (!q) return null

    const bestResult = results.find(r => r.title.toLowerCase().startsWith(q)) ?? results[0]
    if (bestResult) {
      const meta = TYPE_META[bestResult.type]
      return { title: bestResult.title, href: bestResult.href, icon: meta.icon, color: meta.color, typeLabel: meta.label }
    }

    const bestCommand = commands.find(c => c.label.toLowerCase().startsWith(q))
    if (bestCommand) {
      return { title: bestCommand.label, href: bestCommand.href, icon: bestCommand.icon, color: 'hsl(var(--muted-foreground))', typeLabel: 'Go to' }
    }
    return null
  }, [typed, results, commands])

  const ghostTail = candidate && candidate.title.toLowerCase().startsWith(typed.toLowerCase())
    ? candidate.title.slice(typed.length)
    : ''
  const displayValue = typed + ghostTail

  // Keep the ghost tail selected so the next keystroke overwrites it.
  useEffect(() => {
    const el = inputRef.current
    if (!el || !ghostTail) return
    el.setSelectionRange(typed.length, displayValue.length)
  }, [displayValue, ghostTail, typed.length])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    // Whatever remains after this change is the user's real typed intent —
    // any selected ghost tail was replaced/removed by the native edit.
    setTyped(e.target.value)
  }

  function accept() {
    if (candidate) { router.push(candidate.href); onClose() }
  }

  function handleInputKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') { e.preventDefault(); accept() }
    if ((e.key === 'Tab' || e.key === 'ArrowRight') && ghostTail && inputRef.current?.selectionStart === typed.length) {
      e.preventDefault()
      setTyped(displayValue)
    }
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
            value={displayValue}
            onChange={handleChange}
            onKeyDown={handleInputKey}
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

        {candidate && (
          <div
            className="flex items-center gap-3 px-5 cursor-pointer transition-colors"
            style={{ height: '52px', borderTop: '1px solid hsl(var(--border))' }}
            onClick={accept}
            onMouseEnter={e => { e.currentTarget.style.background = 'hsl(var(--muted))' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            <div style={{
              width: '28px', height: '28px', borderRadius: '9px', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: `${candidate.color}18`,
            }}>
              <candidate.icon style={{ width: '14px', height: '14px', color: candidate.color }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: candidate.color, marginRight: '8px' }}>
                {candidate.typeLabel}
              </span>
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'hsl(var(--foreground))' }}>{candidate.title}</span>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0" style={{ color: 'hsl(var(--muted-foreground))' }}>
              <CornerDownLeft className="w-3.5 h-3.5" />
              <span style={{ fontSize: '11px', fontWeight: 600 }}>to go</span>
            </div>
          </div>
        )}

        {typed.trim().length >= 2 && !candidate && !searching && (
          <p style={{ fontSize: '14px', color: 'hsl(var(--muted-foreground))', padding: '16px 20px', borderTop: '1px solid hsl(var(--border))' }}>
            No results for &ldquo;{typed}&rdquo;
          </p>
        )}
      </div>
    </div>
  )
}
