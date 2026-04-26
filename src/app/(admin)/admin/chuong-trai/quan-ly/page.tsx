import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { CageManageTabs } from '@/components/admin/cages/CageManageTabs'

export const revalidate = 0

export default async function ManageCagePage() {
  const supabase = await createClient()
  const [areasRes, rowsRes, cagesRes] = await Promise.all([
    supabase.from('areas').select('*').order('display_order'),
    supabase.from('cage_rows').select('*, areas(code, name_vi)').order('code'),
    supabase
      .from('cages')
      .select('*, cage_rows(code, area_id, areas(code, name_vi))')
      .order('full_code'),
  ])

  return (
    <div>
      <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
        <div>
          <Link
            href="/admin/chuong-trai"
            className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline mb-2"
          >
            <ArrowLeft className="w-4 h-4" /> Quay lại Chuồng trại
          </Link>
          <h1 className="text-2xl font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
            🏠 Quản lý khu / dãy / chuồng
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            CRUD cấu trúc trang trại 3 cấp · Khu → Dãy → Chuồng · Tạo hàng loạt + chỉnh inline
          </p>
        </div>
      </div>

      <CageManageTabs
        areas={(areasRes.data ?? []) as never}
        rows={(rowsRes.data ?? []) as never}
        cages={(cagesRes.data ?? []) as never}
      />
    </div>
  )
}
