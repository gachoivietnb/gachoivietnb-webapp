import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import QRCode from 'qrcode'
import { validateSpec, layoutCard, qrErrorCorrection, type CardSpec } from '@/lib/qr/card-spec'

type SvgFormat = 'sheet' | 'labels'

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await request.json()) as Partial<CardSpec> & { format?: SvgFormat }
  const { spec, error } = validateSpec(body)
  if (!spec) return NextResponse.json({ error: error ?? 'Invalid input' }, { status: 400 })

  const format: SvgFormat = body.format === 'labels' ? 'labels' : 'sheet'
  const svg = format === 'labels' ? await renderLabels(spec) : await renderSheet(spec)

  const fname = `qr-tags-${String(spec.from).padStart(4, '0')}-${String(spec.to).padStart(4, '0')}-${format}.svg`
  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Content-Disposition': `attachment; filename="${fname}"`,
    },
  })
}

async function qrSvgString(url: string, ec: 'M' | 'H'): Promise<string> {
  // Returns SVG markup without xml header
  const raw = await QRCode.toString(url, { type: 'svg', margin: 0, errorCorrectionLevel: ec })
  // Extract inner content + viewBox so we can embed into our SVG with scaling
  const vbMatch = raw.match(/viewBox="([^"]+)"/)
  const viewBox = vbMatch?.[1] ?? '0 0 33 33'
  const inner = raw
    .replace(/<\?xml[^?]*\?>/, '')
    .replace(/<svg[^>]*>/, '')
    .replace(/<\/svg>/, '')
  return `<g data-vb="${viewBox}">${inner}</g>`
}

async function renderCardSvg(spec: CardSpec, num: number, ox: number, oy: number): Promise<string> {
  const tag = String(num).padStart(4, '0')
  const url = `${spec.baseUrl}/ga/${tag}`
  const { qr, num: numBox, farmText, webText } = layoutCard(spec)

  let body = ''
  body += `<rect x="${ox}" y="${oy}" width="${spec.cardW}" height="${spec.cardH}" rx="1.2" ry="1.2" fill="#ffffff" stroke="#bdbdbd" stroke-width="0.2"/>`

  if (farmText) {
    const fs = clamp(farmText.w * 0.6, 4, 9)
    body += `<text x="${ox + farmText.x + farmText.w / 2}" y="${oy + farmText.y}" font-family="Helvetica, Arial, sans-serif" font-size="${fs}" font-weight="bold" fill="#3c3c3c" text-anchor="middle">${escapeXml(spec.farmName)}</text>`
  }

  if (qr) {
    const qrSvg = await qrSvgString(url, qrErrorCorrection(spec))
    const vbMatch = qrSvg.match(/data-vb="([^"]+)"/)
    const vb = vbMatch ? vbMatch[1].split(/\s+/) : ['0', '0', '33', '33']
    const vbW = Number(vb[2]) || 33
    const vbH = Number(vb[3]) || 33
    const scaleX = qr.size / vbW
    const scaleY = qr.size / vbH
    body += `<g transform="translate(${ox + qr.x}, ${oy + qr.y}) scale(${scaleX}, ${scaleY})">${qrSvg}</g>`
  }

  if (numBox) {
    // For overlay mode: draw white rounded rect on top of QR center first
    if (numBox.overlay) {
      const r = Math.min(0.6, numBox.h * 0.2)
      body += `<rect x="${ox + numBox.x}" y="${oy + numBox.y}" width="${numBox.w}" height="${numBox.h}" rx="${r}" ry="${r}" fill="#ffffff" stroke="#141414" stroke-width="0.15"/>`
    }
    const widthFactor = numBox.overlay ? 0.85 : 0.95
    const heightFactor = numBox.overlay ? 2.4 : 1.8
    const fitFs = (() => {
      let s = clamp(numBox.h * heightFactor, 6, 80)
      while (tag.length * s * 0.6 > numBox.w * widthFactor && s > 6) s -= 1
      return s
    })()
    const cy = oy + numBox.y + numBox.h / 2 + fitFs * 0.34
    body += `<text x="${ox + numBox.x + numBox.w / 2}" y="${cy}" font-family="Helvetica, Arial, sans-serif" font-size="${fitFs}" font-weight="bold" fill="#141414" text-anchor="middle">${tag}</text>`
  }

  if (webText) {
    const fs = clamp(webText.w * 0.18, 3.5, 6)
    const host = spec.baseUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')
    body += `<text x="${ox + webText.x + webText.w / 2}" y="${oy + webText.y}" font-family="Helvetica, Arial, sans-serif" font-size="${fs}" fill="#8c8c8c" text-anchor="middle">${escapeXml(host)}</text>`
  }

  return body
}

async function renderSheet(spec: CardSpec): Promise<string> {
  // Single SVG covering 1 A4 sheet at first; if more, return only first sheet (for vector engraving services that want one sheet)
  const pageW = 210
  const pageH = 297
  const marginX = 8
  const marginY = 8
  const gap = 2
  const cols = Math.max(1, Math.floor((pageW - 2 * marginX + gap) / (spec.cardW + gap)))
  const rows = Math.max(1, Math.floor((pageH - 2 * marginY + gap) / (spec.cardH + gap)))
  const perPage = cols * rows
  const totalCards = spec.to - spec.from + 1
  const totalPages = Math.ceil(totalCards / perPage)

  // Compose multipage SVG by stacking pages vertically with a gap and a "page break" marker — many laser engravers prefer a single SVG
  const sheetGap = 6
  const totalH = pageH * totalPages + sheetGap * (totalPages - 1)

  let bodies = ''
  for (let p = 0; p < totalPages; p++) {
    const pageOffsetY = p * (pageH + sheetGap)
    bodies += `<rect x="0" y="${pageOffsetY}" width="${pageW}" height="${pageH}" fill="#ffffff" stroke="#dddddd" stroke-width="0.1" stroke-dasharray="2 2"/>`
    for (let s = 0; s < perPage; s++) {
      const idx = p * perPage + s
      if (idx >= totalCards) break
      const num = spec.from + idx
      const col = s % cols
      const row = Math.floor(s / cols)
      const x = marginX + col * (spec.cardW + gap)
      const y = pageOffsetY + marginY + row * (spec.cardH + gap)
      bodies += await renderCardSvg(spec, num, x, y)
    }
  }

  return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${pageW}mm" height="${totalH}mm" viewBox="0 0 ${pageW} ${totalH}">
  <desc>Gà Chọi Việt NB — QR card sheet ${spec.from}..${spec.to}</desc>
  ${bodies}
</svg>`
}

async function renderLabels(spec: CardSpec): Promise<string> {
  // Single SVG with cards laid out in a vertical strip at exact dimensions — for label printers / engraving plotters
  const totalCards = spec.to - spec.from + 1
  const gap = 1
  const totalH = spec.cardH * totalCards + gap * (totalCards - 1)
  let bodies = ''
  for (let i = 0; i < totalCards; i++) {
    const num = spec.from + i
    const y = i * (spec.cardH + gap)
    bodies += await renderCardSvg(spec, num, 0, y)
  }
  return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${spec.cardW}mm" height="${totalH}mm" viewBox="0 0 ${spec.cardW} ${totalH}">
  <desc>Gà Chọi Việt NB — QR labels strip ${spec.from}..${spec.to}</desc>
  ${bodies}
</svg>`
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
