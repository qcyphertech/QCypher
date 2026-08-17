import Link from 'next/link'
import type { Metadata } from 'next'
import { PrintButton } from '@/components/legal/PrintButton'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'What QCypher collects, how we use it, and your rights over your data — in plain English.',
  alternates: { canonical: 'https://www.qcyphertech.com/privacy' },
  openGraph: {
    title: 'Privacy Policy — QCypher Technologies',
    description: 'Your data. Your control. Here’s exactly what we collect and why.',
    url: 'https://www.qcyphertech.com/privacy',
    type: 'website',
  },
}

const LAST_UPDATED = 'August 14, 2026'

const INTEGRATION_LOGOS = [
  { name: 'Google Business Profile', file: '/logos/googlebusiness.png' },
  { name: 'Cal.com', file: '/logos/calcom.png' },
  { name: 'Telnyx', file: '/logos/telnyx.svg' },
  { name: 'Resend', file: '/logos/resend.svg' },
  { name: 'Supabase', file: '/logos/supabase.svg' },
  { name: 'Cloudflare', file: '/logos/cloudflare.svg' },
  { name: 'Vercel', file: '/logos/vercel.svg' },
  { name: 'GitHub', file: '/logos/github.svg' },
  { name: 'Anthropic', file: '/logos/anthropic.png' },
]

export default function PrivacyPage() {
  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif', background: '#f8f9fc', color: '#171a2b', lineHeight: 1.5 }}>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        a { color: inherit; text-decoration: none; }
        img { max-width: 100%; display: block; }

        :root {
          --ink: #171a2b; --soft: #5b6072; --bg: #f8f9fc; --card: #ffffff;
          --border: rgba(26,48,112,0.10); --border2: rgba(26,48,112,0.18);
          --navy: #0B1640; --indigo: #1a3070; --indigo-d: #2a52a0; --steel: #2B5FA8;
          --cyan: #4a9db5; --teal: #17C9E8; --mint: #00a87a;
        }

        .wrap { max-width: 780px; margin: 0 auto; padding: 0 20px; }

        .nav-bar { position: sticky; top: 0; z-index: 50; background: rgba(255,255,255,0.95); backdrop-filter: blur(16px); border-bottom: 1px solid var(--border); }
        .nav-inner { display: flex; align-items: center; justify-content: space-between; padding: 20px 32px; max-width: 1152px; margin: 0 auto; }
        .nav-logo { display: flex; align-items: center; gap: 2px; font-weight: 800; font-size: 17px; color: var(--indigo); }
        .nav-logo img { height: 44px; width: auto; display: block; }
        .nav-links { display: flex; align-items: center; gap: 24px; }
        .nav-link { font-size: 15px; font-weight: 600; color: var(--soft); transition: color .15s; }
        .nav-link:hover, .nav-link.active { color: var(--indigo); }
        .nav-cta { display: flex; align-items: center; gap: 8px; }

        .btn { display: inline-flex; align-items: center; justify-content: center; gap: 7px; min-height: 44px; padding: 0 20px; border-radius: 10px; font-weight: 700; font-size: 15px; cursor: pointer; border: 1px solid transparent; transition: transform .15s, opacity .15s; font-family: inherit; text-align: center; }
        .btn:hover { transform: translateY(-1px); }
        .btn-ghost { background: transparent; color: var(--indigo); border: 1px solid var(--border2); }
        .btn-ghost:hover { border-color: var(--cyan); color: var(--cyan); }
        .btn-sm { min-height: 44px; padding: 0 14px; font-size: 14px; white-space: nowrap; }

        .doc-hero { padding: 56px 0 36px; background: linear-gradient(155deg, #0B1640 0%, #1a3070 45%, #2B5FA8 85%, #17C9E8 130%); position: relative; overflow: hidden; }
        .doc-hero .wrap { position: relative; }
        .doc-hero h1 { font-size: 38px; font-weight: 900; letter-spacing: -0.03em; color: #fff; margin-bottom: 10px; }
        .doc-hero p { font-size: 16px; color: rgba(255,255,255,0.78); max-width: 560px; line-height: 1.6; }
        .doc-meta { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; margin-top: 22px; }
        .doc-meta span { font-size: 13px; color: rgba(255,255,255,0.6); }

        .legal-article { padding: 48px 0 64px; background: #fff; }
        .legal-article h2 { font-size: 21px; font-weight: 800; color: var(--ink); letter-spacing: -0.02em; margin: 40px 0 12px; }
        .legal-article h2:first-child { margin-top: 0; }
        .legal-article p { font-size: 16px; color: var(--soft); line-height: 1.75; margin-bottom: 12px; }
        .legal-article ul { margin: 0 0 12px 20px; }
        .legal-article li { font-size: 16px; color: var(--soft); line-height: 1.75; margin-bottom: 6px; }
        .legal-article strong { color: var(--ink); }
        .callout { margin: 16px 0; padding: 16px 20px; background: rgba(43,95,168,0.06); border-left: 3px solid var(--steel); border-radius: 8px; font-size: 15px; color: var(--soft); line-height: 1.65; }
        .callout strong { color: var(--ink); }
        .svc-row { display: flex; gap: 8px; margin-bottom: 10px; font-size: 15px; color: var(--soft); line-height: 1.6; }
        .svc-row strong { flex-shrink: 0; color: var(--ink); }

        footer { position: relative; padding: 22px 0 12px; background: linear-gradient(145deg, #0e1f45 0%, #1a3070 45%, #1e4a7a 75%, #246080 100%); overflow: hidden; }
        footer::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, transparent, var(--cyan), var(--mint), transparent); opacity: 0.7; }
        footer .wrap { position: relative; max-width: 1060px; }
        footer .nav-logo { color: #fff; }
        .foot-grid { display: grid; grid-template-columns: 1.4fr 1fr 1fr; gap: 20px; margin-bottom: 12px; }
        @media (max-width: 680px) { .foot-grid { grid-template-columns: 1fr; gap: 14px; } }
        .foot-brand p { font-size: 13px; color: rgba(255,255,255,0.55); max-width: 260px; margin-top: 4px; line-height: 1.45; }
        .foot-col h5 { font-size: 11px; text-transform: uppercase; letter-spacing: .12em; color: rgba(255,255,255,0.4); margin-bottom: 6px; font-weight: 700; }
        .foot-col a { display: flex; align-items: center; gap: 6px; font-size: 13px; color: rgba(255,255,255,0.75); margin-bottom: 3px; font-weight: 500; transition: color .15s, transform .15s; width: fit-content; }
        .foot-col a:hover { color: #fff; transform: translateX(3px); }
        .foot-bottom { border-top: 1px solid rgba(255,255,255,0.1); padding-top: 10px; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px; font-size: 13px; color: rgba(255,255,255,0.4); }
        .integrations-section { padding: 0.85rem 0; margin-bottom: 10px; border-top: 1px solid rgba(255,255,255,0.08); border-bottom: 1px solid rgba(255,255,255,0.08); }
        .integrations-headline { text-align: center; font-size: 12px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: rgba(255,255,255,0.4); margin-bottom: 14px; }
        .integrations-grid { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; }
        .integration-card { width: 60px; height: 30px; border-radius: 8px; background: rgba(255,255,255,0.92); display: flex; align-items: center; justify-content: center; padding: 6px; flex: 0 0 auto; }
        .integration-card img { max-width: 100%; max-height: 100%; object-fit: contain; display: block; }

        @media print {
          .nav-bar, footer, .print-btn, .doc-meta { display: none !important; }
          .doc-hero { background: #fff !important; padding: 0 0 24px; }
          .doc-hero h1, .doc-hero p { color: #171a2b !important; }
          .legal-article { padding: 0; }
        }
        @media (max-width: 480px) {
          .nav-inner { padding: 10px 16px; } .nav-logo img { height: 32px; }
          .nav-links { display: none; }
          .doc-hero h1 { font-size: 28px; }
        }
      `}</style>

      <header className="nav-bar">
        <div className="nav-inner">
          <Link href="/" className="nav-logo"><img src="/qcypher-logo-horizontal.png" alt="QCypher Technologies" /></Link>
          <nav className="nav-links">
            <Link href="/" className="nav-link">Home</Link>
            <Link href="/about" className="nav-link">About</Link>
            <Link href="/security" className="nav-link">Security</Link>
          </nav>
          <div className="nav-cta"><Link href="/auth/login" className="btn btn-ghost btn-sm">Sign in</Link></div>
        </div>
      </header>

      <div className="doc-hero">
        <div className="wrap">
          <h1>Your Data. Your Control.</h1>
          <p>This page tells you what we collect. It tells you how we use it. It tells you your rights. No legal jargon — just the facts.</p>
          <div className="doc-meta">
            <span>Last updated: {LAST_UPDATED}</span>
            <span>Contact: legal@qcyphertech.com</span>
            <PrintButton label="Download as PDF" />
          </div>
        </div>
      </div>

      <article className="legal-article">
        <div className="wrap">

          <h2>What Data We Collect</h2>
          <p><strong>From you:</strong> Your name, email, phone, business address, and payment info.</p>
          <p><strong>From your customers:</strong> Their names, emails, phone numbers, and service history. This lives in your CRM.</p>
          <p><strong>Usage data:</strong> How you use the app. This means logins, which features you use, your IP address, and your browser type.</p>
          <p><strong>Automatic data:</strong> Login cookies and basic usage stats.</p>
          <div className="callout">
            <strong>Your customer data belongs to you.</strong> We don&apos;t sell it. We don&apos;t share it. We don&apos;t use it for marketing. We only touch it to run the service you pay for.
          </div>

          <h2>How We Use Your Data</h2>
          <ul>
            <li>Provide the CRM, website, and scheduling tools</li>
            <li>Send billing invoices and receipts</li>
            <li>Send service notifications (review requests, payment reminders)</li>
            <li>Improve our product (usage analytics, error tracking)</li>
            <li>Comply with the law</li>
          </ul>
          <p><strong>What we don&apos;t do:</strong></p>
          <ul>
            <li>We don&apos;t sell or share your business data</li>
            <li>We don&apos;t use customer data for targeted advertising</li>
            <li>We don&apos;t train AI models on your data without consent</li>
          </ul>

          <h2>AI &amp; Automated Decision-Making</h2>
          <p>We use AI in two places:</p>
          <p><strong>1. Monthly Customer Report (AI-generated)</strong></p>
          <ul>
            <li>What it does: sums up your bookings, review scores, and customer activity</li>
            <li>Data used: your CRM records — contacts, notes, finished jobs</li>
            <li>Why it helps: gives you tips to grow your business</li>
            <li>Turn it off: use Settings. You&apos;ll stop getting the monthly summary.</li>
          </ul>
          <p><strong>2. Automatic Review Requests</strong></p>
          <ul>
            <li>What it does: texts or emails a review request once a job is done</li>
            <li>Data used: the job&apos;s completion date, plus the customer&apos;s email or phone</li>
            <li>Why it helps: gets you more online reviews</li>
            <li>Turn it off: use Automation settings. Or turn it off for just one customer.</li>
          </ul>

          <h2>Third-Party Services (Who We Share With)</h2>
          <div className="svc-row"><strong>Supabase</strong><span>Our database. Stores your CRM data and logins. Encrypted and independently audited.</span></div>
          <div className="svc-row"><strong>Vercel</strong><span>Hosts our website. Stores site content and basic stats. Makes pages load fast.</span></div>
          <div className="svc-row"><strong>Cal.com</strong><span>Runs our scheduling. Stores bookings and open time slots.</span></div>
          <div className="svc-row"><strong>Telnyx</strong><span>Sends texts and calls. Stores text logs, used for reviews and payment reminders.</span></div>
          <div className="svc-row"><strong>Resend</strong><span>Sends email. Stores email addresses and send logs, used for invoices and alerts.</span></div>
          <div className="svc-row"><strong>Stripe / Helcim</strong><span>Handles payments. Stores billing info and past charges. Meets card-industry security rules.</span></div>
          <div className="svc-row"><strong>Google Business Profile</strong><span>Your public listing. You choose what it shows.</span></div>
          <div className="callout">We don&apos;t sell your data to advertisers. We don&apos;t sell it to data brokers. The services above only touch your data to run QCypher&apos;s features.</div>

          <h2>Data Retention &amp; Deletion</h2>
          <ul>
            <li>Audit logs: kept 90 days, then deleted automatically</li>
            <li>Backups: kept 7&ndash;30 days by Supabase</li>
            <li>Billing records: kept 5 years, as tax law requires</li>
            <li>Customer data: deleted 30 days after you close your account</li>
          </ul>
          <p>You can export all your data as a CSV file anytime. Ask us to delete your account, and it&apos;s gone for good in 30 days.</p>

          <h2>Your Rights (GDPR &amp; CCPA)</h2>
          <p>You have the right to:</p>
          <ul>
            <li><strong>Access</strong> — get a copy of all your data</li>
            <li><strong>Correct</strong> — fix wrong information</li>
            <li><strong>Delete</strong> — ask us to delete it (gone for good after 30 days)</li>
            <li><strong>Export</strong> — download your data as a CSV file</li>
            <li><strong>Opt out</strong> — turn off AI reports or review requests</li>
          </ul>
          <p>To use these rights, email <a href="mailto:legal@qcyphertech.com" style={{ color: 'var(--steel)', fontWeight: 600 }}>legal@qcyphertech.com</a>. We reply within 30 days.</p>

          <h2>Cookies &amp; Tracking</h2>
          <p>We use very few cookies. They&apos;re only for login. We don&apos;t track you with ad pixels. We don&apos;t use third-party analytics. Google Business Profile and Stripe may set their own cookies — check their own privacy pages for that.</p>

          <h2>Security</h2>
          <p>Your data is locked with encryption, both while it travels and while it sits in our database. Only approved staff can access it, based on their role. We log every access, and we delete old logs after 90 days.</p>
          <p>See our full <Link href="/security" style={{ color: 'var(--steel)', fontWeight: 600 }}>Security page</Link> for more.</p>

          <h2>Children&apos;s Privacy</h2>
          <p>QCypher is not for anyone under 18. We don&apos;t knowingly collect data from kids. If we find out we did, we delete it right away.</p>

          <h2>Changes to This Policy</h2>
          <p>We update this page once a year, or sooner if our practices change. We&apos;ll email you about any big changes.</p>

          <h2>Contact</h2>
          <p>Questions about your data? Email <a href="mailto:legal@qcyphertech.com" style={{ color: 'var(--steel)', fontWeight: 600 }}>legal@qcyphertech.com</a>.</p>
          <p>We reply within 5 business days.</p>

        </div>
      </article>

      <footer>
        <div className="wrap">
          <div className="foot-grid">
            <div className="foot-brand">
              <div className="nav-logo" style={{ marginBottom: 0 }}><img src="/qcypher-logo-footer.png" alt="QCypher Technologies" /></div>
              <p>Simple tech solutions for local businesses. No jargon, just results.</p>
            </div>
            <div className="foot-col">
              <h5>Contact Us</h5>
              <a href="mailto:info@qcyphertech.com">info@qcyphertech.com</a>
              <a href="tel:+18042505066" style={{ fontWeight: 600, color: 'var(--cyan)', marginBottom: '4px' }}>(804) 250-5066</a>
            </div>
            <div className="foot-col">
              <h5>Quick Links</h5>
              <Link href="/about">About</Link>
              <Link href="/security">Security</Link>
              <Link href="/privacy">Privacy</Link>
              <Link href="/terms">Terms</Link>
              <Link href="/faq">FAQs</Link>
              <Link href="/auth/login">Client Login</Link>
            </div>
          </div>
          <div className="integrations-section" role="region" aria-label="Integration partners">
            <div className="integrations-headline">Built to work together — no tech headaches</div>
            <div className="integrations-grid">
              {INTEGRATION_LOGOS.map(logo => (
                <div className="integration-card" key={logo.file}><img src={logo.file} alt={logo.name} loading="lazy" /></div>
              ))}
            </div>
          </div>
          <div className="foot-bottom">
            <span>© 2026 QCypher Technologies. All rights reserved.</span>
            <span>Built for small businesses, by a small business.</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
