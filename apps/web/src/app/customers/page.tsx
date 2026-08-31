import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Customer Stories',
  description: 'Real small businesses running on QCypher — HVAC and plumbing, mobile cleaning, and roofing — and what changed after they switched.',
  alternates: { canonical: 'https://www.qcyphertech.com/customers' },
  openGraph: {
    title: 'Customer Stories — QCypher Technologies',
    description: 'Real small businesses running on QCypher and what changed after they switched.',
    url: 'https://www.qcyphertech.com/customers',
    type: 'website',
  },
}

const STORIES = [
  {
    initials: 'MR',
    name: 'Marcus R.',
    business: 'HVAC & Plumbing',
    location: 'Richmond, VA',
    quote: 'Before QCypher, I was keeping track of everything in my head and a bunch of sticky notes. Now I actually know which customers I need to follow up with. Got 8 new bookings in 30 days. It\'s honestly one of the best things I\'ve done for my business.',
    accent: '#2a52a0',
  },
  {
    initials: 'DW',
    name: 'Denise W.',
    business: 'Mobile Cleaning Service',
    location: 'Annapolis, MD',
    quote: 'They set up my website and Google listing in the same week. My phone started ringing more within the first month. Thomas walked me through everything — no tech background needed.',
    accent: '#4a9db5',
  },
  {
    initials: 'JT',
    name: 'James T.',
    business: 'Roofing Contractor',
    location: 'Alexandria, VA',
    quote: 'I\'ve worked with a few different tech companies and most of them just hand you a login and disappear. QCypher actually shows up. Felix walked me through everything, answered my questions the same day, and the tools they built actually work the way they say they do. Couldn\'t ask for more.',
    accent: '#17C9E8',
  },
]

export default function CustomersPage() {
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

        .wrap { max-width: 900px; margin: 0 auto; padding: 0 20px; }

        .nav-bar { position: sticky; top: 0; z-index: 50; background: rgba(255,255,255,0.95); backdrop-filter: blur(16px); border-bottom: 1px solid var(--border); }
        .nav-inner { display: flex; align-items: center; justify-content: space-between; padding: 20px 32px; width: 100%; }
        .nav-logo { display: flex; align-items: center; gap: 2px; font-weight: 800; font-size: 17px; color: var(--indigo); }
        .nav-logo img { height: 44px; width: auto; display: block; }
        .nav-links { display: flex; align-items: center; gap: 24px; }
        .nav-link { font-size: 15px; font-weight: 600; color: var(--soft); transition: color .15s; }
        .nav-link:hover { color: var(--indigo); }
        .nav-cta { display: flex; align-items: center; gap: 8px; }

        .btn { display: inline-flex; align-items: center; justify-content: center; gap: 7px; min-height: 44px; padding: 0 20px; border-radius: 10px; font-weight: 700; font-size: 15px; cursor: pointer; border: 1px solid transparent; transition: transform .15s, opacity .15s; font-family: inherit; text-align: center; }
        .btn:hover { transform: translateY(-1px); }
        .btn-primary { background: linear-gradient(135deg, #2a52a0, #4a9db5); color: #fff; }
        .btn-ghost { background: transparent; color: var(--indigo); border: 1px solid var(--border2); }
        .btn-ghost:hover { border-color: var(--cyan); color: var(--cyan); }
        .btn-sm { min-height: 44px; padding: 0 14px; font-size: 14px; white-space: nowrap; }

        .doc-hero { padding: 56px 0 56px; background: linear-gradient(155deg, #0B1640 0%, #1a3070 45%, #2B5FA8 85%, #17C9E8 130%); position: relative; overflow: hidden; }
        .doc-hero .wrap { position: relative; }
        .doc-hero h1 { font-size: 38px; font-weight: 900; letter-spacing: -0.03em; color: #fff; margin-bottom: 10px; }
        .doc-hero p { font-size: 16px; color: rgba(255,255,255,0.78); max-width: 560px; line-height: 1.6; }

        .story { background: var(--card); border: 1px solid var(--border2); border-radius: 20px; padding: 32px; margin-bottom: 20px; }
        .story-head { display: flex; align-items: center; gap: 14px; margin-bottom: 18px; }
        .story-avatar { width: 52px; height: 52px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 800; font-size: 17px; flex-shrink: 0; }
        .story-name { font-size: 17px; font-weight: 800; color: var(--ink); }
        .story-meta { font-size: 14px; color: var(--soft); }
        .story-quote { font-size: 18px; line-height: 1.65; color: var(--ink); font-style: italic; }

        footer { position: relative; padding: 22px 0 12px; background: linear-gradient(145deg, #0e1f45 0%, #1a3070 45%, #1e4a7a 75%, #246080 100%); overflow: hidden; margin-top: 40px; }
        footer::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, transparent, var(--cyan), var(--mint), transparent); opacity: 0.7; }
        footer .wrap { position: relative; max-width: 1060px; }
        footer .nav-logo { color: #fff; }
        .foot-compact { display: flex; flex-wrap: wrap; gap: 32px 40px; margin-bottom: 12px; }
        .foot-contact { flex-shrink: 0; min-width: 170px; }
        .foot-contact h5, .foot-links h5 { font-size: 11px; text-transform: uppercase; letter-spacing: .12em; color: rgba(255,255,255,0.4); margin-bottom: 8px; font-weight: 700; }
        .foot-contact a { display: block; font-size: 13px; font-weight: 600; color: var(--cyan); margin-bottom: 2px; }
        .foot-links { flex: 1; min-width: 220px; }
        .foot-links-row { display: flex; flex-wrap: wrap; gap: 6px 18px; }
        .foot-links-row a { font-size: 13px; color: rgba(255,255,255,0.75); font-weight: 500; transition: color .15s; }
        .foot-links-row a:hover { color: #fff; }
        .foot-bottom { border-top: 1px solid rgba(255,255,255,0.1); padding-top: 10px; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px; font-size: 13px; color: rgba(255,255,255,0.4); }

        @media (max-width: 480px) {
          .nav-inner { padding: 10px 16px; } .nav-logo img { height: 32px; }
          .nav-links { display: none; }
          .doc-hero h1 { font-size: 28px; }
          .story-quote { font-size: 16px; }
        }
      `}</style>

      <header className="nav-bar">
        <div className="nav-inner">
          <Link href="/" className="nav-logo"><img src="/qcypher-logo-horizontal.png" alt="QCypher Technologies" /></Link>
          <nav className="nav-links">
            <Link href="/" className="nav-link">Home</Link>
            <Link href="/faq" className="nav-link">FAQs</Link>
            <Link href="/security" className="nav-link">Security</Link>
          </nav>
          <div className="nav-cta"><Link href="/auth/login" className="btn btn-ghost btn-sm">Sign in</Link></div>
        </div>
      </header>

      <div className="doc-hero">
        <div className="wrap">
          <h1>Customer Stories</h1>
          <p>Real small businesses running on QCypher — in their own words.</p>
        </div>
      </div>

      <main className="wrap" style={{ paddingTop: '48px', paddingBottom: '64px' }}>
        {STORIES.map(s => (
          <div className="story" key={s.name}>
            <div className="story-head">
              <div className="story-avatar" style={{ background: s.accent }}>{s.initials}</div>
              <div>
                <div className="story-name">{s.name}</div>
                <div className="story-meta">{s.business} · {s.location}</div>
              </div>
            </div>
            <p className="story-quote">&ldquo;{s.quote}&rdquo;</p>
          </div>
        ))}

        <div style={{ marginTop: '32px', padding: '28px', background: '#fff', border: '1px solid var(--border2)', borderRadius: '16px', textAlign: 'center' }}>
          <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--ink)', marginBottom: '6px' }}>Want to see it running for your business?</p>
          <p style={{ fontSize: '15px', color: 'var(--soft)', marginBottom: '16px' }}>Talk to Felix or Thomas directly — no sales team, no pressure.</p>
          <a href="mailto:info@qcyphertech.com" className="btn btn-primary">Get a free quote</a>
        </div>
      </main>

      <footer>
        <div className="wrap">
          <div className="foot-compact">
            <div className="foot-contact">
              <h5>Contact Us</h5>
              <a href="mailto:info@qcyphertech.com">info@qcyphertech.com</a>
              <a href="tel:+18042505066">(804) 250-5066</a>
            </div>
            <div className="foot-links">
              <h5>Quick Links</h5>
              <div className="foot-links-row">
                <Link href="/about">About</Link>
                <Link href="/customers">Customer Stories</Link>
                <Link href="/refer">Refer a Business</Link>
                <Link href="/security">Security</Link>
                <Link href="/privacy">Privacy</Link>
                <Link href="/terms">Terms</Link>
                <Link href="/faq">FAQs</Link>
                <Link href="/auth/login">Client Login</Link>
              </div>
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
