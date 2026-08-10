import crypto from 'crypto'

// PAYMENTS_ENCRYPTION_KEY must be 64 hex chars (32 bytes) — kept separate from
// CAL_ENCRYPTION_KEY (lib/cal-encrypt.ts, same AES-256-GCM approach) so a leak
// of one integration's key never exposes the other's tokens.
// Generate once: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
// Then set PAYMENTS_ENCRYPTION_KEY=<output> in .env.local / Vercel.

function key(): Buffer {
  const k = process.env.PAYMENTS_ENCRYPTION_KEY
  if (!k || k.length !== 64) throw new Error('PAYMENTS_ENCRYPTION_KEY must be 64 hex chars')
  return Buffer.from(k, 'hex')
}

export function encryptPaymentToken(plain: string): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv)
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [iv.toString('hex'), enc.toString('hex'), tag.toString('hex')].join('.')
}

export function decryptPaymentToken(encoded: string): string {
  const [ivHex, encHex, tagHex] = encoded.split('.')
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
  return Buffer.concat([decipher.update(Buffer.from(encHex, 'hex')), decipher.final()]).toString('utf8')
}
