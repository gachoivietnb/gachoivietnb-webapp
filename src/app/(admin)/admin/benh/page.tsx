// Module bệnh list - Phần 4 placeholder
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatDate } from '@/lib/utils/format'

type Disease = {
  id: string
  chicken_id: string
  symptoms: string
  diagnosis: string | null
  outcome: string | null
  start_date: string
  end_date: string | null
  chickens: { id: string; chicken_code: string; name: string | null } | null
}

export default async function BenhPage() {
  const supabase = await createClient()

  const { data: diseases } = await supabase
    .from('diseases')
    .select('id, chicken_id, symptoms, diagnosis, outcome, start_date, end_date, chickens(id, chicken_code, name)')
    .order('start_date', { ascending: false })
    .limit(50)

  const { data: alerts } = await supabase
    .from('alerts')
    .select('id, title, message, created_at')
    .eq('alert_type', 'dich_benh')
    .eq('status', 'chua_doc')
    .order('created_at', { ascending: false })
    .limit(5)

  const list = (diseases ?? []) as unknown as Disease[]
  const alertList = (alerts ?? []) as Array<{ id: string; title: string; message: string; created_at: string }>

  return (
    <div>
      <h1 className="text-2xl font-medium mb-4">Theo dõi bệnh</h1>

      {alertList.length > 0 && (
        <section className="mb-4 space-y-2">
          {alertList.map((a) => (
            <div key={a.id} className="bg-red-50 dark:bg-red-950/40 border border-red-300 rounded-lg p-3">
              <div className="font-medium text-red-900">{a.title}</div>
              <div className="text-sm text-red-700 dark:text-red-300 mt-1">{a.message}</div>
              <div className="text-xs text-red-500 mt-1">{formatDate(a.created_at)}</div>
            </div>
          ))}
        </section>
      )}

      {list.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
          <div className="text-4xl mb-2">💊</div>
          <p className="text-gray-600 dark:text-gray-400">Chưa có ca bệnh nào được ghi. Ghi qua trang chi tiết gà.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((d) => (
            <div key={d.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  {d.chickens && (
                    <Link href={`/admin/ho-so-ga/${d.chickens.id}`} className="font-medium text-blue-600 dark:text-blue-400 hover:underline text-sm">
                      {d.chickens.name ?? d.chickens.chicken_code}
                    </Link>
                  )}
                  <div className="text-sm text-gray-700 dark:text-gray-300 mt-1">{d.symptoms}</div>
                  {d.diagnosis && (
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Chẩn đoán: {d.diagnosis}</div>
                  )}
                </div>
                <span className={`text-xs px-2 py-1 rounded whitespace-nowrap ${
                  d.outcome === 'khoi' ? 'bg-green-100 text-green-800'
                  : d.outcome === 'chet' ? 'bg-red-100 text-red-800'
                  : 'bg-amber-100 text-amber-800'
                }`}>
                  {d.outcome === 'khoi' ? '✓ Đã khỏi' : d.outcome === 'chet' ? '✗ Đã chết' : '⏳ Điều trị'}
                </span>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Từ {formatDate(d.start_date)}
                {d.end_date && ` đến ${formatDate(d.end_date)}`}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-500 dark:text-gray-400 mt-6">
        💡 Ghi ca bệnh mới trực tiếp từ trang chi tiết từng con gà.
      </p>
    </div>
  )
}
