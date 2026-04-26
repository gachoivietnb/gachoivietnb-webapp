export const SITE_NAME = 'Gà Chọi Việt NB'
export const SITE_FULL_NAME = 'Gà Chọi Việt Ninh Bình'
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://gachoivietnb.com'

export const USER_ROLES = {
  chu_trai: 'Chủ trại',
  nhan_vien: 'Nhân viên',
  khach: 'Khách',
} as const

export const CHICKEN_STATUS_LABELS = {
  dang_nuoi: 'Đang nuôi',
  dang_cach_ly: 'Cách ly',
  da_ban: 'Đã bán',
  chet: 'Đã chết',
  loai_thai: 'Loại thải',
} as const

export const CHICKEN_GENDER_LABELS = {
  trong: 'Trống',
  mai: 'Mái',
  chua_xac_dinh: 'Chưa xác định',
} as const

export const AREA_TYPE_LABELS = {
  trong: 'Trống',
  mai: 'Mái',
  duc: 'Đực',
  ghep_doi: 'Ghép đôi',
  cach_ly: 'Cách ly',
  gia_pho_tong: 'Gia phả tổng',
} as const

export const ORDER_STATUS_LABELS = {
  hoi_mua: 'Hỏi mua',
  dat_coc: 'Đã đặt cọc',
  da_giao: 'Đã giao',
  huy: 'Đã hủy',
} as const
