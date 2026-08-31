// Config-driven data for the /solutions/[industry] programmatic SEO pages
// (apps/web/src/app/solutions/[industry]/page.tsx). Add a new vertical by
// adding an entry here — the page template renders every field, no code
// changes needed per industry.

export type Industry = {
  slug: string
  name: string              // e.g. "Plumbers" — used in headings
  metaTitle: string
  metaDescription: string
  heroKicker: string        // small label above the h1, e.g. "For plumbing businesses"
  heroHeadline: string      // the h1
  heroSubhead: string
  ctaLabel: string          // primary CTA button text, tuned per vertical
  painPoints: { title: string; body: string }[]
  features: { title: string; body: string }[]
  faq: { q: string; a: string }[]
}

export const INDUSTRIES: Industry[] = [
  {
    slug: 'plumbers',
    name: 'Plumbers',
    metaTitle: 'CRM & Scheduling Software for Plumbers | QCypher',
    metaDescription: 'QCypher gives plumbing businesses a website, booking calendar, job scheduling, inventory tracking, and automatic follow-ups — all in one $49/mo platform.',
    heroKicker: 'For plumbing businesses',
    heroHeadline: 'The all-in-one CRM built for plumbers',
    heroSubhead: 'Book jobs, track parts and inventory, send quotes, and follow up with customers automatically — without juggling five different apps.',
    ctaLabel: 'Book a demo',
    painPoints: [
      { title: 'Missed calls become missed jobs', body: 'A missed call while you\'re under a sink is a job that goes to the next plumber in the search results.' },
      { title: 'No idea what\'s on the truck', body: 'Tracking fittings, valves, and parts across jobs in a notebook or spreadsheet means running back to the supply house mid-job.' },
      { title: 'Customers forget to leave a review', body: 'The job\'s done and paid for — but nobody asks for the review that would\'ve brought in the next three customers.' },
    ],
    features: [
      { title: 'Job scheduling & dispatch', body: 'A calendar built for service jobs — recurring maintenance visits, rescheduling, and reminders sent automatically.' },
      { title: 'Parts & inventory tracking', body: 'Know what\'s in stock before you quote a job, with low-stock alerts so you\'re never caught short.' },
      { title: 'Automatic follow-ups', body: 'Review requests and invoice reminders go out on their own, days after the job — email first, text as backup.' },
      { title: 'Website + booking, included', body: 'A professional site with an online booking form, live on your own domain, no separate web developer needed.' },
    ],
    faq: [
      { q: 'Can QCypher replace my current scheduling app?', a: 'Yes — QCypher\'s scheduling covers one-time and recurring jobs, technician assignment, and customer confirmation links, so most plumbing businesses use it as their only scheduling tool.' },
      { q: 'Does it track parts and materials, not just labor?', a: 'Yes. Inventory items can be tagged as goods you stock (fittings, valves, water heaters) with quantity tracking and low-stock alerts, separate from your service line items.' },
      { q: 'How much does it cost for a plumbing business?', a: 'Plans start at $49/mo (Starter) with a one-time setup fee — see full pricing and what\'s included at each tier on our pricing page.' },
      { q: 'Do customers get automatic reminders for maintenance visits?', a: 'Yes, recurring job reminders go out automatically before each scheduled visit, with a link for the customer to confirm, reschedule, or skip.' },
    ],
  },
  {
    slug: 'hvac-contractors',
    name: 'HVAC Contractors',
    metaTitle: 'CRM & Job Scheduling Software for HVAC Contractors | QCypher',
    metaDescription: 'Run your HVAC business on one platform — scheduling, equipment inventory, quotes, invoicing, and customer follow-ups. Starting at $49/mo.',
    heroKicker: 'For HVAC & climate control businesses',
    heroHeadline: 'Run your HVAC business without the spreadsheet chaos',
    heroSubhead: 'Schedule installs and tune-ups, track equipment and parts, send quotes, and keep customers coming back for seasonal maintenance — automatically.',
    ctaLabel: 'Book a demo',
    painPoints: [
      { title: 'Seasonal maintenance falls through the cracks', body: 'Without automatic reminders, spring and fall tune-ups get forgotten — and so does the recurring revenue.' },
      { title: 'Equipment and part costs are hard to track', body: 'Units, filters, refrigerant — keeping tabs on what\'s in the shop versus what\'s been used on a job is a mess in a notebook.' },
      { title: 'Quotes take too long to turn around', body: 'A slow quote after a home visit means the customer\'s already called the next contractor.' },
    ],
    features: [
      { title: 'Recurring maintenance scheduling', body: 'Set up seasonal tune-up visits once — QCypher reminds the customer and re-books automatically each cycle.' },
      { title: 'Equipment & parts inventory', body: 'Track units, filters, and refrigerant with quantity and reorder-point alerts, tied directly to job line items.' },
      { title: 'Quotes & invoicing', body: 'Build and send a quote from your phone before you leave the driveway, with online payment built in.' },
      { title: 'Review & referral follow-ups', body: 'Automatic review requests after every completed job — email first, so it doesn\'t compete with your dispatch texts.' },
    ],
    faq: [
      { q: 'Can I schedule recurring seasonal maintenance visits?', a: 'Yes — recurring jobs can be set to any cadence (e.g. spring/fall tune-ups), with confirmation reminders sent to the customer automatically before each visit.' },
      { q: 'Does QCypher track HVAC equipment and parts separately from labor?', a: 'Yes, catalog items can be tagged as goods (units, filters, refrigerant) with quantity tracking, alongside separate service/labor line items on the same job.' },
      { q: 'What does QCypher cost for an HVAC business?', a: 'Plans start at $49/mo (Starter), with higher tiers unlocking QBot AI assistance and full inventory tracking — see the pricing page for a full breakdown.' },
      { q: 'Can customers pay their invoice online?', a: 'Yes, invoices include a secure online payment link, and payment status updates automatically once paid.' },
    ],
  },
  {
    slug: 'electricians',
    name: 'Electricians',
    metaTitle: 'CRM & Scheduling Software for Electricians | QCypher',
    metaDescription: 'A CRM built for electrical contractors — job scheduling, parts inventory, quotes, invoicing, and automatic customer follow-ups. From $49/mo.',
    heroKicker: 'For electrical contractors',
    heroHeadline: 'The CRM that keeps your electrical business organized',
    heroSubhead: 'Schedule jobs, quote on the spot, track parts and materials, and let follow-ups send themselves — so nothing falls through the cracks.',
    ctaLabel: 'Book a demo',
    painPoints: [
      { title: 'Quotes get lost in text threads', body: 'A quote texted from the job site is easy to lose — and hard to turn into a real, trackable order.' },
      { title: 'No system for tracking materials', body: 'Breakers, wire, panels — without inventory tracking, it\'s guesswork whether you have what the next job needs.' },
      { title: 'Repeat customers slip away', body: 'No automatic way to stay in touch means a one-time customer rarely becomes a repeat one.' },
    ],
    features: [
      { title: 'On-site quoting', body: 'Build a professional quote from your phone during the walkthrough, with e-signature and online payment.' },
      { title: 'Materials & parts inventory', body: 'Track breakers, wire, and fixtures with quantity and reorder alerts, linked to the jobs that use them.' },
      { title: 'Job scheduling & dispatch', body: 'A calendar built for service work, with technician assignment and automatic customer confirmations.' },
      { title: 'Automatic customer follow-up', body: 'Review requests and reminders go out on their own after every job — no manual texting required.' },
    ],
    faq: [
      { q: 'Can I send quotes and get them signed electronically?', a: 'Yes — quotes can be sent from any device, and customers can approve and pay online without printing anything.' },
      { q: 'Does QCypher handle both residential and commercial jobs?', a: 'Yes, orders and scheduling work the same way for both — you can tag and filter jobs however fits your business.' },
      { q: 'What\'s included at the $49/mo Starter tier?', a: 'Starter includes your website, CRM, scheduling, and quoting/invoicing. Higher tiers add QBot AI and full inventory tracking — see the pricing page for the full comparison.' },
      { q: 'Can I track which electrician handled which job?', a: 'Yes, jobs can be assigned to specific staff members, with per-staff scheduling and job history.' },
    ],
  },
  {
    slug: 'salons-spas',
    name: 'Salons & Spas',
    metaTitle: 'Booking & Client Management Software for Salons and Spas | QCypher',
    metaDescription: 'Online booking, client history, and automatic review requests for salons and spas. QCypher replaces your booking app, notebook, and follow-up texts — from $49/mo.',
    heroKicker: 'For salons, spas & beauty businesses',
    heroHeadline: 'Booking, client history, and follow-ups — all in one place',
    heroSubhead: 'Let clients book online 24/7, keep a full history on every client, and send automatic review requests after every visit.',
    ctaLabel: 'Start free trial',
    painPoints: [
      { title: 'Phone tag for every booking', body: 'Clients want to book at 9pm on a Sunday — not wait for you to answer the phone Monday morning.' },
      { title: 'No record of what a client had last time', body: 'Remembering every client\'s color formula or preferences from memory doesn\'t scale past a handful of regulars.' },
      { title: 'Reviews only happen if you remember to ask', body: 'The clients who loved their visit are exactly the ones who\'d leave a great review — if anyone asked.' },
    ],
    features: [
      { title: 'Online booking, 24/7', body: 'A booking page on your own site that clients can use any time, with automatic confirmation and reminder texts or emails.' },
      { title: 'Client history & notes', body: 'Every visit, note, and preference saved to the client\'s profile — pull it up before they sit down.' },
      { title: 'Automatic review requests', body: 'A review ask goes out automatically after every appointment, timed so it lands while the visit is still fresh.' },
      { title: 'Retail & product inventory', body: 'Track product stock alongside services, so you know what\'s low before a client asks for a refill.' },
    ],
    faq: [
      { q: 'Can clients book appointments themselves online?', a: 'Yes — your booking page lives on your own website and lets clients pick a service and time without calling in.' },
      { q: 'Does QCypher remember client preferences and history?', a: 'Yes, every client has a profile with visit history, notes, and any custom fields you want to track (like a color formula).' },
      { q: 'Is there a free trial?', a: 'Yes — you can try QCypher before committing; see the pricing page for current trial details and plan tiers starting at $49/mo.' },
      { q: 'Can I sell retail products alongside services?', a: 'Yes, product inventory and service line items live in the same catalog, so a checkout can include both.' },
    ],
  },
  {
    slug: 'coaches-consultants',
    name: 'Coaches & Consultants',
    metaTitle: 'CRM & Client Management Software for Coaches and Consultants | QCypher',
    metaDescription: 'Proposal templates, email sequences, and client tracking for coaches and consultants. Replace your spreadsheet and inbox chaos — from $49/mo.',
    heroKicker: 'For coaches, consultants & advisors',
    heroHeadline: 'Client management built for coaches and consultants',
    heroSubhead: 'Track every client relationship, send proposals and follow-ups automatically, and stop losing leads in your inbox.',
    ctaLabel: 'Start free trial',
    painPoints: [
      { title: 'Leads go cold waiting on a follow-up', body: 'A lead who booked a discovery call deserves a fast, consistent follow-up — not whatever you remember to send.' },
      { title: 'Proposals are rebuilt from scratch every time', body: 'Copy-pasting an old proposal into a new doc every time wastes hours you could spend with clients.' },
      { title: 'No single place to see client history', body: 'Notes in one app, emails in another, invoices somewhere else — nothing tells the full story of a client relationship.' },
    ],
    features: [
      { title: 'Client CRM & pipeline', body: 'Track every lead and client in one place, from first inquiry through ongoing engagement.' },
      { title: 'Reusable templates', body: 'Save proposal, follow-up, and check-in messages as templates — personalize and send in seconds, not from scratch.' },
      { title: 'Automatic follow-up sequences', body: 'Email-first automated touchpoints keep leads and clients warm without you having to remember to send them.' },
      { title: 'Invoicing & online payment', body: 'Send an invoice with a payment link built in, and see payment status update automatically.' },
    ],
    faq: [
      { q: 'Can I save reusable proposal and email templates?', a: 'Yes — the Templates page lets you build reusable email and text templates with merge fields (client name, business name, amount due) that fill in automatically when you send.' },
      { q: 'Does QCypher track my client pipeline, not just contacts?', a: 'Yes, contacts carry full history — orders, notes, communications — so you can see the whole relationship in one view.' },
      { q: 'Is QCypher overkill for a solo consultant?', a: 'No — Starter at $49/mo covers a single-person practice; you only pay for QBot AI or full inventory tracking if you actually need them.' },
      { q: 'Can I send an invoice and get paid online?', a: 'Yes, invoices include a secure payment link and update automatically once the client pays.' },
    ],
  },
  {
    slug: 'retail',
    name: 'Retail Shops',
    metaTitle: 'Inventory & Customer Management Software for Retail Shops | QCypher',
    metaDescription: 'Track stock, manage customers, and automate follow-ups for ice cream shops, grocers, and boutiques. One platform for inventory and customer relationships — from $49/mo.',
    heroKicker: 'For ice cream shops, grocers & boutiques',
    heroHeadline: 'Inventory and customer management for retail shops',
    heroSubhead: 'Track stock levels across every product, keep a record of your regulars, and automate the follow-ups and reorder alerts you\'d otherwise forget.',
    ctaLabel: 'Start free trial',
    painPoints: [
      { title: 'Stock counts live in your head, not a system', body: 'Knowing you\'re low on a flavor or size only when the shelf is already empty means lost sales you never see.' },
      { title: 'No record of who your regulars are', body: 'The customer who comes in every week deserves to be remembered — but there\'s no easy way to track that without a real system.' },
      { title: 'Reorder timing is guesswork', body: 'Ordering too early ties up cash in stock that sits; ordering too late means empty shelves during your busiest hours.' },
    ],
    features: [
      { title: 'Inventory with reorder alerts', body: 'Track quantity on every item, get flagged automatically when something falls below your reorder point.' },
      { title: 'Customer profiles & history', body: 'Keep every customer\'s order history and notes in one place — useful for loyalty, special orders, and outreach.' },
      { title: 'Sale price + rental/service pricing', body: 'One catalog handles straightforward retail pricing alongside anything you rent out or sell as a service.' },
      { title: 'Automatic customer follow-ups', body: 'Review requests and re-engagement messages go out on their own — email first, so it lands in an inbox, not lost in a text thread.' },
    ],
    faq: [
      { q: 'Does QCypher work as a point-of-sale system?', a: 'Not yet — QCypher currently handles inventory tracking, orders, and customer management, but doesn\'t replace a checkout register. Many retail shops run it alongside their existing POS for the customer and inventory side.' },
      { q: 'Can I track different product types (perishable vs. shelf-stable)?', a: 'Yes, catalog items support an expiry date field for perishables, plus quantity and reorder-point tracking for any product type.' },
      { q: 'Is this only for one location?', a: 'QCypher supports multiple locations on higher tiers, with inventory and staff scoped per location.' },
      { q: 'What does it cost for a small retail shop?', a: 'Plans start at $49/mo (Starter); full inventory tracking with reorder points and expiry dates is available from the Full inventory tier upward.' },
    ],
  },
  {
    slug: 'event-planners',
    name: 'Event Planners',
    metaTitle: 'Calendar & Client Tracking Software for Event Planners | QCypher',
    metaDescription: 'Manage every event, client, and vendor detail in one calendar and CRM built for event planners. Automated reminders and client follow-ups — from $49/mo.',
    heroKicker: 'For event & wedding planners',
    heroHeadline: 'Calendar and client tracking built for event planners',
    heroSubhead: 'Keep every event date, client detail, and rental item organized in one place — with reminders and follow-ups that send themselves.',
    ctaLabel: 'Start free trial',
    painPoints: [
      { title: 'Event details are scattered everywhere', body: 'Contracts in email, notes in a doc, dates in a separate calendar — nothing ties an event to its full history.' },
      { title: 'Rental items are hard to track across events', body: 'Chairs, linens, decor — knowing what\'s booked, out, or due back without a system means double-booking your own inventory.' },
      { title: 'Client communication falls behind during busy season', body: 'When three events are happening in the same week, the follow-up emails are the first thing to slip.' },
    ],
    features: [
      { title: 'Event calendar & scheduling', body: 'See every booked event at a glance, synced with Google Calendar and Cal.com so nothing gets double-booked.' },
      { title: 'Client & vendor history', body: 'Every client\'s past events, preferences, and communications live on one profile you can pull up instantly.' },
      { title: 'Rental inventory tracking', body: 'Mark items as rentable with their own pricing, and track what\'s currently checked out and when it\'s due back.' },
      { title: 'Automated client follow-ups', body: 'Booking confirmations, reminders, and post-event review requests go out on their own — email first.' },
    ],
    faq: [
      { q: 'Can I track rental items like decor, linens, or furniture?', a: 'Yes — catalog items can be marked as rentable with their own rental price and billing unit, and a dedicated Rentals view shows what\'s currently out and when it\'s due back.' },
      { q: 'Does the calendar sync with Google Calendar?', a: 'Yes, QCypher\'s calendar supports Google Calendar sync and Cal.com booking links.' },
      { q: 'Can clients see a history of their past events with me?', a: 'Yes, each client\'s profile keeps a full history of past orders, events, and communications.' },
      { q: 'What\'s the cost for a solo event planner?', a: 'Starter is $49/mo and covers calendar, CRM, and client communication — rental inventory tracking is available on higher tiers.' },
    ],
  },
]

export function getIndustry(slug: string): Industry | undefined {
  return INDUSTRIES.find(i => i.slug === slug)
}
