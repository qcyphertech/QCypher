import { BackLink } from '@/components/ui/BackLink'
import { Zap, Lock, Zap as Speed } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'About QCypher' }

export default function AboutPage() {
  return (
    <div className="max-w-lg space-y-6">
      <BackLink href="/support" label="Help & Support" />

      <div>
        <h1 className="text-2xl font-black" style={{ color: 'var(--heading)' }}>About QCypher</h1>
      </div>

      {/* Identity block */}
      <div className="rounded-2xl border px-5 py-5 flex items-center gap-4"
        style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--card))' }}>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#2a52a0,#4a9db5)' }}>
          <span className="text-white font-black" style={{ fontSize: '22px' }}>Q</span>
        </div>
        <div>
          <p className="text-base font-black" style={{ color: 'hsl(var(--foreground))' }}>QCypher Micro-CRM</p>
          <p className="text-[15px] mt-0.5" style={{ color: 'hsl(var(--muted-foreground))' }}>by QCypher Technologies</p>
        </div>
      </div>

      {/* Mission */}
      <div className="rounded-2xl border px-5 py-5 space-y-3"
        style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--card))' }}>
        <p className="text-[15px] font-black" style={{ color: 'hsl(var(--foreground))' }}>Our mission</p>
        <p className="text-[15px] leading-relaxed" style={{ color: 'hsl(var(--muted-foreground))' }}>
          QCypher builds tools for the people who keep local economies running — plumbers, shop owners,
          service providers. We believe powerful software shouldn't require a 200-page manual or an
          enterprise budget.
        </p>
        <p className="text-[15px] leading-relaxed" style={{ color: 'hsl(var(--muted-foreground))' }}>
          The Micro-CRM is everything you actually need to manage your customers: contacts, notes,
          a calendar, and quick replies — nothing more, nothing less.
        </p>
      </div>

      {/* Pillars */}
      {[
        {
          icon: Zap, color: '#2a52a0', bg: 'rgba(42,82,160,0.12)',
          title: 'Fast by default',
          body: 'Every screen is designed to be navigated in under three taps. No buried menus, no modal-on-modal flows.',
        },
        {
          icon: Lock, color: '#10b981', bg: 'rgba(16,185,129,0.12)',
          title: 'Private by design',
          body: 'Every tenant\'s data is strictly isolated at the database level using row-level security. No other business on QCypher can read, write, or detect your records.',
        },
        {
          icon: Speed, color: '#f97316', bg: 'rgba(249,115,22,0.12)',
          title: 'Built to last',
          body: 'No VC-funded feature bloat. We ship what\'s useful, keep the interface clean, and only grow the feature set when real customers ask for it.',
        },
      ].map(({ icon: Icon, color, bg, title, body }) => (
        <div key={title} className="rounded-2xl border px-5 py-4 flex items-start gap-4"
          style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--card))' }}>
          <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ background: bg }}>
            <Icon style={{ width: '16px', height: '16px', color }} strokeWidth={2} />
          </span>
          <div>
            <p className="text-[15px] font-bold" style={{ color: 'hsl(var(--foreground))' }}>{title}</p>
            <p className="text-[15px] leading-relaxed mt-0.5" style={{ color: 'hsl(var(--muted-foreground))' }}>{body}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
