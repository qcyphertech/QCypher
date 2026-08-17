import type { Metadata, Viewport } from 'next'
import { ServiceWorkerRegistrar } from '@/components/layout/ServiceWorkerRegistrar'
import { ChatbotWidgetGate } from '@/components/shared/ChatbotWidgetGate'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'QCypher Technologies', template: '%s — QCypher Technologies' },
  description: 'Security on autopilot. Stay compliant. Keep your clients safe. Website, CRM, security monitoring, and AI tools for local service businesses.',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png',   sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'QCypher' },
  openGraph: {
    type: 'website',
    url: 'https://www.qcyphertech.com',
    siteName: 'QCypher Technologies',
    title: 'QCypher Technologies — Security On Autopilot. Compliance Built In.',
    description: 'Security on autopilot. Stay compliant. Keep your clients safe. Website, CRM, security monitoring, and AI tools for local service businesses.',
    images: [{ url: 'https://www.qcyphertech.com/qcypher-logo-full.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'QCypher Technologies — Security On Autopilot. Compliance Built In.',
    description: 'Security on autopilot. Stay compliant. Keep your clients safe. Website, CRM, security monitoring, and AI tools for local service businesses.',
    images: ['https://www.qcyphertech.com/qcypher-logo-full.png'],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#ffffff',
}

// Runs before first paint so dark mode is already applied when the page
// first renders — without this, every full page load (not just a
// client-side <Link> nav) briefly shows light mode until React hydrates
// and useTheme()'s effect catches up. Previously there was no such
// script at all despite useTheme()'s own comment claiming one existed,
// and the hook never read localStorage back either — so dark mode only
// ever lived in that one AppShell instance's React state, lost on any
// real navigation or reload.
//
// Deliberately a literal <script> tag, NOT next/script's
// strategy="beforeInteractive" (tried first) — confirmed via direct
// testing that next/script's injection path silently fails to execute
// under this app's CSP (script-src has 'unsafe-inline' but not
// 'unsafe-eval' by deliberate design; next/script's runtime apparently
// needs the latter). A plain <script> tag is parsed and executed
// synchronously by the browser itself as part of normal HTML parsing —
// no Next.js runtime injection involved, so it isn't affected by that.
// Wrapped in try/catch: localStorage can throw in some privacy-mode
// browser configurations.
const THEME_INIT_SCRIPT = `
try {
  if (localStorage.getItem('qc-theme') === 'dark') {
    document.documentElement.classList.add('dark');
  }
} catch (e) {}
`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {/* eslint-disable-next-line react/no-danger */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <ServiceWorkerRegistrar />
        {children}
        <ChatbotWidgetGate />
      </body>
    </html>
  )
}
