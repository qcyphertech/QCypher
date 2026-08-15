'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CreditCard, CheckCircle2, AlertTriangle } from 'lucide-react'
import { disconnectPaymentAccount, type PaymentAccount } from '@/lib/actions/payment-accounts'

const STRIPE_ERROR_LABELS: Record<string, string> = {
  access_denied: 'Stripe connection was cancelled.',
  state_mismatch: 'Security check failed — please try connecting again.',
  token_exchange: "Couldn't complete the Stripe connection. Please try again.",
  no_tenant: 'Account setup issue — contact support.',
  save_failed: "Couldn't save the connection. Please try again.",
  not_owner: 'Only account admins can connect a payment account.',
}

const HELCIM_ERROR_LABELS: Record<string, string> = {
  not_owner: 'Only account admins can connect a payment account.',
  no_tenant: 'Account setup issue — contact support.',
  not_configured: 'Helcim connection is not set up yet — contact support.',
}

export function PaymentAccountPanel({ account }: { account: PaymentAccount }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const stripeError = searchParams.get('stripe_error')
  const helcimError = searchParams.get('helcim_error')
  const justConnected = searchParams.get('stripe_connected') === '1'

  async function handleDisconnect() {
    setDisconnecting(true)
    setError(null)
    const result = await disconnectPaymentAccount()
    setDisconnecting(false)
    if (result.ok) {
      setConfirmOpen(false)
      router.refresh()
    } else {
      setError(result.error)
    }
  }

  const card: React.CSSProperties = {
    borderRadius: '16px', background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', overflow: 'hidden',
  }

  return (
    <div style={{ maxWidth: '640px' }}>
      {justConnected && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', borderRadius: '12px', background: 'var(--badge-green-bg)', color: 'var(--badge-green-text)', marginBottom: '20px', fontSize: '15px', fontWeight: 600 }}>
          <CheckCircle2 style={{ width: '16px', height: '16px' }} /> Stripe account connected successfully.
        </div>
      )}
      {stripeError && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', borderRadius: '12px', background: 'var(--badge-red-bg)', color: 'var(--badge-red-text)', marginBottom: '20px', fontSize: '15px', fontWeight: 600 }}>
          <AlertTriangle style={{ width: '16px', height: '16px', flexShrink: 0 }} />
          {STRIPE_ERROR_LABELS[stripeError] ?? 'Something went wrong connecting your payment account.'}
        </div>
      )}
      {helcimError && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', borderRadius: '12px', background: 'var(--badge-red-bg)', color: 'var(--badge-red-text)', marginBottom: '20px', fontSize: '15px', fontWeight: 600 }}>
          <AlertTriangle style={{ width: '16px', height: '16px', flexShrink: 0 }} />
          {HELCIM_ERROR_LABELS[helcimError] ?? 'Something went wrong connecting your Helcim account.'}
        </div>
      )}

      {/* Section 1+2: status / connect */}
      <div style={{ marginBottom: '24px' }}>
        <p style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))', marginBottom: '12px', paddingLeft: '2px' }}>
          Payment Account
        </p>
        <div style={card}>
          {account?.is_connected ? (
            <div style={{ padding: '20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CheckCircle2 style={{ width: '20px', height: '20px', color: '#10b981' }} />
                </div>
                <div>
                  <p style={{ fontSize: '15px', fontWeight: 700, color: 'hsl(var(--foreground))' }}>
                    Connected to {account.provider === 'stripe' ? 'Stripe' : 'Helcim'}
                  </p>
                  <p style={{ fontSize: '14px', color: 'hsl(var(--muted-foreground))' }}>
                    Ready to accept payments
                  </p>
                </div>
              </div>
              <div style={{ fontSize: '14px', color: 'hsl(var(--muted-foreground))', paddingTop: '12px', borderTop: '1px solid hsl(var(--border))', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span>Provider: <strong style={{ color: 'hsl(var(--foreground))' }}>{account.provider === 'stripe' ? 'Stripe' : 'Helcim'}</strong></span>
                <span>Status: <strong style={{ color: '#10b981' }}>Active</strong></span>
                {account.connected_at && <span>Connected: {new Date(account.connected_at).toLocaleDateString()}</span>}
              </div>
            </div>
          ) : (
            <div style={{ padding: '24px' }}>
              <p style={{ fontSize: '15px', fontWeight: 600, color: 'hsl(var(--foreground))', marginBottom: '4px' }}>Not connected</p>
              <p style={{ fontSize: '14px', color: 'hsl(var(--muted-foreground))', marginBottom: '18px' }}>
                Connect your payment account so customers can pay you directly. Money goes straight to your bank — QCypher never touches it.
              </p>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <a
                  href="/api/oauth/stripe/connect"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '10px 18px', borderRadius: '12px', fontSize: '15px', fontWeight: 700,
                    background: 'linear-gradient(135deg,#635bff,#4b44d6)', color: '#fff', textDecoration: 'none',
                  }}
                >
                  <CreditCard style={{ width: '15px', height: '15px' }} /> Connect Stripe
                </a>
                <a
                  href="/api/oauth/helcim/connect"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '10px 18px', borderRadius: '12px', fontSize: '15px', fontWeight: 700,
                    background: 'linear-gradient(135deg,#1a2b57,#2a52a0)', color: '#fff', textDecoration: 'none',
                  }}
                >
                  <CreditCard style={{ width: '15px', height: '15px' }} /> Connect Helcim
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Section 3: disconnect */}
      {account?.is_connected && (
        <div style={{ marginBottom: '24px' }}>
          {!confirmOpen ? (
            <button
              onClick={() => setConfirmOpen(true)}
              style={{
                fontSize: '15px', fontWeight: 700, color: '#ef4444',
                padding: '10px 18px', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.3)',
                background: 'rgba(239,68,68,0.06)', cursor: 'pointer',
              }}
            >
              Disconnect {account.provider === 'stripe' ? 'Stripe' : 'Helcim'} account
            </button>
          ) : (
            <div style={{ ...card, padding: '20px 24px', border: '1px solid rgba(239,68,68,0.3)' }}>
              <p style={{ fontSize: '15px', fontWeight: 700, color: 'hsl(var(--foreground))', marginBottom: '4px' }}>
                Disconnect your payment account?
              </p>
              <p style={{ fontSize: '14px', color: 'hsl(var(--muted-foreground))', marginBottom: '16px' }}>
                Future payment links won&apos;t work until you reconnect. Existing links already sent to customers are unaffected.
              </p>
              {error && <p style={{ fontSize: '14px', color: '#ef4444', marginBottom: '12px' }}>{error}</p>}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => { setConfirmOpen(false); setError(null) }}
                  disabled={disconnecting}
                  style={{ fontSize: '15px', fontWeight: 600, padding: '9px 16px', borderRadius: '10px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', color: 'hsl(var(--foreground))', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  style={{ fontSize: '15px', fontWeight: 700, padding: '9px 16px', borderRadius: '10px', border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', opacity: disconnecting ? 0.6 : 1 }}
                >
                  {disconnecting ? 'Disconnecting…' : 'Yes, disconnect'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Section 4: how it works */}
      <div>
        <p style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))', marginBottom: '12px', paddingLeft: '2px' }}>
          How it works
        </p>
        <div style={{ ...card, padding: '20px 24px' }}>
          <ol style={{ fontSize: '14px', color: 'hsl(var(--muted-foreground))', lineHeight: 1.8, paddingLeft: '18px', margin: 0 }}>
            <li>You connect your Stripe account</li>
            <li>You generate a payment link for a customer</li>
            <li>Customer pays → money goes to <strong style={{ color: 'hsl(var(--foreground))' }}>your</strong> bank account</li>
            <li>QCypher gets your subscription fee only</li>
            <li>You keep 100% of customer payments (minus card processing fees)</li>
          </ol>
          <p style={{ fontSize: '13px', color: 'hsl(var(--muted-foreground))', marginTop: '14px', paddingTop: '14px', borderTop: '1px solid hsl(var(--border))' }}>
            QCypher never handles your customer payments — this is the same model used by Shopify and Square.
          </p>
        </div>
      </div>
    </div>
  )
}
