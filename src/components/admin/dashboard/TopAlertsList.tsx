import Link from 'next/link'

type Alert = {
  id: string
  title: string
  message: string | null
  priority: string | null
  alert_type: string | null
  entity_type: string | null
  entity_id: string | null
  created_at: string
}

export function TopAlertsList({ alerts }: { alerts: Alert[] }) {
  const color = (p: string | null) => {
    if (p === 'khan_cap') return 'border-l-red-500 bg-red-50 dark:bg-red-950/30'
    if (p === 'cao') return 'border-l-orange-500 bg-orange-50 dark:bg-orange-950/30'
    if (p === 'trung_binh') return 'border-l-amber-500 bg-amber-50 dark:bg-amber-950/30'
    return 'border-l-gray-400 bg-gray-50 dark:bg-gray-700/30'
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200/80 dark:border-gray-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-medium text-gray-900 dark:text-gray-100">⚠️ Cảnh báo ưu tiên</h2>
        <Link
          href="/admin/nhat-ky"
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          Tất cả →
        </Link>
      </div>

      {alerts.length === 0 ? (
        <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
          ✓ Không có cảnh báo chưa đọc
        </div>
      ) : (
        <ul className="space-y-2">
          {alerts.map((a) => (
            <li
              key={a.id}
              className={`border-l-4 px-3 py-2 rounded-r ${color(a.priority)}`}
            >
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{a.title}</div>
              {a.message && <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{a.message}</div>}
              <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                {new Date(a.created_at).toLocaleString('vi-VN')}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
