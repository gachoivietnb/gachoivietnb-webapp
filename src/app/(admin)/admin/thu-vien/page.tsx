import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FarmMediaManager } from '@/components/admin/farm-media/FarmMediaManager'

export const revalidate = 0

export default async function FarmMediaAdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data } = await supabase
    .from('farm_media')
    .select('*')
    .order('display_order')
    .order('created_at', { ascending: false })
    .limit(2000)

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
          🖼️ Thư viện trang trại
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Upload ảnh/video giới thiệu · Lọc thông minh · Quản lý hàng loạt · Hiển thị ở /thu-vien public
        </p>
      </div>
      <FarmMediaManager items={(data ?? []) as never} />
    </div>
  )
}
