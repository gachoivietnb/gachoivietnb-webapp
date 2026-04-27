export type ModulePermission = {
  read?: boolean
  write?: boolean
  delete?: boolean
}

export type PermissionsMap = Record<string, ModulePermission>

export type ModuleDef = {
  key: string
  label: string
  group: string
  supports: { read: boolean; write: boolean; delete: boolean }
}

export const MODULES: ModuleDef[] = [
  { key: 'nhat_ky_cong_viec', label: 'Nhật ký công việc', group: 'Tổng quan', supports: { read: true, write: true, delete: true } },

  { key: 'ho_so_ga',    label: 'Hồ sơ gà',       group: 'Quản lý đàn', supports: { read: true, write: true, delete: true } },
  { key: 'chuong_trai', label: 'Chuồng trại',    group: 'Quản lý đàn', supports: { read: true, write: true, delete: true } },
  { key: 'gia_pha',     label: 'Gia phả',        group: 'Quản lý đàn', supports: { read: true, write: false, delete: false } },
  { key: 'sinh_san',    label: 'Sinh sản',       group: 'Quản lý đàn', supports: { read: true, write: true, delete: true } },
  { key: 'giong',       label: 'Thư viện giống', group: 'Quản lý đàn', supports: { read: true, write: true, delete: true } },

  { key: 'tiem_phong',   label: 'Tiêm phòng',    group: 'Sức khỏe', supports: { read: true, write: true, delete: false } },
  { key: 'kho_thuoc',    label: 'Kho thuốc',     group: 'Sức khỏe', supports: { read: true, write: true, delete: true } },
  { key: 'kho_thuc_an',  label: 'Kho thức ăn',   group: 'Sức khỏe', supports: { read: true, write: true, delete: true } },
  { key: 'van_ga',       label: 'Vần gà',        group: 'Sức khỏe', supports: { read: true, write: true, delete: true } },

  { key: 'thi_dau',      label: 'Trận đấu',      group: 'Thi đấu & Thành tích', supports: { read: true, write: true, delete: true } },
  { key: 'giai_dau',     label: 'Giải đấu',      group: 'Thi đấu & Thành tích', supports: { read: true, write: true, delete: true } },
  { key: 'bxh_thi_dau',  label: 'BXH Thi đấu',   group: 'Thi đấu & Thành tích', supports: { read: true, write: false, delete: false } },

  { key: 'mua_vao',    label: 'Mua vào',     group: 'Kinh doanh', supports: { read: true, write: true, delete: true } },
  { key: 'ban_ra',     label: 'Bán ra',      group: 'Kinh doanh', supports: { read: true, write: true, delete: true } },
  { key: 'khach_hang', label: 'Khách hàng',  group: 'Kinh doanh', supports: { read: true, write: true, delete: true } },

  { key: 'quy',          label: 'Quản lý quỹ',     group: 'Tài chính & Kế toán', supports: { read: true, write: true, delete: true } },
  { key: 'tai_san',      label: 'Tài sản/CCDC',    group: 'Tài chính & Kế toán', supports: { read: true, write: true, delete: true } },
  { key: 'hoa_don',      label: 'Hóa đơn điện tử', group: 'Tài chính & Kế toán', supports: { read: true, write: true, delete: true } },
  { key: 'bao_cao_thue', label: 'Báo cáo thuế',    group: 'Tài chính & Kế toán', supports: { read: true, write: false, delete: false } },

  { key: 'nhan_su',    label: 'Nhân sự',     group: 'Quản lý Nhân sự', supports: { read: true, write: true, delete: true } },

  { key: 'tai_chinh',  label: 'Báo cáo',     group: 'Báo cáo',    supports: { read: true, write: true, delete: false } },

  { key: 'ai_marketing', label: 'AI Marketing', group: 'Marketing', supports: { read: true, write: true, delete: false } },
  { key: 'nhat_ky',      label: 'Nhật ký',      group: 'Hệ thống', supports: { read: true, write: false, delete: false } },
  { key: 'generate_qr',  label: 'In thẻ QR',    group: 'Hệ thống', supports: { read: true, write: true, delete: false } },
  { key: 'quet_qr',      label: 'Quét QR',      group: 'Hệ thống', supports: { read: true, write: false, delete: false } },
  { key: 'cai_dat',      label: 'Cài đặt',      group: 'Hệ thống', supports: { read: true, write: true, delete: false } },
]

export function hasPermission(
  role: string | null | undefined,
  permissions: unknown,
  moduleKey: string,
  action: 'read' | 'write' | 'delete'
): boolean {
  if (role === 'chu_trai') return true
  if (!permissions || typeof permissions !== 'object') return false
  const perms = permissions as PermissionsMap
  return Boolean(perms[moduleKey]?.[action])
}

export const DEFAULT_NHAN_VIEN_PERMISSIONS: PermissionsMap = {
  nhat_ky_cong_viec: { read: true, write: true, delete: true },
  ho_so_ga: { read: true, write: true, delete: false },
  chuong_trai: { read: true, write: false, delete: false },
  gia_pha: { read: true },
  sinh_san: { read: true, write: true, delete: false },
  giong: { read: true, write: false, delete: false },
  tiem_phong: { read: true, write: true },
  kho_thuoc: { read: true, write: true, delete: false },
  kho_thuc_an: { read: true, write: true, delete: false },
  van_ga: { read: true, write: true, delete: false },
  thi_dau: { read: true, write: true, delete: false },
  giai_dau: { read: true, write: false, delete: false },
  bxh_thi_dau: { read: true },
  mua_vao: { read: true, write: false, delete: false },
  ban_ra: { read: true, write: true, delete: false },
  khach_hang: { read: true, write: true, delete: false },
  quy: { read: false },
  tai_chinh: { read: false },
  tai_san: { read: true, write: true, delete: false },
  hoa_don: { read: false },
  bao_cao_thue: { read: false },
  ai_marketing: { read: true, write: false, delete: false },
  nhan_su: { read: false },
  nhat_ky: { read: false },
  generate_qr: { read: true },
  quet_qr: { read: true },
  cai_dat: { read: false },
}
