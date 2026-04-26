/**
 * Convert an integer amount (VND) to Vietnamese words.
 * 12,300,000 → "mười hai triệu ba trăm nghìn"
 */
const UNITS = ['', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín']

function readTriple(num: number, full: boolean): string {
  const h = Math.floor(num / 100)
  const t = Math.floor((num % 100) / 10)
  const o = num % 10
  const parts: string[] = []

  if (full || h > 0) {
    parts.push(`${UNITS[h] || 'không'} trăm`)
  }
  if (t > 1) {
    parts.push(`${UNITS[t]} mươi`)
    if (o === 1) parts.push('mốt')
    else if (o === 5) parts.push('lăm')
    else if (o > 0) parts.push(UNITS[o])
  } else if (t === 1) {
    parts.push('mười')
    if (o === 5) parts.push('lăm')
    else if (o > 0) parts.push(UNITS[o])
  } else {
    if (o > 0) {
      if (full || h > 0) parts.push('lẻ')
      parts.push(UNITS[o])
    }
  }

  return parts.join(' ').trim()
}

export function numberToVietnameseWords(num: number): string {
  if (!Number.isFinite(num)) return ''
  if (num === 0) return 'không'
  if (num < 0) return 'âm ' + numberToVietnameseWords(-num)

  const groups: number[] = []
  let x = Math.floor(num)
  while (x > 0) {
    groups.unshift(x % 1000)
    x = Math.floor(x / 1000)
  }

  const scales = ['', 'nghìn', 'triệu', 'tỷ']
  // Collapse into groups of billion (trillion+ = "tỷ tỷ" style, rare for VND)
  const parts: string[] = []
  for (let i = 0; i < groups.length; i++) {
    const g = groups[i]
    const scaleIdx = groups.length - 1 - i
    if (g === 0) continue
    const isFirst = parts.length === 0
    const word = readTriple(g, !isFirst)
    // Every 3rd group (tỷ) may repeat if very large
    const scale = scales[scaleIdx % scales.length] || (scaleIdx >= 3 ? 'tỷ' : '')
    parts.push(`${word} ${scale}`.trim())
  }

  const s = parts.join(' ').replace(/\s+/g, ' ').trim()
  // Capitalize first letter
  return s.charAt(0).toUpperCase() + s.slice(1)
}
