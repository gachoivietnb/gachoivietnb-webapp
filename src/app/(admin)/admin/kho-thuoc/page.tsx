import { createClient } from '@/lib/supabase/server'
import { MedicinesManager } from '@/components/admin/health/MedicinesManager'

export default async function KhoThuocPage() {
  const supabase = await createClient()
  const { data } = await supabase.from('medicines').select('*').eq('is_active', true).order('name_vi')

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
          💊 Kho thuốc
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Theo dõi tồn kho · Cảnh báo sắp hết / hết hạn · Lọc thông minh · Nhập xuất nhanh
        </p>
      </div>
      <MedicinesManager items={(data ?? []) as never} />
    </div>
  )
}
