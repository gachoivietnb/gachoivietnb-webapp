/* ============================================================
 * Diary types & meta — CLIENT-SAFE
 * ============================================================ */

export type DiaryCategory =
  | 'cham_soc'
  | 'cho_an'
  | 've_sinh'
  | 'huan_luyen'
  | 'sinh_san'
  | 'thu_y'
  | 'kinh_doanh'
  | 'su_co'
  | 'quan_sat'
  | 'cong_viec'
  | 'khac'

export type DiaryMood = 'rat_tot' | 'tot' | 'binh_thuong' | 'lo_lang' | 'rat_xau'

export type DiaryEntry = {
  id: string
  farm_id: string
  author_id: string | null
  title: string | null
  content: string
  category: DiaryCategory
  mood: DiaryMood | null
  tags: string[]
  related_chicken_id: string | null
  related_area_id: string | null
  diary_date: string
  weather: string | null
  attachments: string[]
  is_pinned: boolean
  created_at: string
  updated_at: string
}

export type DiaryEntryWithMeta = DiaryEntry & {
  author_name: string | null
  chicken_tag: string | null
  area_name: string | null
  comment_count?: number
}

export type DiaryComment = {
  id: string
  entry_id: string
  author_id: string | null
  author_name: string | null
  content: string
  created_at: string
  updated_at: string
}

/* ============================================================
 * Meta
 * ============================================================ */

export const CATEGORY_META: Record<
  DiaryCategory,
  { label: string; emoji: string; bar: string; cls: string }
> = {
  cham_soc: {
    label: 'Chăm sóc',
    emoji: '🐓',
    bar: 'from-emerald-500 to-teal-500',
    cls: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300',
  },
  cho_an: {
    label: 'Cho ăn',
    emoji: '🌾',
    bar: 'from-amber-500 to-orange-500',
    cls: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300',
  },
  ve_sinh: {
    label: 'Vệ sinh',
    emoji: '🧽',
    bar: 'from-cyan-500 to-blue-500',
    cls: 'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300',
  },
  huan_luyen: {
    label: 'Huấn luyện · Vần',
    emoji: '🥊',
    bar: 'from-violet-500 to-purple-500',
    cls: 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300',
  },
  sinh_san: {
    label: 'Sinh sản',
    emoji: '🥚',
    bar: 'from-pink-500 to-rose-500',
    cls: 'bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-950/40 dark:text-pink-300',
  },
  thu_y: {
    label: 'Thú y',
    emoji: '💉',
    bar: 'from-blue-500 to-indigo-500',
    cls: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300',
  },
  kinh_doanh: {
    label: 'Kinh doanh',
    emoji: '💵',
    bar: 'from-green-500 to-emerald-600',
    cls: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-300',
  },
  su_co: {
    label: 'Sự cố',
    emoji: '⚠️',
    bar: 'from-rose-500 to-red-600',
    cls: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300',
  },
  quan_sat: {
    label: 'Quan sát',
    emoji: '👁',
    bar: 'from-slate-500 to-gray-600',
    cls: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/40 dark:text-slate-300',
  },
  cong_viec: {
    label: 'Công việc',
    emoji: '📋',
    bar: 'from-blue-500 to-cyan-500',
    cls: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300',
  },
  khac: {
    label: 'Khác',
    emoji: '📝',
    bar: 'from-gray-500 to-gray-600',
    cls: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/40 dark:text-gray-300',
  },
}

export const MOOD_META: Record<DiaryMood, { label: string; emoji: string; cls: string }> = {
  rat_tot: {
    label: 'Rất tốt',
    emoji: '😄',
    cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  },
  tot: {
    label: 'Tốt',
    emoji: '🙂',
    cls: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
  },
  binh_thuong: {
    label: 'Bình thường',
    emoji: '😐',
    cls: 'bg-gray-100 text-gray-700 dark:bg-gray-900/40 dark:text-gray-300',
  },
  lo_lang: {
    label: 'Lo lắng',
    emoji: '😟',
    cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  },
  rat_xau: {
    label: 'Rất xấu',
    emoji: '😞',
    cls: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
  },
}

export const WEATHER_PRESETS: Array<{ key: string; emoji: string; label: string }> = [
  { key: 'nang', emoji: '☀️', label: 'Nắng' },
  { key: 'may', emoji: '⛅', label: 'Có mây' },
  { key: 'mua', emoji: '🌧', label: 'Mưa' },
  { key: 'gio', emoji: '💨', label: 'Gió' },
  { key: 'lanh', emoji: '🥶', label: 'Lạnh' },
  { key: 'nong', emoji: '🥵', label: 'Nóng' },
  { key: 'am', emoji: '💧', label: 'Ẩm' },
  { key: 'suong', emoji: '🌫', label: 'Sương' },
]

export function weatherEmoji(key: string | null): string {
  if (!key) return ''
  const p = WEATHER_PRESETS.find((w) => w.key === key || w.label === key)
  return p?.emoji ?? '🌤'
}
