'use client'

const fmtVnd = (n: number) => Number(n || 0).toLocaleString('vi-VN')

export function VaccinationHero({ kpis }: { kpis: Record<string, number> }) {
  const due = Number(kpis.total_due ?? 0)
  const overdue = Number(kpis.overdue ?? 0)
  const week = Number(kpis.this_week ?? 0)
  const done30 = Number(kpis.done_30d ?? 0)
  const cost30 = Number(kpis.cost_30d ?? 0)
  const reactions = Number(kpis.reactions_30d ?? 0)
  const baselineDone = Number(kpis.baseline_complete_count ?? 0)
  const activeBatches = Number(kpis.active_batches ?? 0)

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      <Kpi
        emoji="📅"
        label="Tổng cần tiêm"
        value={due.toString()}
        sub={`${week} trong 7 ngày tới`}
        tone="from-blue-500 to-indigo-600"
      />
      <Kpi
        emoji="🚨"
        label="Quá hạn"
        value={overdue.toString()}
        sub={overdue > 0 ? 'CẦN XỬ LÝ NGAY' : 'Tất cả đúng lịch'}
        tone={overdue > 0 ? 'from-red-500 to-rose-600' : 'from-emerald-500 to-teal-600'}
      />
      <Kpi
        emoji="✅"
        label="Đã tiêm 30d"
        value={done30.toString()}
        sub={cost30 > 0 ? `Chi phí: ${fmtVnd(cost30)}đ` : 'Chưa có chi phí'}
        tone="from-emerald-500 to-teal-600"
      />
      <Kpi
        emoji="🛡"
        label="Gà đủ baseline"
        value={baselineDone.toString()}
        sub="≥80% vaccine cốt lõi"
        tone="from-amber-500 to-orange-600"
      />
      {(reactions > 0 || activeBatches > 0) && (
        <>
          {reactions > 0 && (
            <Kpi
              emoji="⚠️"
              label="Phản ứng 30d"
              value={reactions.toString()}
              sub="Cần theo dõi"
              tone="from-orange-500 to-red-500"
            />
          )}
          {activeBatches > 0 && (
            <Kpi
              emoji="🎯"
              label="Đợt đang chạy"
              value={activeBatches.toString()}
              sub="Đang tiêm hoặc chuẩn bị"
              tone="from-violet-500 to-fuchsia-600"
            />
          )}
        </>
      )}
    </div>
  )
}

function Kpi({ emoji, label, value, sub, tone }: { emoji: string; label: string; value: string; sub?: string; tone: string }) {
  return (
    <div className={`rounded-xl p-3 bg-gradient-to-br ${tone} text-white shadow-sm relative overflow-hidden`}>
      <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-white/10 blur-2xl" />
      <div className="relative">
        <div className="text-2xl mb-0.5">{emoji}</div>
        <div className="text-[10px] uppercase tracking-wide opacity-90 font-semibold">{label}</div>
        <div className="font-extrabold text-2xl leading-tight">{value}</div>
        {sub && <div className="text-[10px] opacity-80 mt-0.5 truncate">{sub}</div>}
      </div>
    </div>
  )
}
