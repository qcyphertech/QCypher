'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Sparkles, X, Send, ArrowRight } from 'lucide-react'
import { startCrmBotConversation, sendCrmBotMessage, confirmCrmBotAction, type CrmBotProposedAction, type CrmBotNavigate } from '@/lib/actions/crm-bot'

type Msg = { role: 'user' | 'assistant'; content: string; navigate?: CrmBotNavigate[] | null }

export function CrmBotWidget({ dark = false }: { dark?: boolean }) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', content: "Hi, I'm QBot. Ask me how to do something, or tell me to add a contact or schedule something — I'll check with you before making any changes." },
  ])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<CrmBotProposedAction | null>(null)
  const [resolvingAction, setResolvingAction] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, pendingAction])

  async function ensureConversation(): Promise<string> {
    if (conversationId) return conversationId
    const result = await startCrmBotConversation()
    if (!result.ok) throw new Error(result.error)
    setConversationId(result.data)
    return result.data
  }

  async function send() {
    const text = input.trim()
    if (!text || sending || pendingAction) return
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: text }])
    setSending(true)
    try {
      const id = await ensureConversation()
      const result = await sendCrmBotMessage(id, text)
      if (!result.ok) throw new Error(result.error)
      setMessages((prev) => [...prev, { role: 'assistant', content: result.data.reply, navigate: result.data.navigate }])
      setPendingAction(result.data.proposedAction)
    } catch (e) {
      setMessages((prev) => [...prev, { role: 'assistant', content: e instanceof Error ? e.message : 'Something went wrong.' }])
    } finally {
      setSending(false)
    }
  }

  async function resolveAction(approve: boolean) {
    if (!pendingAction || resolvingAction) return
    setResolvingAction(true)
    try {
      const result = await confirmCrmBotAction(pendingAction.id, approve)
      if (!result.ok) throw new Error(result.error)
      setMessages((prev) => [...prev, { role: 'assistant', content: result.data.reply }])
      // A multi-step chain surfaces its next proposed action here instead
      // of requiring the user to type anything — resolveAction just keeps
      // going until nextAction comes back null.
      setPendingAction(result.data.nextAction)
    } catch (e) {
      setMessages((prev) => [...prev, { role: 'assistant', content: e instanceof Error ? e.message : 'Something went wrong.' }])
      setPendingAction(null)
    } finally {
      setResolvingAction(false)
    }
  }

  const panelBg = dark ? 'linear-gradient(180deg, #0b1738 0%, #0a1230 100%)' : '#ffffff'
  const panelShadow = dark ? '0 24px 70px rgba(3,10,30,0.55), 0 0 0 1px rgba(56,189,248,0.18)' : '0 24px 60px rgba(13,36,84,0.18), 0 0 0 1px rgba(13,109,255,0.12)'
  const bodyBorderTop = dark ? '1px solid rgba(94,234,212,0.14)' : '1px solid rgba(13,36,84,0.08)'
  const assistantBubbleBg = dark ? 'rgba(255,255,255,0.06)' : '#f2f6fd'
  const assistantBubbleBorder = dark ? '1px solid rgba(148,197,255,0.14)' : '1px solid rgba(13,36,84,0.06)'
  const assistantText = dark ? 'rgba(226,236,255,0.92)' : '#171a2b'
  const typingText = dark ? 'rgba(148,197,255,0.6)' : '#5b6072'
  const actionBoxBg = dark ? 'rgba(255,255,255,0.05)' : '#f2f6fd'
  const actionBoxBorder = dark ? '1px solid rgba(94,234,212,0.2)' : '1px solid rgba(13,109,255,0.15)'
  const cancelText = dark ? 'rgba(226,236,255,0.85)' : '#2a52a0'
  const cancelBorder = dark ? '1px solid rgba(148,197,255,0.3)' : '1px solid rgba(13,36,84,0.18)'
  const inputBg = dark ? 'rgba(255,255,255,0.04)' : '#f8faff'
  const inputBorder = dark ? '1px solid rgba(148,197,255,0.22)' : '1px solid rgba(13,36,84,0.15)'
  const inputText = dark ? '#fff' : '#171a2b'
  const inputPlaceholder = dark ? 'rgba(255,255,255,0.4)' : 'rgba(23,26,43,0.4)'

  return (
    <div className="bottom-[84px] md:bottom-5" style={{ position: 'fixed', right: '20px', zIndex: 100 }}>
      <style>{`
        @keyframes qc-crmbot-glow-pulse {
          0%, 100% { box-shadow: 0 8px 28px rgba(13,109,255,0.38), 0 0 0 1px rgba(94,234,212,0.25); }
          50% { box-shadow: 0 8px 32px rgba(13,109,255,0.55), 0 0 0 1px rgba(94,234,212,0.45), 0 0 20px rgba(56,189,248,0.35); }
        }
        .qc-crmbot-toggle { animation: qc-crmbot-glow-pulse 3.2s ease-in-out infinite; }
        .qc-crmbot-input::placeholder { color: ${inputPlaceholder}; }
        .qc-crmbot-input:focus { outline: none; border-color: rgba(13,109,255,0.6) !important; box-shadow: 0 0 0 3px rgba(13,109,255,0.15); }
      `}</style>

      {isOpen && (
        <div style={{
          width: 'min(360px, calc(100vw - 40px))', height: 'min(500px, calc(100vh - 120px))',
          background: panelBg,
          borderRadius: '18px', boxShadow: panelShadow,
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
              QBot
              <span style={{
                fontSize: '10px', fontWeight: 700, color: '#5eead4', letterSpacing: '0.04em',
                background: 'rgba(94,234,212,0.12)', border: '1px solid rgba(94,234,212,0.3)',
                borderRadius: '999px', padding: '2px 7px',
              }}>
                AI-ASSISTED
              </span>
            </span>
            <button onClick={() => setIsOpen(false)} aria-label="Close" style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.75)', cursor: 'pointer', display: 'flex' }}>
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
                    : assistantBubbleBg,
                  border: m.role === 'user' ? 'none' : assistantBubbleBorder,
                  color: m.role === 'user' ? '#fff' : assistantText,
                }}>{m.content}</p>
                {m.navigate && m.navigate.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px', alignItems: 'flex-start' }}>
                    {m.navigate.map((nav, ni) => (
                      <Link
                        key={ni}
                        href={nav.path}
                        onClick={() => setIsOpen(false)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '6px',
                          fontSize: '13px', fontWeight: 700, textDecoration: 'none',
                          color: dark ? '#5eead4' : '#0d6dff',
                          padding: '7px 10px', borderRadius: '8px',
                          background: dark ? 'rgba(94,234,212,0.1)' : 'rgba(13,109,255,0.08)',
                          border: dark ? '1px solid rgba(94,234,212,0.25)' : '1px solid rgba(13,109,255,0.18)',
                          width: 'fit-content',
                        }}
                      >
                        {nav.label} <ArrowRight size={13} />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {sending && (
              <p style={{ fontSize: '13px', color: typingText, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#0d6dff', animation: 'qc-crmbot-glow-pulse 1s ease-in-out infinite' }} />
                Thinking…
              </p>
            )}

            {pendingAction && (
              <div style={{ background: actionBoxBg, border: actionBoxBorder, borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {pendingAction.step && (
                  <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.04em', color: typingText, textTransform: 'uppercase' }}>
                    Step {pendingAction.step.index} of {pendingAction.step.total}
                  </span>
                )}
                <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => resolveAction(true)}
                  disabled={resolvingAction}
                  style={{ flex: 1, background: 'linear-gradient(135deg,#0d6dff,#38bdf8)', color: '#fff', border: 'none', borderRadius: '8px', padding: '9px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                >Confirm</button>
                <button
                  onClick={() => resolveAction(false)}
                  disabled={resolvingAction}
                  style={{ flex: 1, background: 'transparent', color: cancelText, border: cancelBorder, borderRadius: '8px', padding: '9px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                >Cancel</button>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px', padding: '12px', borderTop: bodyBorderTop }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder={pendingAction ? 'Confirm or cancel above first…' : 'Ask how to…'}
              disabled={sending || !!pendingAction}
              className="qc-crmbot-input"
              style={{ flex: 1, padding: '9px 12px', borderRadius: '8px', border: inputBorder, background: inputBg, color: inputText, fontSize: '14px', fontFamily: 'inherit' }}
            />
            <button onClick={send} disabled={sending || !!pendingAction} aria-label="Send" style={{ background: 'linear-gradient(135deg,#0d6dff,#38bdf8)', color: '#fff', border: 'none', borderRadius: '8px', padding: '0 14px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <Send size={16} />
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setIsOpen((v) => !v)}
        aria-label="Open assistant"
        className="qc-crmbot-toggle"
        style={{
          width: '52px', height: '52px', borderRadius: '50%', border: 'none', cursor: 'pointer',
          background: 'linear-gradient(135deg,#0d1f45,#0d6dff)', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {isOpen ? <X size={22} /> : <Sparkles size={22} />}
      </button>
    </div>
  )
}
