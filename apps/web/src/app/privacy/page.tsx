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
        .nav-inner { display: flex; align-items: center; justify-content: space-between; padding: 12px 20px; max-width: 1060px; margin: 0 auto; }
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
          <p>This page explains what we collect, how we use it, and your rights. No legal jargon — just the facts.</p>
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
          <p><strong>From you directly:</strong> Name, email, phone, business address, and payment info.</p>
          <p><strong>From your customers:</strong> Names, emails, phone numbers, and service history — stored in your CRM.</p>
          <p><strong>Usage data:</strong> How you use the platform (logins, features used), IP address, and browser type.</p>
          <p><strong>Automatically:</strong> Cookies (authentication only) and basic analytics.</p>
          <div className="callout">
            <strong>Your customer data belongs to you.</strong> We don&apos;t sell it, share it, or use it for marketing. We only access it to provide the service you&apos;ve paid for.
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
            <li>What it does: summarizes your booking trends, review scores, and customer engagement</li>
            <li>Data used: your CRM records (contacts, notes, completed jobs)</li>
            <li>Impact: gives you insights to improve your business</li>
            <li>Opt-out: disable this in settings (you won&apos;t receive monthly summaries)</li>
          </ul>
          <p><strong>2. Automatic Review Requests (automated workflow)</strong></p>
          <ul>
            <li>What it does: sends review request emails/SMS after a job is marked complete</li>
            <li>Data used: job completion date, customer email/phone</li>
            <li>Impact: helps you collect more online reviews</li>
            <li>Opt-out: disable in Automation settings, or turn off for a specific customer</li>
          </ul>

          <h2>Third-Party Services (Who We Share With)</h2>
          <div className="svc-row"><strong>Supabase</strong><span>Database storage (encrypted). Stores CRM data and user accounts. SOC 2 Type II compliant.</span></div>
          <div className="svc-row"><strong>Vercel</strong><span>Website hosting. Stores site content and analytics. CDN for fast loading.</span></div>
          <div className="svc-row"><strong>Cal.com</strong><span>Scheduling integration. Stores appointment bookings and availability.</span></div>
          <div className="svc-row"><strong>Telnyx</strong><span>SMS/phone. Stores SMS logs and calls, used for review requests and payment reminders.</span></div>
          <div className="svc-row"><strong>Resend</strong><span>Email service. Stores email addresses and logs, used for invoices and notifications.</span></div>
          <div className="svc-row"><strong>Stripe / Helcim</strong><span>Payment processing. Stores billing info and transaction history. PCI-compliant.</span></div>
          <div className="svc-row"><strong>Google Business Profile</strong><span>Your public business listing. You control what&apos;s shown.</span></div>
          <div className="callout">We don&apos;t sell your data to advertisers or data brokers. The services above process data only to deliver QCypher&apos;s features.</div>

          <h2>Data Retention &amp; Deletion</h2>
          <ul>
            <li>Audit logs: 90 days (automatically deleted after)</li>
            <li>Backups: 7&ndash;30 days (managed by Supabase)</li>
            <li>Billing records: 5 years (required for tax/accounting)</li>
            <li>Customer data: deleted immediately when an account is closed, after a 30-day grace period</li>
          </ul>
          <p>You can export all your data as CSV anytime. You can request account deletion, and all your data will be permanently deleted after 30 days.</p>

          <h2>Your Rights (GDPR &amp; CCPA)</h2>
          <p>You have the right to:</p>
          <ul>
            <li><strong>Access</strong> — request a copy of all your data</li>
            <li><strong>Correct</strong> — update incorrect information</li>
            <li><strong>Delete</strong> — request deletion (30-day grace period, then permanent)</li>
            <li><strong>Export</strong> — download all your data as CSV</li>
            <li><strong>Opt-out</strong> — disable automated features (AI reports, review requests)</li>
          </ul>
          <p>To exercise these rights, email <a href="mailto:legal@qcyphertech.com" style={{ color: 'var(--steel)', fontWeight: 600 }}>legal@qcyphertech.com</a>. We&apos;ll respond within 30 days.</p>

          <h2>Cookies &amp; Tracking</h2>
          <p>We use minimal cookies (authentication only). We don&apos;t track you with third-party analytics or ad pixels. If you use Google Business Profile or Stripe, their cookies may be present — read their privacy policies for details.</p>

          <h2>Security</h2>
          <p>Your data is encrypted in transit (TLS 1.2+) and at rest (AES-256). Access is restricted to authorized staff via role-based access control. We log all access and delete old logs after 90 days.</p>
          <p>See our full <Link href="/security" style={{ color: 'var(--steel)', fontWeight: 600 }}>Security page</Link> for details.</p>

          <h2>Children&apos;s Privacy</h2>
          <p>QCypher is not intended for anyone under 18. We don&apos;t knowingly collect data from minors. If we discover we have, we delete it immediately.</p>

          <h2>Changes to This Policy</h2>
          <p>We update this policy annually or when our practices change. We&apos;ll email you if there are material changes.</p>

          <h2>Contact</h2>
          <p>Questions about your data? Email <a href="mailto:legal@qcyphertech.com" style={{ color: 'var(--steel)', fontWeight: 600 }}>legal@qcyphertech.com</a>.</p>
          <p>Response time: within 5 business days.</p>

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
