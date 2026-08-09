import { BackLink } from '@/components/ui/BackLink'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Data Retention Policy' }

const UPDATED = 'August 8, 2026'

const SECTIONS = [
  {
    title: 'What we keep',
    items: [
      'Audit logs — 90 days',
      'Backups — 7–30 days, auto-managed by Supabase',
      'Billing records — 5 years, for tax and legal purposes',
    ],
  },
  {
    title: 'What we delete permanently',
    items: [
      'Contacts, notes, and calendar events — upon request, after a 30-day grace period',
    ],
  },
  {
    title: 'Contact us',
    body: 'Questions about this policy? Reach us at legal@qcyphertech.com.',
  },
]

type Section = {
  title: string
  body?: string
  items?: string[]
}

export default function DataRetentionPage() {
  return (
    <div className="max-w-2xl space-y-6 pb-10">
      <BackLink href="/support" label="Help & Support" />

      <div>
        <p className="text-[15px] font-bold uppercase tracking-widest mb-1"
          style={{ color: 'hsl(var(--muted-foreground))' }}>Legal</p>
        <h1 className="text-2xl font-black" style={{ color: 'var(--heading)' }}>Data Retention Policy</h1>
        <p className="text-[15px] mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
          Last updated {UPDATED}
        </p>
      </div>

      <div className="space-y-6">
        {(SECTIONS as Section[]).map(({ title, body, items }) => (
          <div key={title}>
            <h2 className="text-[15px] font-black mb-1.5" style={{ color: 'hsl(var(--foreground))' }}>{title}</h2>
            {body && (
              <p className="text-[15px] leading-relaxed" style={{ color: 'hsl(var(--muted-foreground))' }}>{body}</p>
            )}
            {items && (
              <ul className="space-y-1 pl-4">
                {items.map(item => (
                  <li key={item} className="text-[15px] leading-relaxed list-disc"
                    style={{ color: 'hsl(var(--muted-foreground))' }}>{item}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
