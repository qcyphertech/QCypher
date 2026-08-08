'use client'

import { useState } from 'react'
import { changePassword } from '@/lib/actions/account'
import { Mail, Chrome, Monitor, ChevronRight, Eye, EyeOff } from 'lucide-react'

const FG      = 'hsl(var(--foreground))'
const MUTED   = 'hsl(var(--muted-foreground))'
const BORDER  = 'hsl(var(--border))'
const CARD    = 'hsl(var(--card))'
const MUTED_BG = 'hsl(var(--muted))'

const LABEL_STYLE = {
  fontSize: '14px', fontWeight: 600 as const,
  letterSpacing: '0.04em', textTransform: 'uppercase' as const,
  color: MUTED, marginBottom: '3px',
}
const ROW_PRIMARY   = { fontSize: '15px', fontWeight: 600 as const, color: FG }
const ROW_SECONDARY = { fontSize: '14px', color: MUTED, marginTop: '2px' }

type Props = {
  email:       string
  hasPassword: boolean
  hasGoogle:   boolean
  signedInAt:  string
  readOnly?:   boolean
}

export function SecurityPanel({ email, hasPassword, hasGoogle, signedInAt, readOnly = false }: Props) {
  const [pwOpen,   setPwOpen]   = useState(false)
  const [pw,       setPw]       = useState({ next: '', confirm: '' })
  const [showPw,   setShowPw]   = useState(false)
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg,    setPwMsg]    = useState<{ ok: boolean; text: string } | null>(null)

  async function submitPw(e: React.FormEvent) {
    e.preventDefault()
    if (pw.next !== pw.confirm) { setPwMsg({ ok: false, text: 'Passwords do not match' }); return }
    if (pw.next.length < 8)     { setPwMsg({ ok: false, text: 'Password must be at least 8 characters' }); return }
    setPwSaving(true)
    try {
      await changePassword(pw.next)
      setPwMsg({ ok: true, text: 'Password updated successfully' })
      setPw({ next: '', confirm: '' })
      setPwOpen(false)
    } catch (err: unknown) {
      setPwMsg({ ok: false, text: err instanceof Error ? err.message : 'Error updating password' })
    } finally {
      setPwSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* ── Login methods + current session ── */}
      <div style={{ borderRadius: '16px', border: `1px solid ${BORDER}`, background: CARD, overflow: 'hidden' }}>

        {hasGoogle && (
          <>
            <LoginRow icon={Chrome} label="Google" email={email} color="#10b981" bg="rgba(16,185,129,0.10)" />
            {hasPassword && <Divider />}
          </>
        )}
        {hasPassword && (
          <LoginRow icon={Mail} label="Email" email={email} color="#2a52a0" bg="rgba(42,82,160,0.10)" />
        )}

        <Divider />

        {/* Current session */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 20px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
            background: MUTED_BG, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Monitor style={{ width: '15px', height: '15px', color: MUTED }} strokeWidth={2} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={LABEL_STYLE}>Current session</p>
            <p style={ROW_PRIMARY}>Signed in via this browser · {signedInAt}</p>
          </div>
        </div>
      </div>

      {/* ── Change password ── */}
      {/* Read-only role: view-only per RBAC spec, so password changes are disabled too */}
      {hasPassword && !readOnly && (
        <div style={{ borderRadius: '16px', border: `1px solid ${BORDER}`, background: CARD, overflow: 'hidden' }}>
          <button
            onClick={() => { setPwOpen(o => !o); setPwMsg(null) }}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '14px',
              padding: '14px 20px', background: 'transparent', border: 'none',
              cursor: 'pointer', textAlign: 'left',
            }}
          >
            <div style={{ flex: 1 }}>
              <p style={ROW_PRIMARY}>Change password</p>
              <p style={ROW_SECONDARY}>Update your login password</p>
            </div>
            <ChevronRight style={{
              width: '16px', height: '16px', color: MUTED, flexShrink: 0,
              transform: pwOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s',
            }} />
          </button>

          {pwOpen && (
            <form onSubmit={submitPw} style={{
              borderTop: `1px solid ${BORDER}`, padding: '16px 20px 20px',
              display: 'flex', flexDirection: 'column', gap: '12px',
            }}>
              {(['next', 'confirm'] as const).map(key => (
                <div key={key}>
                  <label style={LABEL_STYLE}>
                    {key === 'next' ? 'New password' : 'Confirm password'}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={pw[key]}
                      onChange={e => setPw(p => ({ ...p, [key]: e.target.value }))}
                      required minLength={8}
                      style={{
                        width: '100%', padding: '10px 36px 10px 12px', borderRadius: '12px',
                        border: `1px solid ${BORDER}`, fontSize: '15px', outline: 'none',
                        background: MUTED_BG, color: FG, boxSizing: 'border-box',
                      }}
                    />
                    {key === 'next' && (
                      <button type="button" onClick={() => setShowPw(s => !s)} style={{
                        position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                        background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
                      }}>
                        {showPw
                          ? <EyeOff style={{ width: '15px', height: '15px', color: MUTED }} />
                          : <Eye    style={{ width: '15px', height: '15px', color: MUTED }} />}
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {pwMsg && (
                <p style={{ fontSize: '14px', fontWeight: 600, color: pwMsg.ok ? '#10b981' : '#ef4444' }}>
                  {pwMsg.text}
                </p>
              )}

              <div style={{ display: 'flex', gap: '8px', paddingTop: '4px' }}>
                <button type="button" onClick={() => setPwOpen(false)} style={{
                  padding: '7px 16px', borderRadius: '10px', border: `1px solid ${BORDER}`,
                  background: 'transparent', cursor: 'pointer',
                  fontSize: '14px', fontWeight: 600, color: MUTED,
                }}>
                  Cancel
                </button>
                <button type="submit" disabled={pwSaving} style={{
                  padding: '7px 18px', borderRadius: '10px', border: 'none',
                  background: 'linear-gradient(135deg,#2a52a0,#4a9db5)',
                  cursor: pwSaving ? 'wait' : 'pointer',
                  fontSize: '14px', fontWeight: 700, color: '#fff', opacity: pwSaving ? 0.7 : 1,
                }}>
                  {pwSaving ? 'Updating…' : 'Update password'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

    </div>
  )
}

function LoginRow({ icon: Icon, label, email, color, bg }: {
  icon: React.ElementType; label: string; email: string; color: string; bg: string
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 20px' }}>
      <div style={{
        width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
        background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon style={{ width: '15px', height: '15px', color }} strokeWidth={2} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={LABEL_STYLE}>{label} login</p>
        <p style={{ fontSize: '15px', fontWeight: 500, color: FG, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {email}
        </p>
      </div>
      <span style={{
        fontSize: '14px', fontWeight: 700, padding: '4px 12px', borderRadius: '20px', flexShrink: 0,
        background: 'rgba(16,185,129,0.12)', color: '#10b981',
      }}>Active</span>
    </div>
  )
}

function Divider() {
  return <div style={{ height: '1px', margin: '0 20px', background: 'hsl(var(--border))' }} />
}
