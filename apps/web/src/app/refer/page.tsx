import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Refer a Business',
  description: 'Know another small business that could use QCypher? Refer them and earn a $50 credit once they\'re onboarded.',
  alternates: { canonical: 'https://www.qcyphertech.com/refer' },
  openGraph: {
    title: 'Refer a Business — QCypher Technologies',
    description: 'Refer another small business to QCypher and earn a $50 credit once they\'re onboarded.',
    url: 'https://www.qcyphertech.com/refer',
    type: 'website',
  },
}

export default function ReferPage() {
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

        .steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; margin: 40px 0; }
        .step { background: var(--card); border: 1px solid var(--border2); border-radius: 16px; padding: 24px; }
        .step .n { font-size: 12px; font-weight: 800; color: var(--cyan); letter-spacing: .06em; margin-bottom: 8px; }
        .step h3 { font-size: 16px; font-weight: 800; color: var(--ink); margin-bottom: 6px; }
        .step p { font-size: 14.5px; color: var(--soft); line-height: 1.6; }

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

        @media (max-width: 780px) {
          .steps { grid-template-columns: 1fr; }
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
            <Link href="/customers" className="nav-link">Customer Stories</Link>
            <Link href="/faq" className="nav-link">FAQs</Link>
          </nav>
          <div className="nav-cta"><Link href="/auth/login" className="btn btn-ghost btn-sm">Sign in</Link></div>
        </div>
      </header>

      <div className="doc-hero">
        <div className="wrap">
          <h1>Refer a Business, Earn $50</h1>
          <p>Know another small business owner who'd benefit from QCypher? Refer them, and once they're onboarded, you get a $50 credit — your choice, applied as a discount or account balance.</p>
        </div>
      </div>

      <main className="wrap" style={{ paddingBottom: '64px' }}>
        <div className="steps">
          <div className="step">
            <div className="n">STEP 1</div>
            <h3>Tell us who you're referring</h3>
            <p>Email us the business's name and contact info, or have them mention your name when they reach out.</p>
          </div>
          <div className="step">
            <div className="n">STEP 2</div>
            <h3>We onboard them</h3>
            <p>Once they're set up as a QCypher customer, your referral is logged against your account.</p>
          </div>
          <div className="step">
            <div className="n">STEP 3</div>
            <h3>Claim your $50</h3>
            <p>Existing customers can claim it right from Settings → Refer QCypher, as a discount or account balance.</p>
          </div>
        </div>

        <div style={{ padding: '28px', background: '#fff', border: '1px solid var(--border2)', borderRadius: '16px', textAlign: 'center' }}>
          <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--ink)', marginBottom: '6px' }}>Ready to refer someone?</p>
          <p style={{ fontSize: '15px', color: 'var(--soft)', marginBottom: '16px' }}>
            Email us directly, or your account owner can find this same program under <strong>Settings → Refer QCypher</strong> once signed in.
          </p>
          <a href="mailto:info@qcyphertech.com?subject=Referral" className="btn btn-primary">info@qcyphertech.com</a>
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
