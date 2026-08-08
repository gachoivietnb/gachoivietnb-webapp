import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import {
  buildExcel,
  buildPdf,
  type FarmInfo,
  type ReportMeta,
  type ReportSection,
} from '@/lib/reports/finance-export'
import { numberToVietnameseWords } from '@/lib/utils/number-to-words'

function n(v: unknown): number {
  if (v == null) return 0
  const x = Number(v)
  return Number.isFinite(x) ? x : 0
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return ''
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return d
  return dt.toLocaleDateString('vi-VN')
}

function fmtVnd(v: number): string {
  return `${Math.round(v).toLocaleString('vi-VN')} đ`
}

const STATUS_LABELS: Record<string, string> = {
  hoi_mua: 'Hỏi mua',
  dat_coc: 'Đã đặt cọc',
  da_giao: 'Đã giao',
  huy: 'Đã hủy',
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { searchParams } = new URL(request.url)
  const format = (searchParams.get('format') ?? 'excel').toLowerCase()
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: farmRow } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'farm_info')
    .maybeSingle()
  const farm =
    ((farmRow as { value?: FarmInfo } | null)?.value as FarmInfo) ?? { name: 'Gà Chọi Việt NB' }

  const { data, error } = await supabase
    .from('sales_orders')
    .select(
      `
      id, order_code, order_date, status, total_amount, deposit_amount, paid_amount,
      delivered_date, payment_method, notes,
      customer:customers (name, tier, phone, zalo, address),
      items:sales_items (
        id, unit_price, notes,
        chicken:chickens (
          chicken_code, name, weight_kg, color, gender,
          breed:breeds (code, name_vi)
        )
      )
      `
    )
    .eq('id', id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Không tìm thấy đơn' }, { status: 404 })

  type Order = {
    order_code: string
    order_date: string
    status: string
    total_amount: number
    deposit_amount: number | null
    paid_amount: number | null
    delivered_date: string | null
    payment_method: string | null
    notes: string | null
    customer: {
      name: string
      tier: string | null
      phone: string | null
      zalo: string | null
      address: string | null
    } | null
    items: Array<{
      id: string
      unit_price: number
      notes: string | null
      chicken: {
        chicken_code: string
        name: string | null
        weight_kg: number | null
        color: string | null
        gender: string | null
        breed: { code: string | null; name_vi: string } | null
      } | null
    }>
  }

  const o = data as unknown as Order
  const totalAmount = n(o.total_amount)
  const deposit = n(o.deposit_amount)
  const paid = n(o.paid_amount)
  const remaining = totalAmount - paid

  const meta: ReportMeta = {
    title: 'HOÁ ĐƠN BÁN GÀ',
    subtitle: `Số: ${o.order_code}`,
    period: fmtDate(o.order_date),
    summary: [
      ['Khách hàng', `${o.customer?.name ?? '—'}${o.customer?.tier === 'vip' ? ' (★ VIP)' : ''}`],
      ...(o.customer?.phone ? ([['Điện thoại', o.customer.phone]] as Array<[string, string]>) : []),
      ...(o.customer?.address
        ? ([['Địa chỉ', o.customer.address]] as Array<[string, string]>)
        : []),
      ['Ngày đặt', fmtDate(o.order_date)],
      ...(o.delivered_date
        ? ([['Ngày giao', fmtDate(o.delivered_date)]] as Array<[string, string]>)
        : []),
      ['Trạng thái', STATUS_LABELS[o.status] ?? o.status],
      ['Số lượng', `${o.items.length} con`],
      ['Tổng thành tiền', fmtVnd(totalAmount)],
      ...(deposit > 0 ? ([['Đặt cọc', fmtVnd(deposit)]] as Array<[string, string]>) : []),
      ['Đã thanh toán', fmtVnd(paid)],
      ...(remaining > 0
        ? ([['Còn nợ', fmtVnd(remaining)]] as Array<[string, string]>)
        : []),
      ['Bằng chữ', `${numberToVietnameseWords(Math.round(totalAmount))} đồng`],
    ],
  }

  const sections: ReportSection[] = [
    {
      title: 'CHI TIẾT TỪNG CON GÀ',
      headers: [
        'STT',
        'Mã gà',
        'Tên',
        'Giống',
        'Giới tính',
        'Màu lông',
        'Cân nặng (kg)',
        'Đơn giá (đ)',
      ],
      rows: o.items.map((it, i) => [
        i + 1,
        it.chicken?.chicken_code ?? '—',
        it.chicken?.name ?? '—',
        it.chicken?.breed?.name_vi ?? '—',
        it.chicken?.gender === 'trong'
          ? 'Trống'
          : it.chicken?.gender === 'mai'
            ? 'Mái'
            : '—',
        it.chicken?.color ?? '—',
        it.chicken?.weight_kg != null ? Number(it.chicken.weight_kg) : '—',
        n(it.unit_price),
      ]),
      footer: ['', '', '', '', '', '', 'TỔNG CỘNG', totalAmount],
      rightAlign: [6, 7],
    },
  ]

  if (o.notes) {
    sections.push({
      title: 'GHI CHÚ',
      headers: ['Nội dung'],
      rows: [[o.notes]],
    })
  }

  const filenameBase = `hoa-don_${o.order_code}`

  if (format === 'pdf') {
    const buf = buildPdf(meta, sections, farm)
    return new NextResponse(buf as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filenameBase}.pdf"`,
      },
    })
  }

  const buf = await buildExcel(meta, sections, farm)
  return new NextResponse(buf as BodyInit, {
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filenameBase}.xlsx"`,
    },
  })
}
