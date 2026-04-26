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
    .from('purchases')
    .select(
      `
      id, purchase_code, purchase_date, total_quantity, total_amount, notes,
      supplier:suppliers (name, phone, address),
      items:purchase_items (
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
  if (!data) return NextResponse.json({ error: 'Không tìm thấy phiếu' }, { status: 404 })

  type Purchase = {
    purchase_code: string
    purchase_date: string
    total_quantity: number
    total_amount: number
    notes: string | null
    supplier: { name: string; phone: string | null; address: string | null } | null
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

  const p = data as unknown as Purchase
  const totalAmount = n(p.total_amount)
  const totalQty = n(p.total_quantity) || p.items.length

  const meta: ReportMeta = {
    title: `PHIẾU NHẬP GÀ`,
    subtitle: `Số: ${p.purchase_code}`,
    period: fmtDate(p.purchase_date),
    summary: [
      ['Nhà cung cấp', p.supplier?.name ?? '—'],
      ...(p.supplier?.phone ? ([['Điện thoại', p.supplier.phone]] as Array<[string, string]>) : []),
      ...(p.supplier?.address ? ([['Địa chỉ', p.supplier.address]] as Array<[string, string]>) : []),
      ['Ngày nhập', fmtDate(p.purchase_date)],
      ['Tổng số lượng', `${totalQty} con`],
      ['Tổng thanh toán', fmtVnd(totalAmount)],
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
      rows: p.items.map((it, i) => [
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

  if (p.notes) {
    sections.push({
      title: 'GHI CHÚ',
      headers: ['Nội dung'],
      rows: [[p.notes]],
    })
  }

  const filenameBase = `phieu-nhap_${p.purchase_code}`

  if (format === 'pdf') {
    const buf = buildPdf(meta, sections, farm)
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filenameBase}.pdf"`,
      },
    })
  }

  const buf = await buildExcel(meta, sections, farm)
  return new NextResponse(buf, {
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filenameBase}.xlsx"`,
    },
  })
}
