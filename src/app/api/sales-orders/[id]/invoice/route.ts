import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { jsPDF } from 'jspdf'

function formatVnd(n: number): string {
  return new Intl.NumberFormat('vi-VN').format(n) + ' d'
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: order } = await supabase
    .from('sales_orders')
    .select('*, customer:customers(*), sales_items(*, chicken:chickens(chicken_code, name, breeds(name_vi)))')
    .eq('id', id)
    .maybeSingle()

  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const o = order as {
    order_code: string
    order_date: string
    total_amount: number
    paid_amount: number
    customer: { name: string | null; phone: string | null; address: string | null } | null
    sales_items: Array<{
      unit_price: number
      chicken: { chicken_code: string; name: string | null; breeds: { name_vi: string } | null } | null
    }>
  }

  const { data: settings } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'farm_info')
    .maybeSingle()
  const farm = ((settings as { value: Record<string, string> } | null)?.value ?? {}) as {
    name?: string
    address?: string
    phone?: string
  }

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(farm.name ?? 'GA CHOI VIET NB', 105, 20, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`Dia chi: ${farm.address ?? ''}`, 105, 26, { align: 'center' })
  if (farm.phone) doc.text(`SDT: ${farm.phone}`, 105, 31, { align: 'center' })

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('BIEN LAI BAN HANG', 105, 45, { align: 'center' })
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`So: ${o.order_code}`, 105, 52, { align: 'center' })
  doc.text(`Ngay: ${new Date(o.order_date).toLocaleDateString('vi-VN')}`, 105, 57, { align: 'center' })

  doc.text(`Khach hang: ${o.customer?.name ?? '---'}`, 15, 70)
  doc.text(`Dien thoai: ${o.customer?.phone ?? '---'}`, 15, 76)
  if (o.customer?.address) doc.text(`Dia chi: ${o.customer.address}`, 15, 82)

  let y = 95
  doc.setFont('helvetica', 'bold')
  doc.setFillColor(230, 230, 230)
  doc.rect(15, y - 5, 180, 8, 'F')
  doc.text('STT', 18, y)
  doc.text('Ma', 35, y)
  doc.text('Ten/Giong', 75, y)
  doc.text('Don gia', 145, y, { align: 'right' })
  doc.text('Thanh tien', 190, y, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  y += 8
  o.sales_items.forEach((item, idx) => {
    doc.text(`${idx + 1}`, 18, y)
    doc.text(item.chicken?.chicken_code ?? '', 35, y)
    doc.text(`${item.chicken?.name ?? ''} (${item.chicken?.breeds?.name_vi ?? ''})`.substring(0, 30), 75, y)
    doc.text(formatVnd(item.unit_price), 145, y, { align: 'right' })
    doc.text(formatVnd(item.unit_price), 190, y, { align: 'right' })
    y += 7
  })

  y += 5
  doc.line(15, y - 3, 195, y - 3)
  doc.setFont('helvetica', 'bold')
  doc.text('Tong cong:', 145, y, { align: 'right' })
  doc.text(formatVnd(o.total_amount), 190, y, { align: 'right' })
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.text('Da thanh toan:', 145, y, { align: 'right' })
  doc.text(formatVnd(o.paid_amount), 190, y, { align: 'right' })
  y += 6
  doc.setFont('helvetica', 'bold')
  doc.text('Con lai:', 145, y, { align: 'right' })
  doc.text(formatVnd(o.total_amount - o.paid_amount), 190, y, { align: 'right' })

  y += 30
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text('Cam on quy khach! --- gachoivietnb.com', 105, y, { align: 'center' })

  y += 15
  doc.text('Nguoi mua', 50, y, { align: 'center' })
  doc.text('Nguoi ban', 160, y, { align: 'center' })
  doc.text('(Ky, ghi ro ho ten)', 50, y + 5, { align: 'center' })
  doc.text('(Ky, ghi ro ho ten)', 160, y + 5, { align: 'center' })

  const pdfBuffer = Buffer.from(doc.output('arraybuffer'))
  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="bien-lai-${o.order_code}.pdf"`,
    },
  })
}
