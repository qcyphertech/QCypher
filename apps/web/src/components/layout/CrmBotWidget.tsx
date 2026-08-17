'use client'

import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send } from 'lucide-react'
import { startCrmBotConversation, sendCrmBotMessage, confirmCrmBotAction, type CrmBotProposedAction } from '@/lib/actions/crm-bot'

type Msg = { role: 'user' | 'assistant'; content: string }

export function CrmBotWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', content: 'Hi! Ask me how to do something, or tell me to add a contact or schedule something — I\'ll check with you before making any changes.' },
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
    const id = await startCrmBotConversation()
    setConversationId(id)
    return id
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
      setMessages((prev) => [...prev, { role: 'assistant', content: result.reply }])
      setPendingAction(result.proposedAction)
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
      const { reply } = await confirmCrmBotAction(pendingAction.id, approve)
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }])
    } catch (e) {
      setMessages((prev) => [...prev, { role: 'assistant', content: e instanceof Error ? e.message : 'Something went wrong.' }])
    } finally {
      setPendingAction(null)
      setResolvingAction(false)
    }
  }

  return (
    <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 100 }}>
      {isOpen && (
        <div style={{
          width: 'min(360px, calc(100vw - 40px))', height: 'min(500px, calc(100vh - 120px))',
          background: 'hsl(var(--card))', borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          border: '1px solid hsl(var(--border))', display: 'flex', flexDirection: 'column',
          marginBottom: '12px', overflow: 'hidden',
        }}>
          <div style={{ background: '#2a52a0', color: '#fff', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 700, fontSize: '15px' }}>CRM Assistant</span>
            <button onClick={() => setIsOpen(false)} aria-label="Close" style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex' }}>
              <X size={18} />
            </button>
          </div>

          <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {messages.map((m, i) => (
              <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                <p style={{
                  fontSize: '14px', lineHeight: 1.5, margin: 0, padding: '9px 12px', borderRadius: '12px',
                  background: m.role === 'user' ? '#2a52a0' : 'hsl(var(--muted))',
                  color: m.role === 'user' ? '#fff' : 'hsl(var(--foreground))',
                }}>{m.content}</p>
              </div>
            ))}
            {sending && <p style={{ fontSize: '13px', color: 'hsl(var(--muted-foreground))', margin: 0 }}>Thinking…</p>}

            {pendingAction && (
              <div style={{ background: 'hsl(var(--muted))', borderRadius: '12px', padding: '12px', display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => resolveAction(true)}
                  disabled={resolvingAction}
                  style={{ flex: 1, background: '#2a52a0', color: '#fff', border: 'none', borderRadius: '8px', padding: '9px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                >Confirm</button>
                <button
                  onClick={() => resolveAction(false)}
                  disabled={resolvingAction}
                  style={{ flex: 1, background: 'transparent', color: 'hsl(var(--foreground))', border: '1px solid hsl(var(--border))', borderRadius: '8px', padding: '9px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                >Cancel</button>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px', padding: '12px', borderTop: '1px solid hsl(var(--border))' }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder={pendingAction ? 'Confirm or cancel above first…' : 'Ask how to…'}
              disabled={sending || !!pendingAction}
              style={{ flex: 1, padding: '9px 12px', borderRadius: '8px', border: '1px solid hsl(var(--border))', fontSize: '14px', fontFamily: 'inherit', background: 'hsl(var(--background))', color: 'hsl(var(--foreground))' }}
            />
            <button onClick={send} disabled={sending || !!pendingAction} aria-label="Send" style={{ background: '#2a52a0', color: '#fff', border: 'none', borderRadius: '8px', padding: '0 14px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <Send size={16} />
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setIsOpen((v) => !v)}
        aria-label="Open assistant"
        style={{
          width: '52px', height: '52px', borderRadius: '50%', border: 'none', cursor: 'pointer',
          background: '#2a52a0', color: '#fff',
          boxShadow: '0 8px 24px rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {isOpen ? <X size={22} /> : <MessageCircle size={22} />}
      </button>
    </div>
  )
}
