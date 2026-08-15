'use client'

import { useState } from 'react'
import { CheckCircle2, XCircle, CalendarClock } from 'lucide-react'
import { respondToRecurringOrder } from '@/lib/actions/recurring-jobs'

type Appointment = {
  token: string
  title: string
  description: string | null
  scheduledDate: string
  amount: number
  businessName: string
  customerName: string
  alreadyResponded: string | null
  isExpired: boolean
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

export function RecurringJobConfirmCard({ appointment }: { appointment: Appointment }) {
  const [state, setState] = useState<'idle' | 'rescheduling' | 'approved' | 'rescheduled' | 'skipped' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [rescheduleDate, setRescheduleDate] = useState('')

  const card: React.CSSProperties = {
    maxWidth: '440px', width: '100%',
    borderRadius: '20px', background: '#ffffff', border: '1px solid rgba(0,0,0,0.06)',
    boxShadow: '0 8px 32px rgba(15,23,42,0.10)', overflow: 'hidden',
  }
  const shell: React.CSSProperties = { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: '#f7f7f8' }

  async function handleApprove() {
    setBusy(true)
    setErrorMsg('')
    const res = await respondToRecurringOrder(appointment.token, 'approve')
    setBusy(false)
    if (res.ok) setState('approved')
    else { setState('error'); setErrorMsg(res.error) }
  }

  async function handleSkip() {
    setBusy(true)
    setErrorMsg('')
    const res = await respondToRecurringOrder(appointment.token, 'skip')
    setBusy(false)
    if (res.ok) setState('skipped')
    else { setState('error'); setErrorMsg(res.error) }
  }

  async function handleRescheduleSubmit() {
    if (!rescheduleDate) return
    setBusy(true)
    setErrorMsg('')
    const res = await respondToRecurringOrder(appointment.token, 'reschedule', { rescheduleToDate: rescheduleDate })
    setBusy(false)
    if (res.ok) setState('rescheduled')
    else { setState('error'); setErrorMsg(res.error) }
  }

  if (appointment.alreadyResponded || state === 'approved' || state === 'rescheduled' || state === 'skipped') {
    const label =
      state === 'approved' || appointment.alreadyResponded === 'approved' ? { title: 'Appointment confirmed!', body: `Thank you — ${appointment.businessName} will see you on ${fmtDate(appointment.scheduledDate)}.` } :
      state === 'rescheduled' || appointment.alreadyResponded === 'reschedule_requested' ? { title: 'Reschedule requested', body: `${appointment.businessName} has been notified of your new date.` } :
      { title: 'Appointment skipped', body: `This appointment has been skipped. ${appointment.businessName} will follow up about your next visit.` }

    return (
      <div style={shell}>
        <div style={{ ...card, padding: '40px 32px', textAlign: 'center' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '18px', background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <CheckCircle2 style={{ width: '32px', height: '32px', color: '#10b981' }} />
          </div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#1a202c', marginBottom: '6px' }}>{label.title}</h1>
          <p style={{ fontSize: '15px', color: '#718096' }}>{label.body}</p>
        </div>
      </div>
    )
  }

  if (appointment.isExpired) {
    return (
      <div style={shell}>
        <div style={{ ...card, padding: '40px 32px', textAlign: 'center' }}>
          <XCircle style={{ width: '40px', height: '40px', color: '#dc2626', margin: '0 auto 12px' }} />
          <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#1a202c' }}>This link has expired</h1>
          <p style={{ fontSize: '14px', color: '#718096', marginTop: '6px' }}>Contact {appointment.businessName} directly about your upcoming appointment.</p>
        </div>
      </div>
    )
  }

  const minDate = new Date(appointment.scheduledDate)
  minDate.setUTCDate(minDate.getUTCDate() - 14)
  const maxDate = new Date(appointment.scheduledDate)
  maxDate.setUTCDate(maxDate.getUTCDate() + 14)

  return (
    <div style={shell}>
      <div style={card}>
        <div style={{ padding: '28px 32px 20px', textAlign: 'center', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <p style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#718096' }}>{appointment.businessName}</p>
          <p style={{ fontSize: '22px', fontWeight: 900, color: '#1a202c', marginTop: '6px' }}>{appointment.title}</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '10px', color: '#4a5568' }}>
            <CalendarClock style={{ width: '15px', height: '15px' }} />
            <span style={{ fontSize: '14px', fontWeight: 600 }}>{fmtDate(appointment.scheduledDate)}</span>
          </div>
          {appointment.description && (
            <p style={{ fontSize: '13px', color: '#718096', marginTop: '8px' }}>{appointment.description}</p>
          )}
          <p style={{ fontSize: '28px', fontWeight: 900, color: '#1a202c', marginTop: '14px' }}>${appointment.amount.toFixed(2)}</p>
        </div>

        <div style={{ padding: '28px 32px' }}>
          {errorMsg && <p style={{ fontSize: '14px', color: '#dc2626', marginBottom: '14px', textAlign: 'center' }}>{errorMsg}</p>}

          {state === 'rescheduling' ? (
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: '6px' }}>
                Pick a new date (within 14 days)
              </label>
              <input
                type="date"
                value={rescheduleDate}
                min={minDate.toISOString().slice(0, 10)}
                max={maxDate.toISOString().slice(0, 10)}
                onChange={e => setRescheduleDate(e.target.value)}
                style={{ width: '100%', fontSize: '15px', padding: '12px', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.12)', marginBottom: '14px' }}
              />
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setState('idle')}
                  disabled={busy}
                  style={{ flex: 1, fontSize: '15px', fontWeight: 700, color: '#4a5568', background: '#f1f5f9', padding: '12px', borderRadius: '10px', border: 'none', cursor: 'pointer' }}
                >
                  Back
                </button>
                <button
                  onClick={handleRescheduleSubmit}
                  disabled={busy || !rescheduleDate}
                  style={{ flex: 1, fontSize: '15px', fontWeight: 700, color: '#fff', background: '#2d3748', padding: '12px', borderRadius: '10px', border: 'none', cursor: 'pointer', opacity: busy || !rescheduleDate ? 0.6 : 1 }}
                >
                  {busy ? 'Sending…' : 'Request reschedule'}
                </button>
              </div>
            </div>
          ) : (
            <>
              <button
                onClick={handleApprove}
                disabled={busy}
                style={{ width: '100%', fontSize: '16px', fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#059669,#047857)', padding: '14px', borderRadius: '12px', border: 'none', cursor: 'pointer', opacity: busy ? 0.6 : 1 }}
              >
                {busy ? 'Confirming…' : 'Approve This Appointment'}
              </button>
              <button
                onClick={() => setState('rescheduling')}
                disabled={busy}
                style={{ width: '100%', fontSize: '15px', fontWeight: 700, color: '#2d3748', background: '#f1f5f9', padding: '13px', borderRadius: '12px', border: 'none', cursor: 'pointer', marginTop: '10px' }}
              >
                Reschedule
              </button>
              <button
                onClick={handleSkip}
                disabled={busy}
                style={{ width: '100%', fontSize: '13px', fontWeight: 600, color: '#a0aec0', background: 'transparent', padding: '12px', border: 'none', cursor: 'pointer', marginTop: '4px' }}
              >
                Skip this appointment
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
