export type TournamentType = 'van_trai' | 'hoi_xom' | 'giai_tinh' | 'khu_vuc' | 'quoc_gia'
export type TournamentStatus = 'sap_dien_ra' | 'dang_dien_ra' | 'da_ket_thuc' | 'huy_bo'
export type MatchRules = 'don' | 'cua'
export type MatchSpursType = 'khong' | 'sat' | 'dao' | 'tron'
export type MatchResult =
  | 'thang' | 'thua' | 'hoa'
  | 'be_tran_minh' | 'be_tran_doi'
  | 'chet' | 'bi_thuong' | 'huy'
export type MatchResultMethod =
  | 'ko_doi' | 'ko_minh' | 'quyet_dinh' | 'het_gio'
  | 'bo_chay_doi' | 'bo_chay_minh' | 'chet_tran' | 'khac'
export type MatchInjuryLevel = 'khong' | 'nhe' | 'nang' | 'chi_mang'
export type ChickenCombatTier =
  | 'ga_con' | 'ga_to' | 'ga_van_kho' | 'ga_van_nuoc' | 'ga_mo_mo'
  | 'ga_an_ky_1' | 'ga_an_ky_2' | 'ga_an_ky_3'
  | 'chien_tuong' | 'huyen_thoai'

export const TOURNAMENT_TYPE_META: Record<TournamentType, { label: string; emoji: string; tone: string; rank: number }> = {
  van_trai:  { label: 'Vần trại',     emoji: '🏠', tone: 'gray',    rank: 1 },
  hoi_xom:   { label: 'Hội xóm/làng', emoji: '🏘', tone: 'blue',    rank: 2 },
  giai_tinh: { label: 'Giải tỉnh',    emoji: '🏛', tone: 'amber',   rank: 3 },
  khu_vuc:   { label: 'Khu vực',      emoji: '🌐', tone: 'purple',  rank: 4 },
  quoc_gia:  { label: 'Quốc gia / QT',emoji: '🌍', tone: 'rose',    rank: 5 },
}

export const TOURNAMENT_STATUS_META: Record<TournamentStatus, { label: string; emoji: string; cls: string }> = {
  sap_dien_ra:  { label: 'Sắp diễn ra', emoji: '⏰', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  dang_dien_ra: { label: 'Đang diễn ra', emoji: '🔴', cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
  da_ket_thuc:  { label: 'Đã kết thúc', emoji: '✅', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  huy_bo:       { label: 'Hủy bỏ',      emoji: '❌', cls: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
}

export const RESULT_META: Record<MatchResult, { label: string; emoji: string; cls: string; isWin: boolean }> = {
  thang:        { label: 'THẮNG',     emoji: '✅', cls: 'bg-emerald-500 text-white', isWin: true },
  thua:         { label: 'THUA',      emoji: '❌', cls: 'bg-red-500 text-white', isWin: false },
  hoa:          { label: 'HÒA',       emoji: '🤝', cls: 'bg-amber-500 text-white', isWin: false },
  be_tran_minh: { label: 'Bể trận (mình)', emoji: '🚪', cls: 'bg-rose-500 text-white', isWin: false },
  be_tran_doi:  { label: 'Đối bỏ',    emoji: '🏃', cls: 'bg-emerald-400 text-white', isWin: true },
  chet:         { label: 'GÀ CHẾT',   emoji: '💀', cls: 'bg-gray-700 text-white', isWin: false },
  bi_thuong:    { label: 'Bị thương', emoji: '🤕', cls: 'bg-orange-500 text-white', isWin: false },
  huy:          { label: 'Hủy trận',  emoji: '⚠️', cls: 'bg-gray-400 text-white', isWin: false },
}

export const RESULT_METHOD_META: Record<MatchResultMethod, { label: string; emoji: string }> = {
  ko_doi:       { label: 'KO đối thủ',     emoji: '💥' },
  ko_minh:      { label: 'Bị KO',           emoji: '😵' },
  quyet_dinh:   { label: 'Quyết định trọng tài', emoji: '⚖️' },
  het_gio:      { label: 'Hết giờ',         emoji: '⏰' },
  bo_chay_doi:  { label: 'Đối chạy',        emoji: '🏃‍♂️' },
  bo_chay_minh: { label: 'Mình chạy',       emoji: '🏳️' },
  chet_tran:    { label: 'Chết trận',       emoji: '💀' },
  khac:         { label: 'Khác',            emoji: '❓' },
}

export const RULES_META: Record<MatchRules, { label: string; emoji: string; desc: string }> = {
  don: { label: 'Đá đòn', emoji: '⚔️', desc: 'Không gắn cựa, đá tự nhiên' },
  cua: { label: 'Đá cựa', emoji: '🗡', desc: 'Gắn cựa sắt/dao/tròn' },
}

export const SPURS_META: Record<MatchSpursType, { label: string; emoji: string }> = {
  khong: { label: 'Không cựa', emoji: '🚫' },
  sat:   { label: 'Cựa sắt',   emoji: '🔪' },
  dao:   { label: 'Cựa dao',   emoji: '🗡' },
  tron:  { label: 'Cựa tròn',  emoji: '🔘' },
}

export const COMBAT_TIER_META: Record<ChickenCombatTier, {
  label: string
  emoji: string
  short: string
  desc: string
  gradient: string
  borderCls: string
  textCls: string
  rank: number
  starsHint: string
}> = {
  ga_con:        { label: 'Gà con',           emoji: '🐣', short: 'Con',        desc: 'Chưa đủ 6 tháng tuổi',                gradient: 'from-yellow-300 to-amber-400',  borderCls: 'border-yellow-300', textCls: 'text-yellow-700', rank: 1, starsHint: '0 sao' },
  ga_to:         { label: 'Gà tơ',            emoji: '🌱', short: 'Tơ',         desc: 'Chưa từng đấu chính thức',           gradient: 'from-green-300 to-lime-400',    borderCls: 'border-green-300', textCls: 'text-green-700', rank: 2, starsHint: '0 sao' },
  ga_van_kho:    { label: 'Gà vần khô',       emoji: '💪', short: 'Vần khô',    desc: 'Đã tập đòn cá nhân',                 gradient: 'from-cyan-400 to-sky-500',      borderCls: 'border-cyan-400', textCls: 'text-cyan-700', rank: 3, starsHint: '0 sao' },
  ga_van_nuoc:   { label: 'Gà vần nước',      emoji: '💧', short: 'Vần nước',   desc: 'Đã đối kháng với gà thật',           gradient: 'from-blue-400 to-indigo-500',   borderCls: 'border-blue-400', textCls: 'text-blue-700', rank: 4, starsHint: '0 sao' },
  ga_mo_mo:      { label: 'Gà mở mỏ',         emoji: '🥚', short: 'Mở mỏ',      desc: 'Đã ra trường lần đầu',               gradient: 'from-violet-400 to-purple-500', borderCls: 'border-violet-400', textCls: 'text-violet-700', rank: 5, starsHint: '0 sao' },
  ga_an_ky_1:    { label: 'Gà ăn kỳ 1',       emoji: '⭐', short: 'Kỳ 1',       desc: 'Đã thắng 1 trận chính thức',         gradient: 'from-amber-400 to-orange-500',  borderCls: 'border-amber-400', textCls: 'text-amber-700', rank: 6, starsHint: '1 sao' },
  ga_an_ky_2:    { label: 'Gà ăn kỳ 2',       emoji: '⭐⭐', short: 'Kỳ 2',      desc: 'Đã thắng 2-3 trận',                  gradient: 'from-orange-500 to-red-500',    borderCls: 'border-orange-500', textCls: 'text-orange-700', rank: 7, starsHint: '2-3 sao' },
  ga_an_ky_3:    { label: 'Gà ăn kỳ 3',       emoji: '⭐⭐⭐', short: 'Kỳ 3',     desc: 'Đã thắng 4-5 trận',                  gradient: 'from-red-500 to-rose-600',      borderCls: 'border-red-500', textCls: 'text-red-700', rank: 8, starsHint: '4-5 sao' },
  chien_tuong:   { label: 'Chiến tướng',      emoji: '👑', short: 'Chiến tướng', desc: 'Đã thắng 6-9 trận, danh tiếng vùng', gradient: 'from-purple-600 to-pink-600',   borderCls: 'border-purple-600', textCls: 'text-purple-700', rank: 9, starsHint: '6-9 sao' },
  huyen_thoai:   { label: 'Huyền thoại',      emoji: '🏆', short: 'Huyền thoại', desc: 'Thắng ≥10 trận hoặc giải tỉnh trở lên', gradient: 'from-yellow-400 via-amber-500 to-orange-600', borderCls: 'border-yellow-500', textCls: 'text-amber-800', rank: 10, starsHint: '≥10 sao' },
}

export const INJURY_META: Record<MatchInjuryLevel, { label: string; emoji: string; cls: string }> = {
  khong:    { label: 'Không thương', emoji: '✅', cls: 'text-emerald-600' },
  nhe:      { label: 'Nhẹ',         emoji: '🩹', cls: 'text-amber-600' },
  nang:     { label: 'Nặng',        emoji: '🤕', cls: 'text-orange-600' },
  chi_mang: { label: 'Chí mạng',    emoji: '⚠️', cls: 'text-red-600' },
}

export type CombatStats = {
  chicken_id: string
  farm_id: string
  chicken_code: string
  name: string | null
  birth_date: string | null
  combat_tier_manual: ChickenCombatTier | null
  total_matches: number
  wins: number
  losses: number
  draws: number
  forfeits: number
  deaths: number
  injuries: number
  stars: number
  win_rate_pct: number | null
  last_match_date: string | null
  prize_total: number
  avg_rounds: number | null
  avg_duration: number | null
  best_tournament_rank: number | null
  current_win_streak: number
  combat_tier: ChickenCombatTier
}

export type Tournament = {
  id: string
  farm_id: string
  name: string
  type: TournamentType
  status: TournamentStatus
  venue: string | null
  location: string | null
  start_date: string | null
  end_date: string | null
  weight_class_min: number | null
  weight_class_max: number | null
  rules: MatchRules
  spurs_type: MatchSpursType
  prize_pool: number
  entry_fee: number
  organizer: string | null
  organizer_phone: string | null
  banner_url: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type Match = {
  id: string
  farm_id: string
  chicken_id: string
  tournament_id: string | null
  match_code: string | null
  match_date: string
  match_time: string | null
  opponent_name: string
  opponent_owner: string | null
  opponent_owner_phone: string | null
  opponent_breed: string | null
  opponent_origin: string | null
  opponent_weight_kg: number | null
  opponent_age_months: number | null
  opponent_color: string | null
  opponent_photo_url: string | null
  self_weight_kg: number | null
  rules: MatchRules
  spurs_type: MatchSpursType
  weight_class: string | null
  rounds_planned: number | null
  is_ho_doc: boolean
  result: MatchResult | null
  result_method: MatchResultMethod | null
  result_round: number | null
  rounds_actual: number
  total_duration_minutes: number | null
  injury_self: MatchInjuryLevel
  injury_notes: string | null
  recovery_days: number | null
  prize_money: number
  betting_amount: number
  betting_won: number
  photo_urls: string[]
  video_url: string | null
  referee_name: string | null
  witnesses: string[]
  match_quality: number | null
  highlight_moments: string[]
  internal_notes: string | null
  public_notes: string | null
  is_public: boolean
  is_pinned: boolean
  created_at: string
  updated_at: string
}
