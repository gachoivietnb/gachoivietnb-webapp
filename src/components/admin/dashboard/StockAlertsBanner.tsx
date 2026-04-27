import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

type Alert = {
  id: string
  title: string
  message: string | null
  priority: string
  alert_type: string
  related_entity_type: string | null
  related_entity_id: string | null
}

export async function StockAlertsBanner() {
  const supabase = await createClient()
  // Auto-resolve old alerts cho items đã đủ tồn
  await supabase.rpc('resolve_stock_alerts')
  // Generate new alerts (idempotent)
  await supabase.rpc('generate_stock_alerts')

  const { data } = await supabase
    .from('alerts')
    .select('id, title, message, priority, alert_type, related_entity_type, related_entity_id')
    .in('alert_type', ['low_stock_medicine', 'low_stock_feed'])
    .eq('status', 'chua_doc')
    .order('priority', { ascending: false })
    .limit(10)

  const alerts = (data ?? []) as Alert[]
  if (alerts.length === 0) return null

  const critical = alerts.filter((a) => a.priority === 'khan_cap').length
  const high = alerts.filter((a) => a.priority === 'cao').length

  return (
    <div className="bg-gradient-to-r from-red-50 via-orange-50 to-amber-50 dark:from-red-950/30 dark:via-orange-950/30 dark:to-amber-950/30 border-l-4 border-red-500 rounded-xl p-4 mb-4">
      <div className="flex items-start gap-3">
        <div className="text-3xl shrink-0">📦</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-bold text-red-900 dark:text-red-200">
              🚨 Cảnh báo tồn kho — {alerts.length} mặt hàng dưới ngưỡng
            </h3>
            {critical > 0 && (
              <span className="text-[10px] bg-red-600 text-white font-bold px-2 py-0.5 rounded-full">
                {critical} HẾT SẠCH
              </span>
            )}
            {high > 0 && (
              <span className="text-[10px] bg-orange-500 text-white font-bold px-2 py-0.5 rounded-full">
                {high} SẮP HẾT
              </span>
            )}
          </div>
          <ul className="text-sm space-y-0.5 mt-2">
            {alerts.slice(0, 5).map((a) => {
              const target = a.alert_type === 'low_stock_medicine' ? '/admin/kho-thuoc' : '/admin/kho-thuc-an'
              return (
                <li key={a.id} className="flex items-start gap-2">
                  <span className="text-red-600 mt-0.5">•</span>
                  <Link href={target} className="text-gray-800 dark:text-gray-200 hover:underline flex-1">
                    {a.title}
                  </Link>
                </li>
              )
            })}
            {alerts.length > 5 && (
              <li className="text-xs text-gray-500 italic">… và {alerts.length - 5} cảnh báo khác</li>
            )}
          </ul>
          <div className="mt-3 flex gap-2 flex-wrap">
            <Link
              href="/admin/mua-vao/them-moi?from_stock_alert=1"
              className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-1.5 text-xs font-bold shadow"
            >
              + Tạo phiếu mua draft
            </Link>
            <Link
              href="/admin/kho-thuoc"
              className="bg-white dark:bg-gray-800 border border-red-300 text-red-700 rounded-lg px-4 py-1.5 text-xs font-semibold"
            >
              📦 Mở kho thuốc
            </Link>
            <Link
              href="/admin/kho-thuc-an"
              className="bg-white dark:bg-gray-800 border border-amber-300 text-amber-700 rounded-lg px-4 py-1.5 text-xs font-semibold"
            >
              🌾 Mở kho cám
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
