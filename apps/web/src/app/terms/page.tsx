import Link from 'next/link'
import type { Metadata } from 'next'
import { PrintButton } from '@/components/legal/PrintButton'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'The terms that apply when you use QCypher — billing, cancellation, and what you can expect from us.',
  alternates: { canonical: 'https://www.qcyphertech.com/terms' },
  openGraph: {
    title: 'Terms of Service — QCypher Technologies',
    description: 'The terms that apply when you use QCypher — billing, cancellation, and what you can expect from us.',
    url: 'https://www.qcyphertech.com/terms',
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

export default function TermsPage() {
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
        .price-table { width: 100%; border-collapse: collapse; margin: 8px 0 16px; font-size: 15px; }
        .price-table th, .price-table td { text-align: left; padding: 10px 12px; border-bottom: 1px solid var(--border); }
        .price-table th { color: var(--soft); font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 700; }
        .price-table td { color: var(--ink); font-weight: 600; }

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
          <h1>Terms of Service</h1>
          <p>These terms apply when you use QCypher. By signing up, you agree to these terms.</p>
          <div className="doc-meta">
            <span>Last updated: {LAST_UPDATED}</span>
            <span>Effective: {LAST_UPDATED}</span>
            <PrintButton label="Download as PDF" />
          </div>
        </div>
      </div>

      <article className="legal-article">
        <div className="wrap">

          <h2>What QCypher Is</h2>
          <p>QCypher builds websites. We also run your CRM, scheduling, and business automation. We serve small service businesses. We do not give accounting, legal, or tax advice.</p>

          <h2>Your Subscription &amp; Billing</h2>
          <p>Your plan renews each month. Here&apos;s what each plan costs:</p>
          <table className="price-table">
            <thead><tr><th>Plan</th><th>Setup fee</th><th>Monthly</th></tr></thead>
            <tbody>
              <tr><td>Starter</td><td>$1,250 one-time</td><td>$49/mo</td></tr>
              <tr><td>Growth</td><td>$1,250 one-time</td><td>$99/mo</td></tr>
              <tr><td>All-In</td><td>$1,250 one-time</td><td>$149/mo</td></tr>
            </tbody>
          </table>
          <p>We may set custom pricing if we agree on it with you directly. We charge your card on the same date each month.</p>
          <p><strong>Before you&apos;re charged:</strong> we email you 7 days ahead of time. That email shows the amount and the date, with a link to manage your plan.</p>
          <div className="callout">
            <strong>Your right to cancel:</strong> log in to your account and click &ldquo;Cancel Subscription.&rdquo; Your service stops right away, and we won&apos;t charge you again.
          </div>

          <h2>Payment &amp; Refunds</h2>
          <ul>
            <li>You pay upfront, by card, through Stripe or Helcim</li>
            <li>If we don&apos;t deliver what you paid for, we&apos;ll refund your setup fee</li>
            <li>To ask for a refund, email legal@qcyphertech.com within 30 days of your purchase</li>
          </ul>

          <h2>What You Can&apos;t Do</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Use QCypher for anything illegal</li>
            <li>Try to hack, copy, or take apart our code</li>
            <li>Upload viruses or harmful files</li>
            <li>Harass other users</li>
            <li>Steal or misuse someone else&apos;s trademarks, copyrights, or other protected work</li>
          </ul>

          <h2>Intellectual Property</h2>
          <p>You own your own data — your contacts, notes, and customer records. We own QCypher&apos;s code and design. You get a license to use QCypher for your business. You may not resell it.</p>

          <h2>Limitation of Liability</h2>
          <p>We give you QCypher &ldquo;as is.&rdquo; We are not liable for:</p>
          <ul>
            <li>Lost data (though we run daily backups)</li>
            <li>Lost revenue, or your business being interrupted</li>
            <li>Indirect damages — losses that follow from a problem, rather than being caused by it directly</li>
            <li>Problems caused by outside services (Google, Cal.com, Telnyx, etc.)</li>
          </ul>
          <p>If we owe you anything, the most we&apos;ll pay is what you paid us in the past 12 months.</p>

          <h2>Disclaimer</h2>
          <p>QCypher is a business tool. It is not professional advice. We don&apos;t give legal, tax, or accounting guidance. Talk to a professional for that.</p>

          <h2>Termination</h2>
          <p>We can close your account if you break these terms, or if your payment is more than 30 days late.</p>
          <p>You can cancel anytime. After you cancel, we keep your data for 30 more days. That gives you time to get it back if you change your mind. Then we delete it.</p>

          <h2>Changes to Terms</h2>
          <p>We may update these terms over time. We&apos;ll email you about any big changes. If you keep using QCypher after that, it means you accept them.</p>

          <h2>Governing Law</h2>
          <p>Maryland law governs these terms. If there&apos;s a dispute, it will be handled in a Maryland state or federal court.</p>

          <h2>Contact</h2>
          <p>Questions about these terms? Email <a href="mailto:legal@qcyphertech.com" style={{ color: 'var(--steel)', fontWeight: 600 }}>legal@qcyphertech.com</a>.</p>
          <p>We reply within 5 business days.</p>

          <div className="callout" style={{ marginTop: '32px' }}>
            <strong>Still have questions?</strong> Check out our <Link href="/faq" style={{ color: 'var(--steel)', fontWeight: 700 }}>FAQs</Link> or email <a href="mailto:legal@qcyphertech.com" style={{ color: 'var(--steel)', fontWeight: 600 }}>legal@qcyphertech.com</a>.
          </div>

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
