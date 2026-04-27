import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requirePermission } from '@/lib/rbac/guard'

const Schema = z.object({ ids: z.array(z.string().uuid()).min(1) })

export async function POST(request: Request) {
  const ctx = await requirePermission('hoa_don', 'write')
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const parsed = Schema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 })

  const supabase = await createClient()
  const { data } = await supabase
    .from('invoices_full')
    .select('id, buyer_email, status')
    .in('id', parsed.data.ids)

  const rows = (data ?? []) as Array<{ id: string; buyer_email: string | null; status: string }>
  let sent = 0
  let skipped = 0
  for (const r of rows) {
    if (r.status !== 'da_phat_hanh') {
      skipped++
      continue
    }
    if (!r.buyer_email) {
      skipped++
      continue
    }
    // Mock send — log event
    await supabase
      .from('invoices')
      .update({
        buyer_email_sent_at: new Date().toISOString(),
        buyer_email_log: { to: r.buyer_email, sent_at: new Date().toISOString(), mock: true },
      } as never)
      .eq('id', r.id)
    await supabase.from('invoice_events').insert({
      invoice_id: r.id,
      event_type: 'sent_to_buyer',
      actor_id: ctx.userId,
      message: `Bulk email tới ${r.buyer_email}`,
    } as never)
    sent++
  }

  return NextResponse.json({ message: `Đã gửi ${sent}, bỏ qua ${skipped}` })
}
