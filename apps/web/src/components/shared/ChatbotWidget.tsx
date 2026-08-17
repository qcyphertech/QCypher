'use client'

import { useState, useRef, useEffect } from 'react'

type Msg = { role: 'user' | 'assistant'; content: string }

export function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', content: "Hi! I'm QCypher's assistant. Ask me about our features, pricing, or how it works — or I can set up a call with the team." },
  ])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [showLeadForm, setShowLeadForm] = useState(false)
  const [leadName, setLeadName] = useState('')
  const [leadEmail, setLeadEmail] = useState('')
  const [leadSaved, setLeadSaved] = useState<string | null>(null)
  const [leadError, setLeadError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, showLeadForm])

  async function send() {
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: text }])
    setSending(true)

    try {
      const res = await fetch('/api/bot/website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, conversationId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      setConversationId(data.conversationId)
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }])
      if (data.showLeadForm) setShowLeadForm(true)
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: "Sorry, something went wrong. Reach us at info@qcyphertech.com or (804) 250-5066." }])
    } finally {
      setSending(false)
    }
  }

  async function submitLead() {
    setLeadError(null)
    if (!leadName.trim() || !leadEmail.trim()) {
      setLeadError('Name and email are required.')
      return
    }
    try {
      const res = await fetch('/api/bot/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: leadName.trim(), email: leadEmail.trim(), conversationId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      setLeadSaved(data.calLink)
      setShowLeadForm(false)
    } catch (e) {
      setLeadError(e instanceof Error ? e.message : 'Could not save your info.')
    }
  }

  return (
    <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 200, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {isOpen && (
        <div style={{
          width: 'min(360px, calc(100vw - 40px))', height: 'min(520px, calc(100vh - 120px))',
          background: '#fff', borderRadius: '16px', boxShadow: '0 20px 60px rgba(13,36,84,0.25)',
          border: '1px solid rgba(26,48,112,0.10)', display: 'flex', flexDirection: 'column',
          marginBottom: '12px', overflow: 'hidden',
        }}>
          <div style={{ background: 'linear-gradient(135deg,#1a3070,#2a52a0)', color: '#fff', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 700, fontSize: '15px' }}>QCypher Assistant</span>
            <button onClick={() => setIsOpen(false)} aria-label="Close chat" style={{ background: 'none', border: 'none', color: '#fff', fontSize: '18px', cursor: 'pointer', lineHeight: 1 }}>×</button>
          </div>

          <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {messages.map((m, i) => (
              <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                <p style={{
                  fontSize: '14px', lineHeight: 1.5, margin: 0, padding: '9px 12px', borderRadius: '12px',
                  background: m.role === 'user' ? '#2a52a0' : '#f4f6fc',
                  color: m.role === 'user' ? '#fff' : '#171a2b',
                }}>{m.content}</p>
              </div>
            ))}
            {sending && <p style={{ fontSize: '13px', color: '#8a90a3', margin: 0 }}>Typing…</p>}

            {showLeadForm && !leadSaved && (
              <div style={{ background: '#f4f6fc', borderRadius: '12px', padding: '14px', marginTop: '4px' }}>
                <p style={{ fontSize: '13px', fontWeight: 700, color: '#171a2b', marginBottom: '8px' }}>Let's set up a call</p>
                <input value={leadName} onChange={(e) => setLeadName(e.target.value)} placeholder="Your name"
                  style={{ width: '100%', marginBottom: '6px', padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(26,48,112,0.18)', fontSize: '13px' }} />
                <input value={leadEmail} onChange={(e) => setLeadEmail(e.target.value)} placeholder="Your email" type="email"
                  style={{ width: '100%', marginBottom: '8px', padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(26,48,112,0.18)', fontSize: '13px' }} />
                {leadError && <p style={{ fontSize: '12px', color: '#ff5a4e', marginBottom: '6px' }}>{leadError}</p>}
                <button onClick={submitLead} style={{ width: '100%', background: '#2a52a0', color: '#fff', border: 'none', borderRadius: '8px', padding: '9px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                  Continue to booking
                </button>
              </div>
            )}

            {leadSaved && (
              <div style={{ background: '#f4f6fc', borderRadius: '12px', padding: '14px', marginTop: '4px' }}>
                <p style={{ fontSize: '13px', color: '#171a2b', marginBottom: '8px' }}>Thanks! Pick a time that works for you:</p>
                <a href={leadSaved} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'block', textAlign: 'center', background: '#2a52a0', color: '#fff', borderRadius: '8px', padding: '9px', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>
                  Open booking calendar
                </a>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px', padding: '12px', borderTop: '1px solid rgba(26,48,112,0.08)' }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Ask me anything…"
              disabled={sending}
              style={{ flex: 1, padding: '9px 12px', borderRadius: '8px', border: '1px solid rgba(26,48,112,0.18)', fontSize: '14px', fontFamily: 'inherit' }}
            />
            <button onClick={send} disabled={sending} style={{ background: '#2a52a0', color: '#fff', border: 'none', borderRadius: '8px', padding: '0 16px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>
              Send
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setIsOpen((v) => !v)}
        aria-label="Open chat"
        style={{
          width: '56px', height: '56px', borderRadius: '50%', border: 'none', cursor: 'pointer',
          background: 'linear-gradient(135deg,#1a3070,#2a52a0)', color: '#fff', fontSize: '24px',
          boxShadow: '0 8px 24px rgba(13,36,84,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {isOpen ? '×' : '💬'}
      </button>
    </div>
  )
}
