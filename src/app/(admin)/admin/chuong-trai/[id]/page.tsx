import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ChickenStatusBadge } from '@/components/admin/chickens/ChickenStatusBadge'
import { formatDate } from '@/lib/utils/format'

export default async function CageDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: cage } = await supabase
    .from('cages')
    .select('*, cage_rows(code, name_vi, areas(code, name_vi, type))')
    .eq('id', id)
    .maybeSingle()

  if (!cage) notFound()

  const c = cage as unknown as {
    id: string
    code: string
    full_code: string
    capacity: number
    status: string
    qr_door_code: string | null
    notes: string | null
    cage_rows: {
      code: string
      name_vi: string | null
      areas: { code: string; name_vi: string; type: string } | null
    } | null
  }

  const { data: chickens } = await supabase
    .from('chickens_with_details')
    .select('id, chicken_code, name, status, breed_name, age_months, tag_number')
    .eq('cage_id', id)

  const { data: history } = await supabase.rpc('get_cage_history' as never, {
    p_cage_id: id,
  } as never)

  const currentChickens = (chickens ?? []) as Array<{
    id: string
    chicken_code: string
    name: string | null
    status: string
    breed_name: string | null
    age_months: number | null
    tag_number: string | null
  }>

  const historyList = (history ?? []) as Array<{
    chicken_id: string
    chicken_code: string
    chicken_name: string | null
    moved_in: string
    moved_out: string | null
    status: string
  }>

  return (
    <div>
      <Link
        href="/admin/chuong-trai"
        className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline mb-3"
      >
        <ArrowLeft className="w-4 h-4" /> Quay lại sơ đồ chuồng trại
      </Link>

      <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-medium">Chuồng {c.full_code}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Khu {c.cage_rows?.areas?.code} · Dãy {c.cage_rows?.code} · Sức chứa {c.capacity}
          </p>
        </div>
        <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${
          c.status === 'dang_co_ga' ? 'bg-green-100 text-green-800'
          : c.status === 'bao_tri' ? 'bg-red-100 text-red-800'
          : 'bg-gray-100 text-gray-600'
        }`}>
          {c.status === 'dang_co_ga' ? 'Đang có gà' : c.status === 'bao_tri' ? 'Bảo trì' : 'Trống'}
        </span>
      </div>

      <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Gà hiện tại ({currentChickens.length}/{c.capacity})
        </h2>
        {currentChickens.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 italic">Chuồng trống.</p>
        ) : (
          <div className="space-y-2">
            {currentChickens.map((ch) => (
              <Link
                key={ch.id}
                href={`/admin/ho-so-ga/${ch.id}`}
                className="flex items-center justify-between p-2 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <div>
                  <div className="font-medium text-sm">{ch.name || ch.chicken_code}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {ch.breed_name} · {ch.age_months ? `${ch.age_months} tháng` : 'chưa rõ tuổi'}
                    {ch.tag_number ? ` · #${ch.tag_number}` : ''}
                  </div>
                </div>
                <ChickenStatusBadge status={ch.status} />
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">QR cửa chuồng</h2>
        <p className="text-xs font-mono bg-gray-50 dark:bg-gray-900 rounded p-2 break-all">
          {c.qr_door_code || 'Chưa có'}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Mã này có thể dùng để in QR dán trên cửa chuồng.
        </p>
      </section>

      <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Lịch sử chuồng
        </h2>
        {historyList.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 italic">Chưa có lịch sử.</p>
        ) : (
          <ul className="text-sm space-y-2">
            {historyList.map((h) => (
              <li key={h.chicken_id} className="border-b border-gray-100 dark:border-gray-700 pb-2 last:border-0">
                <Link href={`/admin/ho-so-ga/${h.chicken_id}`} className="font-medium text-blue-600 dark:text-blue-400 hover:underline">
                  {h.chicken_name || h.chicken_code}
                </Link>
                <span className="text-gray-500 dark:text-gray-400 ml-2">
                  vào {formatDate(h.moved_in)}
                  {h.moved_out ? ` → ra ${formatDate(h.moved_out)}` : ' (đang ở đây)'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
