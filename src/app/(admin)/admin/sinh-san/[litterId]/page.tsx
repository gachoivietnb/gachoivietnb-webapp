import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { formatDate } from '@/lib/utils/format'
import { LitterActions } from '@/components/admin/breeding/LitterActions'
import { LitterDeleteButton } from '@/components/admin/breeding/LitterDeleteButton'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  dang_ap: { label: 'Đang ấp', color: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300' },
  da_no: { label: 'Đã nở', color: 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300' },
  that_bai: { label: 'Thất bại', color: 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300' },
}

export default async function LitterDetailPage({
  params,
}: {
  params: Promise<{ litterId: string }>
}) {
  const { litterId } = await params
  const supabase = await createClient()

  const { data: litter } = await supabase
    .from('breeding_litters')
    .select('*')
    .eq('id', litterId)
    .maybeSingle()

  if (!litter) notFound()

  const l = litter as {
    id: string
    litter_code: string
    female_id: string
    male_ids: string[]
    paired_date: string
    expected_hatch_date: string | null
    hatched_date: string | null
    eggs_total: number
    eggs_fertile: number
    hatched_count: number
    status: string
    cage_id: string | null
    notes: string | null
  }

  type BreederMini = { id: string; chicken_code: string; name: string | null; breed_name: string | null }

  const { data: femaleData } = await supabase
    .from('chickens_with_details')
    .select('id, chicken_code, name, breed_name')
    .eq('id', l.female_id)
    .maybeSingle()
  const female = femaleData as BreederMini | null

  const malesResp = l.male_ids?.length
    ? await supabase
        .from('chickens_with_details')
        .select('id, chicken_code, name, breed_name')
        .in('id', l.male_ids)
    : { data: [] }
  const males = (malesResp.data ?? []) as BreederMini[]

  const { data: chickGroups } = await supabase
    .from('chick_groups')
    .select('*')
    .eq('litter_id', litterId)
    .order('created_at', { ascending: false })

  const { data: graduated } = await supabase
    .from('chickens')
    .select('id, chicken_code, name, gender, status')
    .eq('breeding_litter_id', litterId)

  const cfg = STATUS_LABELS[l.status] ?? { label: l.status, color: 'bg-gray-100' }

  return (
    <div>
      <Link
        href="/admin/sinh-san"
        className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline mb-3"
      >
        <ArrowLeft className="w-4 h-4" /> Quay lại danh sách
      </Link>

      <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
        <h1 className="text-2xl font-medium">{l.litter_code}</h1>
        <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${cfg.color}`}>{cfg.label}</span>
      </div>

      <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <Info label="Ngày ghép" value={formatDate(l.paired_date)} />
        <Info label="Dự kiến nở" value={formatDate(l.expected_hatch_date)} />
        <Info label="Nở thực tế" value={l.hatched_date ? formatDate(l.hatched_date) : '—'} />
        <Info label="Số ngày ấp" value={`${21} ngày tiêu chuẩn`} />
      </section>

      <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4">
        <h2 className="text-sm font-semibold mb-3">Thông số lứa</h2>
        <div className="grid grid-cols-3 gap-3 text-center">
          <Stat icon="🥚" value={l.eggs_total} label="Trứng" />
          <Stat icon="✨" value={l.eggs_fertile} label="Có phôi" />
          <Stat icon="🐣" value={l.hatched_count} label="Nở" />
        </div>
      </section>

      <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4">
        <h2 className="text-sm font-semibold mb-3">Mái & đực</h2>
        {female && (
          <div className="mb-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">Mái: </span>
            <Link href={`/admin/ho-so-ga/${female.id}`} className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium">
              {female.name ?? female.chicken_code}
            </Link>
            <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">{female.breed_name}</span>
          </div>
        )}
        <div>
          <span className="text-xs text-gray-500 dark:text-gray-400">Đực ({males.length}): </span>
          <span className="text-sm">
            {males.map((m, i) => (
              <span key={m.id}>
                {i > 0 && ', '}
                <Link href={`/admin/ho-so-ga/${m.id}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                  {m.name ?? m.chicken_code}
                </Link>
              </span>
            ))}
          </span>
        </div>
      </section>

      <LitterActions
        litterId={litterId}
        status={l.status}
        eggsTotal={l.eggs_total}
        eggsFertile={l.eggs_fertile}
        hatchedCount={l.hatched_count}
        maleIds={l.male_ids}
        chickGroups={(chickGroups ?? []) as never}
        graduated={(graduated ?? []) as never}
      />

      <div className="mt-4 flex justify-end">
        <LitterDeleteButton litterId={litterId} graduatedCount={(graduated ?? []).length} />
      </div>

      {l.notes && (
        <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mt-4">
          <h2 className="text-sm font-semibold mb-2">Ghi chú</h2>
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">{l.notes}</p>
        </section>
      )}
    </div>
  )
}

function Info({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
      <div className="font-medium text-sm">{value ?? '—'}</div>
    </div>
  )
}

function Stat({ icon, value, label }: { icon: string; value: number; label: string }) {
  return (
    <div>
      <div className="text-2xl">{icon}</div>
      <div className="text-xl font-medium">{value}</div>
      <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
    </div>
  )
}
