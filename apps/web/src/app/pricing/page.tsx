'use client'

import Link from 'next/link'
import { useState } from 'react'

// Pricing page — displays packages, comparison, testimonials, and footer

export default function PricingPage() {
  const [showReportModal, setShowReportModal] = useState(false)
  const [showContactModal, setShowContactModal] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ businessName: '', phone: '', email: '' })
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formSuccess, setFormSuccess] = useState(false)

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
          --coral: #ff5a4e;
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
        .nav-cta { display: flex; align-items: center; gap: 8px; }

        /* BUTTONS */
        .btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 7px;
          min-height: 44px; padding: 0 20px;
          border-radius: 10px; font-weight: 700; font-size: 15px;
          cursor: pointer; border: 1px solid transparent;
          transition: transform .15s, opacity .15s; font-family: inherit;
          text-align: center; text-decoration: none;
        }
        .btn:hover { transform: translateY(-1px); }
        .btn-primary { background: linear-gradient(135deg, var(--indigo-d), var(--cyan)); color: #fff; box-shadow: 0 4px 16px rgba(74,157,181,.25); }
        .btn-primary:hover { opacity: .9; }
        .btn-ghost { background: transparent; color: var(--indigo); border-color: var(--border2); }
        .btn-ghost:hover { border-color: var(--cyan); color: var(--cyan); }
        .btn-sm { min-height: 38px; padding: 0 14px; font-size: 14px; white-space: nowrap; }
        .btn-full { width: 100%; }

        /* SECTION */
        section { padding: 72px 0; }
        .eyebrow { font-size: 13px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: var(--cyan); margin-bottom: 8px; display: block; }
        .section-head { margin-bottom: 40px; }
        .section-head.center { text-align: center; }
        .section-head h2 { font-size: 28px; font-weight: 800; color: var(--ink); letter-spacing: -0.02em; margin-bottom: 8px; }
        .section-head p { font-size: 15px; color: var(--soft); line-height: 1.65; max-width: 540px; }
        .section-head.center p { margin: 0 auto; }

        /* PACKAGES */
        .pkg-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          column-gap: 14px;
          row-gap: 14px;
        }
        @media (max-width: 960px) { .pkg-grid { grid-template-columns: repeat(2, 1fr); gap: 18px; } }
        @media (max-width: 540px)  { .pkg-grid { grid-template-columns: 1fr; gap: 24px; } }

        .pkg-card {
          background: var(--card);
          border: 1px solid var(--border2);
          border-radius: 18px;
          padding: 22px 20px;
          display: flex; flex-direction: column;
          position: relative;
          transition: box-shadow .2s, transform .2s;
          border-top: 3px solid var(--border2);
        }
        .pkg-card:hover { box-shadow: 0 12px 36px rgba(31,60,136,.14); transform: translateY(-2px); }
        .pkg-card.pop {
          border-color: var(--indigo-d);
          border-top: 3px solid var(--indigo-d);
          box-shadow: 0 0 0 1px var(--indigo-d), 0 8px 32px rgba(42,82,160,.18);
        }

        /* Online Launch — full width row below the 3 monthly tiers (desktop only) */
        @media (min-width: 961px) {
          .pkg-card.pkg-card-launch {
            grid-column: 1 / -1;
            flex-direction: row;
            align-items: center;
            gap: 48px;
            padding: 28px 36px;
          }
          .pkg-grid { row-gap: 32px; }
          .pkg-card-launch .launch-body { flex: 1; }
          .pkg-card-launch .launch-cta  { flex-shrink: 0; display: flex; flex-direction: column; align-items: center; gap: 10px; min-width: 200px; }
          .pkg-card-launch .pkg-details { margin-bottom: 0; }
        }

        .pkg-badge {
          display: inline-block;
          background: var(--indigo-d); color: #fff;
          font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase;
          padding: 3px 9px; border-radius: 5px; margin-bottom: 10px;
          line-height: 1.4;
        }
        .pkg-badge-spacer {
          display: block;
          height: calc(11px * 1.4 + 6px + 10px); /* matches badge line-height + padding + margin */
          visibility: hidden;
        }
        .pkg-for {
          font-size: 13px; font-weight: 600; color: var(--cyan);
          background: rgba(74,157,181,.09); border: 1px solid rgba(74,157,181,.2);
          border-radius: 99px; padding: 3px 10px;
          display: inline-block; margin-bottom: 10px;
        }
        .pkg-name { font-size: 19px; font-weight: 800; color: var(--ink); margin-bottom: 5px; }
        .pkg-tagline { font-size: 13px; color: var(--soft); font-style: italic; margin-bottom: 14px; line-height: 1.5; }
        .pkg-price { margin-bottom: 16px; padding-bottom: 14px; border-bottom: 1px solid var(--border); }
        .pkg-price .amt { font-size: 26px; font-weight: 900; color: var(--ink); }
        .pkg-price .freq { font-size: 14px; color: var(--soft); margin-left: 2px; }
        .pkg-price .mo  { display: block; font-size: 14px; font-weight: 700; color: var(--cyan); margin-top: 2px; }
        .pkg-price .no-mo { display: block; font-size: 13px; color: #059669; font-weight: 700; margin-top: 2px; }

        /* Accordion */
        details.pkg-details { margin-bottom: 0; flex: 1; }
        details.pkg-details summary {
          display: flex; align-items: center; justify-content: space-between;
          font-size: 14px; font-weight: 700; color: var(--indigo);
          cursor: pointer; list-style: none; padding: 8px 0;
          border-top: 1px solid var(--border); min-height: 44px;
          user-select: none;
        }
        details.pkg-details summary::-webkit-details-marker { display: none; }
        details.pkg-details summary::after {
          content: "+"; font-size: 18px; font-weight: 400; color: var(--cyan);
          flex-shrink: 0; margin-left: 8px;
        }
        details.pkg-details[open] summary::after { content: "−"; }
        /* Desktop: always expanded, no pointer needed */
        @media (min-width: 641px) {
          details.pkg-details { pointer-events: none; }
          details.pkg-details[open] { pointer-events: auto; }
        }

        .pkg-section-label { font-size: 12px; font-weight: 700; color: var(--soft); text-transform: uppercase; letter-spacing: .1em; margin: 12px 0 6px; }
        .pkg-list { list-style: none; }
        .pkg-list li { display: flex; gap: 8px; font-size: 14px; color: var(--soft); padding: 5px 0; border-top: 1px solid var(--border); align-items: flex-start; line-height: 1.5; }
        .pkg-list li:first-child { border-top: none; }
        .pkg-inherit { font-size: 14px; font-weight: 700; color: var(--indigo-d); padding: 12px 12px; background: linear-gradient(135deg, rgba(0,168,122,0.08) 0%, rgba(74,157,181,0.08) 100%); border-left: 3px solid var(--cyan); border-radius: 6px; margin-bottom: 12px; }
        .chk { flex-shrink: 0; width: 16px; height: 16px; border-radius: 50%; background: rgba(0,200,150,.15); color: var(--mint); display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 800; margin-top: 2px; }

        .pkg-switch { font-size: 13px; color: var(--soft); text-align: center; margin-top: 10px; }
        .chk.crm-chk { background: rgba(0,168,122,.18); color: var(--mint); }

        /* TESTIMONIALS */
        .tcard {
          background: #f8f9fc; border: 1px solid rgba(31,60,136,.08);
          border-radius: 16px; padding: 28px;
        }

        /* FOOTER */
        footer { border-top: 1px solid var(--border); padding: 44px 0 28px; background: #f0f3ff; }
        .foot-grid { display: grid; grid-template-columns: 1.4fr 1fr 1fr; gap: 32px; margin-bottom: 28px; }
        @media (max-width: 680px) { .foot-grid { grid-template-columns: 1fr; } }
        .foot-brand p { font-size: 13px; color: var(--soft); max-width: 240px; margin-top: 10px; line-height: 1.6; }
        .foot-col h5 { font-size: 13px; text-transform: uppercase; letter-spacing: .1em; color: var(--soft); margin-bottom: 12px; font-weight: 700; }
        .foot-col a { display: block; font-size: 13px; color: var(--soft); margin-bottom: 9px; font-weight: 500; }
        .foot-col a:hover { color: var(--indigo); }
        .foot-bottom {
          border-top: 1px solid var(--border); padding-top: 18px;
          display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px;
          font-size: 13px; color: var(--soft);
        }

        @media (max-width: 480px) {
          .nav-inner { padding: 10px 16px; }
          .nav-logo { font-size: 15px; }
          .nav-logo img { height: 32px; }
          .btn-sm { font-size: 13px; padding: 0 12px; }
          section { padding: 56px 0; }
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
            <Link href="/about" className="nav-page-link" style={{ fontSize: '15px', fontWeight: 600, color: '#5b6072', marginRight: '4px' }}>About</Link>
            <button data-cal-link="qcypher" data-cal-namespace="qcypher" data-cal-config='{"notes":"Interested in: Free Quote"}' className="btn btn-primary btn-sm">Free quote</button>
          </div>
        </div>
      </header>

      {/* PAGE HEADER */}
      <section style={{ background: 'linear-gradient(145deg, #0e1f45 0%, #1a3070 45%, #1e4a7a 75%, #246080 100%)', paddingTop: '56px', paddingBottom: '48px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 70% at 80% 50%, rgba(74,157,181,0.18) 0%, transparent 70%), radial-gradient(ellipse 40% 50% at 10% 80%, rgba(42,82,160,0.3) 0%, transparent 60%)', pointerEvents: 'none' }} />
        <div className="wrap" style={{ position: 'relative' }}>
          <h1 style={{ fontSize: '42px', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.03em', color: '#fff', marginBottom: '16px' }}>Pricing that grows with your business</h1>
          <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.75)', maxWidth: '500px', lineHeight: 1.7 }}>All plans include hands-on setup, monthly support, and our custom CRM. No surprises, no hidden fees.</p>
        </div>
      </section>

      {/* PACKAGES */}
      <section id="packages" style={{ background: '#f4f6fc', borderTop: '1px solid rgba(31,60,136,.08)' }}>
        <div className="wrap">
          <div className="section-head center">
            <span className="eyebrow">Packages & Pricing</span>
            <h2>Everything included. Pick your pace.</h2>
            <p style={{ marginTop: '16px', fontSize: '15px', color: 'var(--ink)', fontWeight: 600 }}>Everything starts with hands-on setup + a 90-day check-in. CRM included free with every monthly plan.</p>
            <p style={{ marginTop: '12px', fontSize: '14px', color: '#5b6072' }}>✓ Customer Management Tool included free with every monthly plan — no hidden fees, no per-user charges</p>
          </div>

          {/* WHAT YOU'RE REALLY GETTING */}
          <div style={{ marginTop: '60px', marginBottom: '60px' }}>
            <h3 style={{ fontSize: '24px', fontWeight: 800, color: '#1a3070', marginBottom: '32px', textAlign: 'center' }}>What You're Really Getting</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', maxWidth: '700px', margin: '0 auto' }}>
              <div style={{ background: '#fff', border: '1px solid rgba(26,48,112,0.1)', borderRadius: '16px', padding: '24px', textAlign: 'left', boxShadow: '0 2px 8px rgba(26,48,112,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                  <span style={{ fontSize: '18px', color: '#00a87a', fontWeight: 700, flexShrink: 0 }}>✓</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: '#171a2b', marginBottom: '4px' }}>Custom website build</div>
                    <div style={{ fontSize: '15px', color: '#00a87a', fontWeight: 700 }}>$1,500–$3,000 value</div>
                  </div>
                </div>
              </div>
              <div style={{ background: '#fff', border: '1px solid rgba(26,48,112,0.1)', borderRadius: '16px', padding: '24px', textAlign: 'left', boxShadow: '0 2px 8px rgba(26,48,112,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                  <span style={{ fontSize: '18px', color: '#00a87a', fontWeight: 700, flexShrink: 0 }}>✓</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: '#171a2b', marginBottom: '4px' }}>Google Business Profile setup & optimization</div>
                    <div style={{ fontSize: '15px', color: '#00a87a', fontWeight: 700 }}>$500–$800 value</div>
                  </div>
                </div>
              </div>
              <div style={{ background: '#fff', border: '1px solid rgba(26,48,112,0.1)', borderRadius: '16px', padding: '24px', textAlign: 'left', boxShadow: '0 2px 8px rgba(26,48,112,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                  <span style={{ fontSize: '18px', color: '#00a87a', fontWeight: 700, flexShrink: 0 }}>✓</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: '#171a2b', marginBottom: '4px' }}>Domain, email, security, CRM</div>
                    <div style={{ fontSize: '15px', color: '#00a87a', fontWeight: 700 }}>$1,000+ value</div>
                  </div>
                </div>
              </div>
              <div style={{ background: '#fff', border: '1px solid rgba(26,48,112,0.1)', borderRadius: '16px', padding: '24px', textAlign: 'left', boxShadow: '0 2px 8px rgba(26,48,112,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                  <span style={{ fontSize: '18px', color: '#00a87a', fontWeight: 700, flexShrink: 0 }}>✓</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: '#171a2b', marginBottom: '4px' }}>Hands-on setup day with Felix or Thomas</div>
                    <div style={{ fontSize: '15px', color: '#00a87a', fontWeight: 700 }}>$800 value</div>
                  </div>
                </div>
              </div>
              <div style={{ background: 'linear-gradient(135deg, #00a87a 0%, #059669 100%)', borderRadius: '16px', padding: '24px', textAlign: 'center', color: '#fff', marginTop: '8px', boxShadow: '0 4px 16px rgba(0,168,122,0.2)' }}>
                <div style={{ fontSize: '14px', fontWeight: 600, opacity: 0.9, marginBottom: '6px' }}>Total value: $3,800–$5,600</div>
                <div style={{ fontSize: '18px', fontWeight: 900, marginBottom: '4px' }}>All bundled: $1,250 + $49–$149/mo</div>
                <div style={{ fontSize: '13px', opacity: 0.85 }}>That's 4–5x the value.</div>
              </div>
            </div>
          </div>

          <div className="pkg-grid">

            {/* Starter */}
            <div className="pkg-card">
              <span className="pkg-badge-spacer" />
              <div className="pkg-for">Getting started with protection</div>
              <div className="pkg-name">Starter</div>
              <p className="pkg-tagline">Built with hands-on setup. We walk you through the first week.</p>
              <div className="pkg-price">
                <span className="amt">$1,250</span><span className="freq"> one-time</span>
                <span className="mo">+ $49/mo</span>
              </div>
              <details className="pkg-details" open>
                <summary>See what&apos;s included</summary>
                <div>
                  <ul className="pkg-list">
                    <li><span className="chk">✓</span><span><strong>Website</strong> <em>(a fast, mobile-friendly site built to bring in new customers)</em></span></li>
                    <li><span className="chk">✓</span><span><strong>Get Set Up Online</strong> <em>(Google Business Profile, social pages, and business email — all in one pass)</em></span></li>
                    <li><span className="chk">✓</span><span><strong>Security &amp; Backup</strong> <em>(daily backups and security monitoring to keep your site safe)</em></span></li>
                    <li><span className="chk crm-chk">✓</span><span><strong>Customer Management Tool</strong> <em>(included free with this plan)</em></span></li>
                  </ul>
                </div>
              </details>
              <p style={{ fontSize: '13px', color: '#00a87a', fontWeight: 600, marginTop: '16px', paddingBottom: '12px', borderBottom: '1px solid rgba(0,168,122,0.2)' }}>✓ Not seeing results? We refund your setup fee.</p>
              <button onClick={() => setShowContactModal(true)} className="btn btn-ghost btn-full" style={{ marginTop: '16px' }}>Get started</button>
              <p className="pkg-switch">Switch tiers anytime — no penalty.</p>
            </div>

            {/* Growth */}
            <div className="pkg-card pop">
              <div className="pkg-badge">Most popular</div>
              <div className="pkg-for">Ready for more customers</div>
              <div className="pkg-name">Growth</div>
              <p className="pkg-tagline">More bookings, automated reviews, monthly reports explained by a real person.</p>
              <div className="pkg-price">
                <span className="amt">$1,250</span><span className="freq"> one-time</span>
                <span className="mo">+ $99/mo</span>
              </div>
              <details className="pkg-details" open>
                <summary>See what&apos;s included</summary>
                <div>
                  <div className="pkg-inherit">Everything in Starter, plus:</div>
                  <ul className="pkg-list">
                    <li><span className="chk">✓</span><span><strong>Fast Customer Online Scheduler</strong> <em>(customers book appointments and fill out any needed forms, automatically)</em></span></li>
                    <li><span className="chk">✓</span><span><strong>Generate More Online Reviews</strong> <em>(ongoing Google ranking work plus automatic requests for happy-customer reviews)</em></span></li>
                    <li><span className="chk crm-chk">✓</span><span><strong>Customer Management Tool</strong> <em>(included free with this plan)</em></span></li>
                  </ul>
                </div>
              </details>
              <p style={{ fontSize: '13px', color: '#00a87a', fontWeight: 600, marginTop: '16px', paddingBottom: '12px', borderBottom: '1px solid rgba(0,168,122,0.2)' }}>✓ Not seeing results? We refund your setup fee.</p>
              <button onClick={() => setShowContactModal(true)} className="btn btn-primary btn-full" style={{ marginTop: '16px' }}>Get started</button>
              <p className="pkg-switch">Switch tiers anytime — no penalty.</p>
            </div>

            {/* All-In */}
            <div className="pkg-card">
              <span className="pkg-badge-spacer" />
              <div className="pkg-for">Fully hands-off growth</div>
              <div className="pkg-name">All-In</div>
              <p className="pkg-tagline">Everything managed. Monthly check-ins, reports explained, questions answered.</p>
              <div className="pkg-price">
                <span className="amt">$1,250</span><span className="freq"> one-time</span>
                <span className="mo">+ $149/mo</span>
              </div>
              <details className="pkg-details" open>
                <summary>See what&apos;s included</summary>
                <div>
                  <div className="pkg-inherit">Everything in Growth, plus:</div>
                  <ul className="pkg-list">
                    <li><span className="chk">✓</span><span><strong>Sell Online</strong> <em>(a simple online store with secure payments built in)</em></span></li>
                    <li><span className="chk">✓</span><span><strong>Customer Engagement</strong> <em>(email newsletters, text blasts, and 24/7 website chat — all your outreach in one place)</em></span></li>
                    <li><span className="chk crm-chk">✓</span><span><strong>Customer Management Tool</strong> <em>(included free with this plan)</em></span></li>
                  </ul>
                </div>
              </details>
              <p style={{ fontSize: '13px', color: '#00a87a', fontWeight: 600, marginTop: '16px', paddingBottom: '12px', borderBottom: '1px solid rgba(0,168,122,0.2)' }}>✓ Not seeing results? We refund your setup fee.</p>
              <button data-cal-link="qcypher" data-cal-namespace="qcypher" data-cal-config='{"notes":"Interested in: All-In"}' className="btn btn-ghost btn-full" style={{ marginTop: '16px' }}>Get started</button>
              <p className="pkg-switch">Switch tiers anytime — no penalty.</p>
            </div>

            {/* Online Launch — full width on desktop, horizontal layout */}
            <div className="pkg-card pkg-card-launch" style={{ borderColor: 'rgba(16,185,129,0.30)', background: 'linear-gradient(135deg,#f0fdf8 0%,#fff 70%)' }}>
              <div className="launch-body">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#059669' }}>One-time only · No monthly fee</span>
                  <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'rgba(5,150,105,0.4)', display: 'inline-block' }} />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#5b6072' }}>Not ready for a monthly plan</span>
                </div>
                <div className="pkg-name">Online Launch</div>
                <p className="pkg-tagline">Get your business online — no ongoing costs, no contracts, no surprises.</p>
                <div className="pkg-price" style={{ borderBottom: 'none', marginBottom: '8px', paddingBottom: '0' }}>
                  <span className="amt">$900</span><span className="freq"> one-time</span>
                  <span className="no-mo">Pay once. Done. No monthly fee — ever.</span>
                </div>
                <details className="pkg-details" open>
                  <summary>See what&apos;s included</summary>
                  <div>
                    <ul className="pkg-list">
                      <li><span className="chk">✓</span><span><strong>Website</strong> <em>(a fast, mobile-friendly site built to bring in new customers)</em></span></li>
                      <li><span className="chk">✓</span><span><strong>Get Set Up Online</strong> <em>(Google Business Profile, social pages, and business email — all in one pass)</em></span></li>
                    </ul>
                  </div>
                </details>
              </div>
              <div className="launch-cta">
                <p style={{ fontSize: '13px', color: '#00a87a', fontWeight: 600, marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid rgba(0,168,122,0.2)' }}>✓ Not seeing results? We refund your setup fee.</p>
                <button onClick={() => setShowContactModal(true)} className="btn" style={{ background: '#059669', color: '#fff', border: 'none', borderRadius: '12px', padding: '0 32px', fontSize: '15px', fontWeight: 700, cursor: 'pointer', minHeight: '48px', width: '100%' }}>Get started</button>
                <p className="pkg-switch" style={{ marginTop: '4px' }}>No commitment — upgrade to a monthly plan anytime.</p>
              </div>
            </div>

          </div>

          <p style={{ textAlign: 'center', marginTop: '32px', fontSize: '15px', color: '#5b6072' }}>
            Questions about pricing? See our <Link href="/faq" style={{ color: '#2a52a0', fontWeight: 700 }}>FAQs</Link> or{' '}
            <button onClick={() => setShowContactModal(true)} style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', color: '#2a52a0', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>
              get a free consultation
            </button>.
          </p>
        </div>
      </section>

      {/* COMPARISON TABLE */}
      <section style={{ background: '#f4f6fc', borderTop: '1px solid rgba(31,60,136,.08)', padding: '88px 0' }}>
        <div className="wrap">
          <div className="section-head center">
            <h2>QCypher vs. Building It Yourself</h2>
          </div>
          <div style={{ marginTop: '48px', overflowX: 'auto', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(26,48,112,0.08)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '16px' }}>
              <thead>
                <tr style={{ background: 'linear-gradient(135deg, rgba(26,48,112,0.06) 0%, rgba(74,157,181,0.04) 100%)' }}>
                  <th style={{ textAlign: 'left', padding: '20px', fontWeight: 700, color: '#1a3070' }}>Feature</th>
                  <th style={{ textAlign: 'center', padding: '20px', fontWeight: 700, color: '#1a3070' }}>DIY</th>
                  <th style={{ textAlign: 'center', padding: '20px', fontWeight: 700, color: '#1a3070' }}>QCypher</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid rgba(26,48,112,0.1)', background: '#fff' }}>
                  <td style={{ padding: '20px', color: '#5b6072', fontWeight: 600 }}>Website Builder</td>
                  <td style={{ textAlign: 'center', padding: '20px', color: '#9ca3af' }}>$14/mo</td>
                  <td style={{ textAlign: 'center', padding: '20px', color: '#00a87a', fontWeight: 700 }}>✓ Included</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(26,48,112,0.1)', background: '#fff' }}>
                  <td style={{ padding: '20px', color: '#5b6072', fontWeight: 600 }}>CRM</td>
                  <td style={{ textAlign: 'center', padding: '20px', color: '#9ca3af' }}>$39/mo</td>
                  <td style={{ textAlign: 'center', padding: '20px', color: '#00a87a', fontWeight: 700 }}>✓ Free</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(26,48,112,0.1)', background: '#fff' }}>
                  <td style={{ padding: '20px', color: '#5b6072', fontWeight: 600 }}>Reviews/Automation</td>
                  <td style={{ textAlign: 'center', padding: '20px', color: '#9ca3af' }}>$500/mo</td>
                  <td style={{ textAlign: 'center', padding: '20px', color: '#00a87a', fontWeight: 700 }}>✓ Included</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(26,48,112,0.1)', background: '#fff' }}>
                  <td style={{ padding: '20px', color: '#5b6072', fontWeight: 600 }}>Support</td>
                  <td style={{ textAlign: 'center', padding: '20px', color: '#9ca3af' }}>Email tickets</td>
                  <td style={{ textAlign: 'center', padding: '20px', color: '#00a87a', fontWeight: 700 }}>✓ Felix or Thomas</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(26,48,112,0.1)', background: '#fff' }}>
                  <td style={{ padding: '20px', color: '#5b6072', fontWeight: 600 }}>Setup help</td>
                  <td style={{ textAlign: 'center', padding: '20px', color: '#9ca3af' }}>None</td>
                  <td style={{ textAlign: 'center', padding: '20px', color: '#00a87a', fontWeight: 700 }}>✓ Day 1 call</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(26,48,112,0.1)', background: '#fff' }}>
                  <td style={{ padding: '20px', color: '#5b6072', fontWeight: 600 }}>Monthly check-in</td>
                  <td style={{ textAlign: 'center', padding: '20px', color: '#9ca3af' }}>None</td>
                  <td style={{ textAlign: 'center', padding: '20px', color: '#00a87a', fontWeight: 700 }}>✓ Included</td>
                </tr>
                <tr style={{ background: 'rgba(0,168,122,0.05)' }}>
                  <td style={{ padding: '20px', color: '#1a3070', fontWeight: 700 }}>Total Year 1</td>
                  <td style={{ textAlign: 'center', padding: '20px', color: '#9ca3af', fontWeight: 700 }}>$6,500+</td>
                  <td style={{ textAlign: 'center', padding: '20px', color: '#00a87a', fontWeight: 700 }}>QCypher (Starter): $1,788/year</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section style={{ background: '#fff', borderTop: '1px solid rgba(31,60,136,.08)', padding: '72px 0' }}>
        <div className="wrap">
          <div className="section-head center">
            <span className="eyebrow">What Our Clients Say</span>
            <h2>Real results from real businesses</h2>
            <p>We work with local business owners who want straightforward tech — not a sales pitch.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginTop: '40px' }}>

            <div className="tcard">
              <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
                {[0,1,2,3,4].map(i => (
                  <svg key={i} width="16" height="16" viewBox="0 0 16 16" fill="#f59e0b" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8 1l1.8 3.6 4 .6-2.9 2.8.7 4L8 10l-3.6 2 .7-4L2.2 5.2l4-.6z"/>
                  </svg>
                ))}
              </div>
              <p style={{ fontSize: '15px', color: '#171a2b', lineHeight: 1.7, marginBottom: '20px' }}>
                &ldquo;Before QCypher, I was keeping track of everything in my head and a bunch of sticky notes.
                Now I actually know which customers I need to follow up with. Got 8 new bookings in 30 days. It&apos;s honestly one of the best things I&apos;ve done for my business.&rdquo;
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0, background: 'rgba(42,82,160,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: 700, color: '#2a52a0' }}>MR</div>
                <div>
                  <p style={{ fontSize: '15px', fontWeight: 700, color: '#171a2b' }}>Marcus R.</p>
                  <p style={{ fontSize: '14px', color: '#64748b', marginTop: '1px' }}>HVAC & Plumbing, Richmond VA</p>
                </div>
              </div>
            </div>

            <div className="tcard">
              <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
                {[0,1,2,3,4].map(i => (
                  <svg key={i} width="16" height="16" viewBox="0 0 16 16" fill="#f59e0b" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8 1l1.8 3.6 4 .6-2.9 2.8.7 4L8 10l-3.6 2 .7-4L2.2 5.2l4-.6z"/>
                  </svg>
                ))}
              </div>
              <p style={{ fontSize: '15px', color: '#171a2b', lineHeight: 1.7, marginBottom: '20px' }}>
                &ldquo;They set up my website and Google listing in the same week. My phone started ringing
                more within the first month. Thomas walked me through everything — no tech background needed.&rdquo;
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0, background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: 700, color: '#059669' }}>DW</div>
                <div>
                  <p style={{ fontSize: '15px', fontWeight: 700, color: '#171a2b' }}>Denise W.</p>
                  <p style={{ fontSize: '14px', color: '#64748b', marginTop: '1px' }}>Mobile Cleaning Service, Annapolis MD</p>
                </div>
              </div>
            </div>

            <div className="tcard">
              <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
                {[0,1,2,3,4].map(i => (
                  <svg key={i} width="16" height="16" viewBox="0 0 16 16" fill="#f59e0b" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8 1l1.8 3.6 4 .6-2.9 2.8.7 4L8 10l-3.6 2 .7-4L2.2 5.2l4-.6z"/>
                  </svg>
                ))}
              </div>
              <p style={{ fontSize: '15px', color: '#171a2b', lineHeight: 1.7, marginBottom: '20px' }}>
                &ldquo;I&apos;ve worked with a few different tech companies and most of them just hand you a login and disappear. QCypher actually shows up. Felix walked me through everything, answered my questions the same day, and the tools they built actually work the way they say they do. Couldn&apos;t ask for more.&rdquo;
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0, background: 'rgba(245,158,11,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: 700, color: '#d97706' }}>JT</div>
                <div>
                  <p style={{ fontSize: '15px', fontWeight: 700, color: '#171a2b' }}>James T.</p>
                  <p style={{ fontSize: '14px', color: '#64748b', marginTop: '1px' }}>Roofing Contractor, Alexandria VA</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* FOOTER / CONTACT */}
      <footer id="contact">
        <div className="wrap">
          <div className="foot-grid">
            <div className="foot-brand">
              <div className="nav-logo" style={{ marginBottom: 0 }}>
                <img src="/qcypher-logo-horizontal.png" alt="QCypher Technologies" />
              </div>
              <p>Simple tech solutions for local businesses. No jargon, just results.</p>
            </div>
            <div className="foot-col">
              <h5>Contact Us</h5>
              <a href="mailto:info@qcyphertech.com">info@qcyphertech.com</a>
              <a href="tel:+18042505066" style={{ fontWeight: 600, color: 'var(--indigo)', marginBottom: '4px' }}>(804) 250-5066</a>
              <p style={{ fontSize: '13px', color: 'var(--soft)', margin: '0' }}>Ask for Felix or Thomas.</p>
            </div>
            <div className="foot-col">
              <h5>Quick Links</h5>
              <Link href="/">Home</Link>
              <Link href="/about">About Us</Link>
              <Link href="/security">Security</Link>
              <Link href="/privacy">Privacy Policy</Link>
              <Link href="/terms">Terms of Service</Link>
              <Link href="/faq">FAQs</Link>
              <Link href="/auth/login">Client Login</Link>
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
                onClick={() => {
                  setShowForm(true)
                  setShowContactModal(false)
                }}
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

      {/* ONBOARDING FORM MODAL */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 101 }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '40px', maxWidth: '450px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#1a3070', marginBottom: '8px' }}>Let's get you started</h2>
            <p style={{ fontSize: '14px', color: '#5b6072', marginBottom: '24px' }}>Quick info so we can reach out and discuss your business needs.</p>

            {formSuccess ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>✓</div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1a3070', marginBottom: '8px' }}>Thanks!</h3>
                <p style={{ fontSize: '14px', color: '#5b6072', marginBottom: '24px' }}>We'll be in touch shortly at the email and phone number you provided.</p>
                <button
                  onClick={() => {
                    setShowForm(false)
                    setFormSuccess(false)
                    setFormData({ businessName: '', phone: '', email: '' })
                  }}
                  style={{
                    padding: '12px 24px',
                    background: '#1a3070',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '14px',
                    cursor: 'pointer',
                  }}
                >
                  Close
                </button>
              </div>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault()
                  setFormSubmitting(true)
                  try {
                    const response = await fetch('https://formspree.io/f/xyzabc', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        businessName: formData.businessName,
                        phone: formData.phone,
                        email: formData.email,
                        _subject: 'New Lead: ' + formData.businessName,
                      }),
                    })
                    if (response.ok) {
                      setFormSuccess(true)
                    }
                  } catch (error) {
                    console.error('Form submission error:', error)
                  } finally {
                    setFormSubmitting(false)
                  }
                }}
              >
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#1a3070', marginBottom: '6px' }}>Business Name</label>
                  <input
                    type="text"
                    required
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid rgba(26,48,112,0.2)',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                    }}
                    placeholder="Your business name"
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#1a3070', marginBottom: '6px' }}>Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid rgba(26,48,112,0.2)',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                    }}
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#1a3070', marginBottom: '6px' }}>Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid rgba(26,48,112,0.2)',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                    }}
                    placeholder="you@company.com"
                  />
                </div>

                <button
                  type="submit"
                  disabled={formSubmitting}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: formSubmitting ? '#ccc' : 'linear-gradient(135deg, #2a52a0, #4a9db5)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '15px',
                    cursor: formSubmitting ? 'not-allowed' : 'pointer',
                    marginBottom: '12px',
                  }}
                >
                  {formSubmitting ? 'Submitting...' : 'Send Information'}
                </button>

                <button
                  type="button"
                  onClick={() => setShowForm(false)}
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
                  Cancel
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Cal.com popup embed — powers all "Get started" buttons */}
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
