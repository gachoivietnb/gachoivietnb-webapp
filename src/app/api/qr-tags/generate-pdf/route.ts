import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { jsPDF } from 'jspdf'
import QRCode from 'qrcode'
import { validateSpec, layoutCard, qrErrorCorrection, type CardSpec } from '@/lib/qr/card-spec'

type PdfFormat = 'sheet' | 'labels'

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await request.json()) as Partial<CardSpec> & { format?: PdfFormat }
  const { spec, error } = validateSpec(body)
  if (!spec) return NextResponse.json({ error: error ?? 'Invalid input' }, { status: 400 })

  const format: PdfFormat = body.format === 'labels' ? 'labels' : 'sheet'

  const buffer =
    format === 'labels'
      ? await renderLabelsPdf(spec)
      : await renderSheetPdf(spec)

  const fname = `qr-tags-${String(spec.from).padStart(4, '0')}-${String(spec.to).padStart(4, '0')}-${format}.pdf`
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${fname}"`,
    },
  })
}

async function renderCardOnto(
  doc: jsPDF,
  spec: CardSpec,
  num: number,
  origin: { x: number; y: number }
): Promise<void> {
  const tag = String(num).padStart(4, '0')
  const url = `${spec.baseUrl}/ga/${tag}`
  const { qr, num: numBox, farmText, webText } = layoutCard(spec)

  // Card border (subtle)
  doc.setDrawColor(180)
  doc.setLineWidth(0.2)
  doc.roundedRect(origin.x, origin.y, spec.cardW, spec.cardH, 1.2, 1.2, 'S')

  if (farmText) {
    doc.setFont('helvetica', 'bold')
    const fontSize = clamp(farmText.w * 0.6, 4, 9)
    doc.setFontSize(fontSize)
    doc.setTextColor(60)
    doc.text(spec.farmName, origin.x + farmText.x + farmText.w / 2, origin.y + farmText.y, {
      align: 'center',
    })
  }

  if (qr) {
    const qrPxScale = Math.max(120, Math.min(500, Math.round(qr.size * 14)))
    const qrDataUrl = await QRCode.toDataURL(url, {
      width: qrPxScale,
      margin: 0,
      errorCorrectionLevel: qrErrorCorrection(spec),
    })
    doc.addImage(qrDataUrl, 'PNG', origin.x + qr.x, origin.y + qr.y, qr.size, qr.size)
  }

  if (numBox) {
    // For overlay (center) mode: draw a white rounded rect first to mask the QR
    if (numBox.overlay) {
      doc.setFillColor(255, 255, 255)
      doc.setDrawColor(20)
      doc.setLineWidth(0.15)
      doc.roundedRect(
        origin.x + numBox.x,
        origin.y + numBox.y,
        numBox.w,
        numBox.h,
        Math.min(0.6, numBox.h * 0.2),
        Math.min(0.6, numBox.h * 0.2),
        'FD'
      )
    }
    // Find largest font size that fits
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(20)
    const target = numBox.w * (numBox.overlay ? 0.85 : 0.95)
    let fs = clamp(numBox.h * (numBox.overlay ? 2.4 : 1.8), 6, 80)
    doc.setFontSize(fs)
    let textW = doc.getTextWidth(tag)
    while (textW > target && fs > 6) {
      fs -= 1
      doc.setFontSize(fs)
      textW = doc.getTextWidth(tag)
    }
    const cy = origin.y + numBox.y + numBox.h / 2 + fs * 0.16
    doc.text(tag, origin.x + numBox.x + numBox.w / 2, cy, { align: 'center' })
  }

  if (webText) {
    doc.setFont('helvetica', 'normal')
    const fontSize = clamp(webText.w * 0.18, 3.5, 6)
    doc.setFontSize(fontSize)
    doc.setTextColor(140)
    const host = spec.baseUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')
    doc.text(host, origin.x + webText.x + webText.w / 2, origin.y + webText.y, {
      align: 'center',
    })
  }
}

async function renderSheetPdf(spec: CardSpec): Promise<Buffer> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = 210
  const pageH = 297
  const marginX = 8
  const marginY = 8
  const gap = 2

  const cols = Math.max(1, Math.floor((pageW - 2 * marginX + gap) / (spec.cardW + gap)))
  const rows = Math.max(1, Math.floor((pageH - 2 * marginY + gap) / (spec.cardH + gap)))
  const perPage = cols * rows

  for (let i = 0; i < spec.to - spec.from + 1; i++) {
    const num = spec.from + i
    const slot = i % perPage
    if (slot === 0 && i > 0) doc.addPage()
    const col = slot % cols
    const row = Math.floor(slot / cols)
    const x = marginX + col * (spec.cardW + gap)
    const y = marginY + row * (spec.cardH + gap)
    await renderCardOnto(doc, spec, num, { x, y })
  }

  return Buffer.from(doc.output('arraybuffer'))
}

async function renderLabelsPdf(spec: CardSpec): Promise<Buffer> {
  // 1 card per page, page sized exactly to card so printers can use roll/sheet labels
  const doc = new jsPDF({ unit: 'mm', format: [spec.cardW, spec.cardH] })
  for (let i = 0; i < spec.to - spec.from + 1; i++) {
    const num = spec.from + i
    if (i > 0) doc.addPage([spec.cardW, spec.cardH])
    await renderCardOnto(doc, spec, num, { x: 0, y: 0 })
  }
  return Buffer.from(doc.output('arraybuffer'))
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}
