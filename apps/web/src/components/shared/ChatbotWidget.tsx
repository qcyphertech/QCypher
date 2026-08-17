'use client'

import { useState, useRef, useEffect } from 'react'
import { Sparkles, X, Send } from 'lucide-react'

type Msg = { role: 'user' | 'assistant'; content: string }

export function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', content: "Hi, I'm QBot — QCypher's assistant. Ask me about our features, pricing, or how it works, or I can set up a call with the team." },
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
      <style>{`
        @keyframes qc-bot-glow-pulse {
          0%, 100% { box-shadow: 0 8px 28px rgba(13,109,255,0.38), 0 0 0 1px rgba(94,234,212,0.25); }
          50% { box-shadow: 0 8px 32px rgba(13,109,255,0.55), 0 0 0 1px rgba(94,234,212,0.45), 0 0 20px rgba(56,189,248,0.35); }
        }
        .qc-bot-toggle { animation: qc-bot-glow-pulse 3.2s ease-in-out infinite; }
        .qc-bot-input::placeholder { color: rgba(255,255,255,0.4); }
        .qc-bot-input:focus { outline: none; border-color: rgba(56,189,248,0.6) !important; box-shadow: 0 0 0 3px rgba(13,109,255,0.18); }
      `}</style>

      {isOpen && (
        <div style={{
          width: 'min(370px, calc(100vw - 40px))', height: 'min(530px, calc(100vh - 120px))',
          background: 'linear-gradient(180deg, #0b1738 0%, #0a1230 100%)',
          borderRadius: '18px', boxShadow: '0 24px 70px rgba(3,10,30,0.55), 0 0 0 1px rgba(56,189,248,0.18)',
          display: 'flex', flexDirection: 'column', marginBottom: '12px', overflow: 'hidden',
        }}>
          <div style={{
            background: 'linear-gradient(120deg, #0d1f45 0%, #12326b 55%, #0d6dff 130%)',
            borderBottom: '1px solid rgba(94,234,212,0.25)',
            color: '#fff', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '15px' }}>
              <span style={{
                width: '26px', height: '26px', borderRadius: '8px', flexShrink: 0,
                background: 'rgba(255,255,255,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3px',
              }}>
                <img src="/icon-192.png" alt="" width={20} height={20} style={{ display: 'block' }} />
              </span>
              QBot — QCypher Assistant
            </span>
            <button onClick={() => setIsOpen(false)} aria-label="Close chat" style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.75)', cursor: 'pointer', display: 'flex' }}>
              <X size={18} />
            </button>
          </div>

          <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {messages.map((m, i) => (
              <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                <p style={{
                  fontSize: '14px', lineHeight: 1.5, margin: 0, padding: '9px 12px', borderRadius: '12px',
                  background: m.role === 'user'
                    ? 'linear-gradient(135deg,#0d6dff,#2a52a0)'
                    : 'rgba(255,255,255,0.06)',
                  border: m.role === 'user' ? 'none' : '1px solid rgba(148,197,255,0.14)',
                  color: m.role === 'user' ? '#fff' : 'rgba(226,236,255,0.92)',
                }}>{m.content}</p>
              </div>
            ))}
            {sending && (
              <p style={{ fontSize: '13px', color: 'rgba(148,197,255,0.6)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#38bdf8', animation: 'qc-bot-glow-pulse 1s ease-in-out infinite' }} />
                Typing…
              </p>
            )}

            {showLeadForm && !leadSaved && (
              <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(94,234,212,0.2)', borderRadius: '12px', padding: '14px', marginTop: '4px' }}>
                <p style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>Let&apos;s set up a call</p>
                <input value={leadName} onChange={(e) => setLeadName(e.target.value)} placeholder="Your name" className="qc-bot-input"
                  style={{ width: '100%', marginBottom: '6px', padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(148,197,255,0.22)', background: 'rgba(255,255,255,0.04)', color: '#fff', fontSize: '13px' }} />
                <input value={leadEmail} onChange={(e) => setLeadEmail(e.target.value)} placeholder="Your email" type="email" className="qc-bot-input"
                  style={{ width: '100%', marginBottom: '8px', padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(148,197,255,0.22)', background: 'rgba(255,255,255,0.04)', color: '#fff', fontSize: '13px' }} />
                {leadError && <p style={{ fontSize: '12px', color: '#ff8a80', marginBottom: '6px' }}>{leadError}</p>}
                <button onClick={submitLead} style={{ width: '100%', background: 'linear-gradient(135deg,#0d6dff,#38bdf8)', color: '#fff', border: 'none', borderRadius: '8px', padding: '9px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                  Continue to booking
                </button>
              </div>
            )}

            {leadSaved && (
              <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(94,234,212,0.2)', borderRadius: '12px', padding: '14px', marginTop: '4px' }}>
                <p style={{ fontSize: '13px', color: 'rgba(226,236,255,0.92)', marginBottom: '8px' }}>Thanks! Pick a time that works for you:</p>
                <a href={leadSaved} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'block', textAlign: 'center', background: 'linear-gradient(135deg,#0d6dff,#38bdf8)', color: '#fff', borderRadius: '8px', padding: '9px', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>
                  Open booking calendar
                </a>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px', padding: '12px', borderTop: '1px solid rgba(94,234,212,0.14)' }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Ask me anything…"
              disabled={sending}
              className="qc-bot-input"
              style={{ flex: 1, padding: '9px 12px', borderRadius: '8px', border: '1px solid rgba(148,197,255,0.22)', background: 'rgba(255,255,255,0.04)', color: '#fff', fontSize: '14px', fontFamily: 'inherit' }}
            />
            <button onClick={send} disabled={sending} aria-label="Send" style={{ background: 'linear-gradient(135deg,#0d6dff,#38bdf8)', color: '#fff', border: 'none', borderRadius: '8px', padding: '0 14px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <Send size={16} />
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setIsOpen((v) => !v)}
        aria-label="Open chat"
        className="qc-bot-toggle"
        style={{
          width: '56px', height: '56px', borderRadius: '50%', border: 'none', cursor: 'pointer',
          background: 'linear-gradient(135deg,#0d1f45,#0d6dff)', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {isOpen ? <X size={22} /> : <Sparkles size={22} />}
      </button>
    </div>
  )
}
