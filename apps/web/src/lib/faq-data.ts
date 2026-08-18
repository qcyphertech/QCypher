export type FaqItem = { q: string; a: string }
export type FaqCategory = { id: string; label: string; items: FaqItem[] }

// Answers are corrected against real app behavior where the original
// draft overstated what's built — notably cancellation (no no-login
// email link exists, only Settings while logged in) and QCypher's own
// invoices to tenants (created by hand, not auto-generated monthly, and
// not yet downloadable by the tenant).
export const FAQ_CATEGORIES: FaqCategory[] = [
  {
    id: 'setup',
    label: 'Setup & Onboarding',
    items: [
      { q: 'How long does setup take?', a: 'Your website and email go live on day one. We walk you through everything in your first week, so you’re up and running within about 7 days.' },
      { q: 'Do I need tech skills to use QCypher?', a: 'No. Everything is built to be simple. Felix or Thomas walks you through the first week, and you can reach out anytime you have questions.' },
      { q: 'What if I don’t like my website design?', a: 'We build your site with you, showing you options before it goes live. If you want changes, we handle them — no hidden fees.' },
      { q: 'Can I switch to a different plan later?', a: 'Yes. Switch anytime — Starter, Growth, or All-In — in either direction. No penalties, no long-term contracts.' },
    ],
  },
  {
    id: 'features',
    label: 'Features & CRM',
    items: [
      { q: 'What’s included in the customer management tool?', a: 'It’s a simple CRM: contacts, notes, call history, appointment scheduling, and SMS and email templates. It’s included free with every monthly plan.' },
      { q: 'Can I import my existing customers?', a: 'Yes. Upload a CSV file of your contacts. We’ll flag anything that looks like a duplicate so you can review it before it’s added.' },
      { q: 'Does the scheduling work on my phone?', a: 'Yes. Everything works on desktop, tablet, or phone — you can manage appointments from anywhere.' },
      { q: 'Can my team members use the CRM?', a: 'Yes. You can invite team members and set their access level: Admin, User, or Read-only.' },
    ],
  },
  {
    id: 'pricing',
    label: 'Pricing & Billing',
    items: [
      { q: 'What’s the setup fee for?', a: 'The $1,250 setup fee covers your domain, website build, email setup, Google Business Profile, initial training, and your first month of configuration.' },
      { q: 'Do you charge monthly or annual?', a: 'Monthly. Your plan renews automatically each month, and you get a reminder email 7 days before we charge you.' },
      { q: 'Can I get a discount?', a: 'Talk to Felix or Thomas. Custom pricing is available for annual commitments or larger setups — email info@qcyphertech.com to discuss.' },
      { q: 'What if I want to cancel?', a: 'Log in to your account and cancel from Settings — it takes one click once you’re in. Your service ends immediately, and we won’t charge you again. No penalties.' },
      { q: 'What payment methods do you accept?', a: 'Credit and debit cards, via Stripe or Helcim. We handle invoicing and billing securely.' },
      { q: 'Do I get a refund if I cancel mid-month?', a: 'Cancellation is effective immediately — we don’t refund partial months. But you keep access to your website and CRM until your next billing date.' },
    ],
  },
  {
    id: 'billing',
    label: 'Billing & Auto-Renewal',
    items: [
      { q: 'When will I be charged?', a: 'On the same date each month as your original setup. You’ll get an email reminder 7 days before.' },
      { q: 'Can I change my billing date?', a: 'Email legal@qcyphertech.com and we’ll adjust it for you — this isn’t currently a self-serve setting.' },
      { q: 'What if my card is declined?', a: 'We’ll retry the charge and email you. If it keeps failing, we’ll reach out directly to help troubleshoot.' },
      { q: 'Do you charge the setup fee every month?', a: 'No. Setup is one-time ($1,250). Monthly charges are just your subscription price ($49–$149/mo depending on plan).' },
    ],
  },
  {
    id: 'payments',
    label: 'Customer Payments (Stripe)',
    items: [
      { q: 'How do my customers pay me for invoices?', a: 'You generate a payment link in the CRM and send it by SMS or email. They click it and pay securely through Stripe — the money goes straight to your bank account.' },
      { q: 'What fees do you charge on customer payments?', a: 'None. You only pay Stripe’s standard processing fee. QCypher takes nothing from your customer payments.' },
      { q: 'Do I need a Stripe account?', a: 'Yes — you connect your own Stripe account from Settings. Your customers’ payments go to your bank, never ours.' },
    ],
  },
  {
    id: 'data',
    label: 'Data & Privacy',
    items: [
      { q: 'Who owns my customer data?', a: 'You do. We don’t sell it, share it, or use it for anything except running your CRM. See our Privacy Policy for details.' },
      { q: 'Can I download all my data?', a: 'Yes. Go to Settings → Export, and download everything as a CSV file anytime.' },
      { q: 'What happens if I cancel?', a: 'Your data is deleted 30 days after cancellation, which gives you time to export it if you want a copy. After that, it’s gone for good.' },
      { q: 'Is my data secure?', a: 'Yes — encrypted in transit and at rest, daily backups, and role-based access control. See our Security page for the full picture.' },
    ],
  },
  {
    id: 'support',
    label: 'Support & Troubleshooting',
    items: [
      { q: 'How do I get help if something breaks?', a: 'Email info@qcyphertech.com or call (804) 250-5066. Felix or Thomas helps you directly — not a support ticket queue.' },
      { q: 'How fast do you respond?', a: 'Usually the same day. We’re a small team, so we prioritize based on urgency.' },
      { q: 'Do you offer training?', a: 'Yes. Week-one onboarding includes a full walkthrough, plus a monthly check-in call where we explain your numbers.' },
      { q: 'What if I have a feature request?', a: 'Tell us! We build based on customer feedback — email info@qcyphertech.com with your idea.' },
    ],
  },
  {
    id: 'technical',
    label: 'Technical',
    items: [
      { q: 'What happens if your servers go down?', a: 'We run on Supabase, which is AWS-backed with daily backups, so your data stays safe. In the rare case of downtime, we’ll notify you and work to restore service quickly.' },
      { q: 'Can I use QCypher offline?', a: 'The web app needs an internet connection right now. Offline mobile access is on our roadmap.' },
      { q: 'Do you have an API?', a: 'Not yet, but we’re planning integrations with accounting software and other tools — let us know what you need.' },
    ],
  },
  {
    id: 'billing-issues',
    label: 'Billing Issues',
    items: [
      { q: 'I was charged twice. What do I do?', a: 'That’s a mistake on our end — email legal@qcyphertech.com with your order number and we’ll issue a refund right away.' },
      { q: 'I see a charge I don’t recognize.', a: 'It could be from an old trial or a team member’s signup. Email legal@qcyphertech.com and we’ll look into it.' },
      { q: 'Can I get an invoice for accounting?', a: 'Yes — email legal@qcyphertech.com and we’ll send you a copy of any invoice you need. A self-serve invoice history in your account is on our roadmap.' },
    ],
  },
  {
    id: 'accountants',
    label: 'For Accountants & Bookkeepers',
    items: [
      { q: 'How should I categorize QCypher charges?', a: 'It’s typically “Software as a Service” or “Business Software” for accounting purposes. Your accountant can confirm based on your chart of accounts.' },
      { q: 'Do you offer bulk discounts for multiple businesses?', a: 'Contact Felix directly at info@qcyphertech.com to discuss volume pricing.' },
    ],
  },
]
