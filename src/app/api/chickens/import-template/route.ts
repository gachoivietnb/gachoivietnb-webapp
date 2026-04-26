import { createClient } from '@/lib/supabase/server'
import * as XLSX from 'xlsx'

export const dynamic = 'force-dynamic'

/**
 * GET /api/chickens/import-template
 * Returns an Excel file with the proper headers + sample rows + a
 * second sheet showing valid breed codes — so chu_trai fills in and
 * uploads back without column-mismatch errors.
 */
export async function GET() {
  const supabase = await createClient()
  const { data: breeds } = await supabase.from('breeds').select('code, name_vi').order('display_order')
  const breedRows = (breeds ?? []) as Array<{ code: string; name_vi: string }>

  // Sheet 1 — main template
  const headers = [
    'Tên',
    'Giống',
    'Giới tính',
    'Ngày sinh',
    'Nguồn',
    'Cân nặng',
    'Màu',
    'Giá mua',
    'Ghi chú',
  ]
  const samples = [
    ['Hắc Long', 'ASIL', 'trong', '2025-08-15', 'no_tai_trai', 3.2, 'đen', '', 'Trống chiến top'],
    ['Bạch Hổ', 'ASIL', 'mai', '2025-06-10', 'no_tai_trai', 2.4, 'điều', '', 'Mái giống'],
    ['Phong Vân', 'NOI', 'trong', '2024-12-20', 'mua', 3.0, 'tía', 4500000, 'Mua từ trại Long Phụng'],
  ]
  const ws = XLSX.utils.aoa_to_sheet([headers, ...samples])
  ws['!cols'] = [
    { wch: 18 }, { wch: 10 }, { wch: 12 }, { wch: 13 }, { wch: 14 },
    { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 30 },
  ]

  // Sheet 2 — breed reference
  const breedSheet = XLSX.utils.aoa_to_sheet([
    ['Mã giống (điền vào cột Giống ở sheet 1)', 'Tên'],
    ...breedRows.map((b) => [b.code, b.name_vi]),
  ])
  breedSheet['!cols'] = [{ wch: 14 }, { wch: 28 }]

  // Sheet 3 — guide
  const guideRows = [
    ['HƯỚNG DẪN ĐIỀN'],
    [''],
    ['1. Sheet "Hồ sơ gà" — mỗi dòng = 1 con gà'],
    ['2. Cột bắt buộc: "Giống" (mã ASIL/NOI/MA_LAI/TRE/...) — xem sheet "Giống"'],
    ['3. Giới tính: gõ "trong" / "mai" / "chua_xac_dinh"'],
    ['4. Nguồn: "no_tai_trai" hoặc "mua"'],
    ['5. Ngày sinh: định dạng YYYY-MM-DD (vd 2025-08-15)'],
    ['6. Cân nặng: số kg (vd 3.2)'],
    ['7. Giá mua: chỉ điền nếu Nguồn = "mua", đơn vị VNĐ'],
    ['8. Tên + Màu + Ghi chú: để trống nếu không có'],
    [''],
    ['SAU KHI ĐIỀN XONG:'],
    ['- Lưu file rồi upload ngược lên ở trang Import Excel'],
    ['- Hệ thống tự sinh chicken_code (GAxxxx), gán cage trống tự động'],
    ['- Nếu có dòng lỗi → hiện list để bạn sửa, các dòng đúng KHÔNG bị bỏ'],
  ]
  const guideSheet = XLSX.utils.aoa_to_sheet(guideRows)
  guideSheet['!cols'] = [{ wch: 80 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Hồ sơ gà')
  XLSX.utils.book_append_sheet(wb, breedSheet, 'Giống')
  XLSX.utils.book_append_sheet(wb, guideSheet, 'Hướng dẫn')

  const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
  return new Response(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="ho-so-ga-template.xlsx"',
      'Cache-Control': 'no-store',
    },
  })
}
