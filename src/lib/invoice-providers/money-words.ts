/**
 * Đổi số tiền VND sang chữ tiếng Việt (cho HĐ điện tử).
 * VD: 1234567 → "Một triệu hai trăm ba mươi bốn nghìn năm trăm sáu mươi bảy đồng"
 */

const DIGIT_WORDS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín']

function readThree(n: number, full: boolean): string {
  const tram = Math.floor(n / 100)
  const chuc = Math.floor((n % 100) / 10)
  const dvi = n % 10
  let out = ''
  if (full || tram > 0) {
    out += DIGIT_WORDS[tram] + ' trăm'
    if (chuc === 0 && dvi > 0) out += ' lẻ'
  }
  if (chuc > 1) {
    out += ' ' + DIGIT_WORDS[chuc] + ' mươi'
    if (dvi === 1) out += ' mốt'
    else if (dvi === 5) out += ' lăm'
    else if (dvi > 0) out += ' ' + DIGIT_WORDS[dvi]
  } else if (chuc === 1) {
    out += ' mười'
    if (dvi === 5) out += ' lăm'
    else if (dvi > 0) out += ' ' + DIGIT_WORDS[dvi]
  } else if (chuc === 0 && dvi > 0) {
    if (full || tram > 0) out += ' ' + DIGIT_WORDS[dvi]
    else out += DIGIT_WORDS[dvi]
  }
  return out.trim()
}

export function moneyToVietnameseWords(amountRaw: number | string): string {
  const amount = Math.floor(Math.abs(Number(amountRaw) || 0))
  if (amount === 0) return 'Không đồng'

  const groups: number[] = []
  let n = amount
  while (n > 0) {
    groups.unshift(n % 1000)
    n = Math.floor(n / 1000)
  }

  const scales = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ']
  const parts: string[] = []
  groups.forEach((g, idx) => {
    const scaleIdx = groups.length - 1 - idx
    if (g === 0) return
    const isFirst = parts.length === 0
    const text = readThree(g, !isFirst)
    parts.push(text + (scales[scaleIdx] ? ' ' + scales[scaleIdx] : ''))
  })

  let result = parts.join(' ').replace(/\s+/g, ' ').trim() + ' đồng'
  // Capitalize first
  result = result.charAt(0).toUpperCase() + result.slice(1)
  return result
}
