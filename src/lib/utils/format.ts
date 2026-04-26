export function formatVnd(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '—'
  return new Intl.NumberFormat('vi-VN').format(amount) + ' đ'
}

/**
 * Compact VND format for tight spaces (mobile hero stats, etc.):
 *   1_500_000 → "1,5tr"
 *   12_000_000 → "12tr"
 *   1_500_000_000 → "1,5tỷ"
 */
export function formatVndCompact(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '—'
  if (amount >= 1_000_000_000) {
    const v = amount / 1_000_000_000
    return v.toFixed(v >= 10 ? 0 : 1).replace('.', ',') + 'tỷ'
  }
  if (amount >= 1_000_000) {
    const v = amount / 1_000_000
    return v.toFixed(v >= 10 ? 0 : 1).replace('.', ',') + 'tr'
  }
  if (amount >= 1_000) {
    const v = amount / 1_000
    return v.toFixed(0) + 'k'
  }
  return String(amount)
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('vi-VN')
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString('vi-VN')
}

export function formatAge(birthDate: string | Date | null | undefined): string {
  if (!birthDate) return '—'
  const d = typeof birthDate === 'string' ? new Date(birthDate) : birthDate
  const now = new Date()
  const months =
    (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth())
  if (months < 1) {
    const days = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
    return `${days} ngày`
  }
  return `${months} tháng`
}
