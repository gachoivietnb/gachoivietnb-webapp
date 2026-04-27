import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requirePermission } from '@/lib/rbac/guard'
import { encryptCredential, maskCredential } from '@/lib/invoice-providers/encryption'

const ProviderSchema = z.object({
  id: z.string().uuid().optional(),
  provider_code: z.enum(['viettel', 'vnpt', 'misa', 'custom']),
  name: z.string().min(1),
  api_url: z.string().nullable().optional(),
  api_username: z.string().nullable().optional(),
  api_password: z.string().nullable().optional(),       // plaintext, sẽ mã hoá
  api_token: z.string().nullable().optional(),
  seller_tax_code: z.string().min(1),
  seller_name: z.string().min(1),
  seller_address: z.string().nullable().optional(),
  seller_phone: z.string().nullable().optional(),
  seller_email: z.string().nullable().optional(),
  seller_bank_account: z.string().nullable().optional(),
  seller_bank_name: z.string().nullable().optional(),
  default_template_code: z.string().nullable().optional(),
  default_invoice_serial: z.string().nullable().optional(),
  signing_serial: z.string().nullable().optional(),
  signing_cert_alias: z.string().nullable().optional(),
  extra_config: z.record(z.string(), z.unknown()).optional(),
  is_default: z.boolean().optional(),
  is_active: z.boolean().optional(),
  test_mode: z.boolean().optional(),
  notes: z.string().nullable().optional(),
})

export async function GET() {
  const ctx = await requirePermission('hoa_don', 'read')
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('invoice_providers')
    .select('*')
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Mask passwords
  const rows = (data ?? []) as unknown as Array<Record<string, unknown> & { api_password_encrypted: string | null }>
  const masked = rows.map((p) => ({
    ...p,
    api_password_masked: maskCredential(p.api_password_encrypted),
  }))
  return NextResponse.json({ providers: masked })
}

export async function POST(request: Request) {
  const ctx = await requirePermission('hoa_don', 'write')
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const parsed = ProviderSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 })

  const supabase = await createClient()
  const body = parsed.data

  const passwordEncrypted = body.api_password ? encryptCredential(body.api_password) : null

  if (body.id) {
    // UPDATE — chỉ cập nhật password nếu user nhập mới
    const update: Record<string, unknown> = {
      provider_code: body.provider_code,
      name: body.name,
      api_url: body.api_url ?? null,
      api_username: body.api_username ?? null,
      api_token: body.api_token ?? null,
      seller_tax_code: body.seller_tax_code,
      seller_name: body.seller_name,
      seller_address: body.seller_address ?? null,
      seller_phone: body.seller_phone ?? null,
      seller_email: body.seller_email ?? null,
      seller_bank_account: body.seller_bank_account ?? null,
      seller_bank_name: body.seller_bank_name ?? null,
      default_template_code: body.default_template_code ?? null,
      default_invoice_serial: body.default_invoice_serial ?? null,
      signing_serial: body.signing_serial ?? null,
      signing_cert_alias: body.signing_cert_alias ?? null,
      extra_config: body.extra_config ?? {},
      is_default: body.is_default ?? false,
      is_active: body.is_active ?? true,
      test_mode: body.test_mode ?? true,
      notes: body.notes ?? null,
    }
    if (passwordEncrypted) update.api_password_encrypted = passwordEncrypted

    const { data, error } = await supabase
      .from('invoice_providers')
      .update(update as never)
      .eq('id', body.id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ provider: data })
  }

  // INSERT
  const insert = {
    provider_code: body.provider_code,
    name: body.name,
    api_url: body.api_url ?? null,
    api_username: body.api_username ?? null,
    api_password_encrypted: passwordEncrypted,
    api_token: body.api_token ?? null,
    seller_tax_code: body.seller_tax_code,
    seller_name: body.seller_name,
    seller_address: body.seller_address ?? null,
    seller_phone: body.seller_phone ?? null,
    seller_email: body.seller_email ?? null,
    seller_bank_account: body.seller_bank_account ?? null,
    seller_bank_name: body.seller_bank_name ?? null,
    default_template_code: body.default_template_code ?? null,
    default_invoice_serial: body.default_invoice_serial ?? null,
    signing_serial: body.signing_serial ?? null,
    signing_cert_alias: body.signing_cert_alias ?? null,
    extra_config: body.extra_config ?? {},
    is_default: body.is_default ?? false,
    is_active: body.is_active ?? true,
    test_mode: body.test_mode ?? true,
    notes: body.notes ?? null,
  }

  const { data, error } = await supabase
    .from('invoice_providers')
    .insert(insert as never)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ provider: data })
}

export async function DELETE(request: Request) {
  const ctx = await requirePermission('hoa_don', 'delete')
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const url = new URL(request.url)
  const id = url.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Thiếu id' }, { status: 400 })

  const supabase = await createClient()
  const { error } = await supabase.from('invoice_providers').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
