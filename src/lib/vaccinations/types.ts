export type VaccineRoute = 'mat' | 'mui' | 'da' | 'bap' | 'xuyen_canh' | 'nuoc_uong' | 'phun_suong' | 'tron_cam' | 'khac'
export type VaccineType = 'song_nhuoc_doc' | 'vo_hoat' | 'tai_to_hop' | 'sub_unit' | 'thuoc_phong'
export type VaccinationResult = 'thanh_cong' | 'co_phan_ung' | 'phan_ung_nang' | 'that_bai' | 'chua_xac_dinh'
export type VaccinationBatchStatus = 'chuan_bi' | 'dang_tiem' | 'hoan_tat' | 'huy_bo'
export type VaccinationStatus = 'cho_tiem' | 'da_tiem' | 'bo_qua' | 'huy_bo' | 'bi_phan_ung'

export const ROUTE_META: Record<VaccineRoute, { label: string; emoji: string; desc: string }> = {
  mat:        { label: 'Nhỏ mắt',     emoji: '👁',  desc: 'Nhỏ 1 giọt vào mắt' },
  mui:        { label: 'Nhỏ mũi',     emoji: '👃',  desc: 'Nhỏ 1 giọt vào mũi' },
  da:         { label: 'Tiêm dưới da', emoji: '💉', desc: 'Tiêm dưới da cổ' },
  bap:        { label: 'Tiêm bắp',    emoji: '🎯',  desc: 'Tiêm bắp đùi/cánh' },
  xuyen_canh: { label: 'Châm xuyên cánh', emoji: '🪡', desc: 'Châm xuyên màng cánh (đậu gà)' },
  nuoc_uong:  { label: 'Pha nước uống', emoji: '💧', desc: 'Pha vào nước cho gà uống' },
  phun_suong: { label: 'Phun sương',  emoji: '🌫', desc: 'Phun cho cả đàn' },
  tron_cam:   { label: 'Trộn cám',    emoji: '🌾', desc: 'Trộn vào thức ăn' },
  khac:       { label: 'Khác',        emoji: '❓', desc: '' },
}

export const VACCINE_TYPE_META: Record<VaccineType, { label: string; cls: string }> = {
  song_nhuoc_doc: { label: 'Sống nhược độc', cls: 'bg-blue-100 text-blue-700' },
  vo_hoat:        { label: 'Vô hoạt (chết)',  cls: 'bg-purple-100 text-purple-700' },
  tai_to_hop:     { label: 'Tái tổ hợp',     cls: 'bg-emerald-100 text-emerald-700' },
  sub_unit:       { label: 'Tiểu đơn vị',     cls: 'bg-amber-100 text-amber-700' },
  thuoc_phong:    { label: 'Thuốc phòng',    cls: 'bg-gray-100 text-gray-700' },
}

export const RESULT_META: Record<VaccinationResult, { label: string; emoji: string; cls: string }> = {
  thanh_cong:    { label: 'Thành công',    emoji: '✅', cls: 'bg-emerald-500 text-white' },
  co_phan_ung:   { label: 'Có phản ứng',   emoji: '⚠️', cls: 'bg-amber-500 text-white' },
  phan_ung_nang: { label: 'Phản ứng nặng', emoji: '🚨', cls: 'bg-red-500 text-white' },
  that_bai:      { label: 'Thất bại',      emoji: '❌', cls: 'bg-gray-500 text-white' },
  chua_xac_dinh: { label: 'Chưa xác định', emoji: '⏳', cls: 'bg-gray-300 text-gray-700' },
}

export const STATUS_META: Record<VaccinationStatus, { label: string; emoji: string; cls: string }> = {
  cho_tiem:    { label: 'Chờ tiêm',    emoji: '⏳', cls: 'bg-blue-100 text-blue-700' },
  da_tiem:     { label: 'Đã tiêm',     emoji: '✅', cls: 'bg-emerald-100 text-emerald-700' },
  bo_qua:      { label: 'Bỏ qua',      emoji: '⏭', cls: 'bg-gray-100 text-gray-600' },
  huy_bo:      { label: 'Hủy bỏ',      emoji: '✖',  cls: 'bg-red-100 text-red-700' },
  bi_phan_ung: { label: 'Phản ứng',    emoji: '🚨', cls: 'bg-orange-100 text-orange-700' },
}

export const BATCH_STATUS_META: Record<VaccinationBatchStatus, { label: string; emoji: string; cls: string }> = {
  chuan_bi:  { label: 'Chuẩn bị',    emoji: '📋', cls: 'bg-blue-100 text-blue-700' },
  dang_tiem: { label: 'Đang tiêm',   emoji: '💉', cls: 'bg-amber-100 text-amber-700 animate-pulse' },
  hoan_tat:  { label: 'Hoàn tất',    emoji: '✅', cls: 'bg-emerald-100 text-emerald-700' },
  huy_bo:    { label: 'Hủy bỏ',      emoji: '❌', cls: 'bg-gray-100 text-gray-700' },
}

// Lộ trình chuẩn cho gà chọi VN
export const VACCINATION_ROADMAP = [
  { day: 1,   code: 'MAREK',     critical: true,  category: 'baseline', label: 'Marek (HVT)', desc: 'Tiêm tại trại ấp ngay khi mới nở' },
  { day: 7,   code: 'NEW1',      critical: true,  category: 'baseline', label: 'ND-IB lần 1', desc: 'Newcastle + Viêm phế quản, nhỏ mắt' },
  { day: 10,  code: 'GUM1',      critical: true,  category: 'baseline', label: 'Gumboro lần 1', desc: 'Pha nước uống' },
  { day: 14,  code: 'CAU_TRUNG', critical: false, category: 'periodic', label: 'Cầu trùng phòng', desc: 'Trộn cám 5 ngày' },
  { day: 21,  code: 'NEW2',      critical: true,  category: 'baseline', label: 'Newcastle nhắc', desc: 'Lần 2 sau lần 1 đúng 14 ngày' },
  { day: 28,  code: 'GUM2',      critical: true,  category: 'baseline', label: 'Gumboro nhắc', desc: 'Lần 2 sau lần 1 đúng 14 ngày' },
  { day: 28,  code: 'DAU',       critical: true,  category: 'baseline', label: 'Đậu gà', desc: 'Châm cánh xuyên màng' },
  { day: 30,  code: 'CRD_TYL',   critical: false, category: 'periodic', label: 'CRD/Mycoplasma', desc: 'Tylosin pha nước uống' },
  { day: 42,  code: 'H5N1',      critical: true,  category: 'baseline', label: 'Cúm gia cầm H5N1', desc: '⚖️ BẮT BUỘC theo TT 04' },
  { day: 45,  code: 'ILT',       critical: false, category: 'optional', label: 'ILT', desc: 'Chỉ vùng có dịch' },
  { day: 84,  code: 'NDIB',      critical: false, category: 'booster',  label: 'ND-IB nhắc', desc: 'Tăng cường trước đi chiến' },
  { day: 90,  code: 'ND_HE1',    critical: false, category: 'fighter',  label: 'ND hệ 1', desc: 'Newcastle hệ 1 cho gà chiến' },
  { day: 100, code: 'CORYZA',    critical: false, category: 'fighter',  label: 'Coryza', desc: 'Sổ mũi truyền nhiễm' },
  { day: 120, code: 'TUHUYET',   critical: false, category: 'fighter',  label: 'Tụ huyết trùng', desc: 'Pasteurella' },
] as const

export type Vaccine = {
  id: string
  code: string
  name_vi: string
  default_age_days: number
  is_required: boolean
  display_order: number
  description: string | null
  target_disease: string | null
  target_disease_code: string | null
  vaccine_type: VaccineType | null
  route: VaccineRoute
  dose: string | null
  recommended_brands: string[]
  minimum_age_days: number | null
  maximum_age_days: number | null
  repeat_interval_days: number | null
  protection_duration_days: number | null
  contraindications: string | null
  side_effects: string | null
  storage_temp: string | null
  color_hex: string | null
  emoji: string | null
  notes: string | null
  is_active: boolean
}
