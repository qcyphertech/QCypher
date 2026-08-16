'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { signQuote, requestQuoteChanges } from '@/lib/actions/quotes'
import { CheckCircle2, MessageSquareText } from 'lucide-react'
import { PoweredByFooter } from '@/components/shared/PoweredByFooter'

const UNIT_LABELS: Record<string, string> = {
  flat: '', hourly: '/hr', daily: '/day', weekly: '/wk', monthly: '/mo',
}

type Line = {
  id: string
  item_name_snapshot: string
  description_snapshot: string | null
  quantity: number
  unit_price: number
  billing_unit_snapshot: string
}

type Order = {
  id: string
  order_number: number | null
  total_amount: number
  created_at: string
  business_name: string
  tenant_id: string
  contact_name: string | null
}

function SignaturePad({ onChange }: { onChange: (data: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const hasStrokes = useRef(false)

  const getPos = (e: MouseEvent | TouchEvent, rect: DOMRect) => {
    if ('touches' in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top }
    }
    return { x: (e as MouseEvent).clientX - rect.left, y: (e as MouseEvent).clientY - rect.top }
  }

  const startDraw = useCallback((e: MouseEvent | TouchEvent) => {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const rect = canvas.getBoundingClientRect()
    const pos = getPos(e, rect)
    drawing.current = true
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
  }, [])

  const draw = useCallback((e: MouseEvent | TouchEvent) => {
    e.preventDefault()
    if (!drawing.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const rect = canvas.getBoundingClientRect()
    const pos = getPos(e, rect)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    hasStrokes.current = true
  }, [])

  const endDraw = useCallback(() => {
    if (!drawing.current) return
    drawing.current = false
    const canvas = canvasRef.current
    if (!canvas || !hasStrokes.current) return
    onChange(canvas.toDataURL('image/png'))
  }, [onChange])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.strokeStyle = '#1a1a2e'
    ctx.lineWidth = 2.2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    canvas.addEventListener('mousedown', startDraw)
    canvas.addEventListener('mousemove', draw)
    canvas.addEventListener('mouseup', endDraw)
    canvas.addEventListener('mouseleave', endDraw)
    canvas.addEventListener('touchstart', startDraw, { passive: false })
    canvas.addEventListener('touchmove', draw, { passive: false })
    canvas.addEventListener('touchend', endDraw)
    return () => {
      canvas.removeEventListener('mousedown', startDraw)
      canvas.removeEventListener('mousemove', draw)
      canvas.removeEventListener('mouseup', endDraw)
      canvas.removeEventListener('mouseleave', endDraw)
      canvas.removeEventListener('touchstart', startDraw)
      canvas.removeEventListener('touchmove', draw)
      canvas.removeEventListener('touchend', endDraw)
    }
  }, [startDraw, draw, endDraw])

  function clear() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    hasStrokes.current = false
    onChange(null)
  }

  return (
    <div className="space-y-2">
      <div className="relative rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 overflow-hidden" style={{ touchAction: 'none' }}>
        <canvas
          ref={canvasRef}
          width={560}
          height={140}
          className="w-full block cursor-crosshair"
          style={{ height: 140 }}
        />
        <p className="absolute inset-0 flex items-center justify-center text-[13px] text-gray-300 pointer-events-none select-none"
          style={{ display: hasStrokes.current ? 'none' : undefined }}>
          Draw your signature here
        </p>
      </div>
      <button
        type="button"
        onClick={clear}
        className="text-[13px] text-gray-500 hover:text-gray-700 underline underline-offset-2"
      >
        Clear
      </button>
    </div>
  )
}

export function QuoteSignaturePage({ token, order, lines, ip, backHref }: {
  token: string
  order: Order
  lines: Line[]
  ip: string
  backHref?: string
}) {
  const [mode, setMode] = useState<'type' | 'draw'>('type')
  const [name, setName] = useState('')
  const [drawnData, setDrawnData] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [signed, setSigned] = useState(false)
  const [signedAt, setSignedAt] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [requestingChanges, setRequestingChanges] = useState(false)
  const [changeMessage, setChangeMessage] = useState('')
  const [changeName, setChangeName] = useState('')
  const [changeSubmitting, setChangeSubmitting] = useState(false)
  const [changeSent, setChangeSent] = useState(false)
  const [changeError, setChangeError] = useState<string | null>(null)

  const canSubmit = mode === 'type' ? name.trim().length > 0 : drawnData !== null

  async function handleRequestChanges(e: React.FormEvent) {
    e.preventDefault()
    if (!changeMessage.trim()) return
    setChangeSubmitting(true)
    setChangeError(null)
    try {
      const result = await requestQuoteChanges({
        token,
        message: changeMessage,
        requestedByName: changeName.trim() || undefined,
      })
      if (result.ok) {
        setChangeSent(true)
      } else {
        setChangeError(result.error ?? 'Something went wrong. Please try again.')
      }
    } catch {
      setChangeError('Something went wrong. Please try again.')
    } finally {
      setChangeSubmitting(false)
    }
  }

  async function handleSign(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      const result = await signQuote({
        token,
        signedByName: name.trim() || 'Customer',
        signatureType: mode === 'type' ? 'typed' : 'drawn',
        signatureData: mode === 'type' ? name.trim() : drawnData!,
        ipAddress: ip,
      })
      if (result.ok) {
        setSigned(true)
        setSignedAt(new Date())
      } else {
        setError(result.error ?? 'Something went wrong. Please try again.')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (signed) {
    const ts = signedAt ?? new Date()
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'linear-gradient(135deg, #f0f4ff 0%, #f8f9fa 100%)' }}>
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
            {/* Top accent */}
            <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg, #1a3070, #2a52a0, #4a9db5)' }} />
            <div className="px-8 py-10 text-center space-y-6">
              {/* Icon */}
              <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mx-auto border-4 border-emerald-100">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              </div>
              {/* Heading */}
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-gray-900">Quote approved</h1>
                <p className="text-[15px] text-gray-500 leading-relaxed">
                  Thank you{name ? `, ${name}` : ''}. <span className="font-semibold text-gray-700">{order.business_name}</span> has been notified and will be in touch shortly.
                </p>
              </div>
              {/* Signature receipt */}
              <div className="bg-gray-50 rounded-2xl px-5 py-4 text-left space-y-2.5">
                <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Approval record</p>
                <div className="flex justify-between items-center">
                  <span className="text-[13px] text-gray-500">Signed by</span>
                  <span className="text-[13px] font-semibold text-gray-800">{name || 'Customer'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[13px] text-gray-500">Date</span>
                  <span className="text-[13px] font-semibold text-gray-800">
                    {ts.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[13px] text-gray-500">Time</span>
                  <span className="text-[13px] font-semibold text-gray-800">
                    {ts.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[13px] text-gray-500">Amount</span>
                  <span className="text-[13px] font-bold text-gray-900">${Number(order.total_amount).toFixed(2)}</span>
                </div>
              </div>
              {backHref && (
                <a href={backHref}
                  className="block w-full py-3 rounded-2xl text-[15px] font-bold text-white text-center"
                  style={{ background: 'linear-gradient(135deg, #1a3070, #2a52a0)' }}>
                  Back to portal
                </a>
              )}
              <p className="text-[11px] text-gray-400">Quote #{String(order.order_number ?? 0).padStart(4, '0')} · {order.business_name}</p>
            </div>
            <PoweredByFooter />
          </div>
        </div>
      </div>
    )
  }

  if (changeSent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'linear-gradient(135deg, #f0f4ff 0%, #f8f9fa 100%)' }}>
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
            <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg, #1a3070, #2a52a0, #4a9db5)' }} />
            <div className="px-8 py-10 text-center space-y-6">
              <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mx-auto border-4 border-blue-100">
                <MessageSquareText className="w-9 h-9 text-blue-500" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-gray-900">Request sent</h1>
                <p className="text-[15px] text-gray-500 leading-relaxed">
                  <span className="font-semibold text-gray-700">{order.business_name}</span> has been notified. We&apos;ll review your request and send an updated quote.
                </p>
              </div>
              {backHref && (
                <a href={backHref}
                  className="block w-full py-3 rounded-2xl text-[15px] font-bold text-white text-center"
                  style={{ background: 'linear-gradient(135deg, #1a3070, #2a52a0)' }}>
                  Back to portal
                </a>
              )}
              <p className="text-[11px] text-gray-400">Quote #{String(order.order_number ?? 0).padStart(4, '0')} · {order.business_name}</p>
            </div>
            <PoweredByFooter />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: '#f8f9fa' }}>
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">

        {/* Back link (portal only) */}
        {backHref && (
          <a href={backHref} className="text-[13px] text-blue-600 hover:underline">← Back to portal</a>
        )}

        {/* Header */}
        <div className="text-center space-y-1">
          <p className="text-[13px] font-semibold uppercase tracking-widest text-gray-400">Quote from</p>
          <h1 className="text-2xl font-bold text-gray-900">{order.business_name}</h1>
          <p className="text-[15px] text-gray-500">
            Prepared {new Date(order.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            {order.contact_name ? ` · For ${order.contact_name}` : ''}
          </p>
        </div>

        {/* Line items */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-[15px] font-semibold text-gray-900">Quote details</h2>
          </div>
          {lines.length === 0 ? (
            <p className="px-6 py-8 text-[15px] text-gray-400 text-center">No line items</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {lines.map(line => (
                <div key={line.id} className="flex items-start justify-between px-6 py-4 gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-medium text-gray-900">{line.item_name_snapshot}</p>
                    {line.description_snapshot && (
                      <p className="text-[13px] text-gray-500 mt-0.5">{line.description_snapshot}</p>
                    )}
                    <p className="text-[13px] text-gray-400 mt-0.5">
                      Qty {Number(line.quantity)} × ${Number(line.unit_price).toFixed(2)}{UNIT_LABELS[line.billing_unit_snapshot]}
                    </p>
                  </div>
                  <p className="text-[15px] font-semibold text-gray-900 flex-shrink-0">
                    ${(Number(line.quantity) * Number(line.unit_price)).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-between items-center px-6 py-4 bg-gray-50 border-t border-gray-100">
            <p className="text-[15px] font-semibold text-gray-700">Total</p>
            <p className="text-xl font-bold text-gray-900">${Number(order.total_amount).toFixed(2)}</p>
          </div>
        </div>

        {/* Legal disclaimer */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
          <p className="text-[13px] text-amber-800 leading-relaxed">
            <strong>Note:</strong> By clicking &ldquo;Approve quote&rdquo; below, you agree to the terms of this quote from {order.business_name}. This is a lightweight approval — it is not a notarized or legally-advanced e-signature, and is appropriate for standard local business service agreements.
          </p>
        </div>

        {/* Signature form */}
        <form onSubmit={handleSign} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-[15px] font-semibold text-gray-900">Approve this quote</h2>
          </div>

          {/* Mode tabs */}
          <div className="px-6 pt-5">
            <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 gap-0.5">
              {(['type', 'draw'] as const).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className="px-4 py-1.5 rounded-md text-[13px] font-medium transition-all"
                  style={{
                    background: mode === m ? '#fff' : 'transparent',
                    color: mode === m ? '#1a1a2e' : '#6b7280',
                    boxShadow: mode === m ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  }}
                >
                  {m === 'type' ? 'Type' : 'Draw'}
                </button>
              ))}
            </div>
          </div>

          <div className="px-6 py-5 space-y-4">
            {mode === 'type' ? (
              <>
                <div className="space-y-1.5">
                  <label htmlFor="sig-name" className="text-[15px] font-medium text-gray-700">
                    Full name *
                  </label>
                  <input
                    id="sig-name"
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Jane Smith"
                    autoComplete="name"
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-[15px] text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    style={{ fontFamily: 'cursive', letterSpacing: '0.02em' }}
                  />
                </div>
                {name.trim() && (
                  <div className="rounded-xl border-2 border-dashed border-gray-200 px-4 py-3 bg-gray-50">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-1">Signature preview</p>
                    <p className="text-2xl text-gray-800" style={{ fontFamily: 'cursive' }}>{name}</p>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <label className="text-[15px] font-medium text-gray-700">
                    Full name (optional)
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Jane Smith"
                    autoComplete="name"
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-[15px] text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="space-y-1.5">
                  <p className="text-[15px] font-medium text-gray-700">Draw your signature *</p>
                  <SignaturePad onChange={setDrawnData} />
                </div>
              </>
            )}

            {error && (
              <p className="text-[13px] text-red-600 font-medium">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting || !canSubmit}
              className="w-full py-3.5 rounded-xl text-[15px] font-bold text-white transition-opacity"
              style={{
                background: 'linear-gradient(135deg, #1a3070, #2a52a0)',
                opacity: submitting || !canSubmit ? 0.5 : 1,
              }}
            >
              {submitting ? 'Approving…' : `Approve quote · $${Number(order.total_amount).toFixed(2)}`}
            </button>

            <p className="text-[12px] text-gray-400 text-center">
              Quote #{String(order.order_number ?? 0).padStart(4, '0')} · {order.business_name}
            </p>
          </div>
        </form>

        {/* Request changes — the decline/feedback path */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {!requestingChanges ? (
            <button
              type="button"
              onClick={() => setRequestingChanges(true)}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 text-[15px] font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <MessageSquareText className="w-4 h-4" />
              Not quite right? Request changes instead
            </button>
          ) : (
            <form onSubmit={handleRequestChanges} className="px-6 py-5 space-y-4">
              <div>
                <h2 className="text-[15px] font-semibold text-gray-900">What would you like changed?</h2>
                <p className="text-[13px] text-gray-500 mt-0.5">We&apos;ll pass this along to {order.business_name} and they&apos;ll send an updated quote.</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-[15px] font-medium text-gray-700">Your name (optional)</label>
                <input
                  type="text"
                  value={changeName}
                  onChange={e => setChangeName(e.target.value)}
                  placeholder="Jane Smith"
                  autoComplete="name"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-[15px] text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[15px] font-medium text-gray-700">What should change? *</label>
                <textarea
                  required
                  rows={3}
                  value={changeMessage}
                  onChange={e => setChangeMessage(e.target.value)}
                  placeholder="e.g. Can you remove the second visit and adjust the price?"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-[15px] text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              {changeError && <p className="text-[13px] text-red-600 font-medium">{changeError}</p>}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={changeSubmitting || !changeMessage.trim()}
                  className="flex-1 py-3 rounded-xl text-[15px] font-bold text-white transition-opacity"
                  style={{ background: '#374151', opacity: changeSubmitting || !changeMessage.trim() ? 0.5 : 1 }}
                >
                  {changeSubmitting ? 'Sending…' : 'Send request'}
                </button>
                <button
                  type="button"
                  onClick={() => setRequestingChanges(false)}
                  className="px-4 py-3 rounded-xl text-[15px] font-medium text-gray-500 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <PoweredByFooter />
        </div>

      </div>
    </div>
  )
}
