/**
 * QCypher CRM Service Worker
 * Strategy:
 *   - App shell (/_next/static/**, /manifest.json): cache-first
 *   - /api/*: network-only (never cache authenticated API calls)
 *   - Contacts page (/contacts): stale-while-revalidate for offline read
 */

const SHELL_CACHE  = 'qcypher-shell-v4'
const PAGES_CACHE  = 'qcypher-pages-v4'

// Only these navigations use stale-while-revalidate (offline reading) —
// every other page is per-tenant, server-rendered, authenticated content
// (dashboard, settings, analytics, etc.) that must never be served stale
// just because a client happened to visit it before. Previously this
// applied to ALL navigations regardless of path, which meant a tenant's
// nav/settings toggles (or any other per-request data) could keep showing
// an old cached page indefinitely, even across hard reloads, until the
// background revalidation happened to win a race that the user couldn't
// see or control.
const OFFLINE_READ_PATHS = ['/', '/contacts']

const SHELL_ASSETS = [
  '/',
  '/contacts',
  '/manifest.json',
]

// ── Install: pre-cache shell ──────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(cache => cache.addAll(SHELL_ASSETS))
  )
  self.skipWaiting()
})

// ── Activate: purge old caches ────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== SHELL_CACHE && k !== PAGES_CACHE)
          .map(k => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})

// ── Fetch routing ─────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // Never cache API or Supabase calls
  if (url.pathname.startsWith('/api/') || url.hostname.includes('supabase')) {
    event.respondWith(fetch(request))
    return
  }

  // Static assets: network-first so new deploys always get fresh chunks;
  // fall back to cache only when offline.
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/_next/image/') ||
    url.pathname === '/manifest.json' ||
    url.pathname.match(/\.(png|ico|svg|woff2?)$/)
  ) {
    event.respondWith(
      caches.open(SHELL_CACHE).then(async cache => {
        try {
          const fresh = await fetch(request)
          cache.put(request, fresh.clone())
          return fresh
        } catch {
          return cache.match(request)
        }
      })
    )
    return
  }

  // Navigation requests (HTML pages)
  if (request.mode === 'navigate') {
    if (OFFLINE_READ_PATHS.includes(url.pathname)) {
      // Stale-while-revalidate — intentional for offline reading of these
      // specific, low-churn pages.
      event.respondWith(
        caches.open(PAGES_CACHE).then(async cache => {
          const cached = await cache.match(request)
          const networkFetch = fetch(request).then(res => {
            if (res.ok) cache.put(request, res.clone())
            return res
          }).catch(() => cached)
          return cached ?? networkFetch
        })
      )
      return
    }

    // Every other page: network-first, always fresh when online. Only
    // fall back to a cached copy if the network request actually fails
    // (offline), never as a first choice.
    event.respondWith(
      fetch(request)
        .then(res => {
          if (res.ok) caches.open(PAGES_CACHE).then(cache => cache.put(request, res.clone()))
          return res
        })
        .catch(() => caches.open(PAGES_CACHE).then(cache => cache.match(request)))
    )
    return
  }
})
