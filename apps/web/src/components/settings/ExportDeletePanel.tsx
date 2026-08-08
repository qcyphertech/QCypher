'use client'

import { useState, useTransition } from 'react'
import { Download, AlertTriangle, ShieldCheck, Undo2 } from 'lucide-react'
import { requestAccountDeletion, cancelAccountDeletion, type DeletionStatus } from '@/lib/actions/account-deletion'

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

export function ExportDeletePanel({ initial }: { initial: DeletionStatus }) {
  const [status, setStatus] = useState(initial)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [acknowledged, setAcknowledged] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const pending = status.status === 'pending_deletion'

  function handleDelete() {
    setError(null)
    startTransition(async () => {
      try {
        const result = await requestAccountDeletion()
        setStatus(s => ({ ...s, status: 'pending_deletion', deletionScheduledAt: result.deletionScheduledAt }))
        setConfirmDelete(false)
        setAcknowledged(false)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong')
      }
    })
  }

  function handleCancel() {
    setError(null)
    startTransition(async () => {
      try {
        await cancelAccountDeletion()
        setStatus(s => ({ ...s, status: 'active', deletionRequestedAt: null, deletionScheduledAt: null }))
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong')
      }
    })
  }

  const card: React.CSSProperties = {
    borderRadius: '16px',
    background: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    padding: '20px',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Export */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'rgba(42,82,160,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Download style={{ width: '16px', height: '16px', color: '#2a52a0' }} />
          </div>
          <p style={{ fontSize: '15px', fontWeight: 700 }}>Download a copy of your data</p>
        </div>
        <p style={{ fontSize: '14px', color: 'hsl(var(--muted-foreground))', marginBottom: '14px' }}>
          Export all your contacts, their notes, and calendar event counts as a CSV file.
        </p>
        <a
          href="/api/export/csv"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            fontSize: '14px', fontWeight: 600, color: '#fff',
            background: '#2a52a0', padding: '9px 16px', borderRadius: '10px',
            textDecoration: 'none',
          }}
        >
          <Download style={{ width: '14px', height: '14px' }} /> Download CSV
        </a>
      </div>

      {/* Delete */}
      <div style={{ ...card, borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'rgba(239,68,68,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <AlertTriangle style={{ width: '16px', height: '16px', color: '#dc2626' }} />
          </div>
          <p style={{ fontSize: '15px', fontWeight: 700, color: '#dc2626' }}>Delete your account permanently</p>
        </div>

        {pending ? (
          <>
            <p style={{ fontSize: '14px', color: 'hsl(var(--muted-foreground))', marginBottom: '14px' }}>
              Account scheduled for deletion on <strong>{status.deletionScheduledAt ? fmtDate(status.deletionScheduledAt) : '—'}</strong>.
              You can undo this any time before then.
            </p>
            {error && <p style={{ fontSize: '14px', color: '#dc2626', marginBottom: '10px' }}>{error}</p>}
            <button
              onClick={handleCancel}
              disabled={isPending}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                fontSize: '14px', fontWeight: 600, color: '#fff',
                background: '#16a34a', padding: '9px 16px', borderRadius: '10px',
                border: 'none', cursor: 'pointer', opacity: isPending ? 0.6 : 1,
              }}
            >
              <Undo2 style={{ width: '14px', height: '14px' }} /> {isPending ? 'Cancelling…' : 'Cancel Deletion'}
            </button>
          </>
        ) : (
          <>
            <p style={{ fontSize: '14px', color: 'hsl(var(--muted-foreground))', marginBottom: '14px' }}>
              Your account and all associated data will be deleted in 30 days. You can undo this any time
              during the 30-day grace period by logging back in and cancelling here.
            </p>
            {error && <p style={{ fontSize: '14px', color: '#dc2626', marginBottom: '10px' }}>{error}</p>}
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                style={{
                  fontSize: '14px', fontWeight: 600, color: '#dc2626',
                  background: 'transparent', border: '1px solid rgba(239,68,68,0.4)',
                  padding: '9px 16px', borderRadius: '10px', cursor: 'pointer',
                }}
              >
                Delete Account
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '14px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={acknowledged}
                    onChange={e => setAcknowledged(e.target.checked)}
                    style={{ marginTop: '3px' }}
                  />
                  I understand this is permanent — my account and all its data will be deleted after 30 days.
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={handleDelete}
                    disabled={!acknowledged || isPending}
                    style={{
                      fontSize: '14px', fontWeight: 700, color: '#fff',
                      background: '#dc2626', padding: '9px 16px', borderRadius: '10px',
                      border: 'none', cursor: 'pointer',
                      opacity: !acknowledged || isPending ? 0.5 : 1,
                    }}
                  >
                    {isPending ? 'Submitting…' : 'Yes, delete my account'}
                  </button>
                  <button
                    onClick={() => { setConfirmDelete(false); setAcknowledged(false) }}
                    style={{
                      fontSize: '14px', fontWeight: 600, color: 'hsl(var(--muted-foreground))',
                      background: 'transparent', border: 'none', cursor: 'pointer', padding: '9px 10px',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Retention policy */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
          <ShieldCheck style={{ width: '16px', height: '16px', color: 'hsl(var(--muted-foreground))' }} />
          <p style={{ fontSize: '15px', fontWeight: 700 }}>Retention policy</p>
        </div>
        <div style={{ fontSize: '14px', color: 'hsl(var(--muted-foreground))', lineHeight: 1.7 }}>
          <p style={{ fontWeight: 600, color: 'hsl(var(--foreground))', marginBottom: '2px' }}>We keep:</p>
          <p>• Audit logs — 90 days</p>
          <p>• Backups — 7–30 days (auto-managed by Supabase)</p>
          <p>• Billing records — 5 years, for tax and legal purposes</p>
          <p style={{ fontWeight: 600, color: 'hsl(var(--foreground))', marginTop: '10px', marginBottom: '2px' }}>We delete permanently:</p>
          <p>• Contacts, notes, and calendar events — upon request, after a 30-day grace period</p>
          <p style={{ marginTop: '10px' }}>Questions? Contact <a href="mailto:legal@qcyphertech.com" style={{ color: '#2a52a0' }}>legal@qcyphertech.com</a></p>
        </div>
      </div>
    </div>
  )
}
