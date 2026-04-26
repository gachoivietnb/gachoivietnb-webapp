import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, FileSpreadsheet, Layers } from 'lucide-react'
import { HoSoGaIndexClient, type ChickenRow } from '@/components/admin/chickens/HoSoGaIndexClient'

export default async function HoSoGaPage() {
  const supabase = await createClient()

  const [chickensRes, breedsRes, areasRes] = await Promise.all([
    supabase
      .from('chickens_with_details')
      .select(
        `
        id, chicken_code, name, gender, status, weight_kg, age_months, age_days,
        birth_date, color, listed_price, is_for_sale, main_photo_url, tag_number,
        breed_code, breed_name, breed_tier,
        area_code, cage_full_code,
        parent_male_id, parent_female_id,
        created_at
      `
      )
      .order('created_at', { ascending: false })
      .limit(1000),
    supabase.from('breeds').select('code, name_vi').eq('is_active', true).order('display_order'),
    supabase.from('areas').select('code, name_vi').eq('is_active', true).order('display_order'),
  ])

  const rows = (chickensRes.data ?? []) as unknown as ChickenRow[]
  const total = rows.length

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-3">
        <div>
          <h1 className="text-2xl font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
            🐓 Hồ sơ gà
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Quản lý {total.toLocaleString('vi-VN')} con · Lọc thông minh · 2 chế độ xem
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link
            href="/admin/ho-so-ga/them-moi"
            className="inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> Thêm gà
          </Link>
          <Link
            href="/admin/ho-so-ga/nhap-hang-loat"
            className="inline-flex items-center gap-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 px-3 py-2 rounded text-sm"
          >
            <Layers className="w-4 h-4" /> Nhập hàng loạt
          </Link>
          <Link
            href="/admin/ho-so-ga/import-excel"
            className="inline-flex items-center gap-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 px-3 py-2 rounded text-sm"
          >
            <FileSpreadsheet className="w-4 h-4" /> Import Excel
          </Link>
        </div>
      </div>

      <HoSoGaIndexClient
        chickens={rows}
        breeds={(breedsRes.data ?? []) as never}
        areas={(areasRes.data ?? []) as never}
      />
    </div>
  )
}
