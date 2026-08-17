import Link from 'next/link'
import type { Metadata } from 'next'
import { FaqAccordion } from '@/components/faq/FaqAccordion'
import { FAQ_CATEGORIES } from '@/lib/faq-data'

export const metadata: Metadata = {
  title: 'FAQs',
  description: 'Answers to common questions about QCypher pricing, setup, billing, cancellation, data privacy, and support.',
  alternates: { canonical: 'https://www.qcyphertech.com/faq' },
  openGraph: {
    title: 'FAQs — QCypher Technologies',
    description: 'Answers to common questions about pricing, setup, billing, cancellation, data privacy, and support.',
    url: 'https://www.qcyphertech.com/faq',
    type: 'website',
  },
}

const LAST_UPDATED = 'August 15, 2026'

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

export default function FaqPage() {
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

        .wrap { max-width: 820px; margin: 0 auto; padding: 0 20px; }

        .nav-bar { position: sticky; top: 0; z-index: 50; background: rgba(255,255,255,0.95); backdrop-filter: blur(16px); border-bottom: 1px solid var(--border); }
        .nav-inner { display: flex; align-items: center; justify-content: space-between; padding: 20px 32px; width: 100%; }
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

        .doc-hero { padding: 56px 0 56px; background: linear-gradient(155deg, #0B1640 0%, #1a3070 45%, #2B5FA8 85%, #17C9E8 130%); position: relative; overflow: hidden; }
        .doc-hero .wrap { position: relative; }
        .doc-hero h1 { font-size: 38px; font-weight: 900; letter-spacing: -0.03em; color: #fff; margin-bottom: 10px; }
        .doc-hero p { font-size: 16px; color: rgba(255,255,255,0.78); max-width: 560px; line-height: 1.6; }
        .doc-meta { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; margin-top: 22px; }
        .doc-meta span { font-size: 13px; color: rgba(255,255,255,0.6); }

        /* CATEGORY JUMP NAV */
        .cat-nav { display: flex; flex-wrap: wrap; gap: 8px; padding: 20px 0 0; }
        .cat-nav a {
          font-size: 13px; font-weight: 700; color: #fff;
          background: rgba(255,255,255,0.14); border: 1px solid rgba(255,255,255,0.28);
          padding: 8px 16px; border-radius: 999px; transition: background .15s, border-color .15s, transform .15s;
          backdrop-filter: blur(6px);
        }
        .cat-nav a:hover { background: rgba(255,255,255,0.24); border-color: rgba(255,255,255,0.45); transform: translateY(-1px); }

        /* SEARCH — floats up out of the hero for a modern "command bar" feel */
        .faq-search-wrap { margin-top: -34px; position: relative; z-index: 2; }
        .faq-search {
          position: relative;
          display: flex; align-items: center;
        }
        .faq-search-icon { position: absolute; left: 20px; color: var(--soft); pointer-events: none; }
        .faq-search input {
          width: 100%; font-size: 16px; padding: 18px 48px;
          border-radius: 18px; border: 1px solid var(--border2);
          background: var(--card); color: var(--ink);
          outline: none; transition: border-color .15s, box-shadow .15s;
          box-shadow: 0 12px 32px -12px rgba(11,22,64,0.28), 0 1px 2px rgba(11,22,64,0.06);
        }
        .faq-search input:focus { border-color: var(--steel); box-shadow: 0 12px 32px -12px rgba(11,22,64,0.28), 0 0 0 4px rgba(43,95,168,0.14); }
        .faq-search-clear {
          position: absolute; right: 14px; width: 28px; height: 28px; border-radius: 9px;
          display: flex; align-items: center; justify-content: center;
          background: var(--border); border: none; color: var(--soft); cursor: pointer;
          transition: background .15s;
        }
        .faq-search-clear:hover { background: var(--border2); }
        .faq-result-count { font-size: 13px; font-weight: 600; color: var(--steel); margin: 16px 0 0 4px; }

        /* CATEGORIES + ACCORDION */
        .faq-category { margin-top: 44px; scroll-margin-top: 80px; }
        .faq-category-title {
          display: flex; align-items: center; gap: 9px;
          font-size: 13px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase;
          color: var(--steel); margin-bottom: 16px;
        }
        .faq-category-title::before {
          content: ''; width: 7px; height: 7px; border-radius: 50%;
          background: var(--teal); box-shadow: 0 0 0 3px rgba(23,201,232,0.18);
        }
        .faq-list { display: flex; flex-direction: column; gap: 10px; }
        .faq-item {
          background: var(--card); border: 1px solid var(--border2); border-radius: 16px;
          overflow: hidden; transition: border-color .18s, box-shadow .18s, transform .18s;
          box-shadow: 0 1px 2px rgba(11,22,64,0.03);
        }
        .faq-item:hover { border-color: rgba(43,95,168,0.32); }
        .faq-item-open { border-color: var(--steel); box-shadow: 0 10px 28px -10px rgba(43,95,168,0.28); }
        .faq-question {
          width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 12px;
          padding: 18px 20px; background: none; border: none; cursor: pointer; text-align: left;
          font-size: 16px; font-weight: 700; color: var(--ink); font-family: inherit;
        }
        .faq-chevron-wrap {
          flex-shrink: 0; width: 26px; height: 26px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          background: rgba(43,95,168,0.08); transition: background .18s, transform .2s;
        }
        .faq-item-open .faq-chevron-wrap { background: var(--steel); transform: rotate(180deg); }
        .faq-chevron { flex-shrink: 0; color: var(--steel); transition: color .18s; }
        .faq-item-open .faq-chevron { color: #fff; }
        .faq-answer { padding: 0 20px 20px; font-size: 16px; color: var(--soft); line-height: 1.7; animation: faqFadeIn .18s ease; }
        @keyframes faqFadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }

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

        @media (max-width: 480px) {
          .nav-inner { padding: 10px 16px; } .nav-logo img { height: 32px; }
          .nav-links { display: none; }
          .doc-hero h1 { font-size: 28px; }
          .faq-search input { padding: 13px 40px; font-size: 15px; }
          .faq-question { font-size: 15px; padding: 14px 16px; }
          .faq-answer { font-size: 15px; padding: 0 16px 16px; }
        }
      `}</style>

      <header className="nav-bar">
        <div className="nav-inner">
          <Link href="/" className="nav-logo"><img src="/qcypher-logo-horizontal.png" alt="QCypher Technologies" /></Link>
          <nav className="nav-links">
            <Link href="/" className="nav-link">Home</Link>
            <Link href="/security" className="nav-link">Security</Link>
          </nav>
          <div className="nav-cta"><Link href="/auth/login" className="btn btn-ghost btn-sm">Sign in</Link></div>
        </div>
      </header>

      <div className="doc-hero">
        <div className="wrap">
          <h1>Frequently Asked Questions</h1>
          <p>Real answers to the questions business owners actually ask us — about setup, pricing, billing, data, and support.</p>
          <div className="doc-meta">
            <span>Last updated: {LAST_UPDATED}</span>
            <span>Contact: info@qcyphertech.com</span>
          </div>
          <nav className="cat-nav" aria-label="Jump to category">
            {FAQ_CATEGORIES.map(cat => (
              <a key={cat.id} href={`#${cat.id}`}>{cat.label}</a>
            ))}
          </nav>
        </div>
      </div>

      <main className="wrap" style={{ paddingBottom: '64px' }}>
        <FaqAccordion />

        <div style={{ marginTop: '48px', padding: '24px', background: '#fff', border: '1px solid var(--border2)', borderRadius: '16px', textAlign: 'center' }}>
          <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--ink)', marginBottom: '6px' }}>Still have a question?</p>
          <p style={{ fontSize: '15px', color: 'var(--soft)', marginBottom: '16px' }}>
            Read the full <Link href="/privacy" style={{ color: 'var(--steel)', fontWeight: 600 }}>Privacy Policy</Link>, {' '}
            <Link href="/terms" style={{ color: 'var(--steel)', fontWeight: 600 }}>Terms of Service</Link>, or {' '}
            <Link href="/security" style={{ color: 'var(--steel)', fontWeight: 600 }}>Security page</Link> — or just email us.
          </p>
          <a
            href="mailto:info@qcyphertech.com"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg, #2a52a0, #4a9db5)', padding: '12px 24px', borderRadius: '12px' }}
          >
            info@qcyphertech.com
          </a>
        </div>
      </main>

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
