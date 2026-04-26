/**
 * Remove Vietnamese diacritics + lowercase. Keeps spaces.
 * Use for diacritics-insensitive search.
 * "Hoàng Đế" → "hoang de"
 */
export function removeDiacritics(s: string): string {
  if (!s) return ''
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // combining marks
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
}

/**
 * Convert Vietnamese text to URL-safe slug.
 * "Bí Quyết Nuôi Gà Asil" → "bi-quyet-nuoi-ga-asil"
 */
export function slugifyVi(input: string): string {
  if (!input) return ''
  return removeDiacritics(input)
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120)
}
