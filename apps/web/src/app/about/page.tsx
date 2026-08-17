'use client'

import Link from 'next/link'
import { useState } from 'react'

// Same footer used on the homepage — see apps/web/src/app/page.tsx
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

export default function AboutPage() {
  const [showContactModal, setShowContactModal] = useState(false)
  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif', background: '#f8f9fc', color: '#171a2b', lineHeight: 1.5 }}>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        a { color: inherit; text-decoration: none; }
        img { max-width: 100%; display: block; }

        :root {
          --ink: #171a2b;
          --soft: #5b6072;
          --bg: #f8f9fc;
          --card: #ffffff;
          --border: rgba(26,48,112,0.10);
          --border2: rgba(26,48,112,0.18);
          --indigo: #1a3070;
          --indigo-d: #2a52a0;
          --cyan: #4a9db5;
          --mint: #00a87a;
        }

        .wrap { max-width: 1060px; margin: 0 auto; padding: 0 20px; }

        /* NAV */
        .nav-bar {
          position: sticky; top: 0; z-index: 50;
          background: rgba(255,255,255,0.95);
          backdrop-filter: blur(16px);
          border-bottom: 1px solid var(--border);
        }
        .nav-inner {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 20px; max-width: 1060px; margin: 0 auto;
        }
        .nav-logo { display: flex; align-items: center; gap: 2px; font-weight: 800; font-size: 17px; color: var(--indigo); }
        .nav-logo img { height: 44px; width: auto; display: block; }
        .nav-links { display: flex; align-items: center; gap: 24px; }
        .nav-link { font-size: 15px; font-weight: 600; color: var(--soft); transition: color .15s; }
        .nav-link:hover, .nav-link.active { color: var(--indigo); }
        .nav-cta { display: flex; align-items: center; gap: 8px; }

        /* BUTTONS */
        .btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 7px;
          min-height: 44px; padding: 0 20px;
          border-radius: 10px; font-weight: 700; font-size: 15px;
          cursor: pointer; border: 1px solid transparent;
          transition: transform .15s, opacity .15s; font-family: inherit;
          text-align: center;
        }
        .btn:hover { transform: translateY(-1px); }
        .btn-primary { background: linear-gradient(135deg, var(--indigo-d), var(--cyan)); color: #fff; box-shadow: 0 4px 16px rgba(74,157,181,.25); }
        .btn-primary:hover { opacity: .9; }
        .btn-ghost { background: transparent; color: var(--indigo); border: 1px solid var(--border2); }
        .btn-ghost:hover { border-color: var(--cyan); color: var(--cyan); }
        .btn-sm { min-height: 38px; padding: 0 14px; font-size: 14px; white-space: nowrap; }

        /* PAGE HERO */
        .page-hero {
          padding: 80px 0 64px;
          background: linear-gradient(155deg, #eef2ff 0%, #f8f9fc 65%);
          border-bottom: 1px solid var(--border);
        }
        .page-hero .wrap {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 56px;
          align-items: center;
        }
        .page-hero-content { display: flex; flex-direction: column; justify-content: center; }
        .page-hero-image {
          display: flex;
          align-items: center;
          justify-content: center;
          max-width: 100%;
          height: auto;
        }
        .page-hero-image img {
          max-width: 100%;
          height: auto;
          display: block;
          border-radius: 12px;
          -webkit-mask-image:
            linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%),
            linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%);
          -webkit-mask-composite: source-in;
          mask-image:
            linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%),
            linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%);
          mask-composite: intersect;
        }
        .page-hero h1 {
          font-size: 44px; font-weight: 900; line-height: 1.08; letter-spacing: -0.03em;
          color: var(--ink); margin-bottom: 16px;
          font-family: system-ui, -apple-system, "Segoe UI", Arial, sans-serif;
        }
        .page-hero h1 em {
          font-style: normal;
          background: linear-gradient(90deg, var(--indigo-d), var(--cyan));
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .page-hero p { font-size: 16px; color: var(--soft); max-width: 520px; line-height: 1.7; }
        @media (max-width: 900px) {
          .page-hero .wrap { grid-template-columns: 1fr; gap: 32px; }
        }
        @media (max-width: 600px) { .page-hero { padding: 52px 0 40px; } .page-hero h1 { font-size: 30px; } }

        /* SECTION */
        section { padding: 72px 0; }
        .eyebrow { font-size: 13px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: var(--cyan); margin-bottom: 8px; display: block; }
        .section-head { margin-bottom: 40px; }
        .section-head.center { text-align: center; }
        .section-head h2 { font-size: 28px; font-weight: 800; color: var(--ink); letter-spacing: -0.02em; margin-bottom: 8px; }
        .section-head p { font-size: 15px; color: var(--soft); line-height: 1.65; max-width: 560px; }
        .section-head.center p { margin: 0 auto; }

        /* STORY */
        .story-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 56px; align-items: center; }
        @media (max-width: 720px) { .story-grid { grid-template-columns: 1fr; gap: 32px; } }
        .story-body p { font-size: 16px; color: var(--soft); line-height: 1.75; margin-bottom: 16px; }
        .story-body p:last-child { margin-bottom: 0; }
        .story-stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .story-stat {
          background: #fff;
          border: 1px solid var(--border2);
          border-radius: 16px;
          padding: 20px;
        }
        .story-stat-num { font-size: 28px; font-weight: 900; color: var(--indigo-d); letter-spacing: -0.03em; line-height: 1; margin-bottom: 4px; }
        .story-stat-label { font-size: 13px; color: var(--soft); font-weight: 600; line-height: 1.4; }

        /* TEAM */
        .team-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; }
        @media (max-width: 680px) { .team-grid { grid-template-columns: 1fr; } }
        .team-card {
          background: #fff;
          border: 1px solid var(--border2);
          border-radius: 20px;
          padding: 32px 28px;
          transition: box-shadow .2s;
        }
        .team-card:hover { box-shadow: 0 8px 28px rgba(31,60,136,.10); }
        .team-photo-wrap {
          width: 88px; height: 88px;
          border-radius: 20px;
          background: linear-gradient(135deg, #eef2ff 0%, #dce7f5 100%);
          border: 2px solid rgba(42,82,160,.15);
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 20px;
          overflow: hidden;
        }
        .team-photo-wrap img { width: 100%; height: 100%; object-fit: cover; object-position: center top; display: block; }
        .team-photo-placeholder {
          display: flex; flex-direction: column; align-items: center; gap: 4px;
        }
        .team-photo-placeholder svg { opacity: 0.35; }
        .team-photo-placeholder span { font-size: 10px; font-weight: 700; color: var(--indigo-d); opacity: 0.5; letter-spacing: 0.06em; text-transform: uppercase; }
        .team-name { font-size: 19px; font-weight: 800; color: var(--ink); margin-bottom: 3px; }
        .team-title { font-size: 13px; font-weight: 700; color: var(--cyan); letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 6px; }
        .team-company { font-size: 14px; color: var(--soft); font-weight: 600; margin-bottom: 14px; }
        .team-bio { font-size: 15px; color: var(--soft); line-height: 1.7; margin-bottom: 16px; }
        .team-creds { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 18px; }
        .team-cred {
          display: inline-flex; align-items: center; gap: 5px;
          background: rgba(42,82,160,0.07);
          border: 1px solid rgba(42,82,160,0.18);
          border-radius: 6px;
          padding: 4px 9px;
          font-size: 11.5px; font-weight: 700; color: var(--indigo-d);
          letter-spacing: 0.03em; line-height: 1.3;
        }
        .team-cred-icon {
          width: 11px; height: 11px; flex-shrink: 0; opacity: 0.6;
        }

        /* VALUES */
        .values-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        @media (max-width: 720px) { .values-grid { grid-template-columns: 1fr 1fr; } }
        @media (max-width: 480px) { .values-grid { grid-template-columns: 1fr; } }
        .value-card {
          background: #fff;
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 24px;
        }
        .value-icon {
          width: 48px; height: 48px; border-radius: 12px;
          background: linear-gradient(135deg, var(--indigo-d), var(--cyan));
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 14px;
        }
        .value-icon svg { width: 24px; height: 24px; fill: #fff; stroke: none; flex-shrink: 0; }
        .value-icon svg.stroked { fill: none; stroke: #fff; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
        .value-name { font-size: 15px; font-weight: 800; color: var(--ink); margin-bottom: 6px; }
        .value-desc { font-size: 14px; color: var(--soft); line-height: 1.65; }

        /* CTA BANNER */
        .cta-banner {
          background: linear-gradient(135deg, var(--indigo) 0%, var(--indigo-d) 60%, var(--cyan) 100%);
          border-radius: 24px;
          padding: 56px 48px;
          text-align: center;
          color: #fff;
        }
        @media (max-width: 600px) { .cta-banner { padding: 40px 24px; } }
        .cta-banner h2 { font-size: 28px; font-weight: 900; margin-bottom: 10px; letter-spacing: -0.02em; }
        .cta-banner p { font-size: 16px; opacity: 0.8; max-width: 460px; margin: 0 auto 28px; line-height: 1.65; }
        .cta-actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
        .btn-white { background: #fff; color: var(--indigo); border: none; }
        .btn-white:hover { opacity: 0.92; }
        .btn-outline-white { background: transparent; color: #fff; border: 2px solid rgba(255,255,255,0.5); }
        .btn-outline-white:hover { border-color: #fff; }

        /* FOOTER — same as homepage */
        footer {
          position: relative;
          padding: 22px 0 12px;
          background: linear-gradient(145deg, #0e1f45 0%, #1a3070 45%, #1e4a7a 75%, #246080 100%);
          overflow: hidden;
        }
        footer::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, transparent, var(--cyan), var(--mint), transparent);
          opacity: 0.7;
        }
        footer::after {
          content: '';
          position: absolute; inset: 0;
          background: radial-gradient(ellipse 50% 60% at 85% 0%, rgba(74,157,181,0.12) 0%, transparent 70%);
          pointer-events: none;
        }
        footer .wrap { position: relative; }
        footer .nav-logo { color: #fff; }
        .foot-grid { display: grid; grid-template-columns: 1.4fr 1fr 1fr; gap: 20px; margin-bottom: 12px; }
        @media (max-width: 680px) { .foot-grid { grid-template-columns: 1fr; gap: 14px; } }
        .foot-brand p { font-size: 13px; color: rgba(255,255,255,0.55); max-width: 260px; margin-top: 4px; line-height: 1.45; }
        .foot-col h5 {
          font-size: 11px; text-transform: uppercase; letter-spacing: .12em;
          color: rgba(255,255,255,0.4); margin-bottom: 6px; font-weight: 700;
        }
        .foot-col a {
          display: flex; align-items: center; gap: 6px;
          font-size: 13px; color: rgba(255,255,255,0.75); margin-bottom: 3px; font-weight: 500;
          transition: color .15s, transform .15s; width: fit-content;
        }
        .foot-col a:hover { color: #fff; transform: translateX(3px); }
        .foot-col a::after {
          content: '→'; opacity: 0; transform: translateX(-4px);
          transition: opacity .15s, transform .15s; font-size: 11px; color: var(--cyan);
        }
        .foot-col a:hover::after { opacity: 1; transform: translateX(0); }
        .foot-bottom {
          border-top: 1px solid rgba(255,255,255,0.1); padding-top: 10px;
          display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px;
          font-size: 13px; color: rgba(255,255,255,0.4);
        }

        /* INTEGRATIONS FOOTER — same as homepage */
        .integrations-section {
          max-width: 900px; margin: 0 auto; padding: 0.85rem 0;
          border-top: 1px solid rgba(255,255,255,0.1);
          border-bottom: 1px solid rgba(255,255,255,0.1);
          margin-bottom: 10px;
        }
        .integrations-headline {
          font-size: 12px; font-weight: 500; color: rgba(255,255,255,0.6);
          text-align: center; margin-bottom: 0.5rem;
        }
        .integrations-grid {
          display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 10px;
        }
        .integration-card {
          width: 60px; height: 30px;
          background: rgba(255,255,255,0.92);
          border: 0.5px solid rgba(255,255,255,0.15);
          border-radius: 6px;
          padding: 5px;
          display: flex; align-items: center; justify-content: center;
          flex: 0 0 auto;
          transition: background .15s, transform .15s;
        }
        .integration-card:hover { background: #fff; transform: translateY(-2px); }
        .integration-card img { max-width: 100%; max-height: 100%; object-fit: contain; display: block; }
        @media (max-width: 768px) {
          .integrations-grid { gap: 8px; }
        }

        @media (max-width: 480px) {
          .nav-inner { padding: 10px 16px; }
          .nav-logo img { height: 32px; }
          .btn-sm { font-size: 13px; padding: 0 12px; }
          section { padding: 56px 0; }
          .nav-links { display: none; }
          .nav-page-link { font-size: 13px !important; margin-right: 2px !important; }
          .nav-quote-btn { display: none !important; }
        }
      `}</style>

      {/* NAV */}
      <header className="nav-bar">
        <div className="nav-inner">
          <Link href="/" className="nav-logo">
            <img src="/qcypher-logo-horizontal.png" alt="QCypher Technologies" />
          </Link>
          <div className="nav-cta">
            <Link href="/" className="nav-page-link" style={{ fontSize: '15px', fontWeight: 600, color: '#5b6072', marginRight: '4px' }}>Home</Link>
            <Link href="/auth/login" className="btn btn-ghost btn-sm">Sign in</Link>
          </div>
        </div>
      </header>

      {/* PAGE HERO */}
      <div className="page-hero">
        <div className="wrap">
          <div className="page-hero-content">
            <span className="eyebrow">Our Story</span>
            <h1>Built by small business<br/>people, for <em>small businesses.</em></h1>
            <p>We started QCypher because we saw too many local businesses paying too much for tools that were built for enterprises. We fixed that.</p>
          </div>
          <div className="page-hero-image">
            <img src="/about-hero-illustration.png" alt="QCypher team working on security solutions" />
          </div>
        </div>
      </div>

      {/* STORY */}
      <section style={{ background: '#fff', borderBottom: '1px solid rgba(26,48,112,.08)' }}>
        <div className="wrap">
          <div className="story-grid">
            <div className="story-body">
              <span className="eyebrow">Why We Built This</span>
              <h2 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.02em', marginBottom: '20px', lineHeight: 1.2 }}>
                Tech that actually works for you — not the other way around.
              </h2>
              <p>
                We kept seeing the same problem: great local businesses — the kind that show up, do the work, and treat customers right — were either invisible online or drowning in tools they didn't need and couldn't afford.
              </p>
              <p>
                So we built QCypher Technologies to solve exactly that. We handle your website, your online presence, your bookings, your reviews, and your customer management — all under one roof, with real support from real people who call you by your name, explain what's happening, and send you a monthly report showing what's working — because your data should make sense to you.
              </p>
              <p>
                No hidden fees. No locked-in contracts. No tech jargon. Just results.
              </p>
            </div>
            <div className="story-stat-grid">
              <div className="story-stat">
                <div className="story-stat-num">100%</div>
                <div className="story-stat-label">US-based support — real people, real answers</div>
              </div>
              <div className="story-stat">
                <div className="story-stat-num">48hr</div>
                <div className="story-stat-label">Average time from signup to live website</div>
              </div>
              <div className="story-stat">
                <div className="story-stat-num">$0</div>
                <div className="story-stat-label">All-inclusive solution for your whole team</div>
              </div>
              <div className="story-stat">
                <div className="story-stat-num">5★</div>
                <div className="story-stat-label">Average client satisfaction across all services</div>
              </div>
              <div className="story-stat">
                <div className="story-stat-num">24-48hr</div>
                <div className="story-stat-label">Response time on calls and emails</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TEAM */}
      <section>
        <div className="wrap">
          <div className="section-head center">
            <span className="eyebrow">The Team</span>
            <h2>The people behind QCypher</h2>
            <p>Two cofounders with complementary skills and one shared belief: local businesses deserve better tools.</p>
          </div>

          <div className="team-grid">

            {/* Cofounder 1 */}
            <div className="team-card">
              <div className="team-photo-wrap">
                <img src="/felix-sam.jpeg" alt="Felix Sam" />
              </div>
              <div className="team-name">Felix Sam</div>
              <div className="team-title">Co-Founder & CEO</div>
              <div className="team-company">QCypher Technologies</div>
              <div className="team-creds">
                <span className="team-cred">
                  <svg className="team-cred-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>
                  ISC2 CGRC
                </span>
                <span className="team-cred">
                  <svg className="team-cred-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>
                  CISA
                </span>
                <span className="team-cred">
                  <svg className="team-cred-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>
                  CompTIA Security+
                </span>
              </div>
              <p className="team-bio">
                Felix Sam has spent his career inside the world of enterprise cybersecurity — the same complex, expensive world most small businesses can't afford to navigate. As a government contractor across Washington, D.C., Virginia, and Maryland, he has worked with leading consulting and cybersecurity firms, including Accenture, performing security control assessments and compliance reviews under the Risk Management Framework (RMF) to help federal agencies achieve and maintain FISMA authorization. At the management level, his experience extends to advising project teams on data protection strategies and information security best practices. Felix co-founded QCypher to put that enterprise-grade expertise to work for the shops, startups, and small teams who deserve serious security without the enterprise price tag.
              </p>
              <p style={{ fontSize: '14px', color: 'var(--cyan)', fontWeight: 600, marginTop: '12px' }}>Felix takes the first call with every new client.</p>
            </div>

            {/* Cofounder 2 */}
            <div className="team-card">
              <div className="team-photo-wrap">
                <img src="/thomas-ocloo.jpg" alt="Thomas Ocloo" />
              </div>
              <div className="team-name">Thomas Ocloo</div>
              <div className="team-title">Co-Founder & CTO</div>
              <div className="team-company">QCypher Technologies</div>
              <div className="team-creds">
                <span className="team-cred">
                  <svg className="team-cred-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>
                  AWS Solutions Architect
                </span>
                <span className="team-cred">
                  <svg className="team-cred-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>
                  CISA
                </span>
                <span className="team-cred">
                  <svg className="team-cred-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>
                  CompTIA Security+
                </span>
              </div>
              <p className="team-bio">
                Thomas Ocloo has built his career at the intersection of cybersecurity and cloud infrastructure across Washington, D.C., Virginia, and Maryland. As a government contractor with organizations including ManTech and KPMG, he has served as a Security Control Assessor and Compliance Analyst — conducting assessments under the Risk Management Framework (RMF), evaluating security postures, and ensuring federal systems meet regulatory compliance requirements. His background also spans vulnerability analysis and cloud architecture across AWS, Azure, and GCP — the same expertise he now brings to bear as the architect behind the infrastructure powering every QCypher tool. Thomas co-founded QCypher to put that federal-grade infrastructure expertise to work for every local business owner who's been priced out of the tools that could actually grow their business.
              </p>
              <p style={{ fontSize: '14px', color: 'var(--cyan)', fontWeight: 600, marginTop: '12px' }}>Thomas does the 90-day check-in to make sure everything's working.</p>
            </div>

          </div>
        </div>
      </section>

      {/* VALUES */}
      <section style={{ background: '#fff', borderTop: '1px solid rgba(26,48,112,.08)', borderBottom: '1px solid rgba(26,48,112,.08)' }}>
        <div className="wrap">
          <div className="section-head center">
            <span className="eyebrow">What We Stand For</span>
            <h2>Our values</h2>
            <p>These aren't posters on a wall. They're the decisions we make every day when we're building your tools and answering your calls.</p>
          </div>

          <div className="values-grid">
            <div className="value-card">
              <div className="value-icon">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8zm0-13a5 5 0 1 0 5 5 5 5 0 0 0-5-5zm0 8a3 3 0 1 1 3-3 3 3 0 0 1-3 3zm0-4a1 1 0 1 0 1 1 1 1 0 0 0-1-1z"/></svg>
              </div>
              <div className="value-name">Simplicity first</div>
              <p className="value-desc">If it takes a training session to use, we haven't done our job. Every tool we build should feel obvious.</p>
            </div>
            <div className="value-card">
              <div className="value-icon">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M22 9.5a1 1 0 0 0-1-1h-1.6l-3.1-3.1a3 3 0 0 0-2.1-.9H10a3 3 0 0 0-2.1.9L6.2 7H5a3 3 0 0 0-3 3v4a3 3 0 0 0 3 3h.2a2.5 2.5 0 0 0 4.6 0h4.4a2.5 2.5 0 0 0 4.6 0H19a3 3 0 0 0 3-3v-4.5zm-12.3 8a.5.5 0 0 1-1 0v-.5h1zm9 0a.5.5 0 0 1-1 0v-.5h1zM20 14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1h1.6l2.3-2.4A1 1 0 0 1 9.6 6h4.8a1 1 0 0 1 .7.3l2.3 2.4H21z"/></svg>
              </div>
              <div className="value-name">Real relationships</div>
              <p className="value-desc">You get a real person, not a ticket number. We know your business, call you by your name, explain your monthly reports, and show up when you need us. Phone calls, not support bots.</p>
            </div>
            <div className="value-card">
              <div className="value-icon">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 1L3 5v6c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V5zm0 2.2l7 3.1V11c0 4.5-3 8.6-7 9.9-4-1.3-7-5.4-7-9.9V6.3zm-1 9.1l4.6-4.6-1.4-1.4L11 9.5 9.8 8.3 8.4 9.7z"/></svg>
              </div>
              <div className="value-name">Your data, your business</div>
              <p className="value-desc">We never sell or share your customer data. What's yours stays yours — always.</p>
            </div>
            <div className="value-card">
              <div className="value-icon">
                <svg className="stroked" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M13 2L4.5 13.5H11L10 22l8.5-11.5H13z"/></svg>
              </div>
              <div className="value-name">Speed matters</div>
              <p className="value-desc">When you need something, you need it now. We move fast — on support, on builds, and on fixes.</p>
            </div>
            <div className="value-card">
              <div className="value-icon">
                <svg className="stroked" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M3.5 18.5l5-5 4 4L21 7M21 7h-6m6 0v6"/></svg>
              </div>
              <div className="value-name">Built to grow with you</div>
              <p className="value-desc">Start with what you need. Upgrade when you're ready. No penalties, no pressure.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section>
        <div className="wrap">
          <div className="cta-banner">
            <span className="eyebrow" style={{ color: 'rgba(255,255,255,0.65)' }}>Ready to get started?</span>
            <h2>Let's build something together.</h2>
            <p>Get in touch with our team. No commitment, no pressure.</p>
            <div className="cta-actions">
              <Link href="/#packages" className="btn btn-white">See packages</Link>
              <button onClick={() => setShowContactModal(true)} className="btn btn-outline-white">Get a free quote</button>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER — same as homepage */}
      <footer id="contact">
        <div className="wrap">
          <div className="foot-grid">
            <div className="foot-brand">
              <div className="nav-logo" style={{ marginBottom: 0 }}>
                <img src="/qcypher-logo-footer.png" alt="QCypher Technologies" />
              </div>
              <p>Simple tech solutions for local businesses. No jargon, just results.</p>
            </div>
            <div className="foot-col">
              <h5>Contact Us</h5>
              <a href="mailto:info@qcyphertech.com">info@qcyphertech.com</a>
              <a href="tel:+18042505066" style={{ fontWeight: 600, color: 'var(--cyan)', marginBottom: '4px' }}>(804) 250-5066</a>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)', margin: '0' }}>Ask for Felix or Thomas.</p>
            </div>
            <div className="foot-col">
              <h5>Quick Links</h5>
              <Link href="/#packages">Packages</Link>
              <Link href="/#crm">Customer Management</Link>
              <Link href="/about">About Us</Link>
              <Link href="/security">Security</Link>
              <Link href="/privacy">Privacy Policy</Link>
              <Link href="/terms">Terms of Service</Link>
              <Link href="/faq">FAQs</Link>
              <Link href="/auth/login">Client Login</Link>
            </div>
          </div>

          {/* INTEGRATIONS FOOTER — same as homepage */}
          <div className="integrations-section" role="region" aria-label="Integration partners">
            <div className="integrations-headline">Built to work together — no tech headaches</div>
            <div className="integrations-grid">
              {INTEGRATION_LOGOS.map((logo) => (
                <div className="integration-card" key={logo.file}>
                  <img src={logo.file} alt={logo.name} loading="lazy" />
                </div>
              ))}
            </div>
          </div>

          <div className="foot-bottom">
            <span>© 2026 QCypher Technologies. All rights reserved.</span>
            <span>Built for small businesses, by a small business.</span>
          </div>
        </div>
      </footer>
      {/* CONTACT METHOD MODAL */}
      {showContactModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '40px', maxWidth: '500px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#1a3070', marginBottom: '16px', textAlign: 'center' }}>How would you like to get started?</h2>
            <p style={{ fontSize: '15px', color: '#5b6072', textAlign: 'center', marginBottom: '32px' }}>Choose your preferred way to connect with us.</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <button
                onClick={() => {
                  setShowContactModal(false)
                  window.open('https://cal.com/qcyphertech', '_blank')
                }}
                style={{
                  padding: '20px',
                  background: 'linear-gradient(135deg, #2a52a0, #4a9db5)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '12px',
                  fontWeight: 700,
                  fontSize: '15px',
                  cursor: 'pointer',
                  transition: 'transform 0.2s',
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                📅 Schedule a Meeting
              </button>

              <button
                style={{
                  padding: '20px',
                  background: '#f0f3ff',
                  color: '#1a3070',
                  border: '2px solid #1a3070',
                  borderRadius: '12px',
                  fontWeight: 700,
                  fontSize: '15px',
                  cursor: 'pointer',
                  transition: 'transform 0.2s',
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                📝 Fill Out Form
              </button>
            </div>

            <button
              onClick={() => setShowContactModal(false)}
              style={{
                width: '100%',
                padding: '12px',
                background: 'transparent',
                color: '#5b6072',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Cal.com popup embed */}
      <script
        dangerouslySetInnerHTML={{ __html: `
(function(C,A,L){
  let p=function(a,ar){a.q.push(ar)};
  let d=C.document;
  C.Cal=C.Cal||function(){
    let cal=C.Cal,ar=arguments;
    if(!cal.loaded){cal.ns={};cal.q=cal.q||[];d.head.appendChild(d.createElement("script")).src=A;cal.loaded=true}
    if(ar[0]===L){const api=function(){p(api,arguments)};const ns=ar[1];api.q=api.q||[];if(typeof ns==="string"){cal.ns[ns]=cal.ns[ns]||api;p(cal.ns[ns],ar);p(cal,[L,ns,api])}else p(cal,ar);return}
    p(cal,ar)
  };
})(window,"https://app.cal.com/embed/embed.js","init");
Cal("init","qcyphertech",{origin:"https://cal.com"});
Cal.ns.qcyphertech("ui",{"hideEventTypeDetails":false,"layout":"month_view"});
        ` }}
      />
    </div>
  )
}
