export type CardContent =
  | 'qr_and_number'
  | 'qr_only'
  | 'number_only'
  | 'qr_with_number_center'
export type CardLayout = 'side' | 'stacked'

export type CardSpec = {
  from: number
  to: number
  cardW: number // mm
  cardH: number // mm
  padding: number // mm safe margin inside card
  content: CardContent
  layout: CardLayout
  showFarmName: boolean
  showWebsite: boolean
  baseUrl: string
  farmName: string
}

const MIN_DIM = 10
const MAX_DIM = 210
const MIN_PADDING = 0
const MAX_RANGE = 2000

export type ValidationError = string

/**
 * Error correction level for QR. Center-overlay mode needs 'H' (30% recovery)
 * because the center is occluded by the number text. Other modes use 'M' (15%)
 * which is denser (smaller QR for same data).
 */
export function qrErrorCorrection(spec: CardSpec): 'M' | 'H' {
  return spec.content === 'qr_with_number_center' ? 'H' : 'M'
}

export function validateSpec(input: Partial<CardSpec>): {
  spec: CardSpec | null
  error: ValidationError | null
} {
  const from = Number(input.from)
  const to = Number(input.to)
  if (!Number.isFinite(from) || !Number.isFinite(to) || from < 1 || to < from) {
    return { spec: null, error: 'Khoảng số không hợp lệ (from ≤ to, ≥ 1)' }
  }
  if (to - from + 1 > MAX_RANGE) {
    return { spec: null, error: `Vượt quá ${MAX_RANGE} thẻ — chia nhỏ thành nhiều lần` }
  }

  const cardW = Number(input.cardW ?? 45)
  const cardH = Number(input.cardH ?? 28)
  if (cardW < MIN_DIM || cardW > MAX_DIM || cardH < MIN_DIM || cardH > MAX_DIM) {
    return {
      spec: null,
      error: `Kích thước thẻ phải trong khoảng ${MIN_DIM}–${MAX_DIM} mm`,
    }
  }
  const padding = Number(input.padding ?? 1.5)
  if (padding < MIN_PADDING || padding > Math.min(cardW, cardH) / 4) {
    return {
      spec: null,
      error: `Viền không hợp lệ (0 ≤ viền ≤ ${(Math.min(cardW, cardH) / 4).toFixed(1)} mm)`,
    }
  }

  const validContents: CardContent[] = [
    'qr_and_number',
    'qr_only',
    'number_only',
    'qr_with_number_center',
  ]
  const content: CardContent =
    input.content && validContents.includes(input.content as CardContent)
      ? (input.content as CardContent)
      : 'qr_and_number'
  const layout: CardLayout = input.layout === 'stacked' ? 'stacked' : 'side'

  return {
    spec: {
      from,
      to,
      cardW,
      cardH,
      padding,
      content,
      layout,
      showFarmName: Boolean(input.showFarmName ?? true),
      showWebsite: Boolean(input.showWebsite ?? true),
      baseUrl: String(input.baseUrl || 'https://gachoivietnb.com'),
      farmName: String(input.farmName || 'GA CHOI VIET NB').slice(0, 32),
    },
    error: null,
  }
}

/** Resolve content area inside card after padding. Returns mm coords. */
export function contentBox(spec: CardSpec): {
  x: number
  y: number
  w: number
  h: number
} {
  return {
    x: spec.padding,
    y: spec.padding,
    w: spec.cardW - spec.padding * 2,
    h: spec.cardH - spec.padding * 2,
  }
}

/**
 * Compute QR size + position + number text box inside card.
 *
 * For `qr_with_number_center` mode: QR fills full inner area, and `num`
 * box describes the WHITE OVERLAY rect that sits on top of the QR center.
 * The renderer must draw QR first (with EC=H), then white rect, then text.
 */
export function layoutCard(spec: CardSpec): {
  qr: { x: number; y: number; size: number } | null
  num: { x: number; y: number; w: number; h: number; overlay?: boolean } | null
  farmText: { x: number; y: number; w: number } | null
  webText: { x: number; y: number; w: number } | null
} {
  const box = contentBox(spec)

  const farmH = spec.showFarmName ? Math.min(3, box.h * 0.18) : 0
  const webH = spec.showWebsite ? Math.min(2.2, box.h * 0.13) : 0
  const innerY = box.y + farmH
  const innerH = Math.max(0, box.h - farmH - webH)
  const innerX = box.x
  const innerW = box.w

  let qr: { x: number; y: number; size: number } | null = null
  let num: { x: number; y: number; w: number; h: number; overlay?: boolean } | null = null

  if (spec.content === 'qr_only') {
    const size = Math.min(innerW, innerH)
    qr = { x: innerX + (innerW - size) / 2, y: innerY + (innerH - size) / 2, size }
  } else if (spec.content === 'number_only') {
    num = { x: innerX, y: innerY, w: innerW, h: innerH }
  } else if (spec.content === 'qr_with_number_center') {
    // QR fills full inner box; number overlays the center as a white rect.
    // With EC=H the QR can lose ~30% data — keep overlay ≤ 25% of QR area for safety.
    const size = Math.min(innerW, innerH)
    qr = { x: innerX + (innerW - size) / 2, y: innerY + (innerH - size) / 2, size }
    // Overlay box: width ≈ 50% of QR, height ≈ 26% — gives ~13% area = safe under EC-H 30% recovery
    const ow = size * 0.5
    const oh = size * 0.26
    num = {
      x: qr.x + (size - ow) / 2,
      y: qr.y + (size - oh) / 2,
      w: ow,
      h: oh,
      overlay: true,
    }
  } else {
    // qr_and_number
    if (spec.layout === 'side') {
      const qrSize = Math.min(innerH, innerW * 0.5)
      qr = { x: innerX, y: innerY + (innerH - qrSize) / 2, size: qrSize }
      num = {
        x: innerX + qrSize + 1,
        y: innerY,
        w: innerW - qrSize - 1,
        h: innerH,
      }
    } else {
      // stacked
      const qrSize = Math.min(innerW, innerH * 0.66)
      qr = { x: innerX + (innerW - qrSize) / 2, y: innerY, size: qrSize }
      num = {
        x: innerX,
        y: innerY + qrSize + 0.5,
        w: innerW,
        h: Math.max(0, innerH - qrSize - 0.5),
      }
    }
  }

  const farmText = spec.showFarmName
    ? { x: box.x, y: box.y + farmH * 0.75, w: box.w }
    : null
  const webText = spec.showWebsite
    ? { x: box.x, y: box.y + box.h - webH * 0.25, w: box.w }
    : null

  return { qr, num, farmText, webText }
}
