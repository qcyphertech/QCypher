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
// page. Without it the app fails to hydrate at all (confirmed: blank
// hydration errors + "Evaluating a string as JavaScript violates CSP" on
// every route when this was tested strict). A nonce-based CSP would avoid
// this trade-off but requires per-request header generation via
// middleware, not a static next.config.js headers() list — out of scope
// for this pass; flagged rather than silently added, same as style-src.
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
  "img-src 'self' data: https://www.qcyphertech.com",
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
  // allow-popups (not the stricter same-origin) since nothing here has
  // been verified popup-free beyond what this pass audited — safer default.
  //
  // Known accepted ZAP finding: the baseline scanner flags this as
  // "Cross-Origin-Opener-Policy Header Missing or Invalid" every scan,
  // because it specifically wants 'same-origin' and treats
  // 'same-origin-allow-popups' as non-compliant. This is intentional, not
  // a bug — tightening to 'same-origin' risks breaking any window.open()/
  // OAuth-style popup flow that hasn't been audited. Confirmed with the
  // user 2026-08-16 to leave this as-is; the finding is expected to keep
  // showing up in weekly scans.
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
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
