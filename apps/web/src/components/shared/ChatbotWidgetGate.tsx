'use client'

import { usePathname } from 'next/navigation'
import { ChatbotWidget } from './ChatbotWidget'

// Public marketing pages only — mirrors middleware.ts's public-route
// allowlist, minus the auth/portal/pay/invoice/etc. paths that aren't
// really "marketing site" pages a visitor chats from.
const MARKETING_PATHS = ['/', '/pricing', '/about', '/security', '/privacy', '/terms', '/faq', '/blog']

export function ChatbotWidgetGate() {
  const pathname = usePathname()
  const isMarketing = MARKETING_PATHS.some((p) => (p === '/' ? pathname === '/' : pathname.startsWith(p)))
  if (!isMarketing) return null
  return <ChatbotWidget />
}
