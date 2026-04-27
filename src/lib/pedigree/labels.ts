/**
 * Hệ thống đặt tên đời gia phả thuần Việt cho gà chọi (đến 10 đời).
 *
 * Tham khảo truyền thống dòng họ Việt + thuật ngữ sư kê:
 *   Đời 1: Bản thân (con gà đang xem)
 *   Đời 2: Bố mẹ
 *   Đời 3: Ông bà (nội/ngoại)
 *   Đời 4: Cụ
 *   Đời 5: Kỵ
 *   Đời 6: Tổ
 *   Đời 7: Cao tổ
 *   Đời 8: Sơ tổ
 *   Đời 9: Viễn tổ
 *   Đời 10: Thủy tổ (gốc xa nhất)
 *
 * Naming nội/ngoại: phía bố = nội, phía mẹ = ngoại (giống dòng họ người).
 * Đời ≥ 5 thì nội/ngoại không còn ý nghĩa thực tế — chỉ dùng đến đời 4.
 */

export type GenerationInfo = {
  doi: number              // số đời (1-10)
  name: string             // tên gọi: "Bản thân", "Bố mẹ", "Ông bà", "Cụ"...
  emoji: string
  shortName: string        // ngắn: "Mình", "Bố/mẹ", "Ông/bà", "Cụ"...
  desc: string             // mô tả vắn tắt
  gradient: string         // tailwind gradient class
  borderColor: string      // hex
  badgeCls: string         // text + bg
}

export const GENERATION_INFO: GenerationInfo[] = [
  // Index = generation (0..9), but đời = index+1
  { doi: 1,  name: 'Bản thân',  shortName: 'Mình',     emoji: '🐓', desc: 'Con gà đang xem', gradient: 'from-pink-400 to-rose-500',     borderColor: '#ec4899', badgeCls: 'bg-pink-100 text-pink-800 dark:bg-pink-950/40 dark:text-pink-300' },
  { doi: 2,  name: 'Bố mẹ',     shortName: 'Bố/mẹ',    emoji: '👨‍👩', desc: 'Bố và mẹ trực tiếp', gradient: 'from-blue-400 to-indigo-500',  borderColor: '#3b82f6', badgeCls: 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300' },
  { doi: 3,  name: 'Ông bà',    shortName: 'Ông/bà',   emoji: '🧓', desc: 'Ông bà nội & ngoại', gradient: 'from-violet-400 to-purple-500', borderColor: '#8b5cf6', badgeCls: 'bg-violet-100 text-violet-800 dark:bg-violet-950/40 dark:text-violet-300' },
  { doi: 4,  name: 'Cụ',        shortName: 'Cụ',       emoji: '👴', desc: 'Đời cụ (great-grandparents)', gradient: 'from-purple-400 to-fuchsia-500', borderColor: '#a855f7', badgeCls: 'bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300' },
  { doi: 5,  name: 'Kỵ',        shortName: 'Kỵ',       emoji: '🌾', desc: 'Đời kỵ (great-great-grandparents)', gradient: 'from-amber-500 to-orange-600',  borderColor: '#d97706', badgeCls: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300' },
  { doi: 6,  name: 'Tổ',        shortName: 'Tổ',       emoji: '🌿', desc: 'Đời tổ — cha mẹ của kỵ', gradient: 'from-lime-500 to-green-600',     borderColor: '#65a30d', badgeCls: 'bg-lime-100 text-lime-800 dark:bg-lime-950/40 dark:text-lime-300' },
  { doi: 7,  name: 'Cao tổ',    shortName: 'Cao tổ',   emoji: '🏛', desc: 'Tổ cao — lùi 1 đời nữa', gradient: 'from-cyan-500 to-blue-600',      borderColor: '#0891b2', badgeCls: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-300' },
  { doi: 8,  name: 'Sơ tổ',     shortName: 'Sơ tổ',    emoji: '🌳', desc: 'Sơ khởi của dòng', gradient: 'from-emerald-500 to-teal-600',   borderColor: '#059669', badgeCls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' },
  { doi: 9,  name: 'Viễn tổ',   shortName: 'Viễn tổ',  emoji: '🪨', desc: 'Tổ xa — đời thứ 9', gradient: 'from-stone-500 to-gray-600',     borderColor: '#525252', badgeCls: 'bg-stone-100 text-stone-800 dark:bg-stone-800/40 dark:text-stone-300' },
  { doi: 10, name: 'Thủy tổ',   shortName: 'Thủy tổ',  emoji: '⭐', desc: 'Tổ đầu tiên — gốc xa nhất', gradient: 'from-yellow-500 via-amber-500 to-orange-600', borderColor: '#facc15', badgeCls: 'bg-yellow-100 text-yellow-900 dark:bg-yellow-950/50 dark:text-yellow-300 font-extrabold' },
]

/**
 * Lấy thông tin đời từ generation 0..9 (gen 0 = bản thân = đời 1).
 */
export function getGenInfo(generation: number): GenerationInfo {
  const idx = Math.max(0, Math.min(generation, GENERATION_INFO.length - 1))
  return GENERATION_INFO[idx]
}

/**
 * Convert position code (vd 'ff', 'fmf', 'mfm'...) → label thuần Việt.
 *
 * Quy tắc:
 *   - 'self' → "Bản thân"
 *   - 'father' / 'mother' → "Bố" / "Mẹ"
 *   - Length N (N ≥ 2) → đời (N+1), giới tính = ký tự cuối:
 *       'f' = trống → "ông"/"cụ ông"/"kỵ trống"...
 *       'm' = mái → "bà"/"cụ bà"/"kỵ mái"...
 *   - Phía nội/ngoại (chỉ ý nghĩa cho đời 3-4):
 *       Ký tự đầu 'f' = nội (phía bố), 'm' = ngoại (phía mẹ)
 */
export function getPositionLabel(position: string): string {
  if (position === 'self') return 'Bản thân'
  if (position === 'father') return 'Bố'
  if (position === 'mother') return 'Mẹ'

  const len = position.length
  const lastChar = position[len - 1]
  const firstChar = position[0]
  const isMale = lastChar === 'f'   // f = father lineage = trống
  const sideText = firstChar === 'f' ? 'nội' : 'ngoại'

  // gen 2 → ông/bà (đời 3)
  if (len === 2) {
    return isMale ? `Ông ${sideText}` : `Bà ${sideText}`
  }
  // gen 3 → cụ (đời 4)
  if (len === 3) {
    return isMale ? `Cụ ông ${sideText}` : `Cụ bà ${sideText}`
  }
  // gen 4 → kỵ (đời 5)
  if (len === 4) {
    return isMale ? `Kỵ trống` : `Kỵ mái`
  }
  // gen 5 → tổ (đời 6)
  if (len === 5) {
    return isMale ? `Tổ trống` : `Tổ mái`
  }
  // gen 6 → cao tổ (đời 7)
  if (len === 6) {
    return isMale ? `Cao tổ trống` : `Cao tổ mái`
  }
  // gen 7 → sơ tổ (đời 8)
  if (len === 7) {
    return isMale ? `Sơ tổ trống` : `Sơ tổ mái`
  }
  // gen 8 → viễn tổ (đời 9)
  if (len === 8) {
    return isMale ? `Viễn tổ trống` : `Viễn tổ mái`
  }
  // gen 9 → thủy tổ (đời 10)
  if (len === 9) {
    return isMale ? `Thủy tổ trống` : `Thủy tổ mái`
  }
  return `Đời ${len + 1}`
}

/**
 * Tính số cá thể tối đa ở đời N (gen 0..9):
 *   gen 0 = 1, gen 1 = 2, gen 2 = 4, gen 3 = 8, ... gen 9 = 512
 */
export function maxAncestorsAtGen(generation: number): number {
  return Math.pow(2, generation)
}

/**
 * Tổng số cá thể tối đa của cây gia phả với depth N đời (1..10):
 *   1 đời = 1, 2 đời = 3, 3 đời = 7, ..., 10 đời = 1023
 */
export function maxTreeSize(depthDoi: number): number {
  return Math.pow(2, depthDoi) - 1
}
