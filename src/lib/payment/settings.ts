import 'server-only'
import { z } from 'zod'
import { createAdminClient } from '@/lib/multitenancy/super-admin'

/* ============================================================
 * Payment settings — singleton row id='default' chứa thông tin
 * tài khoản nhận tiền + cấu hình Casso (Phase 3).
 * ============================================================ */

export type PaymentSettings = {
  id: 'default'
  bank_name: string | null
  bank_bin: string | null
  bank_account_number: string | null
  bank_account_holder: string | null
  bank_branch: string | null
  momo_phone: string | null
  momo_holder: string | null
  vietqr_template: string
  payment_note_prefix: string
  auto_activate_enabled: boolean
  casso_api_key: string | null
  casso_webhook_secret: string | null
  support_phone: string | null
  support_zalo: string | null
  updated_at: string
  updated_by: string | null
}

export const PaymentSettingsUpdateSchema = z.object({
  bank_name: z.string().max(60).nullable().optional(),
  bank_bin: z.string().max(20).nullable().optional(),
  bank_account_number: z.string().max(40).nullable().optional(),
  bank_account_holder: z.string().max(120).nullable().optional(),
  bank_branch: z.string().max(120).nullable().optional(),
  momo_phone: z.string().max(20).nullable().optional(),
  momo_holder: z.string().max(120).nullable().optional(),
  vietqr_template: z.string().max(40).optional(),
  payment_note_prefix: z.string().min(2).max(20).optional(),
  auto_activate_enabled: z.boolean().optional(),
  casso_api_key: z.string().max(200).nullable().optional(),
  casso_webhook_secret: z.string().max(200).nullable().optional(),
  support_phone: z.string().max(20).nullable().optional(),
  support_zalo: z.string().max(60).nullable().optional(),
})

export type PaymentSettingsUpdate = z.infer<typeof PaymentSettingsUpdateSchema>

const DEFAULTS: PaymentSettings = {
  id: 'default',
  bank_name: 'Vietcombank',
  bank_bin: '970436',
  bank_account_number: null,
  bank_account_holder: null,
  bank_branch: null,
  momo_phone: null,
  momo_holder: null,
  vietqr_template: 'compact2',
  payment_note_prefix: 'GCV',
  auto_activate_enabled: false,
  casso_api_key: null,
  casso_webhook_secret: null,
  support_phone: null,
  support_zalo: null,
  updated_at: new Date(0).toISOString(),
  updated_by: null,
}

export async function getPaymentSettings(): Promise<PaymentSettings> {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('payment_settings')
      .select('*')
      .eq('id', 'default')
      .maybeSingle()
    if (error || !data) return DEFAULTS
    return data as PaymentSettings
  } catch {
    return DEFAULTS
  }
}

export async function updatePaymentSettings(
  patch: PaymentSettingsUpdate,
  userId: string
): Promise<PaymentSettings> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('payment_settings')
    .update({ ...patch, updated_by: userId })
    .eq('id', 'default')
    .select('*')
    .single()
  if (error || !data) {
    throw new Error('Lỗi cập nhật payment settings: ' + (error?.message ?? 'unknown'))
  }
  return data as PaymentSettings
}

/**
 * Public-safe view: bỏ secret keys, chỉ giữ thông tin hiển thị
 * cho user trên trang thanh toán.
 */
export function publicPaymentInfo(s: PaymentSettings) {
  return {
    bank_name: s.bank_name,
    bank_bin: s.bank_bin,
    bank_account_number: s.bank_account_number,
    bank_account_holder: s.bank_account_holder,
    bank_branch: s.bank_branch,
    momo_phone: s.momo_phone,
    momo_holder: s.momo_holder,
    vietqr_template: s.vietqr_template,
    support_phone: s.support_phone,
    support_zalo: s.support_zalo,
    has_bank: Boolean(s.bank_account_number && s.bank_bin),
    has_momo: Boolean(s.momo_phone),
  }
}

/**
 * Build VietQR image URL theo chuẩn vietqr.io.
 * https://img.vietqr.io/image/<bin>-<account>-<template>.png?amount=&addInfo=&accountName=
 */
export function buildVietQRUrl(opts: {
  bin: string
  accountNumber: string
  template?: string
  amount?: number
  addInfo?: string
  accountName?: string
}): string {
  const tmpl = opts.template || 'compact2'
  const base = `https://img.vietqr.io/image/${encodeURIComponent(opts.bin)}-${encodeURIComponent(opts.accountNumber)}-${encodeURIComponent(tmpl)}.png`
  const params = new URLSearchParams()
  if (opts.amount && opts.amount > 0) params.set('amount', String(opts.amount))
  if (opts.addInfo) params.set('addInfo', opts.addInfo)
  if (opts.accountName) params.set('accountName', opts.accountName)
  const qs = params.toString()
  return qs ? `${base}?${qs}` : base
}
