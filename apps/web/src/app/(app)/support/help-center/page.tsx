import { BackLink } from '@/components/ui/BackLink'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Help Center' }

const GUIDES = [
  {
    title: 'Getting started',
    steps: [
      'Sign in and you\'ll land on your Dashboard — a snapshot of recent contacts and upcoming events.',
      'Head to Contacts and create your first contact. Fill in a name and email — everything else is optional.',
      'Add a note to a contact from their detail page to log a call, meeting, or any interaction.',
    ],
  },
  {
    title: 'Using the Calendar',
    steps: [
      'Tap Calendar in the nav to see the month view. Click any day to create an event.',
      'Link an event to a contact by searching their name in the event form.',
      'Switch to Week view for a tighter look at what\'s coming up.',
      'Events are private to your workspace — no other tenant can see them.',
    ],
  },
  {
    title: 'Sending a quick-reply template',
    steps: [
      'Go to Templates and create a new template. Use {{first_name}} to insert contact variables.',
      'Open any contact\'s detail page and tap the template icon to pick and send.',
      'SMS sends via Telnyx, email via Resend — both are pay-as-you-go with no monthly minimum.',
      'Check your Telnyx and Resend dashboards for delivery status.',
    ],
  },
  {
    title: 'Managing your catalog and orders',
    steps: [
      'Go to Catalog to add the services, goods, or rentals your business offers.',
      'Set a base price and billing unit (e.g. "per hour", "per item").',
      'Create an Order and attach a contact, then add line items from your catalog.',
      'Line item prices are snapshotted at creation — changing the catalog later won\'t alter past orders.',
    ],
  },
]

export default function HelpCenterPage() {
  return (
    <div className="max-w-lg space-y-8">
      <BackLink href="/support" label="Help & Support" />
      <div>
        <h1 className="text-2xl font-black" style={{ color: 'var(--heading)' }}>Help Center</h1>
        <p className="text-[15px] mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
          Step-by-step guides for the most common workflows
        </p>
      </div>

      <div className="space-y-6">
        {GUIDES.map(({ title, steps }) => (
          <div key={title} className="rounded-2xl border overflow-hidden"
            style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--card))' }}>
            <div className="px-5 py-4 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
              <p className="text-[15px] font-black" style={{ color: 'hsl(var(--foreground))' }}>{title}</p>
            </div>
            <ol className="px-5 py-4 space-y-3 list-none">
              {steps.map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-white font-black mt-0.5"
                    style={{ background: 'linear-gradient(135deg,#2a52a0,#4a9db5)', fontSize: '15px' }}>
                    {i + 1}
                  </span>
                  <p className="text-[15px] leading-relaxed" style={{ color: 'hsl(var(--muted-foreground))' }}>{step}</p>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </div>
  )
}
