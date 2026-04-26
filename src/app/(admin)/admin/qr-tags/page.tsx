import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  chua_su_dung: { label: 'Chưa dùng', color: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300' },
  dang_su_dung: { label: 'Đang dùng', color: 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300' },
  hong_mat: { label: 'Hỏng / mất', color: 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300' },
}

export default async function QrTagsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const sp = await searchParams
  const page = parseInt(sp.page ?? '1')
  const pageSize = 100
  const status = sp.status
  const q = sp.q

  const supabase = await createClient()
  let query = supabase
    .from('qr_tags')
    .select('*, chickens:chickens!qr_tags_chicken_id_fkey(id, chicken_code, name)', { count: 'exact' })
    .order('tag_number')
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (status) query = query.eq('status', status)
  if (q) query = query.ilike('tag_number', `%${q}%`)

  const { data, count } = await query
  const tags = (data ?? []) as Array<{
    id: string
    tag_number: string
    status: string
    chicken_id: string | null
    assigned_at: string | null
    chickens: { id: string; chicken_code: string; name: string | null } | null
  }>

  const [unused, used, damaged] = await Promise.all([
    supabase.from('qr_tags').select('*', { count: 'exact', head: true }).eq('status', 'chua_su_dung'),
    supabase.from('qr_tags').select('*', { count: 'exact', head: true }).eq('status', 'dang_su_dung'),
    supabase.from('qr_tags').select('*', { count: 'exact', head: true }).eq('status', 'hong_mat'),
  ])

  const totalPages = Math.ceil((count ?? 0) / pageSize)

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-3">
        <div>
          <h1 className="text-2xl font-medium">Thẻ QR</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Tổng {count ?? 0} thẻ</p>
        </div>
        <Link
          href="/admin/generate-qr"
          className="inline-flex items-center gap-1 bg-blue-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-blue-700"
        >
          🖨️ In thẻ mới (PDF)
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <StatCard label="Chưa dùng" value={unused.count ?? 0} color="gray" />
        <StatCard label="Đang dùng" value={used.count ?? 0} color="green" />
        <StatCard label="Hỏng / mất" value={damaged.count ?? 0} color="red" />
      </div>

      <form className="flex flex-wrap gap-2 mb-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
        <input
          name="q"
          defaultValue={q}
          placeholder="Tìm theo số (vd: 0347)..."
          className="flex-1 min-w-[160px] border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 text-sm"
        />
        <select
          name="status"
          defaultValue={status ?? ''}
          className="border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 text-sm"
        >
          <option value="">Tất cả</option>
          <option value="chua_su_dung">Chưa dùng</option>
          <option value="dang_su_dung">Đang dùng</option>
          <option value="hong_mat">Hỏng/mất</option>
        </select>
        <button type="submit" className="bg-gray-900 text-white px-4 py-1.5 rounded text-sm">
          Lọc
        </button>
      </form>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900 text-xs uppercase text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-3 py-2 text-left">Số thẻ</th>
              <th className="px-3 py-2 text-left">Trạng thái</th>
              <th className="px-3 py-2 text-left">Gà gắn</th>
              <th className="px-3 py-2 text-left">Ngày gắn</th>
            </tr>
          </thead>
          <tbody>
            {tags.map((t) => {
              const cfg = STATUS_LABELS[t.status] ?? { label: t.status, color: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300' }
              return (
                <tr key={t.id} className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-3 py-2 font-mono font-medium">
                    <Link href={`/ga/${t.tag_number}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                      #{t.tag_number}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${cfg.color}`}>{cfg.label}</span>
                  </td>
                  <td className="px-3 py-2">
                    {t.chickens ? (
                      <Link
                        href={`/admin/ho-so-ga/${t.chickens.id}`}
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {t.chickens.name || t.chickens.chicken_code}
                      </Link>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-400 text-xs">
                    {t.assigned_at ? new Date(t.assigned_at).toLocaleDateString('vi-VN') : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex gap-1 justify-center mt-4 text-sm flex-wrap">
          {Array.from({ length: Math.min(totalPages, 30) }, (_, i) => i + 1).map((p) => {
            const params = new URLSearchParams()
            if (status) params.set('status', status)
            if (q) params.set('q', q)
            params.set('page', String(p))
            return (
              <Link
                key={p}
                href={`/admin/qr-tags?${params}`}
                className={`px-2 py-1 rounded border ${
                  p === page ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-300'
                }`}
              >
                {p}
              </Link>
            )
          })}
          {totalPages > 30 && <span className="px-2 py-1 text-gray-500 dark:text-gray-400">... /{totalPages}</span>}
        </div>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: 'gray' | 'green' | 'red'
}) {
  const colors: Record<string, string> = {
    gray: 'bg-gray-50 border-gray-200',
    green: 'bg-green-50 border-green-200',
    red: 'bg-red-50 border-red-200',
  }
  return (
    <div className={`border rounded-lg p-3 ${colors[color]}`}>
      <div className="text-xs text-gray-600 dark:text-gray-400">{label}</div>
      <div className="text-2xl font-medium mt-1">{value}</div>
    </div>
  )
}
