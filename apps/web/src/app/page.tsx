'use client'

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Lightbulb, Calendar, FileEdit } from 'lucide-react'

// Public marketing page — no auth calls, no Supabase imports.
// Middleware handles logged-in redirect (/ → /dashboard).

// Phase 17: Customer Logo Carousel — real logos extracted from each company's
// live site (or official press assets) and stored locally in /public/logos.
const CUSTOMER_LOGOS = [
  { name: 'Make Me Pulse', file: '/logos/makemepulse.svg' },
  { name: 'BuildOps', file: '/logos/buildops.svg' },
  { name: 'Contractor Nation', file: '/logos/contractornation.svg' },
  { name: 'FieldEdge', file: '/logos/fieldedge.svg' },
  { name: 'Mace Group', file: '/logos/macegroup.png' },
  { name: 'ServiceTitan', file: '/logos/servicetitan.svg' },
  { name: 'AlignOps', file: '/logos/alignops.png' },
  { name: 'Adoratorio', file: '/logos/adoratorio.png' },
  { name: 'Aquest', file: '/logos/aquest.png' },
  { name: 'Burocratik', file: '/logos/burocratik.png' },
  { name: 'DogStudio', file: '/logos/dogstudio.png' },
  { name: 'Immersive G', file: '/logos/immersiveg.png' },
  { name: 'Lusion', file: '/logos/lusion.png' },
]

// Phase 19: Integration Logos Footer — real logos extracted from each
// service's live site and stored locally in /public/logos.
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

// Reusable CSS glass/clay-morphic laptop with abstract CRM inscriptions —
// used full-size in the hero (with the 3D tilt ref) and shrunk via CSS zoom
// wherever a smaller version fits (e.g. the CRM section's CTA column).
function ClayLaptop({ screenRef }: { screenRef?: React.Ref<HTMLDivElement> }) {
  return (
    <div ref={screenRef} className="clay-laptop">
      <div className="clay-screen">
        <div className="clay-crm" aria-hidden="true">
          <div className="clay-crm-nav">
            <div className="clay-crm-nav-item active"><span className="clay-crm-nav-dot" /><span>Dashboard</span></div>
            <div className="clay-crm-nav-item"><span className="clay-crm-nav-dot" /><span>Contacts</span></div>
            <div className="clay-crm-nav-item"><span className="clay-crm-nav-dot" /><span>Orders</span></div>
            <div className="clay-crm-nav-item"><span className="clay-crm-nav-dot" /><span>Reports</span></div>
          </div>
          <div className="clay-crm-main">
            <span className="clay-crm-label">Recent Contacts</span>
            <div className="clay-crm-row">
              <span className="clay-crm-avatar" style={{ background: 'linear-gradient(135deg,#0d6dff,#5fa0ff)' }} />
              <div className="clay-crm-row-text">
                <div className="clay-crm-row-name">Marcus R.</div>
                <div className="clay-crm-row-sub">HVAC & Plumbing</div>
              </div>
              <span className="clay-crm-chip won">Booked</span>
            </div>
            <div className="clay-crm-row">
              <span className="clay-crm-avatar" style={{ background: 'linear-gradient(135deg,#ff7a1a,#ffb066)' }} />
              <div className="clay-crm-row-text">
                <div className="clay-crm-row-name">Denise W.</div>
                <div className="clay-crm-row-sub">Mobile Cleaning</div>
              </div>
              <span className="clay-crm-chip pending">Follow up</span>
            </div>
            <div className="clay-crm-row">
              <span className="clay-crm-avatar" style={{ background: 'linear-gradient(135deg,#0d2454,#3a5a9c)' }} />
              <div className="clay-crm-row-text">
                <div className="clay-crm-row-name">James T.</div>
                <div className="clay-crm-row-sub">Roofing Contractor</div>
              </div>
              <span className="clay-crm-chip new">New lead</span>
            </div>
            <div className="clay-crm-chart">
              <svg width="100%" height="100%" viewBox="0 0 160 30" preserveAspectRatio="none">
                <polyline points="0,24 20,20 40,22 60,12 80,16 100,8 120,10 140,4 160,6" fill="none" stroke="#0d6dff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </div>
      </div>
      <div className="clay-base" />
    </div>
  )
}

export default function HomePage() {
  const [showReportModal, setShowReportModal] = useState(false)
  const [showContactModal, setShowContactModal] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ businessName: '', phone: '', email: '', message: '', selectedPackages: [] as string[] })
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formSuccess, setFormSuccess] = useState(false)
  const [latestPost, setLatestPost] = useState<{ title: string; slug: string; excerpt: string; published_at: string | null } | null>(null)

  useEffect(() => {
    fetch('/api/blog/latest')
      .then((res) => res.json())
      .then((data) => setLatestPost(data.article ?? null))
      .catch(() => setLatestPost(null))
  }, [])

  const heroPinRef = useRef<HTMLElement>(null)
  const heroAlphaRef = useRef<HTMLDivElement>(null)
  const heroBetaRef = useRef<HTMLDivElement>(null)
  const mobileTiltRef = useRef<HTMLDivElement>(null)

  // Lenis intercepts native scroll (drives its own virtual scroll position
  // via rAF), so a plain window.scrollTo(0,0) alone gets fought/overridden
  // on the next frame — logo-click-to-top needs to reset Lenis's own state
  // too, not just the browser's native scrollY.
  const lenisRef = useRef<Lenis | null>(null)

  function scrollToTop(e: React.MouseEvent) {
    e.preventDefault()
    if (lenisRef.current) {
      lenisRef.current.scrollTo(0, { immediate: true })
    } else {
      window.scrollTo({ top: 0 })
    }
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname)
    }
  }

  const formatPhoneNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '')
    const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/)
    if (!match) return value
    const [, area, exchange, line] = match
    if (!exchange) return area ? `(${area}` : ''
    if (!line) return `(${area}) ${exchange}`
    return `(${area}) ${exchange}-${line}`
  }

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in')
          observer.unobserve(entry.target)
        }
      })
    }, { threshold: 0.1 })

    const workStepCards = document.querySelectorAll('.work-step-card')
    workStepCards.forEach((card) => observer.observe(card))

    return () => observer.disconnect()
  }, [])

  // Lenis smooth scroll + GSAP ScrollTrigger integration
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)

    const lenis = new Lenis({ lerp: 0.1 })
    lenis.on('scroll', ScrollTrigger.update)
    lenisRef.current = lenis

    let rafId: number
    function raf(time: number) {
      lenis.raf(time)
      rafId = requestAnimationFrame(raf)
    }
    rafId = requestAnimationFrame(raf)

    const canPin = typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches

    // Hero — pinned scroll-through, Alpha -> Beta
    let heroCtx: gsap.Context | undefined
    if (canPin && heroPinRef.current && heroAlphaRef.current && heroBetaRef.current) {
      heroCtx = gsap.context(() => {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: heroPinRef.current,
            start: 'top top',
            end: '+=200%',
            scrub: true,
            pin: true,
          },
        })
        tl.to(heroAlphaRef.current, { opacity: 0, scale: 0.85, z: -300, ease: 'none' }, 0)
          .fromTo(
            heroBetaRef.current,
            { opacity: 0, scale: 0.8, z: -400, y: 60 },
            { opacity: 1, scale: 1, z: 0, y: 0, ease: 'none' },
            0.25
          )
          // Hand off clickability at the crossover point (halfway through
          // beta's fade-in) — before this, alpha is the visible phase and
          // its buttons must stay clickable; after, beta is visible and on
          // top, so it should own clicks instead. .set() applies instantly
          // rather than interpolating, so there's no ambiguous in-between
          // state where both or neither phase is clickable.
          .set(heroAlphaRef.current, { pointerEvents: 'none' }, 0.5)
          .set(heroBetaRef.current, { pointerEvents: 'auto' }, 0.5)
      })
    }

    return () => {
      cancelAnimationFrame(rafId)
      lenis.destroy()
      lenisRef.current = null
      heroCtx?.revert()
      ScrollTrigger.getAll().forEach((st) => st.kill())
    }
  }, [])

  // Mobile-only idle CSS 3D tilt for hero-phase-beta's iso-block visual
  // (no mouse to react to on touch devices, unlike a desktop hover
  // effect). The desktop counterpart this used to pair with (a WebGL
  // Three.js scene on heroCanvasRef) is not restored here — confirmed
  // it was already fully dead code before tonight's changes even
  // started (heroCanvasRef was never attached to any element in JSX),
  // so bringing it back would just reintroduce dead weight, not real
  // functionality.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const isDesktop = window.matchMedia('(min-width: 768px)').matches
    if (isDesktop || !mobileTiltRef.current) return

    const el = mobileTiltRef.current
    let raf2: number
    let t = 0
    const idle = () => {
      t += 0.01
      const rx = Math.sin(t) * 8
      const ry = Math.cos(t * 0.8) * 10
      el.style.transform = `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg)`
      raf2 = requestAnimationFrame(idle)
    }
    idle()
    return () => cancelAnimationFrame(raf2)
  }, [])

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

          /* Design-brief palette (Light Mode) */
          --navy: #0d2454;
          --navy-line: rgba(13,36,84,0.14);
          --navy-line-soft: rgba(13,36,84,0.08);
          --orange: #ff7a1a;
          --electric: #0d6dff;
          --offwhite: #f8f9fa;
          --offwhite-2: #f4f5f7;
        }

        /* Widened to fit all 3 package tiles (415px + 34px gaps + outline
           bleed) side by side without horizontal scroll on desktop —
           applied globally so nav/hero/every section stays aligned to the
           same width. */
        .wrap { max-width: 1380px; margin: 0 auto; padding: 0 20px; }

        /* NAV */
        .nav-bar {
          position: sticky; top: 0; z-index: 50;
          background: rgba(255,255,255,0.95);
          backdrop-filter: blur(16px);
          border-bottom: 1px solid var(--border);
        }
        .nav-inner {
          display: flex; align-items: center; justify-content: space-between;
          padding: 20px 32px; width: 100%;
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

        /* HERO — Huly-inspired, off-white bg, navy text, electric-blue accent grid.
           This base rule is always fully overridden by the more-specific
           .hero.hero-pin further down (both classes are applied together
           in JSX) — it only matters as a fallback if hero-pin's class
           were ever removed. */
        .hero {
          padding: 88px 0 72px;
          background: var(--offwhite);
          position: relative; overflow: hidden;
          border-bottom: 1px solid var(--navy-line);
        }
        .hero::before {
          content: '';
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(13,109,255,0.09) 1px, transparent 1px),
            linear-gradient(90deg, rgba(13,109,255,0.09) 1px, transparent 1px);
          background-size: 42px 42px;
          -webkit-mask-image: radial-gradient(ellipse 60% 70% at 78% 45%, black 0%, transparent 72%);
          mask-image: radial-gradient(ellipse 60% 70% at 78% 45%, black 0%, transparent 72%);
          pointer-events: none;
        }
        .hero-eyebrow {
          font-size: 12px; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase;
          color: var(--orange); margin-bottom: 14px; display: block;
        }
        .hero .wrap { position: relative; z-index: 2; }
        .hero h1 {
          font-size: clamp(40px, 6vw, 88px); font-weight: 800; line-height: 1.02;
          letter-spacing: -0.03em; color: var(--navy); margin-bottom: 20px;
          font-family: system-ui, -apple-system, "Segoe UI", Arial, sans-serif;
        }
        .hero-lead { font-size: 16px; color: var(--soft); max-width: 500px; margin-bottom: 28px; line-height: 1.7; }
        .hero-actions { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 28px; }
        .btn-hero-primary {
          background: linear-gradient(90deg, var(--orange) 0%, var(--orange) 55%, #ffe4cc 130%);
          color: var(--navy); font-weight: 800;
          letter-spacing: 0.03em; text-transform: uppercase; font-size: 14px;
        }
        .btn-hero-primary:hover { opacity: 0.92; }
        .hero .btn-ghost { color: var(--navy); border-color: var(--navy-line); background: transparent; }
        .hero .btn-ghost:hover { border-color: var(--navy); color: var(--navy); background: rgba(13,36,84,0.04); }
        .trust-row { display: flex; gap: 18px; flex-wrap: wrap; font-size: 14px; color: var(--soft); font-weight: 600; }

        /* HERO VISUAL — CSS glass/clay-morphic laptop (replaces torus/orb) */
        .hero-visual {
          position: relative;
          display: flex; align-items: center; justify-content: center;
          height: 420px;
          /* Without this, the grid cell refuses to shrink below its fixed-
             width ring/laptop child's intrinsic size (CSS Grid's default
             min-width:auto), blowing the column out past the viewport on
             narrow screens instead of letting the oversized visual overflow
             in place. */
          min-width: 0;
        }
        .hero-canvas-3d { position: absolute; inset: 0; z-index: 1; pointer-events: none; }

        /* Hero visual — stacked isometric 3D blocks (blue/green/orange),
           floating in place, with a separate rotating ring orbiting them.
           Used by hero-phase-beta. */
        .hero-iso-stage { perspective: 1200px; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; position: relative; }
        .hero-iso-ring {
          position: absolute; width: 300px; height: 300px; border-radius: 50%;
          border: 2px dashed rgba(13,109,255,0.4);
          animation: heroRingSpin 12s linear infinite;
        }
        .hero-iso-ring::before, .hero-iso-ring::after {
          content: ''; position: absolute; width: 10px; height: 10px; border-radius: 50%;
        }
        .hero-iso-ring::before { top: -5px; left: 50%; margin-left: -5px; background: #0d6dff; box-shadow: 0 0 10px #0d6dff; }
        .hero-iso-ring::after { bottom: -5px; left: 50%; margin-left: -5px; background: #ff7a1a; box-shadow: 0 0 10px #ff7a1a; }
        @keyframes heroRingSpin { to { transform: rotate(360deg); } }
        .hero-iso { position: relative; width: 240px; height: 240px; transform-style: preserve-3d; transform: rotateX(55deg) rotateZ(45deg); animation: heroIsoFloat 6s ease-in-out infinite; }
        @keyframes heroIsoFloat {
          0%, 100% { transform: rotateX(55deg) rotateZ(45deg) translateZ(0); }
          50% { transform: rotateX(55deg) rotateZ(45deg) translateZ(22px); }
        }
        .hero-iso-block { position: absolute; inset: 0; border-radius: 18px; box-shadow: 0 24px 48px rgba(13,36,84,0.22); }
        .hero-iso-b1 { background: linear-gradient(135deg, #0d6dff, #4d9bff); }
        .hero-iso-b2 { transform: translateZ(50px) scale(0.8); background: linear-gradient(135deg, #00a86b, #3fcf9a); }
        .hero-iso-b3 { transform: translateZ(100px) scale(0.6); background: linear-gradient(135deg, #ff7a1a, #ffab5c); }
        @media (max-width: 900px) {
          .hero-iso { width: 180px; height: 180px; }
          .hero-iso-ring { width: 230px; height: 230px; }
        }

        /* HERO PIN — pinned scroll-through, Alpha (current hero) -> Beta,
           replicating the Digital Presentation Dock's pin+crossfade pattern. */
        .hero.hero-pin {
          height: 100vh; padding: 0; display: block;
          /* Static background shared by both phases — lives on the pin
             container (not the phases) so it never fades/crossfades; only
             the phase content transitions on top of it. */
          background: linear-gradient(160deg, #0a1440 0%, #12266b 45%, #0f3d6e 100%);
        }
        .hero-phase { position: absolute; inset: 0; transform-style: preserve-3d; }
        .hero-phase-alpha { display: flex; align-items: center; }
        .hero-phase-alpha .wrap, .hero-phase-beta .wrap { width: 100%; }
        .hero-phase-beta {
          display: flex; align-items: center;
          /* Starts invisible (opacity:0, set inline) but is still a
             full-size absolutely-positioned box stacked on top of
             hero-phase-alpha in DOM order — opacity alone doesn't
             remove it from hit-testing, so without this its (invisible)
             buttons silently intercepted every click meant for alpha's
             real, visible buttons underneath. The GSAP timeline flips
             this to 'auto' (and alpha to 'none') once beta actually
             becomes the visible phase. */
          pointer-events: none;
        }
        .hero-phase-beta h2 {
          font-size: clamp(40px, 6vw, 88px); font-weight: 800; line-height: 1.02;
          letter-spacing: -0.03em; color: #fff; margin-bottom: 20px;
        }
        .hero-phase-beta .accent {
          background: linear-gradient(90deg, #5eead4, #38bdf8);
          -webkit-background-clip: text; background-clip: text; color: transparent;
        }
        .hero-phase-beta p { font-size: 17px; color: rgba(255,255,255,0.72); max-width: 480px; line-height: 1.7; margin-bottom: 26px; }
        .hero-phase-beta .btn-ghost {
          background: linear-gradient(135deg, #2563eb, #38bdf8); color: #fff; border-color: transparent;
        }
        /* Explicitly repeats background/color/border-color (not just
           opacity) — .hero .btn-ghost:hover (above, a leftover from an
           even earlier hero design) ties this rule's specificity on
           those properties and, appearing later in the cascade, was
           winning: this button rendered with navy text on a
           near-transparent navy background on hover, i.e. invisible
           against the dark hero. Confirmed via a real :hover inspection,
           not guessed from reading the CSS. */
        .hero-phase-beta .btn-ghost:hover {
          opacity: 0.92; background: linear-gradient(135deg, #2563eb, #38bdf8); color: #fff; border-color: transparent;
        }
        .hero-micro { font-size: 13px; color: var(--soft); font-weight: 500; margin-bottom: 28px; }

        /* Phase Alpha — "We handle the tech" panel with glowing ring visual */
        .hero-phase-alpha .wrap { position: relative; z-index: 2; }
        .hero-phase-alpha h1 { color: #fff; }
        .hero-phase-alpha .hero-lead { color: rgba(255,255,255,0.72); }
        .hero-phase-alpha .accent {
          background: linear-gradient(90deg, #5eead4, #38bdf8);
          -webkit-background-clip: text; background-clip: text; color: transparent;
        }
        .hero-phase-alpha .accent-orange { color: var(--orange); }
        .hero-phase-alpha .btn-hero-primary { color: var(--navy); }
        .hero-phase-alpha .btn-ghost { background: linear-gradient(135deg, #2563eb, #38bdf8); color: #fff; border-color: transparent; }
        /* Explicitly repeats background/color/border-color on hover (not
           just opacity) — .hero .btn-ghost:hover (above, a leftover from
           an even earlier hero design) ties this rule's specificity on
           those properties and, appearing later in the cascade, was
           winning: this button rendered with navy text on a
           near-transparent navy background on hover, i.e. invisible
           against the dark hero. Confirmed via a real :hover inspection,
           not guessed from reading the CSS. */
        .hero-phase-alpha .btn-ghost:hover {
          opacity: 0.92; background: linear-gradient(135deg, #2563eb, #38bdf8); color: #fff; border-color: transparent;
        }
        .hero-phase-alpha .hero-micro { color: rgba(255,255,255,0.6); }
        .hero-phase-alpha .trust-row { color: rgba(255,255,255,0.68); }
        .hero-phase-alpha .trust-row .dot { background: #5eead4; }

        .hero-ring-stage { position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
        .hero-ring {
          width: 425px; height: 425px;
          /* flex-shrink:0 — otherwise, on narrow mobile columns, being a
             flex child of hero-ring-stage lets it get squashed horizontally
             (distorting the round image into an oval) instead of holding
             its size and overflowing the column like it's meant to. */
          flex-shrink: 0;
          filter: drop-shadow(0 0 50px rgba(56,189,248,0.45));
          animation: ringSpin 16s linear infinite;
        }
        .hero-ring img { width: 100%; height: 100%; object-fit: contain; display: block; }
        @keyframes ringSpin { to { transform: rotate(360deg); } }
        .hero-badge {
          position: absolute; width: 50px; height: 50px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center; color: #5eead4;
          background: rgba(13,27,76,0.55); border: 1.5px solid rgba(94,234,212,0.55);
          box-shadow: 0 0 22px rgba(45,212,191,0.35); backdrop-filter: blur(4px);
          animation: badgeFloat 5s ease-in-out infinite;
        }
        .hero-badge svg { width: 20px; height: 20px; }
        .hb-1 { top: 4%; left: 22%; }
        .hb-2 { top: 4%; right: 16%; animation-delay: .6s; }
        .hb-3 { top: 46%; left: 0%; animation-delay: 1.2s; }
        .hb-4 { top: 46%; right: 0%; animation-delay: 1.8s; }
        .hb-5 { bottom: 4%; left: 22%; animation-delay: 2.4s; }
        .hb-6 { bottom: 4%; right: 16%; animation-delay: 3s; }
        @keyframes badgeFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @media (max-width: 900px) {
          .hero-ring { width: 460px; height: 460px; }
          .hero-badge { display: none; }
          .hero-ring-stage { transform: translateX(33%) translateY(-25%); }
        }
        @media (max-width: 767px) {
          .hero.hero-pin { height: auto; padding: 56px 0 48px; }
          .hero-phase { position: relative; }
          .hero-phase-beta { display: none; }
          /* The visual column was vertically centering against the much
             taller text column, pushing the ring well below the top of the
             headline. Top-align it instead so it sits level with the text. */
          .hero-alpha-wrap { align-items: start !important; }
        }

        .clay-laptop {
          position: relative;
          width: 340px;
          transform: perspective(1000px) rotateX(12deg) rotateY(-14deg);
          transform-style: preserve-3d;
          z-index: 2;
          animation: clayFloat 6s ease-in-out infinite;
        }
        @keyframes clayFloat {
          0%, 100% { transform: perspective(1000px) rotateX(12deg) rotateY(-14deg) translateY(0px); }
          50% { transform: perspective(1000px) rotateX(12deg) rotateY(-14deg) translateY(-14px); }
        }
        .clay-screen {
          width: 100%;
          aspect-ratio: 16 / 10.5;
          border-radius: 22px;
          background: linear-gradient(150deg, rgba(255,255,255,0.97), rgba(248,249,252,0.9));
          border: 1px solid rgba(13,36,84,0.14);
          box-shadow:
            0 40px 80px rgba(13,36,84,0.20),
            0 12px 30px rgba(13,109,255,0.15),
            0 0 60px rgba(255,255,255,0.12),
            inset 0 2px 6px rgba(255,255,255,0.95),
            inset 0 -12px 30px rgba(13,36,84,0.05);
          backdrop-filter: blur(6px);
          position: relative;
          overflow: hidden;
        }
        .clay-screen::before {
          content: '';
          position: absolute; inset: 14px;
          border-radius: 14px;
          background: linear-gradient(160deg, rgba(13,109,255,0.10), rgba(13,36,84,0.03));
          border: 1px solid rgba(13,36,84,0.10);
        }
        .clay-screen::after {
          content: '';
          position: absolute; top: 30px; left: 26px; right: 26px; height: 10px;
          border-radius: 6px;
          background: rgba(255,138,46,0.8);
        }

        /* CRM inscriptions inside the laptop screen — abstract, on-brand
           mockup content (not real data), sitting above the ::before/::after
           decorative gradient + title bar. */
        .clay-crm { position: absolute; inset: 30px 22px 22px; z-index: 1; display: flex; gap: 14px; }
        .clay-crm-nav { width: 56px; flex-shrink: 0; display: flex; flex-direction: column; gap: 10px; padding-top: 18px; }
        .clay-crm-nav-item {
          display: flex; align-items: center; gap: 6px; font-size: 8px; font-weight: 700;
          letter-spacing: 0.02em; color: rgba(13,36,84,0.55); white-space: nowrap;
        }
        .clay-crm-nav-item.active { color: #0d2454; }
        .clay-crm-nav-dot { width: 6px; height: 6px; border-radius: 50%; background: rgba(13,36,84,0.25); flex-shrink: 0; }
        .clay-crm-nav-item.active .clay-crm-nav-dot { background: #0d6dff; box-shadow: 0 0 0 3px rgba(13,109,255,0.18); }
        .clay-crm-main { flex: 1; display: flex; flex-direction: column; gap: 8px; padding-top: 16px; min-width: 0; }
        .clay-crm-label { font-size: 8px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(13,36,84,0.4); margin-bottom: 2px; }
        .clay-crm-row {
          display: flex; align-items: center; gap: 8px; padding: 7px 9px; border-radius: 8px;
          background: rgba(255,255,255,0.6); border: 1px solid rgba(13,36,84,0.08);
        }
        .clay-crm-avatar { width: 16px; height: 16px; border-radius: 50%; flex-shrink: 0; }
        .clay-crm-row-text { flex: 1; min-width: 0; }
        .clay-crm-row-name { font-size: 9px; font-weight: 700; color: #0d2454; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .clay-crm-row-sub { font-size: 7px; color: rgba(13,36,84,0.45); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .clay-crm-chip {
          font-size: 7px; font-weight: 800; letter-spacing: 0.02em; padding: 2px 6px; border-radius: 999px;
          flex-shrink: 0;
        }
        .clay-crm-chip.won { color: #0d9c6a; background: rgba(13,156,106,0.14); }
        .clay-crm-chip.pending { color: #ff7a1a; background: rgba(255,122,26,0.14); }
        .clay-crm-chip.new { color: #0d6dff; background: rgba(13,109,255,0.14); }
        .clay-crm-chart {
          margin-top: 4px; height: 30px; border-radius: 8px; padding: 6px 8px;
          background: rgba(255,255,255,0.5); border: 1px solid rgba(13,36,84,0.08);
        }
        @media (max-width: 900px) {
          .clay-crm-row-sub, .clay-crm-nav-item span { display: none; }
        }

        /* Small copy of the laptop mockup for the CRM section's narrow CTA
           column — the CSS zoom property shrinks the whole box (including
           the absolute-px CRM inscription text) proportionally, so nothing
           needs re-tuning at a second scale. */
        .crm-mini-laptop {
          zoom: 0.84;
          margin-top: 18px;
          margin-right: 28px;
          pointer-events: none;
        }
        @media (max-width: 680px) { .crm-mini-laptop { display: none; } }
        /* Mobile-only copy of the laptop, shown above the checklist instead
           of in the (hidden-on-mobile) CTA column. */
        .crm-mini-laptop-mobile { display: none; }
        @media (max-width: 680px) {
          .crm-mini-laptop-mobile {
            display: flex; justify-content: center;
            margin: 0 0 24px; zoom: 0.72;
          }
        }
        .clay-base {
          width: 112%;
          margin-left: -6%;
          height: 20px;
          border-radius: 0 0 16px 16px;
          background: linear-gradient(180deg, rgba(244,245,247,0.9), rgba(226,229,235,0.9));
          border: 1px solid rgba(13,36,84,0.14);
          border-top: none;
          box-shadow: 0 24px 40px rgba(13,36,84,0.18);
          transform: translateZ(-6px);
        }
        @media (max-width: 900px) {
          .hero-visual { height: 300px; margin-top: 24px; }
          .clay-laptop { width: 260px; }
        }
        @media (max-width: 767px) {
          /* JS drives the tilt below 768px, so disable the CSS float keyframe to avoid fighting it */
          .clay-laptop { animation: none; }
        }
        /* Alpha hero's trust-row — desktop keeps it in the text column;
           mobile shows a second copy under the image instead (and hides
           the text-column one) since the columns don't stack on mobile. */
        .trust-row-mobile { display: none; }
        @media (max-width: 767px) {
          .hero-phase-alpha .hero-visual {
            flex-direction: column; height: auto; margin-top: 0; gap: 16px; padding-bottom: 8px;
          }
          .trust-row-desktop { display: none; }
          /* Pull this up to close the gap left by hero-ring-stage's
             translateY(-25%) shift (transform doesn't affect layout flow,
             so without this the trust-row stays where the ring used to
             sit). */
          .trust-row-mobile { display: flex; flex-direction: column; align-items: center; gap: 8px; margin-top: -155px; }
        }
        .trust-row span { display: flex; align-items: center; gap: 6px; }
        .dot { width: 5px; height: 5px; border-radius: 50%; background: #00e5aa; flex-shrink: 0; }
        @media (max-width: 600px) {
          .hero { padding: 56px 0 48px; }
          .hero h1 { font-size: 32px; }
          .hero-lead { font-size: 15px; }
          .hero .wrap { position: relative; z-index: 10; }
        }

        .latest-post-card:hover { transform: translateY(-4px); box-shadow: 0 20px 44px rgba(13,36,84,0.14); border-color: rgba(13,109,255,0.22) !important; }
        .latest-post-card:hover .latest-post-cta span { transform: translateX(3px); }
        .latest-post-cta span { display: inline-block; transition: transform .15s ease; }

        /* SECTION */
        section { padding: 72px 0; }
        .eyebrow { font-size: 13px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: var(--cyan); margin-bottom: 8px; display: block; }
        .section-head { margin-bottom: 40px; }
        .section-head.center { text-align: center; }
        .section-head h2 { font-size: 28px; font-weight: 800; color: var(--ink); letter-spacing: -0.02em; margin-bottom: 8px; }
        .section-head p { font-size: 15px; color: var(--soft); line-height: 1.65; max-width: 540px; }
        .section-head.center p { margin: 0 auto; }

        /* PACKAGES — horizontal-scrolling row. Cards are ~25% wider than
           the old fixed-3-column layout (330px -> 415px) and no longer
           reflow into 2-up/1-up at narrower widths; they just keep
           scrolling sideways at any viewport size. */
        .pkg-grid {
          display: flex;
          /* 3 cards at 415px + 2 gaps must fit inside .wrap's content width
             (1380 max-width - 40 padding = 1340px) so the row aligns with
             the "Custom packages..." banner above instead of needing to
             scroll on desktop: 3*415 + 2*36 = 1317, with room to spare. */
          gap: 36px;
          overflow-x: auto;
          scroll-snap-type: x proximity;
          /* Extra padding/negative-margin room so the hover glow — which
             bleeds outside the card's outline ring — isn't clipped by this
             scroll container's overflow, while keeping the original
             surrounding spacing. Desktop only (see below) — on touch
             devices there's no hover, and this much horizontal bleed room
             was shifting the scroll-snap start position, clipping the
             first tile off-screen. */
          padding: 48px 46px 58px;
          margin: -48px -46px -58px;
          -webkit-overflow-scrolling: touch;
          /* Modern thin scrollbar (Firefox). */
          scrollbar-width: thin;
          scrollbar-color: var(--border2) transparent;
        }
        /* Modern thin, rounded scrollbar (WebKit/Blink). */
        .pkg-grid::-webkit-scrollbar { height: 6px; }
        .pkg-grid::-webkit-scrollbar-track { background: transparent; }
        .pkg-grid::-webkit-scrollbar-thumb {
          background: var(--border2); border-radius: 999px;
        }
        .pkg-grid::-webkit-scrollbar-thumb:hover { background: var(--indigo-d); }
        @media (max-width: 900px) {
          /* No horizontal padding — scroll-snap-align:start on the first
             card was auto-scrolling to cancel out any horizontal padding
             here entirely (the browser treats the padded content edge as
             the natural snap rest position), so it never actually moved
             anything on screen. The real fix is on .pkg-card below. */
          .pkg-grid { padding: 12px 0 22px; margin: -12px 0 -22px; }
        }
        @media (max-width: 540px) { .pkg-grid { gap: 44px; } }

        .pkg-card {
          background: var(--card);
          border: 1px solid var(--border2);
          border-radius: 18px;
          padding: 22px 20px;
          display: flex; flex-direction: column;
          position: relative;
          /* Establish our own stacking context so ::after's z-index:-1 is
             guaranteed to resolve behind THIS element's own background —
             without it, on some viewports the glow was rendering as a
             wash across the whole card instead of staying behind it. */
          z-index: 0;
          transition: box-shadow .2s, transform .2s, outline-color .2s;
          border-top: 3px solid var(--border2);
          /* Fluid width — matches the pill/heading above it instead of
             forcing horizontal scroll on narrower viewports, while still
             capping at 415px on desktop. flex-shrink stays 0 (not 0 1)
             deliberately: with shrink enabled, all 3 cards in the row would
             shrink together to co-exist in one screen width, breaking the
             "one card ~full width, swipe for the next" mobile layout — the
             sizing has to come entirely from the basis instead. Subtracts
             38px (.wrap's 40px side padding, minus the outline ring's 10px-
             per-side bleed that's now real layout space via nth-of-type(1)'s
             margin-left below) + 24px safety buffer (mobile Safari's 100vw
             can render wider than the actual visible viewport) — a bit
             narrower a subtraction than before so the card sits closer to
             centered instead of leaving a big empty gap on the right. */
          flex: 0 0 clamp(260px, calc(100vw - 62px), 415px);
          scroll-snap-align: start;
          /* HUD corner brackets (see .pkg-bracket) replace the old full
             ring — a slow pulsing glow instead of a static outline, so
             the card reads as "active" at rest, not just on hover. Each
             card's animation-delay is offset (below, per nth-of-type) so
             the three tiles don't pulse in lockstep. */
          animation: pkg-pulse 2.6s ease-in-out infinite;
        }
        @keyframes pkg-pulse {
          0%, 100% {
            box-shadow:
              0 0 9px 1px color-mix(in srgb, var(--pkg-outline, var(--border2)) 35%, transparent),
              0 0 20px 5px color-mix(in srgb, var(--pkg-outline, var(--border2)) 14%, transparent);
          }
          50% {
            box-shadow:
              0 0 15px 2px color-mix(in srgb, var(--pkg-outline, var(--border2)) 60%, transparent),
              0 0 30px 9px color-mix(in srgb, var(--pkg-outline, var(--border2)) 28%, transparent);
          }
        }
        /* Corner brackets — solid at rest, grow slightly on hover. Four
           span children, one per corner, added in JSX next to each
           .pkg-card. */
        .pkg-bracket {
          position: absolute; width: 22px; height: 22px;
          border-width: 3px; border-style: solid;
          border-color: var(--pkg-outline, var(--border2));
          transition: width .18s ease, height .18s ease;
          pointer-events: none;
        }
        .pkg-bracket.tl { top: -10px; left: -10px; border-right: none; border-bottom: none; border-radius: 8px 0 0 0; }
        .pkg-bracket.tr { top: -10px; right: -10px; border-left: none; border-bottom: none; border-radius: 0 8px 0 0; }
        .pkg-bracket.bl { bottom: -10px; left: -10px; border-right: none; border-top: none; border-radius: 0 0 0 8px; }
        .pkg-bracket.br { bottom: -10px; right: -10px; border-left: none; border-top: none; border-radius: 0 0 8px 0; }
        .pkg-card:hover .pkg-bracket {
          width: 28px; height: 28px;
        }
        .pkg-card:hover {
          /* Lift shadow on top of whatever phase the pulse animation is
             currently in — box-shadow here would fight the keyframes'
             own box-shadow, so the lift uses a filter/transform instead
             of trying to merge into the same property. */
          transform: translateY(-3px);
          filter: drop-shadow(0 14px 28px rgba(15,23,42,.14));
        }
        .pkg-grid .pkg-card:nth-of-type(1) { --pkg-outline: #4a9db5; --pkg-glow: rgba(74,157,181,0.22); }
        @media (max-width: 900px) {
          /* Shift just the first card right by the corner brackets' bleed
             (10px, same amount the old outline ring used) via margin (not .pkg-grid
             padding — scroll-snap-align auto-scrolls to cancel that out
             entirely) so the ring's outer edge lands flush with .wrap's
             padding, matching the pill and heading above instead of
             overhanging further left. */
          .pkg-grid .pkg-card:nth-of-type(1) {
            margin-left: 10px;
            /* scroll-snap-align:start on the first card makes the browser
               auto-scroll to snap it flush at rest, silently cancelling
               out ANY leading space before it (margin or padding, tried
               both) the instant the page loads — there's no visible way to
               inset just the first card while it's a snap target. Turning
               its own snapping off (the other cards still snap normally
               when swiped to) is what actually lets the margin show. */
            scroll-snap-align: none;
          }
        }
        .pkg-grid .pkg-card:nth-of-type(2) { --pkg-outline: #00a86b; --pkg-glow: rgba(0,168,107,0.22); animation-delay: -0.6s; }
        .pkg-grid .pkg-card:nth-of-type(3) { --pkg-outline: #ff9a4d; --pkg-glow: rgba(255,122,26,0.22); animation-delay: -1.3s; }
        @media (max-width: 900px) {
          /* Mirror the first card's leading margin fix: with no trailing
             padding on .pkg-grid at this width, the last card's corner
             brackets had no scroll room to reach and were clipped
             flush against the scroll container's right edge. */
          .pkg-grid .pkg-card:last-child { margin-right: 10px; }
        }
        .pkg-card.pop {
          border-top: 3px solid var(--border2);
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
        .pkg-inherit {
          font-size: 13px; font-weight: 700; font-style: italic; color: var(--orange);
          display: inline-block; padding: 4px 10px; margin: 8px 0 6px; border-radius: 6px;
          background: rgba(255,122,26,0.12);
        }
        .chk { flex-shrink: 0; width: 16px; height: 16px; border-radius: 50%; background: rgba(0,200,150,.15); color: var(--mint); display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 800; margin-top: 2px; }

        .pkg-switch { font-size: 13px; color: var(--soft); text-align: center; margin-top: 10px; }
        .chk.crm-chk { background: rgba(0,168,122,.18); color: var(--mint); }

        /* CRM SECTION */
        .crm-section { background: linear-gradient(160deg, #0e1f45 0%, #1a3070 100%); }
        .crm-section .eyebrow { color: #7dd3f7; }
        .crm-section .section-head h2 { color: #fff; }
        .crm-card {
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 20px;
          padding: 36px 32px;
          display: grid; grid-template-columns: 1fr auto; gap: 32px; align-items: start;
        }
        @media (max-width: 680px) { .crm-card { grid-template-columns: 1fr; padding: 24px 20px; } }
        .crm-lead { font-size: 15px; color: rgba(255,255,255,0.72); line-height: 1.65; margin-bottom: 16px; max-width: 520px; }
        .crm-price-line { font-size: 22px; font-weight: 900; color: #fff; margin-bottom: 20px; }
        .crm-price-line span { font-size: 16px; font-weight: 700; color: #7dd3f7; }
        .crm-features { list-style: none; display: flex; flex-direction: column; gap: 0; }
        .crm-features li { display: flex; gap: 8px; font-size: 15px; color: rgba(255,255,255,0.65); padding: 6px 0; position: relative; align-items: flex-start; }
        .crm-features li::before {
          content: ''; position: absolute; top: 0; left: 0; width: 65%; height: 1px;
          background: rgba(255,255,255,0.1);
        }
        .crm-features li:first-child::before { display: none; }
        .crm-features .chk { background: rgba(0,229,170,0.2); color: #00e5aa; }
        .crm-cta-col { display: flex; flex-direction: column; align-items: center; gap: 8px; padding-top: 4px; }
        .crm-cta-col .btn { white-space: nowrap; }
        .crm-cta-col p { color: rgba(255,255,255,0.5) !important; }

        /* HOLOGRAPHIC GLOBE SECTION - ULTRA 3D Futuristic (Horizontal Only, Always Round) */
        @keyframes blobMorph3DUltra {
          0%, 100% {
            border-radius: 50%;
            transform: perspective(600px) rotateY(0deg) scale(1) translateZ(0px);
          }
          20% {
            border-radius: 50%;
            transform: perspective(600px) rotateY(72deg) scale(1.15) translateZ(40px);
          }
          40% {
            border-radius: 50%;
            transform: perspective(600px) rotateY(144deg) scale(1) translateZ(80px);
          }
          60% {
            border-radius: 50%;
            transform: perspective(600px) rotateY(216deg) scale(1.1) translateZ(40px);
          }
          80% {
            border-radius: 50%;
            transform: perspective(600px) rotateY(288deg) scale(1.05) translateZ(60px);
          }
        }
        @keyframes rotateGlobeUltra3D {
          0% { transform: perspective(600px) rotateY(0deg) rotateX(30deg) rotateZ(0deg); }
          100% { transform: perspective(600px) rotateY(360deg) rotateX(30deg) rotateZ(10deg); }
        }
        @keyframes nodePulseUltra {
          0%, 100% { opacity: 0.5; transform: scale(1) translateZ(0px); filter: drop-shadow(0 0 10px rgba(0,255,255,0.6)); }
          50% { opacity: 1; transform: scale(1.6) translateZ(30px); filter: drop-shadow(0 0 30px rgba(0,255,255,1)) drop-shadow(0 0 50px rgba(100,200,255,0.8)); }
        }
        @keyframes globeFloat3DUltra {
          0%, 100% { transform: perspective(600px) rotateY(0deg) rotateX(30deg) rotateZ(0deg) translateZ(0px) translateY(0px); }
          25% { transform: perspective(600px) rotateY(90deg) rotateX(35deg) rotateZ(20deg) translateZ(60px) translateY(-20px); }
          50% { transform: perspective(600px) rotateY(180deg) rotateX(30deg) rotateZ(-10deg) translateZ(120px) translateY(0px); }
          75% { transform: perspective(600px) rotateY(270deg) rotateX(35deg) rotateZ(20deg) translateZ(60px) translateY(-20px); }
        }
        @keyframes globeGlitch {
          0%, 100% { clip-path: inset(0 0 0 0); }
          20% { clip-path: inset(0 0 95% 0); }
          40% { clip-path: inset(0 0 70% 0); }
          60% { clip-path: inset(0 0 90% 0); }
          80% { clip-path: inset(0 0 75% 0); }
        }
        @keyframes neonGlow {
          0%, 100% { text-shadow: 0 0 10px rgba(0,255,255,0.5), 0 0 20px rgba(0,255,255,0.3); }
          50% { text-shadow: 0 0 20px rgba(0,255,255,1), 0 0 40px rgba(100,200,255,0.6), 0 0 60px rgba(0,255,200,0.4); }
        }
        .holographic-section {
          background: linear-gradient(135deg, #0e1f45 0%, #1a3070 50%, #0f1429 100%);
          position: relative;
          overflow: hidden;
        }
        .holographic-section::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background:
            radial-gradient(circle at 80% 30%, rgba(74,157,181,0.08) 0%, transparent 50%),
            radial-gradient(circle at 20% 70%, rgba(100,50,200,0.05) 0%, transparent 50%);
          pointer-events: none;
        }
        .globe-showcase {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 60px;
          align-items: center;
          position: relative;
          z-index: 1;
        }
        .globe-visual {
          position: relative;
          height: 360px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .globe-base-hero {
          width: 280px;
          height: 280px;
          position: relative;
          perspective: 600px;
          animation: globeFloat3DUltra 32s cubic-bezier(0.4, 0.0, 0.2, 1) infinite;
          transform-style: preserve-3d;
        }
        .holographic-blob-hero {
          width: 100%;
          height: 100%;
          background: radial-gradient(circle at 30% 30%, rgba(0,255,255,0.4), rgba(100,50,200,0.15), rgba(0,200,200,0.05));
          border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%;
          animation: blobMorph3DUltra 10s cubic-bezier(0.4, 0.0, 0.2, 1) infinite;
          border: 3px solid rgba(0,255,255,0.7);
          box-shadow:
            inset 0 0 80px rgba(0,255,255,0.3),
            inset -30px -30px 80px rgba(100,50,200,0.2),
            0 0 80px rgba(0,255,255,0.6),
            0 0 150px rgba(0,255,255,0.4),
            0 0 200px rgba(100,200,255,0.3),
            0 30px 80px rgba(0,255,255,0.3);
          transform-style: preserve-3d;
          filter: drop-shadow(0 40px 80px rgba(0,255,255,0.4)) drop-shadow(0 0 60px rgba(0,255,200,0.2));
          position: relative;
        }
        .holographic-blob-hero::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(45deg, transparent 30%, rgba(0,255,255,0.1) 50%, transparent 70%);
          border-radius: inherit;
          animation: globeGlitch 8s ease-in-out infinite;
          pointer-events: none;
        }
        .globe-icon-hero {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 60px;
          opacity: 0.6;
        }
        .neon-nodes-hero {
          position: absolute;
          width: 100%;
          height: 100%;
          top: 0;
          left: 0;
        }
        .node-hero {
          position: absolute;
          width: 10px;
          height: 10px;
          background: #00ffff;
          border-radius: 50%;
          box-shadow:
            0 0 20px rgba(0,255,255,1),
            0 0 40px rgba(0,255,255,0.8),
            0 0 60px rgba(100,200,255,0.6),
            inset 0 0 10px rgba(255,255,255,0.6);
          transform-style: preserve-3d;
          border: 2px solid rgba(0,255,255,0.8);
        }
        .node-hero:nth-child(1) { top: 15%; left: 50%; animation: nodePulseUltra 2s ease-in-out infinite; }
        .node-hero:nth-child(2) { top: 35%; right: 15%; animation: nodePulseUltra 2.3s ease-in-out infinite 0.2s; }
        .node-hero:nth-child(3) { top: 65%; right: 10%; animation: nodePulseUltra 2.6s ease-in-out infinite 0.4s; }
        .node-hero:nth-child(4) { bottom: 20%; left: 50%; animation: nodePulseUltra 2.9s ease-in-out infinite 0.6s; }
        .node-hero:nth-child(5) { top: 65%; left: 10%; animation: nodePulseUltra 2.5s ease-in-out infinite 0.8s; }
        .node-hero:nth-child(6) { top: 35%; left: 15%; animation: nodePulseUltra 2.7s ease-in-out infinite 1s; }
        .globe-content-hero {
          color: white;
        }
        .globe-content-hero h2 {
          font-size: 32px;
          font-weight: 900;
          color: #7dd3f7;
          margin-bottom: 16px;
          line-height: 1.2;
          text-shadow: 0 0 20px rgba(74,157,181,0.3);
        }
        .globe-content-hero p {
          font-size: 15px;
          color: rgba(255,255,255,0.75);
          line-height: 1.7;
          margin-bottom: 24px;
        }
        /* Standalone Globe with Stars */
        @keyframes twinkleStar {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        @keyframes revolveGlobe {
          0% { transform: rotateZ(0deg); }
          100% { transform: rotateZ(360deg); }
        }
        @keyframes floatGlobe {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        .standalone-globe-container {
          position: relative;
          height: 500px;
          display: flex;
          align-items: center;
          justify-content: center;
          perspective: 1000px;
          animation: revolveGlobe 40s linear infinite;
        }
        .stars-background {
          position: absolute;
          width: 100%;
          height: 100%;
          top: 0;
          left: 0;
          pointer-events: none;
        }
        .star {
          position: absolute;
          width: 2px;
          height: 2px;
          background: white;
          border-radius: 50%;
          box-shadow: 0 0 5px rgba(255,255,255,0.8);
          animation: twinkleStar 3s ease-in-out infinite;
        }
        .floating-globe {
          position: relative;
          z-index: 2;
          width: 200px;
          height: 200px;
          animation: floatGlobe 4s ease-in-out infinite;
        }
        .globe-core {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 120px;
          filter: drop-shadow(0 0 40px rgba(0,255,255,0.6)) drop-shadow(0 20px 50px rgba(0,255,255,0.3));
          transform-style: preserve-3d;
        }

        @media (max-width: 960px) {
          .globe-showcase { grid-template-columns: 1fr; gap: 40px; }
          .globe-visual { height: 300px; }
          .globe-base-hero { width: 200px; height: 200px; }
          .globe-content-hero h2 { font-size: 26px; }
          .standalone-globe-container { height: 400px; }
          .floating-globe { width: 150px; height: 150px; }
          .globe-core { font-size: 80px; }
        }

        /* BENEFIT STRIP ANIMATIONS */
        @keyframes benefitFadeInLeft {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        /* BRIDGE STRIP — replaces the old marketing benefit strip */
        .bridge-strip {
          background: #fff;
          border-bottom: 1px solid rgba(31,60,136,.08);
          padding: 48px 0 40px;
        }
        .bridge-strip .section-head { margin-bottom: 0; }

        /* WORK STEP CARDS */
        .work-step-card {
          background: #fff;
          border: 1px solid rgba(26,48,112,0.08);
          border-radius: 12px;
          padding: 16px 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          box-shadow: 0 1px 3px rgba(0,0,0,0.03);
          opacity: 0;
          transform: translateX(-20px);
          transition: all 0.3s ease;
        }
        .work-step-card.animate-in {
          animation: benefitFadeInLeft 0.6s ease-out forwards;
        }
        .work-step-card:nth-child(1).animate-in { animation-delay: 0.1s; }
        .work-step-card:nth-child(2).animate-in { animation-delay: 0.2s; }
        .work-step-card:nth-child(3).animate-in { animation-delay: 0.3s; }
        .work-step-card:nth-child(4).animate-in { animation-delay: 0.4s; }
        .work-step-card:hover {
          transform: translateY(-4px);
        }
        .step-icon {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, #00a87a, #00d4a8);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 10px;
          flex-shrink: 0;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .work-step-card:hover .step-icon {
          box-shadow: 0 0 20px rgba(0, 168, 122, 0.4), 0 8px 24px rgba(0, 0, 0, 0.15);
          transform: scale(1.1);
        }
        .step-icon span {
          color: #fff;
          font-weight: 800;
          font-size: 16px;
        }
        .work-step-card h3 {
          font-size: 14px;
          font-weight: 700;
          color: #171a2b;
          margin-bottom: 6px;
        }
        .work-step-card p {
          font-size: 12px;
          color: #5b6072;
          line-height: 1.5;
          margin: 0;
        }

        /* LOGO CAROUSEL — Phase 17 */
        .logo-carousel-section { padding: 0.5rem 0 1.5rem; background: #fff; }
        .logo-carousel-trust-line {
          display: flex; align-items: center; justify-content: center; gap: 10px;
          flex-wrap: wrap; margin-bottom: 2rem;
        }
        .logo-carousel-eyebrow {
          text-transform: uppercase; font-size: 14px; letter-spacing: 0.5px;
          color: var(--soft); font-weight: 600;
        }
        .logo-carousel-dot {
          width: 4px; height: 4px; border-radius: 50%;
          background: var(--cyan); flex-shrink: 0;
        }
        .logo-carousel-headline {
          font-size: 14px; font-weight: 500; color: var(--ink);
        }
        .logo-carousel-viewport {
          position: relative;
          max-width: 900px;
          margin: 0 auto;
          overflow: hidden;
          -webkit-mask-image: linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%);
          mask-image: linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%);
        }
        .logo-carousel-track {
          display: flex;
          align-items: center;
          gap: 32px;
          width: max-content;
          animation: logoScroll 30s linear infinite;
          will-change: transform;
        }
        @keyframes logoScroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .logo-card {
          flex: 0 0 auto;
          width: 140px; height: 60px;
          background: var(--card);
          border: 0.5px solid var(--border);
          border-radius: 8px;
          padding: 12px;
          display: flex; align-items: center; justify-content: center;
        }
        .logo-card img { max-width: 100%; max-height: 100%; object-fit: contain; display: block; }
        @media (max-width: 768px) {
          .logo-carousel-viewport {
            -webkit-mask-image: linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%);
            mask-image: linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%);
          }
          .logo-carousel-track { gap: 20px; animation-duration: 22s; }
          .logo-card { width: 104px; height: 48px; padding: 8px; }
        }

        /* TESTIMONIALS */
        .tcard {
          background: #f8f9fc; border: 1px solid rgba(31,60,136,.08);
          border-radius: 16px; padding: 28px;
        }

        /* TESTIMONIALS GRID — Huly-style dense bordered grid, thin navy lines */
        .testimonial-frame {
          border: 1px solid var(--navy-line);
          border-radius: 0;
          background: var(--offwhite);
        }
        .testimonial-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
        }
        .testimonial-cell {
          border-right: 1px solid var(--navy-line);
          border-top: 1px solid var(--navy-line);
          padding: 32px;
          background: var(--offwhite-2);
        }
        .testimonial-grid .testimonial-cell:nth-child(3n) { border-right: none; }
        .testimonial-grid .testimonial-cell:nth-child(-n+3) { border-top: none; }
        @media (max-width: 900px) {
          .testimonial-grid { grid-template-columns: 1fr; }
          .testimonial-grid .testimonial-cell { border-right: none; border-top: 1px solid var(--navy-line); }
          .testimonial-grid .testimonial-cell:first-child { border-top: none; }
        }


        /* FOOTER */
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

        /* INTEGRATIONS FOOTER — Phase 19 */
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
          <a href="/" onClick={scrollToTop} className="nav-logo" aria-label="Back to top">
            <img src="/qcypher-logo-horizontal.png" alt="QCypher Technologies" />
          </a>
          <div className="nav-cta">
            <Link href="/about" className="nav-page-link" style={{ fontSize: '15px', fontWeight: 600, color: '#5b6072', marginRight: '4px' }}>About</Link>
            <Link href="/blog" className="nav-page-link" style={{ fontSize: '15px', fontWeight: 600, color: '#5b6072', marginRight: '4px' }}>Blog</Link>
            <Link href="/auth/login" className="btn btn-ghost btn-sm">Sign in</Link>
          </div>
        </div>
      </header>

      {/* HERO — pinned scroll-through, Alpha ("We handle the tech") -> Beta
          ("Security On Autopilot"). Restored after a prior revision fully
          removed the two-phase pin — that revision was wrong: only beta's
          content (the old "Let's get digital" marketing copy) was meant
          to change, not the alpha/beta structure itself. Alpha is back to
          its original copy verbatim; beta now carries the security/
          compliance messaging instead of the marketing content it used
          to. The GSAP pin/crossfade + the pointer-events and hover-color
          fixes from the version this restores from are both back too. */}
      <section ref={heroPinRef} className="hero hero-pin">
        <div ref={heroAlphaRef} className="hero-phase hero-phase-alpha">
          <div className="wrap hero-alpha-wrap" style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '32px', alignItems: 'center' }}>
            <div>
              <h1>We handle the <span className="accent-orange">tech.</span><br/>You run the <span className="accent">business.</span></h1>
              <p className="hero-lead">We build your website, handle setup with you personally, and manage everything ongoing. Real person from day one — monthly reports explained</p>
              <div className="hero-actions">
                <Link href="#packages-section" className="btn btn-hero-primary">See packages</Link>
                <button onClick={() => setShowContactModal(true)} className="btn btn-ghost">Get a free quote</button>
              </div>
              <p className="hero-micro">Talk to Felix or Thomas directly. No sales team.</p>
              <div className="trust-row trust-row-desktop">
                <span><span className="dot" />No long-term contracts</span>
                <span><span className="dot" />Switch tiers anytime</span>
                <span><span className="dot" />Real humans, real support</span>
              </div>
            </div>
            <div className="hero-visual">
              <div className="hero-ring-stage">
                <div className="hero-ring"><img src="/ai-circle-gate-transparent.png" alt="" /></div>
                <div className="hero-badge hb-1"><svg viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6"/><path d="M3 9h18" stroke="currentColor" strokeWidth="1.6"/></svg></div>
                <div className="hero-badge hb-2"><svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.6"/><path d="M5 20c1.5-4 5-5.5 7-5.5s5.5 1.5 7 5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg></div>
                <div className="hero-badge hb-3"><svg viewBox="0 0 24 24" fill="none"><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg></div>
                <div className="hero-badge hb-4"><svg viewBox="0 0 24 24" fill="none"><path d="M7 18a4 4 0 0 1-.5-7.97A5 5 0 0 1 16.9 9.1 4.5 4.5 0 0 1 16.5 18H7Z" stroke="currentColor" strokeWidth="1.6"/></svg></div>
                <div className="hero-badge hb-5"><svg viewBox="0 0 24 24" fill="none"><rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.6"/><path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.6"/></svg></div>
                <div className="hero-badge hb-6"><svg viewBox="0 0 24 24" fill="none"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg></div>
              </div>
              <div className="trust-row trust-row-mobile">
                <span><span className="dot" />No long-term contracts</span>
                <span><span className="dot" />Switch tiers anytime</span>
                <span><span className="dot" />Real humans, real support</span>
              </div>
            </div>
          </div>
        </div>
        <div ref={heroBetaRef} className="hero-phase hero-phase-beta" style={{ opacity: 0 }}>
          <div className="wrap" style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '32px', alignItems: 'center' }}>
            <div>
              <span className="hero-eyebrow">Security &amp; compliance, built in</span>
              <h2>Security On Autopilot.<br/>Stay <span className="accent">Compliant.</span></h2>
              <p>Your data. Your customers&apos; data. Protected by default. Built-in security, compliance checks, and a real person to guide you through it all.</p>
              <div className="hero-actions">
                <Link href="#packages-section" className="btn btn-hero-primary">See packages</Link>
                <button onClick={() => setShowContactModal(true)} className="btn btn-ghost">Get a free quote</button>
              </div>
            </div>
            <div className="hero-visual">
              <div ref={mobileTiltRef} className="hero-iso-stage">
                <div className="hero-iso-ring" />
                <div className="hero-iso">
                  <div className="hero-iso-block hero-iso-b1" />
                  <div className="hero-iso-block hero-iso-b2" />
                  <div className="hero-iso-block hero-iso-b3" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BRIDGE — replaces the removed "Let's get digital" marketing
          content + benefit strip (More Online Visibility / More Bookings /
          More Reviews / Monthly Reports). */}
      <div className="bridge-strip">
        <div className="wrap">
          <div className="section-head center">
            <h2>Everything You Need, Nothing You Don&apos;t</h2>
            <p>Simple packages that grow with your business. Pick what you need now — upgrade anytime.</p>
          </div>
        </div>
      </div>

      {/* HOW WE WORK */}
      <section style={{ background: '#f4f6fc', borderTop: '1px solid rgba(31,60,136,.08)', padding: '56px 0' }}>
        <div className="wrap">
          <div className="section-head center">
            <h2>How We Work</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', maxWidth: '900px', margin: '32px auto 0' }}>
            <div className="work-step-card">
              <div className="step-icon">
                <span>1</span>
              </div>
              <h3>Day 1</h3>
              <p>Setup call. Site built, Google claimed, email live.</p>
            </div>
            <div className="work-step-card">
              <div className="step-icon">
                <span>2</span>
              </div>
              <h3>Week 1</h3>
              <p>Site goes live. Training included.</p>
            </div>
            <div className="work-step-card">
              <div className="step-icon">
                <span>3</span>
              </div>
              <h3>Month 1</h3>
              <p>Check-in call. Review your numbers.</p>
            </div>
            <div className="work-step-card">
              <div className="step-icon">
                <span>4</span>
              </div>
              <h3>Ongoing</h3>
              <p>Monthly reports explained by a real person.</p>
            </div>
          </div>
        </div>
      </section>

      {/* PACKAGES */}
      <section id="packages" style={{ background: '#fff', borderTop: '1px solid rgba(31,60,136,.08)' }}>
        <div className="wrap">
          <div className="section-head center">
            <span className="eyebrow">Packages</span>
            <h2>Everything included. Pick your pace.</h2>
            <p style={{ marginTop: '16px', fontSize: '15px', color: 'var(--ink)', fontWeight: 600 }}>Everything starts with hands-on setup + a 90-day check-in. CRM included free with every monthly plan.</p>
          </div>

          <div style={{ background: 'linear-gradient(135deg, var(--indigo-d) 0%, var(--cyan) 100%)', borderRadius: '16px', padding: '24px 30px', textAlign: 'center', marginBottom: '32px', position: 'relative', overflow: 'hidden', border: '1px solid rgba(74,157,181,0.3)', boxShadow: '0 8px 32px rgba(42,82,160,0.12)' }}>
            <div style={{ position: 'absolute', top: '-40%', right: '-15%', width: '280px', height: '280px', background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: '-20%', left: '-5%', width: '220px', height: '220px', background: 'radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
            <p style={{ fontSize: '24px', fontWeight: 900, lineHeight: 1.4, margin: 0, position: 'relative', zIndex: 1, letterSpacing: '-0.5px', color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>Custom packages built for your business. Let's find what works for your budget.</p>
          </div>

          <div id="packages-section" style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, rgba(74,157,181,0.1) 0%, rgba(0,168,122,0.08) 100%)', border: '1px solid rgba(74,157,181,0.2)', borderRadius: '24px', padding: '8px 20px', fontSize: '16px', color: '#2a52a0', fontWeight: 600 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 1C4.14 1 1 4.14 1 8s3.14 7 7 7 7-3.14 7-7-3.14-7-7-7zm3.5 5L7 10.5 4.5 8" stroke="#4a9db5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Switch tiers anytime — no penalty.
            </div>
          </div>

          <div className="pkg-grid">

            {/* Starter */}
            <div className="pkg-card">
              <span className="pkg-bracket tl" /><span className="pkg-bracket tr" />
              <span className="pkg-bracket bl" /><span className="pkg-bracket br" />
              <span className="pkg-badge-spacer" />
              <div className="pkg-for">Getting started with protection</div>
              <div className="pkg-name">Starter</div>
              <p className="pkg-tagline">Built for basics. Growing businesses start here.</p>
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
              <button onClick={() => setShowContactModal(true)} className="btn btn-ghost btn-full" style={{ marginTop: '16px' }}>Get a Free Consultation</button>
            </div>

            {/* Growth */}
            <div className="pkg-card pop">
              <span className="pkg-bracket tl" /><span className="pkg-bracket tr" />
              <span className="pkg-bracket bl" /><span className="pkg-bracket br" />
              <div className="pkg-badge">Most popular</div>
              <div className="pkg-for">Ready for more customers</div>
              <div className="pkg-name">Growth</div>
              <p className="pkg-tagline">More bookings, smarter growth, your customer data protected.</p>
              <details className="pkg-details" open>
                <summary>See what&apos;s included</summary>
                <div>
                  <div className="pkg-inherit">Everything in Starter, plus:</div>
                  <ul className="pkg-list">
                    <li><span className="chk">✓</span><span><strong>Fast Customer Online Scheduler</strong> <em>(customers book appointments and fill out any needed forms, automatically)</em></span></li>
                    <li><span className="chk">✓</span><span><strong>Generate More Online Reviews</strong> <em>(ongoing optimization plus automatic requests for happy-customer reviews)</em></span></li>
                    <li><span className="chk">✓</span><span><strong>AI Blog Posts</strong> <em>(monthly posts about your services — helps customers find you through AI search and Google)</em></span></li>
                    <li><span className="chk">✓</span><span><strong>24/7 AI Assistant</strong> <em>(chatbot on your website that answers questions and helps book a call, anytime)</em></span></li>
                    <li><span className="chk crm-chk">✓</span><span><strong>Customer Management Tool</strong> <em>(included free with this plan)</em></span></li>
                  </ul>
                </div>
              </details>
              <button onClick={() => setShowContactModal(true)} className="btn btn-primary btn-full" style={{ marginTop: '16px' }}>Get a Free Consultation</button>
            </div>

            {/* All-In */}
            <div className="pkg-card">
              <span className="pkg-bracket tl" /><span className="pkg-bracket tr" />
              <span className="pkg-bracket bl" /><span className="pkg-bracket br" />
              <span className="pkg-badge-spacer" />
              <div className="pkg-for">Fully hands-off growth</div>
              <div className="pkg-name">All-In</div>
              <p className="pkg-tagline">Everything managed. Data protected. Growth on autopilot.</p>
              <details className="pkg-details" open>
                <summary>See what&apos;s included</summary>
                <div>
                  <div className="pkg-inherit">Everything in Growth, plus:</div>
                  <ul className="pkg-list">
                    <li><span className="chk">✓</span><span><strong>Sell Online</strong> <em>(a simple online store with secure payments built in)</em></span></li>
                    <li><span className="chk">✓</span><span><strong>Customer Engagement</strong> <em>(email and text templates you control — job updates, promotions, customer follow-ups)</em></span></li>
                    <li><span className="chk">✓</span><span><strong>Smart Upsell Suggestions</strong> <em>(system recommends add-on services at checkout — increase customer spending without extra effort)</em></span></li>
                    <li><span className="chk crm-chk">✓</span><span><strong>Customer Management Tool</strong> <em>(included free with this plan)</em></span></li>
                  </ul>
                </div>
              </details>
              <button onClick={() => setShowContactModal(true)} className="btn btn-ghost btn-full" style={{ marginTop: '16px' }}>Get a Free Consultation</button>
            </div>

          </div>
        </div>
      </section>

      {/* GUARANTEE */}
      <section style={{ background: '#fff', borderTop: '1px solid rgba(31,60,136,.08)', padding: '48px 0' }}>
        <div className="wrap">
          <div style={{ background: 'linear-gradient(135deg, rgba(42,82,160,0.06) 0%, rgba(74,157,181,0.06) 100%)', borderRadius: '20px', padding: '40px', textAlign: 'center', border: '1px solid rgba(74,157,181,0.15)', boxShadow: '0 2px 8px rgba(42,82,160,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="#00a87a"/>
              </svg>
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#171a2b', marginBottom: '8px' }}>We stand behind our work</h3>
            <p style={{ fontSize: '15px', color: '#5b6072', lineHeight: 1.6, margin: 0, maxWidth: '560px', marginLeft: 'auto', marginRight: 'auto' }}>All packages come with hands-on setup, dedicated support, and the confidence that we're invested in your success. Not seeing results? Let's talk.</p>
          </div>
        </div>
      </section>

      {/* CRM */}
      <section id="crm" className="crm-section">
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">Built In-House — No One Else Has This</span>
            <h2>Customer Management Tool</h2>
          </div>
          <div className="crm-card">
            <div>
              <p className="crm-lead">Built In-House CRM — included free with every monthly plan. We'll walk you through it, and questions get answered by a real person.</p>
              <div className="crm-mini-laptop crm-mini-laptop-mobile">
                <ClayLaptop />
              </div>
              <ul className="crm-features">
                <li><span className="chk">✓</span>Your full customer contact list — always organized</li>
                <li><span className="chk">✓</span>Notes and call history on every customer</li>
                <li><span className="chk">✓</span>Built-in scheduling calendar</li>
                <li><span className="chk">✓</span>Quick-reply text & email templates</li>
                <li><span className="chk">✓</span>Works on your phone, tablet, or computer</li>
              </ul>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.65)', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>Included free with Starter, Growth, and All-In plans</p>
            </div>
            <div className="crm-cta-col">
              <button onClick={() => setShowContactModal(true)} className="btn btn-primary">Get a Free Consultation</button>
              <p style={{ fontSize: 13, color: 'var(--soft)', textAlign: 'center', maxWidth: 140, lineHeight: 1.4 }}>Included free with monthly plans</p>
              <div className="crm-mini-laptop">
                <ClayLaptop />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MONTHLY CHECK-IN */}
      <section style={{ background: '#fff', padding: '40px 0 8px', borderTop: '1px solid rgba(31,60,136,.08)' }}>
        <div className="wrap">
          <div className="section-head center">
            <h2>Monthly Check-In — We Explain the Numbers</h2>
            <p>Every month, a tailored report showing bookings, reviews, and what's working. We walk you through it—just what matters to your business.</p>
            <button onClick={() => setShowReportModal(true)} className="btn btn-ghost" style={{ marginTop: '20px' }}>Ask for a sample report</button>
          </div>
        </div>
      </section>

      {/* CUSTOMER LOGO CAROUSEL — Phase 17 */}
      <section className="logo-carousel-section">
        <div className="wrap">
          <div className="logo-carousel-trust-line">
            <span className="logo-carousel-eyebrow">Trusted by service businesses</span>
            <span className="logo-carousel-dot" />
            <span className="logo-carousel-headline">Real companies, real results</span>
          </div>
          <div className="logo-carousel-viewport" role="region" aria-label="Customer logos">
            <div className="logo-carousel-track">
              {[...CUSTOMER_LOGOS, ...CUSTOMER_LOGOS].map((logo, i) => (
                <div className="logo-card" key={`${logo.file}-${i}`}>
                  <img
                    src={logo.file}
                    alt={logo.name}
                    loading="lazy"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden' }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS — real QCypher client quotes, restyled into Huly-style bordered grid */}
      <section style={{ background: 'var(--offwhite)', borderTop: `1px solid var(--navy-line)`, padding: '72px 0' }}>
        <div className="wrap">
          <div className="section-head center">
            <span className="eyebrow" style={{ color: 'var(--orange)' }}>What Our Clients Say</span>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', color: 'var(--navy)', letterSpacing: '-0.02em' }}>Real results from real businesses</h2>
            <p>We work with local business owners who want straightforward tech — not a sales pitch.</p>
          </div>

          <div className="testimonial-frame" style={{ marginTop: '40px' }}>
            <div className="testimonial-grid">

              <div className="testimonial-cell">
                <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
                  {[0,1,2,3,4].map(i => (
                    <svg key={i} width="16" height="16" viewBox="0 0 16 16" fill="var(--orange)" xmlns="http://www.w3.org/2000/svg">
                      <path d="M8 1l1.8 3.6 4 .6-2.9 2.8.7 4L8 10l-3.6 2 .7-4L2.2 5.2l4-.6z"/>
                    </svg>
                  ))}
                </div>
                <p style={{ fontSize: '15px', color: 'var(--navy)', lineHeight: 1.7, marginBottom: '20px' }}>
                  &ldquo;Before QCypher, I was keeping track of everything in my head and a bunch of sticky notes.
                  Now I actually know which customers I need to follow up with. Got 8 new bookings in 30 days. It&apos;s honestly one of the best things I&apos;ve done for my business.&rdquo;
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0, background: 'rgba(13,36,84,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: 700, color: 'var(--navy)' }}>MR</div>
                  <div>
                    <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--navy)' }}>Marcus R.</p>
                    <p style={{ fontSize: '14px', color: 'var(--soft)', marginTop: '1px' }}>HVAC & Plumbing, Richmond VA</p>
                  </div>
                </div>
              </div>

              <div className="testimonial-cell">
                <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
                  {[0,1,2,3,4].map(i => (
                    <svg key={i} width="16" height="16" viewBox="0 0 16 16" fill="var(--orange)" xmlns="http://www.w3.org/2000/svg">
                      <path d="M8 1l1.8 3.6 4 .6-2.9 2.8.7 4L8 10l-3.6 2 .7-4L2.2 5.2l4-.6z"/>
                    </svg>
                  ))}
                </div>
                <p style={{ fontSize: '15px', color: 'var(--navy)', lineHeight: 1.7, marginBottom: '20px' }}>
                  &ldquo;They set up my website and Google listing in the same week. My phone started ringing
                  more within the first month. Thomas walked me through everything — no tech background needed.&rdquo;
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0, background: 'rgba(13,36,84,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: 700, color: 'var(--navy)' }}>DW</div>
                  <div>
                    <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--navy)' }}>Denise W.</p>
                    <p style={{ fontSize: '14px', color: 'var(--soft)', marginTop: '1px' }}>Mobile Cleaning Service, Annapolis MD</p>
                  </div>
                </div>
              </div>

              <div className="testimonial-cell">
                <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
                  {[0,1,2,3,4].map(i => (
                    <svg key={i} width="16" height="16" viewBox="0 0 16 16" fill="var(--orange)" xmlns="http://www.w3.org/2000/svg">
                      <path d="M8 1l1.8 3.6 4 .6-2.9 2.8.7 4L8 10l-3.6 2 .7-4L2.2 5.2l4-.6z"/>
                    </svg>
                  ))}
                </div>
                <p style={{ fontSize: '15px', color: 'var(--navy)', lineHeight: 1.7, marginBottom: '20px' }}>
                  &ldquo;I&apos;ve worked with a few different tech companies and most of them just hand you a login and disappear. QCypher actually shows up. Felix walked me through everything, answered my questions the same day, and the tools they built actually work the way they say they do. Couldn&apos;t ask for more.&rdquo;
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0, background: 'rgba(13,36,84,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: 700, color: 'var(--navy)' }}>JT</div>
                  <div>
                    <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--navy)' }}>James T.</p>
                    <p style={{ fontSize: '14px', color: 'var(--soft)', marginTop: '1px' }}>Roofing Contractor, Alexandria VA</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* FROM THE BLOG — Phase 36 v3, latest published QCypher post */}
      {latestPost && (
        <section style={{ background: '#fff', borderTop: '1px solid rgba(31,60,136,.08)', padding: '72px 0' }}>
          <div className="wrap">
            <div className="section-head center">
              <span className="eyebrow" style={{ color: 'var(--orange)' }}>From the Blog</span>
              <h2>Fresh off the press</h2>
            </div>
            <Link
              href={`/blog/${latestPost.slug}`}
              style={{
                display: 'block', maxWidth: '700px', margin: '0 auto', position: 'relative',
                background: '#fff', border: '1px solid rgba(13,36,84,0.08)', borderRadius: '20px',
                padding: '36px 40px', overflow: 'hidden',
                boxShadow: '0 4px 24px rgba(13,36,84,0.06)',
                transition: 'transform .18s ease, box-shadow .18s ease',
              }}
              className="latest-post-card"
            >
              <span style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: '4px',
                background: 'linear-gradient(90deg, var(--orange), var(--electric), var(--cyan))',
              }} />
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 800,
                letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--electric)',
                background: 'rgba(13,109,255,0.08)', border: '1px solid rgba(13,109,255,0.18)',
                borderRadius: '999px', padding: '5px 12px', marginBottom: '18px',
              }}>
                Latest
              </span>
              <p style={{ fontSize: '24px', fontWeight: 800, color: 'var(--navy)', marginBottom: '12px', letterSpacing: '-0.01em', lineHeight: 1.2 }}>{latestPost.title}</p>
              <p style={{ fontSize: '15px', color: 'var(--soft)', lineHeight: 1.7, marginBottom: '22px' }}>{latestPost.excerpt}</p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', color: '#8a90a3', fontWeight: 600 }}>
                  {latestPost.published_at ? new Date(latestPost.published_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''}
                </span>
                <span className="latest-post-cta" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--electric)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  Read article <span aria-hidden="true">→</span>
                </span>
              </div>
            </Link>
            <div style={{ textAlign: 'center', marginTop: '28px' }}>
              <Link href="/blog" className="btn btn-ghost btn-sm">View all posts</Link>
            </div>
          </div>
        </section>
      )}

      {/* FOOTER / CONTACT */}
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
              <a href="#packages">Packages</a>
              <a href="#crm">Customer Management</a>
              <Link href="/about">About Us</Link>
              <Link href="/security">Security</Link>
              <Link href="/privacy">Privacy Policy</Link>
              <Link href="/terms">Terms of Service</Link>
              <Link href="/faq">FAQs</Link>
              <Link href="/auth/login">Client Login</Link>
            </div>
          </div>

          {/* INTEGRATIONS FOOTER — Phase 19 */}
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

      {/* SAMPLE REPORT MODAL */}
      {showReportModal && (
        <div onClick={() => setShowReportModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '20px', maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '40px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <button onClick={() => setShowReportModal(false)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#5b6072' }}>×</button>

            <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--ink)', marginBottom: '32px', letterSpacing: '-0.02em' }}>Your Monthly Report — October 2026</h2>

            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '32px' }}>
              <div style={{ background: '#f8f9fc', padding: '20px', borderRadius: '12px', border: '1px solid rgba(26,48,112,0.1)' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#5b6072', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>New Bookings</div>
                <div style={{ fontSize: '28px', fontWeight: 900, color: '#1a3070' }}>24</div>
                <div style={{ fontSize: '13px', color: '#00a87a', fontWeight: 600, marginTop: '4px' }}>↑ 18% from last month</div>
              </div>
              <div style={{ background: '#f8f9fc', padding: '20px', borderRadius: '12px', border: '1px solid rgba(26,48,112,0.1)' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#5b6072', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>New 5-Star Reviews</div>
                <div style={{ fontSize: '28px', fontWeight: 900, color: '#1a3070' }}>8</div>
                <div style={{ fontSize: '13px', color: '#00a87a', fontWeight: 600, marginTop: '4px' }}>↑ 6 from search</div>
              </div>
              <div style={{ background: '#f8f9fc', padding: '20px', borderRadius: '12px', border: '1px solid rgba(26,48,112,0.1)' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#5b6072', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Online Store Revenue</div>
                <div style={{ fontSize: '28px', fontWeight: 900, color: '#1a3070' }}>$3,240</div>
                <div style={{ fontSize: '13px', color: '#00a87a', fontWeight: 600, marginTop: '4px' }}>↑ 24% from last month</div>
              </div>
              <div style={{ background: '#f8f9fc', padding: '20px', borderRadius: '12px', border: '1px solid rgba(26,48,112,0.1)' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#5b6072', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Email Open Rate</div>
                <div style={{ fontSize: '28px', fontWeight: 900, color: '#1a3070' }}>42%</div>
                <div style={{ fontSize: '13px', color: '#5b6072', fontWeight: 600, marginTop: '4px' }}>Industry avg: 21%</div>
              </div>
            </div>

            {/* Sections */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#1a3070', marginBottom: '12px' }}>What's Working</h3>
              <ul style={{ listStyle: 'none', padding: 0, fontSize: '14px', color: '#5b6072', lineHeight: 1.7 }}>
                <li style={{ marginBottom: '8px' }}>✓ Google reviews increasing steadily — keep up the follow-up requests</li>
                <li style={{ marginBottom: '8px' }}>✓ Online store gaining traction — $3K+ revenue this month</li>
                <li style={{ marginBottom: '8px' }}>✓ Email campaigns performing above industry average</li>
              </ul>
            </div>

            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#1a3070', marginBottom: '12px' }}>Opportunities</h3>
              <ul style={{ listStyle: 'none', padding: 0, fontSize: '14px', color: '#5b6072', lineHeight: 1.7 }}>
                <li style={{ marginBottom: '8px' }}>→ 4 booked customers haven't completed their first appointment — follow up this week</li>
                <li style={{ marginBottom: '8px' }}>→ Chat response time could improve (currently 45 min avg) — consider scheduling shifts</li>
              </ul>
            </div>

            <div style={{ background: '#eef2ff', padding: '20px', borderRadius: '12px', border: '1px solid rgba(26,48,112,0.15)' }}>
              <p style={{ fontSize: '14px', color: '#1a3070', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <Lightbulb size={16} style={{ flexShrink: 0, marginTop: '2px' }} fill="currentColor" strokeWidth={1} />
                Our recommendation: The online store is your highest-ROI channel right now. Consider adding 2-3 new products next month and promoting them via email.
              </p>
            </div>

            <p style={{ fontSize: '13px', color: '#5b6072', marginTop: '24px', textAlign: 'center' }}>This is a sample report. When you sign up, Felix or Thomas will walk you through your actual data every month.</p>

            <button onClick={() => { setShowReportModal(false); setShowContactModal(true); }} className="btn btn-primary" style={{ width: '100%', marginTop: '24px' }}>Get a free consultation</button>
          </div>
        </div>
      )}

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
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={16} fill="currentColor" strokeWidth={1} /> Schedule a Meeting
                </span>
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
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <FileEdit size={16} fill="currentColor" strokeWidth={1} /> Fill Out Form
                </span>
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
            {!formSuccess && <p style={{ fontSize: '14px', color: '#5b6072', marginBottom: '24px' }}>Quick info so we can reach out and discuss your business needs.</p>}

            {formSuccess ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>✓</div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1a3070', marginBottom: '8px' }}>Request Received!</h3>
                <p style={{ fontSize: '14px', color: '#5b6072', marginBottom: '16px' }}>Thank you for reaching out to QCypher.</p>
                <p style={{ fontSize: '14px', color: '#5b6072', marginBottom: '24px' }}>We'll reach out within 24 hours to discuss your needs and find the right solution.</p>
                <button
                  onClick={() => {
                    setShowForm(false)
                    setFormSuccess(false)
                    setFormData({ businessName: '', phone: '', email: '', message: '', selectedPackages: [] })
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
                    const response = await fetch('/api/contact', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        businessName: formData.businessName,
                        phone: formData.phone,
                        email: formData.email,
                        message: formData.message,
                        selectedPackages: formData.selectedPackages,
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
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => {
                      const formatted = formatPhoneNumber(e.target.value)
                      setFormData({ ...formData, phone: formatted })
                    }}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid rgba(26,48,112,0.2)',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                    }}
                    placeholder="(000) 000-0000"
                    maxLength={14}
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

                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#1a3070', marginBottom: '10px' }}>Interested in (Optional)</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {['Starter', 'Growth', 'All-In'].map((pkg) => (
                      <label key={pkg} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={formData.selectedPackages.includes(pkg)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({ ...formData, selectedPackages: [...formData.selectedPackages, pkg] })
                            } else {
                              setFormData({ ...formData, selectedPackages: formData.selectedPackages.filter((p) => p !== pkg) })
                            }
                          }}
                          style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#1a3070' }}
                        />
                        <span style={{ fontSize: '14px', color: '#1a3070' }}>{pkg}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#1a3070', marginBottom: '6px' }}>Message (Optional)</label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid rgba(26,48,112,0.2)',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                      minHeight: '100px',
                      resize: 'vertical',
                    }}
                    placeholder="Tell us more about your business or any specific needs..."
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
