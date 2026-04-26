import { createClient } from '@/lib/supabase/server'

export async function ChickenFlowDiagram() {
  const supabase = await createClient()

  const [quarantine, growing, ready, soldThisMonth] = await Promise.all([
    supabase.from('chickens').select('id', { count: 'exact', head: true }).eq('status', 'dang_cach_ly'),
    supabase.from('chickens').select('id', { count: 'exact', head: true }).eq('status', 'dang_nuoi'),
    supabase
      .from('chickens')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'dang_nuoi')
      .lte('birth_date', new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString().slice(0, 10)),
    supabase
      .from('chickens')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'da_ban')
      .gte('sale_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)),
  ])

  const steps = [
    { label: 'Cách ly', value: quarantine.count ?? 0, bg: 'bg-amber-100 dark:bg-amber-900/50', text: 'text-amber-900 dark:text-amber-100' },
    { label: 'Đang nuôi', value: growing.count ?? 0, bg: 'bg-blue-100 dark:bg-blue-900/50', text: 'text-blue-900 dark:text-blue-100' },
    { label: 'Đến tuổi bán', value: ready.count ?? 0, bg: 'bg-emerald-100 dark:bg-emerald-900/50', text: 'text-emerald-900 dark:text-emerald-100' },
    { label: 'Đã bán (tháng)', value: soldThisMonth.count ?? 0, bg: 'bg-purple-100 dark:bg-purple-900/50', text: 'text-purple-900 dark:text-purple-100' },
  ]

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200/80 dark:border-gray-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <h2 className="font-medium mb-3 text-gray-900 dark:text-gray-100">🔄 Luồng hoạt động</h2>
      <div className="flex items-center gap-2 overflow-x-auto py-2">
        {steps.map((s, i) => (
          <div key={s.label} className="flex items-center gap-2 shrink-0">
            <div className={`rounded-lg px-3 py-2 ${s.bg} ${s.text} min-w-[90px]`}>
              <div className="text-xs">{s.label}</div>
              <div className="text-xl font-medium">{s.value}</div>
            </div>
            {i < steps.length - 1 && <span className="text-gray-400 dark:text-gray-500">→</span>}
          </div>
        ))}
      </div>
    </div>
  )
}
