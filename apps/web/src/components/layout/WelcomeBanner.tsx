'use client'

import { useState } from 'react'
import { X, Zap } from 'lucide-react'
import { dismissWelcome } from '@/lib/actions/account'

export function WelcomeBanner() {
  const [visible, setVisible] = useState(true)

  async function dismiss() {
    setVisible(false)
    await dismissWelcome()
  }

  if (!visible) return null

  return (
    <div className="mx-4 mt-4 md:mx-6 md:mt-5 rounded-2xl border flex items-start gap-4 px-4 py-4"
      style={{
        background: 'linear-gradient(135deg, rgba(42,82,160,0.08), rgba(74,157,181,0.08))',
        borderColor: 'rgba(42,82,160,0.25)',
      }}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: 'linear-gradient(135deg,#2a52a0,#4a9db5)' }}>
        <Zap className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-black" style={{ color: 'hsl(var(--foreground))' }}>
          Welcome to QCypher CRM
        </p>
        <p className="text-[15px] leading-relaxed mt-0.5" style={{ color: 'hsl(var(--muted-foreground))' }}>
          Start by adding your first contact, or explore the Calendar.
          Everything is organized around making your day faster — not busier.
        </p>
      </div>
      <button onClick={dismiss}
        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 hover:bg-[hsl(var(--muted))] transition-colors"
        aria-label="Dismiss">
        <X className="w-4 h-4" style={{ color: 'hsl(var(--muted-foreground))' }} />
      </button>
    </div>
  )
}
