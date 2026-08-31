// Config-driven data for the /alternatives/[competitor] comparison pages
// (apps/web/src/app/alternatives/[competitor]/page.tsx). Keep competitor
// claims defensible and non-specific on things we can't verify in real
// time (their current pricing, feature list) — describe well-known,
// stable positioning (e.g. "enterprise-oriented, sales-call pricing")
// rather than inventing numbers that could be wrong or change.

export type Alternative = {
  slug: string
  competitorName: string
  metaTitle: string
  metaDescription: string
  heroKicker: string
  heroHeadline: string
  heroSubhead: string
  ctaLabel: string
  whySwitch: { title: string; body: string }[]
  comparison: { feature: string; qcypher: string; competitor: string }[]
  faq: { q: string; a: string }[]
}

export const ALTERNATIVES: Alternative[] = [
  {
    slug: 'jobber',
    competitorName: 'Jobber',
    metaTitle: 'QCypher vs. Jobber — A Simpler, All-In-One Alternative',
    metaDescription: 'Comparing QCypher to Jobber? See how QCypher bundles your website, CRM, scheduling, and inventory into one $49/mo plan — no add-ons required.',
    heroKicker: 'QCypher vs. Jobber',
    heroHeadline: 'A Jobber alternative that includes your website',
    heroSubhead: 'Jobber covers scheduling and invoicing well — QCypher adds your website, CRM, and inventory tracking in the same plan, so you\'re not stitching together a separate site builder on top.',
    ctaLabel: 'Book a demo',
    whySwitch: [
      { title: 'One login instead of several tools', body: 'Jobber handles field service scheduling, but most businesses still run a separate website and CRM alongside it. QCypher folds all three into one plan.' },
      { title: 'Inventory tracking built in', body: 'Tracking parts and materials often means a separate spreadsheet or add-on. QCypher includes quantity tracking and reorder alerts from the start.' },
      { title: 'Template-based follow-ups', body: 'Reusable email/SMS templates with merge fields, plus automatic review-request and reminder workflows, come standard rather than as a premium add-on.' },
    ],
    comparison: [
      { feature: 'Website builder', qcypher: 'Included on every plan', competitor: 'Not included — a separate site is typically needed' },
      { feature: 'CRM & contact history', qcypher: 'Included', competitor: 'Included' },
      { feature: 'Job scheduling', qcypher: 'Included, with recurring jobs', competitor: 'Included, strong for field service' },
      { feature: 'Inventory tracking', qcypher: 'Included from Growth tier', competitor: 'Limited/add-on depending on plan' },
      { feature: 'Starting price', qcypher: '$49/mo, published', competitor: 'Published tiers, typically higher entry price for comparable features' },
      { feature: 'AI assistant', qcypher: 'QBot included on Growth+', competitor: 'Not a core feature' },
    ],
    faq: [
      { q: 'Does QCypher do everything Jobber does?', a: 'QCypher covers the core of what most small service businesses use Jobber for — scheduling, invoicing, customer communication — and adds a website and CRM in the same plan. Jobber has deeper field-service-specific tooling (route optimization, advanced dispatch) that larger crews may still prefer.' },
      { q: 'Can I import my existing customers from Jobber?', a: 'Yes — contacts can be imported via CSV, and our team can help with the migration during setup.' },
      { q: 'Is there a contract or can I switch plans anytime?', a: 'No long-term contract — you can switch tiers anytime with no penalty.' },
    ],
  },
  {
    slug: 'housecall-pro',
    competitorName: 'Housecall Pro',
    metaTitle: 'QCypher vs. Housecall Pro — Website, CRM & Scheduling in One Plan',
    metaDescription: 'Comparing QCypher to Housecall Pro? See how QCypher combines your website, booking, CRM, and inventory tracking starting at $49/mo.',
    heroKicker: 'QCypher vs. Housecall Pro',
    heroHeadline: 'A Housecall Pro alternative with your website built in',
    heroSubhead: 'Housecall Pro is a solid field-service scheduling tool — QCypher adds a professional website, full CRM, and inventory tracking to the same monthly plan.',
    ctaLabel: 'Book a demo',
    whySwitch: [
      { title: 'No separate website subscription', body: 'A website is often a separate line item on top of field-service software. QCypher includes it, live on your own domain.' },
      { title: 'One customer record, not two systems', body: 'Contact history, orders, and communications all live in one CRM instead of syncing between a scheduling tool and a separate customer database.' },
      { title: 'Simple, published pricing', body: 'Three tiers, clearly published, switch anytime — no custom quote required to see what it costs.' },
    ],
    comparison: [
      { feature: 'Website builder', qcypher: 'Included on every plan', competitor: 'Not included — a separate site is typically needed' },
      { feature: 'Online booking', qcypher: 'Included', competitor: 'Included' },
      { feature: 'CRM & contact history', qcypher: 'Included', competitor: 'Included' },
      { feature: 'Inventory tracking', qcypher: 'Included from Growth tier', competitor: 'Limited/add-on depending on plan' },
      { feature: 'Template-based follow-ups', qcypher: 'Included, with merge fields', competitor: 'Available, feature depth varies by plan' },
      { feature: 'Starting price', qcypher: '$49/mo, published', competitor: 'Published tiers, typically higher entry price for comparable features' },
    ],
    faq: [
      { q: 'Is QCypher built for the same trades as Housecall Pro?', a: 'Yes — plumbing, HVAC, electrical, and similar home-service trades are QCypher\'s core customer base today.' },
      { q: 'Does QCypher support online payments?', a: 'Yes, invoices include a secure online payment link and update automatically once paid.' },
      { q: 'What happens to my data if I switch back?', a: 'Your data is yours — contacts, orders, and history can be exported at any time.' },
    ],
  },
  {
    slug: 'servicetitan',
    competitorName: 'ServiceTitan',
    metaTitle: 'QCypher vs. ServiceTitan — A Simpler, Transparently-Priced Alternative',
    metaDescription: 'ServiceTitan is built for large operations with custom, sales-call pricing. QCypher offers published pricing from $49/mo for small and growing service businesses.',
    heroKicker: 'QCypher vs. ServiceTitan',
    heroHeadline: 'A ServiceTitan alternative for small and growing teams',
    heroSubhead: 'ServiceTitan is built for large, multi-crew operations with enterprise pricing and a sales process to match. QCypher is built for small teams who want the same core capabilities without the enterprise overhead.',
    ctaLabel: 'Book a demo',
    whySwitch: [
      { title: 'Published pricing, no sales call required', body: 'ServiceTitan pricing is typically quoted per business after a sales conversation. QCypher\'s three tiers are public — see the number before you talk to anyone.' },
      { title: 'Right-sized for small teams', body: 'ServiceTitan\'s depth is built for larger operations with dedicated ops staff. QCypher covers the same core workflows — scheduling, CRM, invoicing, inventory — without the setup overhead that depth requires.' },
      { title: 'Website included', body: 'QCypher bundles your website into the same plan, rather than treating it as a separate purchase.' },
    ],
    comparison: [
      { feature: 'Pricing model', qcypher: 'Published tiers from $49/mo', competitor: 'Custom quote via sales call' },
      { feature: 'Website builder', qcypher: 'Included on every plan', competitor: 'Not included' },
      { feature: 'Setup time', qcypher: 'Self-serve, live same day', competitor: 'Typically a guided onboarding process' },
      { feature: 'Best fit', qcypher: 'Solo operators to growing small teams', competitor: 'Larger operations with multiple crews and dedicated ops staff' },
      { feature: 'Inventory tracking', qcypher: 'Included from Growth tier', competitor: 'Included, enterprise-depth' },
      { feature: 'AI assistant', qcypher: 'QBot included on Growth+', competitor: 'Available on select plans' },
    ],
    faq: [
      { q: 'Is QCypher a real alternative to ServiceTitan, or just cheaper?', a: 'For a solo operator or small crew, QCypher covers the core of what most businesses actually use day to day — scheduling, CRM, invoicing, follow-ups — at a fraction of the setup effort. ServiceTitan\'s extra depth is built for larger, multi-crew operations that need it; if that\'s not you yet, you\'re likely paying for capability you won\'t use.' },
      { q: 'Can I see pricing without booking a call?', a: 'Yes — QCypher\'s three tiers and what\'s included in each are published on the pricing page, no sales call required.' },
      { q: 'What if my business grows and needs more?', a: 'You can switch tiers anytime with no penalty as your needs change.' },
    ],
  },
]

export function getAlternative(slug: string): Alternative | undefined {
  return ALTERNATIVES.find(a => a.slug === slug)
}
