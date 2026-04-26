import { createClient } from '@/lib/supabase/server'
import { ChickenCreateForm } from '@/components/admin/chickens/ChickenCreateForm'

export default async function CreateChickenPage() {
  const supabase = await createClient()
  const { data: breeds } = await supabase
    .from('breeds')
    .select('id, code, name_vi')
    .eq('is_active', true)
    .order('display_order')

  const { data: tags } = await supabase
    .from('qr_tags')
    .select('id, tag_number')
    .eq('status', 'chua_su_dung')
    .order('tag_number')
    .limit(50)

  const { data: cages } = await supabase
    .from('cages')
    .select('id, full_code')
    .eq('status', 'trong')
    .order('full_code')
    .limit(200)

  return (
    <div>
      <h1 className="text-2xl font-medium mb-2">Thêm gà mới</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Mã gà tự sinh theo giống + năm sinh (vd: GA-ASIL-26-0001).
      </p>

      <ChickenCreateForm
        breeds={(breeds ?? []) as { id: string; code: string; name_vi: string }[]}
        availableTags={(tags ?? []) as { id: string; tag_number: string }[]}
        availableCages={(cages ?? []) as { id: string; full_code: string }[]}
      />
    </div>
  )
}
