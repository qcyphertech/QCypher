import Link from 'next/link'
import {
  HelpCircle, BookOpen, Info, MessageSquare,
  FileText, Shield, ChevronRight, Mail, Database,
} from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Help & Support' }

type Row = {
  href:  string
  icon:  React.ElementType
  color: string
  bg:    string
  title: string
  desc:  string
}

const HELP_ROWS: Row[] = [
  {
    href: '/support/faq', icon: HelpCircle, color: '#2a52a0', bg: 'rgba(42,82,160,0.12)',
    title: 'FAQs', desc: 'Billing, contacts, data security, and more',
  },
  {
    href: '/support/help-center', icon: BookOpen, color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)',
    title: 'Help Center', desc: 'Getting started guides and how-tos',
  },
  {
    href: '/support/about', icon: Info, color: '#10b981', bg: 'rgba(16,185,129,0.12)',
    title: 'About QCypher', desc: 'Who we are and what we\'re building',
  },
]

const VOICE_ROWS: Row[] = [
  {
    href: '/support/feedback', icon: MessageSquare, color: '#f97316', bg: 'rgba(249,115,22,0.12)',
    title: 'Share Feedback', desc: 'Bugs, ideas, or anything on your mind',
  },
]

const LEGAL_ROWS: Row[] = [
  {
    href: '/legal/terms', icon: FileText, color: '#a855f7', bg: 'rgba(168,85,247,0.12)',
    title: 'Terms of Service', desc: 'The rules governing your use of QCypher',
  },
  {
    href: '/legal/privacy', icon: Shield, color: '#f472b6', bg: 'rgba(244,114,182,0.12)',
    title: 'Privacy Policy', desc: 'How we collect, use, and protect your data',
  },
  {
    href: '/support/data-retention', icon: Database, color: '#0d9488', bg: 'rgba(13,148,136,0.12)',
    title: 'Data Retention Policy', desc: 'What we keep, what we delete, and for how long',
  },
]

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[15px] font-bold uppercase tracking-widest px-1 mb-2"
      style={{ color: 'hsl(var(--muted-foreground))' }}>
      {children}
    </p>
  )
}

function RowCard({ rows }: { rows: Row[] }) {
  return (
    <div className="rounded-2xl border overflow-hidden"
      style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--card))' }}>
      {rows.map(({ href, icon: Icon, color, bg, title, desc }, i) => (
        <div key={href}>
          {i > 0 && <div className="h-px mx-5" style={{ background: 'hsl(var(--border))' }} />}
          <Link href={href}
            className="flex items-center gap-4 px-5 py-4 hover:bg-[hsl(var(--muted))] transition-colors">
            <span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: bg }}>
              <Icon style={{ width: '18px', height: '18px', color }} strokeWidth={1.8} />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-semibold" style={{ color: 'hsl(var(--foreground))' }}>{title}</p>
              <p className="text-[15px] mt-0.5 truncate" style={{ color: 'hsl(var(--muted-foreground))' }}>{desc}</p>
            </div>
            <ChevronRight style={{ width: '16px', height: '16px', color: 'hsl(var(--muted-foreground))', flexShrink: 0 }} />
          </Link>
        </div>
      ))}
    </div>
  )
}

export default function SupportPage() {
  return (
    <div className="max-w-lg space-y-7">
      <div>
        <h1 className="text-2xl font-black" style={{ color: 'var(--heading)' }}>Help & Support</h1>
        <p className="text-[15px] mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
          Guides, feedback, and legal documents
        </p>
      </div>

      <section className="space-y-2">
        <SectionLabel>Help & Resources</SectionLabel>
        <RowCard rows={HELP_ROWS} />
      </section>

      <section className="space-y-2">
        <SectionLabel>Your Voice</SectionLabel>
        <RowCard rows={VOICE_ROWS} />
      </section>

      <section className="space-y-2">
        <SectionLabel>Legal</SectionLabel>
        <RowCard rows={LEGAL_ROWS} />
      </section>

      {/* Footer contact */}
      <div className="flex items-center gap-3 px-1 pb-4">
        <Mail style={{ width: '14px', height: '14px', color: 'hsl(var(--muted-foreground))', flexShrink: 0 }} />
        <span className="text-[15px]" style={{ color: 'hsl(var(--muted-foreground))' }}>
          Still stuck?{' '}
          <a href="mailto:info@qcyphertech.com"
            className="font-semibold hover:underline"
            style={{ color: '#2a52a0' }}>
            info@qcyphertech.com
          </a>
        </span>
      </div>
    </div>
  )
}
