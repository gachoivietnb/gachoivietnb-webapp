import { createClient } from '@/lib/supabase/server'

/**
 * Hiển thị badge "Đã phòng X bệnh" trên public web — KHÔNG hiện chi phí, lô, người tiêm.
 * Mục đích: tăng độ tin cậy + tăng giá bán.
 */
export async function VaccinationProtectionPublic({ chickenId }: { chickenId: string }) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('chicken_vaccination_summary')
    .select('done_count, diseases_protected, baseline_coverage_pct')
    .eq('chicken_id', chickenId)
    .single<{ done_count: number; diseases_protected: string[] | null; baseline_coverage_pct: number | null }>()

  if (!data || !data.done_count) return null

  const diseases = data.diseases_protected ?? []
  const baselinePct = Number(data.baseline_coverage_pct ?? 0)

  return (
    <section className="rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-emerald-950/40 dark:via-teal-950/40 dark:to-cyan-950/40 border-2 border-emerald-300 dark:border-emerald-800 p-5 md:p-6 shadow-lg">
      <div className="text-center">
        <div className="inline-block bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-black uppercase tracking-widest rounded-full px-4 py-1.5 mb-3 shadow-md">
          🛡 Tiêm phòng đầy đủ
        </div>
        <div className="text-5xl mb-2">💉</div>
        <h3 className="text-2xl md:text-3xl font-extrabold text-emerald-900 dark:text-emerald-100">
          Đã phòng <span className="text-emerald-600">{diseases.length}</span> bệnh truyền nhiễm
        </h3>
        <p className="text-sm text-emerald-800 dark:text-emerald-300 mt-1">
          {data.done_count} mũi vaccine đã tiêm · {baselinePct >= 80 ? '✅ Đầy đủ baseline ' : ''}{baselinePct}% phủ
        </p>
      </div>

      {diseases.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2 justify-center">
          {diseases.map((d) => (
            <span
              key={d}
              className="inline-flex items-center gap-1 bg-white/80 dark:bg-gray-900/40 backdrop-blur-sm border border-emerald-200 dark:border-emerald-800 rounded-full px-3 py-1 text-sm font-semibold text-emerald-800 dark:text-emerald-200 shadow-sm"
            >
              ✓ {d}
            </span>
          ))}
        </div>
      )}

      {baselinePct >= 80 && (
        <div className="mt-4 text-center">
          <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-black px-4 py-1.5 rounded-full shadow-md">
            🏆 ĐỦ BASELINE — gà khỏe, miễn dịch cao
          </span>
        </div>
      )}
    </section>
  )
}
