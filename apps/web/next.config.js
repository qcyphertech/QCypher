const SUPABASE_URL = 'https://hwfyhnfbqkrtpamnmbaw.supabase.co'

// Content-Security-Policy — allowlist built from an actual audit of every
// external script/iframe/fetch this app makes client-side (Helcim's
// payment iframe, Cal.com's embed, address autocomplete, the pricing
// page's Formspree submit, Supabase Auth's browser SDK calls). Anything
// server-side (Resend, Stripe, Telnyx, OAuth token exchanges) doesn't need
// an allowance here — the browser never talks to those directly.
//
// style-src needs 'unsafe-inline' — this app uses React's style={{...}}
// prop extensively, which renders as inline style="" attributes; without
// this the entire UI loses its styling. That's a real trade-off (inline
// styles are XSS-relevant if user content ever ends up in one), not an
// oversight — flagged here rather than silently added.
//
// script-src also needs 'unsafe-inline' — Next.js's App Router injects its
// own inline <script> tags (hydration payload / streaming data) on every
// page. A nonce-based CSP (generated per-request in middleware) removes
// this need, but was tried and reverted: it forces every page that reads
// the nonce out of static rendering, turning the whole marketing site
// (/, /pricing, /about, /privacy, /terms, /faq, /security — previously
// free, edge-cached static HTML) into server-rendered-per-request pages.
// unsafe-inline alone isn't exploitable without a separate XSS injection
// bug elsewhere in the app, which this audit didn't find — so the
// static-rendering cost wasn't worth paying for this specific Medium
// finding. Confirmed with the user 2026-08-16.
//
// Cross-Origin-Embedder-Policy is deliberately NOT set. COEP: require-corp
// blocks any cross-origin resource that doesn't send a matching CORP
// header, which would very likely break the embedded Helcim payment
// iframe — a business-critical flow — and Helcim doesn't control what
// headers their iframe origin sends. ZAP flagged this as Low severity;
// the risk of guessing wrong and silently breaking checkout outweighs it.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://secure.helcim.app https://app.cal.com",
  "style-src 'self' 'unsafe-inline'",
  "frame-src 'self' https://secure.helcim.app https://cal.com https://app.cal.com",
  // blob: is required for any client-side image preview/decode step that
  // uses URL.createObjectURL() before upload (job photos' compression
  // pipeline loads the picked file into an <img> via a blob: URL to draw
  // it to canvas) — without it every image, in any format, fails to
  // decode client-side before the app ever gets to upload it. Confirmed
  // 2026-08-18: a plain, valid PNG blob: URL failed img.onerror with
  // this directive as it was. The Supabase Storage host is required for
  // the same reason on the read side — job photos render via signed URLs
  // from SUPABASE_URL, which this list didn't include.
  `img-src 'self' data: blob: https://www.qcyphertech.com ${SUPABASE_URL}`,
  `connect-src 'self' https://nominatim.openstreetmap.org https://formspree.io ${SUPABASE_URL} wss://${new URL(SUPABASE_URL).host}`,
  "font-src 'self'",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self' https://formspree.io",
].join('; ')

const SECURITY_HEADERS = [
  { key: 'Content-Security-Policy', value: CSP },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  // Tightened to 'same-origin' (from 'same-origin-allow-popups'): audited
  // every window.open() call (Cal.com booking link, no window.opener
  // reliance) and confirmed Helcim's payment flow uses an embedded
  // iframe + postMessage, not a popup — COOP only isolates window.open()
  // -created browsing contexts, it doesn't affect iframes at all. Safe to
  // tighten. Confirmed 2026-08-16.
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  // Vercel's CDN adds "Access-Control-Allow-Origin: *" by default on
  // statically-served pages/assets (confirmed via curl — present on cached
  // pages and static CSS, absent on dynamic API routes). Nothing in this
  // app sets it. None of these responses carry auth/session data, so it
  // wasn't exploitable, but there's no reason another origin's JS should
  // be able to read this site's markup either — overriding it here is
  // free hardening, not a fix for a real breach.
  { key: 'Access-Control-Allow-Origin', value: 'https://www.qcyphertech.com' },
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: { ignoreBuildErrors: true },
  async redirects() {
    return [
      { source: '/legal/privacy', destination: '/privacy', permanent: true },
      { source: '/legal/terms', destination: '/terms', permanent: true },
    ]
  },
  async headers() {
    return [
      { source: '/:path*', headers: SECURITY_HEADERS },
    ]
  },
}

module.exports = nextConfig
