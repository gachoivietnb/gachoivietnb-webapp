export type BreedColor = {
  bg: string
  border: string
  badge: string
}

const PALETTE: Record<string, BreedColor> = {
  orange: {
    bg: 'bg-gradient-to-br from-orange-400 to-red-500',
    border: 'border-orange-200 dark:border-orange-900',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  },
  purple: {
    bg: 'bg-gradient-to-br from-indigo-400 to-purple-600',
    border: 'border-purple-200 dark:border-purple-900',
    badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  },
  green: {
    bg: 'bg-gradient-to-br from-emerald-400 to-green-600',
    border: 'border-emerald-200 dark:border-emerald-900',
    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
  red: {
    bg: 'bg-gradient-to-br from-rose-500 to-red-700',
    border: 'border-rose-200 dark:border-rose-900',
    badge: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
  },
  amber: {
    bg: 'bg-gradient-to-br from-amber-400 to-orange-600',
    border: 'border-amber-200 dark:border-amber-900',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  },
  teal: {
    bg: 'bg-gradient-to-br from-teal-400 to-cyan-600',
    border: 'border-teal-200 dark:border-teal-900',
    badge: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
  },
  darkgreen: {
    bg: 'bg-gradient-to-br from-green-600 to-emerald-900',
    border: 'border-green-300 dark:border-green-900',
    badge: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  },
}

const BREED_CODE_MAP: Record<string, keyof typeof PALETTE> = {
  asil: 'orange',
  ma_lai: 'purple',
  mlai: 'purple',
  peru: 'green',
  noi: 'amber',
  tre: 'darkgreen',
  tan_chau: 'red',
  tanc: 'red',
  hmong: 'teal',
  laif1: 'teal',
  lai_f1: 'teal',
}

export function getBreedColor(code: string | null | undefined): BreedColor {
  const key = (code ?? '').toLowerCase()
  const paletteKey = BREED_CODE_MAP[key] ?? hashPalette(key)
  return PALETTE[paletteKey]
}

function hashPalette(s: string): keyof typeof PALETTE {
  const keys = Object.keys(PALETTE) as Array<keyof typeof PALETTE>
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return keys[h % keys.length]
}

export const TIER_LABEL: Record<string, string> = {
  dac_biet: 'ĐẶC BIỆT',
  cao_cap: 'CAO CẤP',
  trung_cap: 'TRUNG CẤP',
  pho_thong: 'PHỔ THÔNG',
}

export const TIER_COLOR: Record<string, string> = {
  dac_biet: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
  cao_cap: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
  trung_cap: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
  pho_thong: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
}
