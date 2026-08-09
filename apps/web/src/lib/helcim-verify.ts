import { createHash } from 'crypto'

// Validates a HelcimPay.js SUCCESS event server-side, per Helcim's documented
// approach (devdocs.helcim.com/docs/validate-helcimpayjs) — there is no
// "verify transaction" API endpoint; instead the iframe's postMessage
// eventMessage carries { data, hash } where hash = sha256(JSON.stringify(data) + secretToken).
// Recomputing and comparing the hash confirms the payload wasn't tampered
// with client-side before reaching this server action.
export function verifyHelcimTransaction(rawEventMessage: string, secretToken: string): {
  ok: true
  transactionId: string
  status: string
  amount: string
} | { ok: false; error: string } {
  let parsed: { data?: { data?: Record<string, unknown>; hash?: string } }
  try {
    parsed = JSON.parse(rawEventMessage)
  } catch {
    return { ok: false, error: 'Invalid transaction payload' }
  }

  const txData = parsed?.data?.data
  const hash = parsed?.data?.hash
  if (!txData || !hash || typeof txData.transactionId !== 'string') {
    return { ok: false, error: 'Malformed transaction payload' }
  }

  const computedHash = createHash('sha256').update(JSON.stringify(txData) + secretToken).digest('hex')
  if (computedHash !== hash) {
    return { ok: false, error: 'Transaction hash mismatch — payload may have been tampered with' }
  }

  if (txData.status !== 'APPROVED') {
    return { ok: false, error: `Payment not approved: ${txData.status}` }
  }

  return {
    ok: true,
    transactionId: txData.transactionId,
    status: txData.status as string,
    amount: String(txData.amount ?? ''),
  }
}
