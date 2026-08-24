import crypto from 'crypto'

// Server-only. Never import this file from a 'use client' component.
// Set once: openssl rand -hex 32  -> WEBHOOK_ENCRYPTION_KEY in .env
// Same key works for every client forever — you never touch env again to add a new client.

const ALGO = 'aes-256-gcm'

function getKey(): Buffer {
  const key = process.env.WEBHOOK_ENCRYPTION_KEY
  if (!key) throw new Error('WEBHOOK_ENCRYPTION_KEY is not set')
  const buf = Buffer.from(key, 'hex')
  if (buf.length !== 32) throw new Error('WEBHOOK_ENCRYPTION_KEY must be a 32-byte hex string (openssl rand -hex 32)')
  return buf
}

export function encrypt(plainText: string): string {
  const key = getKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGO, key, iv)
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  // pack iv + tag + ciphertext into one base64 string for a single DB column
  return Buffer.concat([iv, tag, encrypted]).toString('base64')
}

export function decrypt(payload: string): string {
  const key = getKey()
  const buf = Buffer.from(payload, 'base64')
  const iv = buf.subarray(0, 12)
  const tag = buf.subarray(12, 28)
  const encrypted = buf.subarray(28)
  const decipher = crypto.createDecipheriv(ALGO, key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}

// Mask a webhook URL for display in the admin UI — never render the decrypted value by default.
export function maskWebhookUrl(url: string): string {
  try {
    const u = new URL(url)
    return `${u.protocol}//${u.hostname}/••••••••`
  } catch {
    return '••••••••'
  }
}

// HMAC-sign an outgoing payload so the receiving n8n workflow can verify it really came from Quiz OS.
export function signPayload(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex')
}
