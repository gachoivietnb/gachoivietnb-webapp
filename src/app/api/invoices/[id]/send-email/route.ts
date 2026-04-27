import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/rbac/guard'

/**
 * Gửi HĐ qua email — sử dụng Resend (đã có trong env).
 * TODO: enable thực — cần đính kèm PDF + link tra cứu.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requirePermission('hoa_don', 'write')
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const { id } = await params
  const supabase = await createClient()

  const { data: inv } = await supabase
    .from('invoices_full')
    .select('id, internal_no, invoice_no, buyer_email, buyer_name, total, total_words, cqt_lookup_code')
    .eq('id', id)
    .single()
  if (!inv) return NextResponse.json({ error: 'Không tìm thấy HĐ' }, { status: 404 })

  const invoice = inv as {
    id: string
    internal_no: string
    invoice_no: string | null
    buyer_email: string | null
    buyer_name: string | null
    total: number
    total_words: string
    cqt_lookup_code: string | null
  }

  if (!invoice.buyer_email) {
    return NextResponse.json({ error: 'Người mua chưa có email' }, { status: 400 })
  }

  // Mock send — log event. Khi tích hợp Resend thật sẽ gọi API ở đây.
  // const resend = new Resend(process.env.RESEND_API_KEY)
  // await resend.emails.send({ from: ..., to: invoice.buyer_email, subject: ..., html: ..., attachments: [pdf] })

  await supabase
    .from('invoices')
    .update({
      buyer_email_sent_at: new Date().toISOString(),
      buyer_email_log: {
        to: invoice.buyer_email,
        sent_at: new Date().toISOString(),
        mock: true,
      },
    } as never)
    .eq('id', id)

  await supabase.from('invoice_events').insert({
    invoice_id: id,
    event_type: 'sent_to_buyer',
    actor_id: ctx.userId,
    message: `Đã gửi HĐ qua email tới ${invoice.buyer_email}`,
  } as never)

  return NextResponse.json({ success: true, sent_to: invoice.buyer_email })
}
