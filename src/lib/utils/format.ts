export function formatVnd(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '—'
  return new Intl.NumberFormat('vi-VN').format(amount) + ' đ'
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
