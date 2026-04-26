import { createClient } from '@/lib/supabase/server'
import { QuickMediaUpload } from '@/components/admin/media/QuickMediaUpload'

export const metadata = { title: 'Upload ảnh/video nhanh | Gà Chọi Việt NB' }

export default async function QuickUploadPage({
  searchParams,
}: {
  searchParams: Promise<{ chicken_id?: string }>
}) {
  const sp = await searchParams
  let preselected: {
    id: string
    chicken_code: string
    name: string | null
    breed_name: string | null
    tag_number: string | null
  } | null = null

  if (sp.chicken_id) {
    const supabase = await createClient()
    const { data } = await supabase
      .from('chickens_with_details')
      .select('id, chicken_code, name, breed_name, tag_number')
      .eq('id', sp.chicken_id)
      .maybeSingle()
    if (data) preselected = data as typeof preselected
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-medium text-gray-900 dark:text-gray-100 mb-1">
        📸 Upload nhanh ảnh/video
      </h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Chụp ảnh / quay video trong chuồng rồi chọn mã gà để gắn. Hoặc quét QR trước để auto-chọn.
      </p>
      <QuickMediaUpload initialChicken={preselected} />
    </div>
  )
}
