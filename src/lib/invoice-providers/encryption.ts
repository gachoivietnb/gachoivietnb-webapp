/**
 * Đơn giản hoá — mã hoá AES-GCM cho password / token NCC HĐĐT.
 *
 * Key lấy từ env INVOICE_CREDENTIALS_KEY (32 bytes hex) — fallback dùng
 * Supabase service role key + farm_id làm derived key (kém an toàn hơn,
 * chỉ dùng nếu chưa cấu hình env).
 *
 * Đầu ra format: "v1:<iv_hex>:<ciphertext_hex>"
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto'

function getKey(): Buffer {
  const envKey = process.env.INVOICE_CREDENTIALS_KEY
  if (envKey && /^[0-9a-f]{64}$/i.test(envKey)) {
    return Buffer.from(envKey, 'hex')
  }
  // Fallback: derive từ NEXT_PUBLIC_SUPABASE_URL (KHÔNG an toàn — chỉ là placeholder)
  const seed = process.env.SUPABASE_SERVICE_ROLE_KEY || 'invoice-credentials-fallback-key-do-not-use-in-prod'
  return createHash('sha256').update(seed).digest()
}

export function encryptCredential(plain: string): string {
  if (!plain) return ''
  const key = getKey()
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return 'v1:' + iv.toString('hex') + ':' + Buffer.concat([enc, tag]).toString('hex')
}

export function decryptCredential(payload: string): string {
  if (!payload || !payload.startsWith('v1:')) return ''
  const [, ivHex, dataHex] = payload.split(':')
  if (!ivHex || !dataHex) return ''
  const iv = Buffer.from(ivHex, 'hex')
  const data = Buffer.from(dataHex, 'hex')
  const tag = data.subarray(data.length - 16)
  const enc = data.subarray(0, data.length - 16)
  const key = getKey()
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  const dec = Buffer.concat([decipher.update(enc), decipher.final()])
  return dec.toString('utf8')
}

export function maskCredential(payload: string | null | undefined): string {
  if (!payload) return ''
  if (!payload.startsWith('v1:')) return payload.slice(0, 4) + '••••'
  return '•••••••• (đã mã hoá)'
}
