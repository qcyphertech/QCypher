'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail, MessageSquare, ChevronRight, Send, Target, Calendar, Wrench, CreditCard, Handshake, MessageCircle, FileText, type LucideIcon } from 'lucide-react'
import { SendTemplateModal } from './SendTemplateModal'
import type { Tables } from '@/types/database'

type Template = Tables<'templates'>
type ContactLite = { id: string; first_name: string; last_name: string | null; email: string | null; phone: string | null }

const CATEGORIES = [
  {
    name: 'Lead & Inquiry',
    icon: Target,
    desc: 'Respond to new customers fast',
    accent: '#f97316',
    glow: 'rgba(249,115,22,0.18)',
    border: 'rgba(249,115,22,0.28)',
    chip: 'rgba(249,115,22,0.14)',
    tag: '#f97316',
  },
  {
    name: 'Booking & Scheduling',
    icon: Calendar,
    desc: 'Confirmations, reminders & reschedules',
    accent: '#3b82f6',
    glow: 'rgba(59,130,246,0.15)',
    border: 'rgba(59,130,246,0.28)',
    chip: 'rgba(59,130,246,0.13)',
    tag: '#3b82f6',
  },
  {
    name: 'Service & Fulfillment',
    icon: Wrench,
    desc: 'Keep customers updated during the job',
    accent: '#22c55e',
    glow: 'rgba(34,197,94,0.13)',
    border: 'rgba(34,197,94,0.26)',
    chip: 'rgba(34,197,94,0.11)',
    tag: '#22c55e',
  },
  {
    name: 'Payment',
    icon: CreditCard,
    desc: 'Invoices, reminders & receipts',
    accent: '#a855f7',
    glow: 'rgba(168,85,247,0.14)',
    border: 'rgba(168,85,247,0.26)',
    chip: 'rgba(168,85,247,0.12)',
    tag: '#a855f7',
  },
  {
    name: 'Follow-Up & Retention',
    icon: Handshake,
    desc: 'Thank-yous, reviews & re-engagement',
    accent: '#ec4899',
    glow: 'rgba(236,72,153,0.14)',
    border: 'rgba(236,72,153,0.26)',
    chip: 'rgba(236,72,153,0.11)',
    tag: '#ec4899',
  },
  {
    name: 'General',
    icon: MessageCircle,
    desc: 'Everything else',
    accent: '#64748b',
    glow: 'rgba(100,116,139,0.10)',
    border: 'rgba(100,116,139,0.22)',
    chip: 'rgba(100,116,139,0.10)',
    tag: '#94a3b8',
  },
]

type Filter = 'all' | 'email' | 'sms'

export function TemplateList({ templates, contacts = [] }: { templates: Template[]; contacts?: ContactLite[] }) {
  const [filter, setFilter] = useState<Filter>('all')
  const [sendTarget, setSendTarget] = useState<Template | null>(null)

  const visible = filter === 'all' ? templates : templates.filter(t => t.channel === filter)
  const emailCount = templates.filter(t => t.channel === 'email').length
  const smsCount = templates.filter(t => t.channel === 'sms').length

  if (templates.length === 0) {
    return (
      <div style={{
        borderRadius: '20px',
        border: '1px solid hsl(var(--border))',
        background: 'hsl(var(--card))',
        padding: '64px 24px',
        textAlign: 'center',
      }}>
        <MessageCircle style={{ width: '44px', height: '44px', marginBottom: '16px' }} fill="currentColor" strokeWidth={1} />
        <p style={{ fontSize: '16px', fontWeight: 700, color: 'hsl(var(--foreground))', marginBottom: '6px' }}>
          No templates yet
        </p>
        <p style={{ fontSize: '15px', color: 'hsl(var(--muted-foreground))', marginBottom: '24px' }}>
          Run migrations 00010 & 00012 to load your starter library, or create your first template.
        </p>
        <Link href="/templates/new" style={{
          display: 'inline-block', padding: '10px 22px', borderRadius: '12px',
          background: '#2a52a0', color: '#fff', fontSize: '15px', fontWeight: 600, textDecoration: 'none',
        }}>
          + New template
        </Link>
      </div>
    )
  }

  const grouped = CATEGORIES.map(cat => ({
    ...cat,
    items: visible.filter(t => (t.category ?? 'General') === cat.name),
  })).filter(g => g.items.length > 0)

  const knownNames = new Set(CATEGORIES.map(c => c.name))
  const uncategorised = visible.filter(t => !knownNames.has(t.category ?? 'General'))

  return (
    <div>
      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '28px', flexWrap: 'wrap' }}>
        {([
          { key: 'all',   label: 'All',   icon: null,         count: templates.length },
          { key: 'email', label: 'Email', icon: Mail,         count: emailCount },
          { key: 'sms',   label: 'Text',  icon: MessageSquare, count: smsCount },
        ] as { key: Filter; label: string; icon: LucideIcon | null; count: number }[]).map(tab => {
          const active = filter === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: '7px',
                padding: '8px 16px', borderRadius: '100px',
                fontSize: '15px', fontWeight: 600,
                border: active ? 'none' : '1px solid hsl(var(--border))',
                cursor: 'pointer', transition: 'all 0.15s',
                background: active
                  ? 'linear-gradient(135deg, #2a52a0 0%, #4a9db5 100%)'
                  : 'hsl(var(--card))',
                color: active ? '#fff' : 'hsl(var(--muted-foreground))',
                boxShadow: active ? '0 2px 12px rgba(42,82,160,0.35)' : 'none',
              }}
            >
              {tab.icon && <tab.icon size={14} fill="currentColor" strokeWidth={1} />}
              {tab.label}
              <span style={{
                fontSize: '15px', fontWeight: 700,
                padding: '1px 7px', borderRadius: '100px',
                background: active ? 'rgba(255,255,255,0.22)' : 'hsl(var(--muted))',
                color: active ? '#fff' : 'hsl(var(--muted-foreground))',
              }}>
                {tab.count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Category sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
        {grouped.map(cat => (
          <CategorySection key={cat.name} cat={cat} onSend={setSendTarget} />
        ))}
        {uncategorised.length > 0 && (
          <CategorySection cat={{
            name: 'My Templates', icon: FileText,
            desc: 'Custom templates you created',
            accent: '#64748b', glow: 'rgba(100,116,139,0.10)',
            border: 'rgba(100,116,139,0.22)', chip: 'rgba(100,116,139,0.10)',
            tag: '#94a3b8', items: uncategorised,
          }} onSend={setSendTarget} />
        )}
      </div>

      {sendTarget && (
        <SendTemplateModal template={sendTarget} contacts={contacts} onClose={() => setSendTarget(null)} />
      )}
    </div>
  )
}

type CatWithItems = typeof CATEGORIES[0] & { items: Template[] }

function CategorySection({ cat, onSend }: { cat: CatWithItems; onSend: (t: Template) => void }) {
  return (
    <div>
      {/* Section header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        marginBottom: '12px', paddingLeft: '4px',
      }}>
        {/* Glowing icon badge */}
        <div style={{
          width: '36px', height: '36px', borderRadius: '12px', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: `linear-gradient(135deg, ${cat.glow} 0%, ${cat.chip} 100%)`,
          border: `1.5px solid ${cat.border}`,
          boxShadow: `0 0 10px ${cat.glow}`,
          color: cat.accent,
        }}>
          <cat.icon size={17} fill="currentColor" strokeWidth={1} />
        </div>

        <div style={{ flex: 1 }}>
          <p style={{
            fontSize: '15px', fontWeight: 700, letterSpacing: '0.03em',
            color: 'hsl(var(--foreground))', lineHeight: 1.1,
            textTransform: 'uppercase',
          }}>
            {cat.name}
          </p>
          <p style={{ fontSize: '15px', color: 'hsl(var(--muted-foreground))', marginTop: '2px' }}>
            {cat.desc}
          </p>
        </div>

        {/* Count pill */}
        <span style={{
          fontSize: '15px', fontWeight: 700, letterSpacing: '0.04em',
          padding: '3px 10px', borderRadius: '100px',
          background: cat.chip, color: cat.accent,
          border: `1px solid ${cat.border}`,
        }}>
          {cat.items.length} {cat.items.length === 1 ? 'template' : 'templates'}
        </span>
      </div>

      {/* Grid of cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '12px',
      }}>
        {cat.items.map(t => (
          <TemplateRow key={t.id} template={t} cat={cat} onSend={onSend} />
        ))}
      </div>
    </div>
  )
}

function TemplateRow({ template: t, cat, onSend }: {
  template: Template
  cat: CatWithItems
  onSend: (t: Template) => void
}) {
  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column',
        padding: '18px 20px',
        borderRadius: '16px',
        border: `1px solid ${cat.border}`,
        background: 'hsl(var(--card))',
        boxShadow: `0 1px 12px ${cat.glow}`,
        transition: 'transform 0.13s, box-shadow 0.13s',
        position: 'relative', overflow: 'hidden',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget
        el.style.transform = 'translateY(-2px)'
        el.style.boxShadow = `0 6px 24px ${cat.glow}`
      }}
      onMouseLeave={e => {
        const el = e.currentTarget
        el.style.transform = 'translateY(0)'
        el.style.boxShadow = `0 1px 12px ${cat.glow}`
      }}
    >
      {/* Accent top bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
        background: `linear-gradient(90deg, ${cat.accent}, transparent)`,
      }} />

      {/* Category icon — channel is now chosen when sending, not fixed here */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{
          width: '38px', height: '38px', borderRadius: '11px', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: cat.chip, border: `1px solid ${cat.border}`,
        }}>
          <cat.icon size={16} color={cat.accent} />
        </div>
      </div>

      {/* Name — links to the editor */}
      <Link href={`/templates/${t.id}`} style={{ textDecoration: 'none' }}>
        <p style={{
          fontSize: '15px', fontWeight: 700,
          color: 'hsl(var(--foreground))',
          marginBottom: '6px',
          lineHeight: 1.2,
        }}>
          {t.name}
        </p>
      </Link>

      {/* Body preview */}
      <p style={{
        fontSize: '15px', color: 'hsl(var(--muted-foreground))',
        lineHeight: 1.5, flex: 1,
        display: '-webkit-box',
        WebkitLineClamp: 3,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}>
        {t.body}
      </p>

      {/* Footer — Send opens the contact picker, Edit goes to the editor */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
        gap: '14px', marginTop: '14px',
      }}>
        <button
          type="button"
          onClick={() => onSend(t)}
          style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            fontSize: '15px', fontWeight: 700, color: cat.accent,
            background: cat.chip, border: `1px solid ${cat.border}`,
            borderRadius: '10px', padding: '5px 12px', cursor: 'pointer',
          }}
        >
          <Send size={13} /> Send
        </button>
        <Link href={`/templates/${t.id}`} style={{
          fontSize: '15px', color: cat.accent, fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none',
        }}>
          Edit <ChevronRight size={13} />
        </Link>
      </div>
    </div>
  )
}
