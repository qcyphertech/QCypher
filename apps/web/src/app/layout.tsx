import type { Metadata, Viewport } from 'next'
import { ServiceWorkerRegistrar } from '@/components/layout/ServiceWorkerRegistrar'
import { ChatbotWidgetGate } from '@/components/shared/ChatbotWidgetGate'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'QCypher Technologies', template: '%s — QCypher Technologies' },
  description: 'We handle the tech. You run the business. Website, bookings, reviews, and tools built for small businesses — no tech skills required.',
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
    title: 'QCypher Technologies — We handle the tech. You run the business.',
    description: 'Website, bookings, reviews, and tools built for small businesses — no tech skills required.',
    images: [{ url: 'https://www.qcyphertech.com/qcypher-logo-full.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'QCypher Technologies — We handle the tech. You run the business.',
    description: 'Website, bookings, reviews, and tools built for small businesses — no tech skills required.',
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ServiceWorkerRegistrar />
        {children}
        <ChatbotWidgetGate />
      </body>
    </html>
  )
}
