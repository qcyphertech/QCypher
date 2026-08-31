import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { INDUSTRIES, getIndustry } from '@/lib/industries-data'
import { BASE_PRICING } from '@/lib/pricing-constants'

export function generateStaticParams() {
  return INDUSTRIES.map(i => ({ industry: i.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ industry: string }> }): Promise<Metadata> {
  const { industry: slug } = await params
  const industry = getIndustry(slug)
  if (!industry) return {}
  const url = `https://www.qcyphertech.com/solutions/${industry.slug}`
  return {
    title: industry.metaTitle,
    description: industry.metaDescription,
    alternates: { canonical: url },
    openGraph: { title: industry.metaTitle, description: industry.metaDescription, url, type: 'website' },
  }
}

export default async function IndustryLandingPage({ params }: { params: Promise<{ industry: string }> }) {
  const { industry: slug } = await params
  const industry = getIndustry(slug)
  if (!industry) notFound()

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: industry.faq.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif', background: '#f8f9fc', color: '#171a2b', lineHeight: 1.5 }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
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

        .wrap { max-width: 960px; margin: 0 auto; padding: 0 20px; }

        .nav-bar { position: sticky; top: 0; z-index: 50; background: rgba(255,255,255,0.95); backdrop-filter: blur(16px); border-bottom: 1px solid var(--border); }
        .nav-inner { display: flex; align-items: center; justify-content: space-between; padding: 20px 32px; width: 100%; }
        .nav-logo { display: flex; align-items: center; gap: 2px; font-weight: 800; font-size: 17px; color: var(--indigo); }
        .nav-logo img { height: 44px; width: auto; display: block; }
        .nav-links { display: flex; align-items: center; gap: 24px; }
        .nav-link { font-size: 15px; font-weight: 600; color: var(--soft); transition: color .15s; }
        .nav-link:hover { color: var(--indigo); }
        .nav-cta { display: flex; align-items: center; gap: 8px; }

        .btn { display: inline-flex; align-items: center; justify-content: center; gap: 7px; min-height: 44px; padding: 0 22px; border-radius: 10px; font-weight: 700; font-size: 15px; cursor: pointer; border: 1px solid transparent; transition: transform .15s, opacity .15s; font-family: inherit; text-align: center; }
        .btn:hover { transform: translateY(-1px); }
        .btn-primary { background: linear-gradient(135deg, #2a52a0, #4a9db5); color: #fff; }
        .btn-ghost { background: transparent; color: var(--indigo); border: 1px solid var(--border2); }
        .btn-ghost:hover { border-color: var(--cyan); color: var(--cyan); }
        .btn-sm { min-height: 44px; padding: 0 14px; font-size: 14px; white-space: nowrap; }

        .hero { padding: 64px 0 60px; background: linear-gradient(155deg, #0B1640 0%, #1a3070 45%, #2B5FA8 85%, #17C9E8 130%); position: relative; overflow: hidden; }
        .hero .wrap { position: relative; }
        .hero-kicker { display: inline-block; font-size: 13px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: var(--teal); background: rgba(23,201,232,0.14); border: 1px solid rgba(23,201,232,0.3); padding: 6px 14px; border-radius: 999px; margin-bottom: 18px; }
        .hero h1 { font-size: 42px; font-weight: 900; letter-spacing: -0.03em; color: #fff; margin-bottom: 14px; max-width: 680px; }
        .hero p { font-size: 17px; color: rgba(255,255,255,0.8); max-width: 560px; line-height: 1.6; margin-bottom: 28px; }
        .hero-ctas { display: flex; gap: 12px; flex-wrap: wrap; }

        .section { padding: 56px 0; }
        .section-title { font-size: 28px; font-weight: 900; letter-spacing: -0.02em; color: var(--ink); margin-bottom: 8px; }
        .section-sub { font-size: 16px; color: var(--soft); max-width: 620px; margin-bottom: 32px; }

        .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .card { background: var(--card); border: 1px solid var(--border2); border-radius: 16px; padding: 24px; box-shadow: 0 1px 2px rgba(11,22,64,0.03); }
        .card h3 { font-size: 17px; font-weight: 800; color: var(--ink); margin-bottom: 8px; }
        .card p { font-size: 15px; color: var(--soft); line-height: 1.6; }
        .pain-card { border-left: 3px solid var(--steel); }

        .cta-band { background: var(--navy); border-radius: 24px; padding: 48px 40px; text-align: center; margin: 0 20px; }
        .cta-band h2 { font-size: 26px; font-weight: 900; color: #fff; margin-bottom: 10px; }
        .cta-band p { font-size: 15px; color: rgba(255,255,255,0.72); margin-bottom: 24px; }

        .faq-list { display: flex; flex-direction: column; gap: 10px; }
        .faq-item { background: var(--card); border: 1px solid var(--border2); border-radius: 16px; padding: 20px; }
        .faq-item h3 { font-size: 16px; font-weight: 700; color: var(--ink); margin-bottom: 8px; }
        .faq-item p { font-size: 15px; color: var(--soft); line-height: 1.6; }

        .pricing-note { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; background: #fff; border: 1px solid var(--border2); border-radius: 16px; padding: 20px 24px; }
        .pricing-note strong { color: var(--ink); }

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
          .grid-3 { grid-template-columns: 1fr; }
        }
        @media (max-width: 480px) {
          .nav-inner { padding: 10px 16px; } .nav-logo img { height: 32px; }
          .nav-links { display: none; }
          .hero h1 { font-size: 30px; }
          .cta-band { margin: 0; border-radius: 0; }
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
          <div className="nav-cta">
            <Link href="/auth/login" className="nav-link">Sign in</Link>
            <Link href="/auth/signup" className="btn btn-primary btn-sm">{industry.ctaLabel}</Link>
          </div>
        </div>
      </header>

      <div className="hero">
        <div className="wrap">
          <span className="hero-kicker">{industry.heroKicker}</span>
          <h1>{industry.heroHeadline}</h1>
          <p>{industry.heroSubhead}</p>
          <div className="hero-ctas">
            <Link href="/auth/signup" className="btn btn-primary">{industry.ctaLabel}</Link>
            <Link href="/#packages-section" className="btn btn-ghost" style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.35)' }}>See pricing</Link>
          </div>
        </div>
      </div>

      <main>
        <section className="section wrap">
          <h2 className="section-title">The problems {industry.name.toLowerCase()} run into every week</h2>
          <p className="section-sub">These are the exact gaps QCypher was built to close for {industry.name.toLowerCase()}.</p>
          <div className="grid-3">
            {industry.painPoints.map(p => (
              <div className="card pain-card" key={p.title}>
                <h3>{p.title}</h3>
                <p>{p.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="section wrap">
          <h2 className="section-title">What {industry.name} get with QCypher</h2>
          <p className="section-sub">One platform, one login, no juggling separate scheduling, invoicing, and follow-up tools.</p>
          <div className="grid-3">
            {industry.features.map(f => (
              <div className="card" key={f.title}>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="section wrap">
          <div className="pricing-note">
            <p style={{ fontSize: '15px', color: 'var(--soft)' }}>
              Plans start at <strong>${BASE_PRICING.starter.monthly}/mo</strong> (${BASE_PRICING.starter.oneTime} setup) — QBot AI and full inventory tracking are included from Growth (${BASE_PRICING.growth.monthly}/mo) and up.
            </p>
            <Link href="/#packages-section" className="btn btn-ghost btn-sm">Compare plans</Link>
          </div>
        </section>

        <section className="section">
          <div className="cta-band">
            <h2>Ready to see it running for your business?</h2>
            <p>No setup call required to look around — see how it fits before you commit.</p>
            <Link href="/auth/signup" className="btn btn-primary">{industry.ctaLabel}</Link>
          </div>
        </section>

        <section className="section wrap">
          <h2 className="section-title">Common questions from {industry.name.toLowerCase()}</h2>
          <div className="faq-list">
            {industry.faq.map(f => (
              <div className="faq-item" key={f.q}>
                <h3>{f.q}</h3>
                <p>{f.a}</p>
              </div>
            ))}
          </div>
        </section>
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
            <div className="foot-links">
              <h5>Solutions</h5>
              <div className="foot-links-row">
                {INDUSTRIES.map(i => (
                  <Link key={i.slug} href={`/solutions/${i.slug}`}>{i.name}</Link>
                ))}
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
