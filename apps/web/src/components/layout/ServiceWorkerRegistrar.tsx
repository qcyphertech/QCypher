'use client'

import { useEffect } from 'react'

// Browsers only check for a new sw.js on navigation/reload, and even then
// the OLD service worker stays in control of the page that triggered the
// check — a new SW's skipWaiting()/clients.claim() (already set in sw.js)
// only takes effect for the *next* load. Left alone, that means every
// deploy needs two manual reloads before a user's browser is actually
// running the new worker: normal use over this session revealed real
// cases of new features/fixes not appearing until a second reload.
//
// Fixed here instead of asking users to reload twice: explicitly poke the
// registration to check for updates on every mount, and when a new worker
// does take control (the 'controllerchange' event), reload automatically
// — once, guarded by sessionStorage so a mid-session SW hiccup can't loop.
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        registration.update().catch(() => {})
      })
      .catch(() => {
        // SW registration is best-effort — app works fine without it
      })

    function onControllerChange() {
      if (sessionStorage.getItem('sw-reloaded') === '1') return
      sessionStorage.setItem('sw-reloaded', '1')
      window.location.reload()
    }
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)
    return () => navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
  }, [])

  return null
}
