import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requirePermission } from '@/lib/rbac/guard'
import { getProviderAdapter } from '@/lib/invoice-providers/registry'
import type { ProviderConfig } from '@/lib/invoice-providers/types'

const Schema = z.object({ reason: z.string().min(3, 'Cần nêu lý do hủy') })

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requirePermission('hoa_don', 'delete')
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const { id } = await params
  const parsed = Schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 })

  const supabase = await createClient()
  const { data: inv } = await supabase.from('invoices').select('*').eq('id', id).single()
  if (!inv) return NextResponse.json({ error: 'Không tìm thấy HĐ' }, { status: 404 })

  const invoice = inv as {
    id: string
    status: string
    invoice_no: string | null
    invoice_serial: string | null
    invoice_form: string | null
    provider_id: string | null
  }

  if (invoice.status === 'da_huy') {
    return NextResponse.json({ error: 'HĐ đã hủy rồi' }, { status: 400 })
  }

  // Nếu đã phát hành → gọi NCC để hủy
  if (invoice.status === 'da_phat_hanh' && invoice.provider_id && invoice.invoice_no) {
    const { data: provider } = await supabase
      .from('invoice_providers')
      .select('*')
      .eq('id', invoice.provider_id)
      .single()
    if (provider) {
      const adapter = getProviderAdapter(provider as unknown as ProviderConfig)
      const result = await adapter.cancel({
        invoice_no: invoice.invoice_no,
        invoice_serial: invoice.invoice_serial ?? '',
        template_code: invoice.invoice_form,
        reason: parsed.data.reason,
        cancel_date: new Date().toISOString().slice(0, 10),
      })
      if (!result.ok) {
        return NextResponse.json({ error: result.error || 'NCC từ chối hủy' }, { status: 500 })
      }
    }
  }

  await supabase
    .from('invoices')
    .update({
      status: 'da_huy',
      cancelled_at: new Date().toISOString(),
      cancel_reason: parsed.data.reason,
    } as never)
    .eq('id', id)

  await supabase.from('invoice_events').insert({
    invoice_id: id,
    event_type: 'cancelled',
    actor_id: ctx.userId,
    message: 'Hủy HĐ — Lý do: ' + parsed.data.reason,
  } as never)

  return NextResponse.json({ success: true })
}
