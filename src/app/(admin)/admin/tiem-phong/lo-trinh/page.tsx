import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserPermissions } from '@/lib/rbac/guard'
import { VaccinationTabs } from '@/components/admin/vaccinations/VaccinationTabs'
import { ROUTE_META, VACCINATION_ROADMAP, type Vaccine } from '@/lib/vaccinations/types'

export const revalidate = 0

export default async function LoTrinhPage() {
  const ctx = await getCurrentUserPermissions()
  if (!ctx) redirect('/auth/login')
  if (!ctx.can('tiem_phong', 'read')) {
    return <div className="text-sm text-gray-500">Không có quyền.</div>
  }
  const supabase = await createClient()
  const { data } = await supabase.from('vaccines').select('*')
  const vacs = (data ?? []) as Vaccine[]
  const vacByCode = new Map(vacs.map((v) => [v.code, v]))

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">🗺 Lộ trình tiêm phòng chuẩn</h1>
      <p className="text-sm text-gray-500 mb-2">Lịch tiêm cốt lõi cho gà chọi VN từ ngày 1 → tuổi trưởng thành (theo TT 04/2024 + thực tế trại)</p>
      <VaccinationTabs />

      {/* Legend */}
      <div className="flex gap-2 flex-wrap mb-4 text-xs">
        <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 font-semibold">⚖️ Bắt buộc theo luật</span>
        <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 font-semibold">⭐ Cốt lõi (baseline)</span>
        <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-semibold">🛡 Booster (gà chiến)</span>
        <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-700 font-semibold">🔄 Định kỳ</span>
        <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 font-semibold">⚪ Tùy chọn</span>
      </div>

      {/* Timeline */}
      <div className="relative">
        <div className="absolute left-7 top-0 bottom-0 w-0.5 bg-gradient-to-b from-emerald-400 via-amber-400 to-red-400" />
        <div className="space-y-4">
          {VACCINATION_ROADMAP.map((item) => {
            const v = vacByCode.get(item.code)
            const cat = item.category
            const catCls = cat === 'baseline' ? 'bg-emerald-500'
                        : cat === 'booster' ? 'bg-blue-500'
                        : cat === 'periodic' ? 'bg-amber-500'
                        : cat === 'fighter' ? 'bg-violet-500'
                        : 'bg-gray-500'
            return (
              <div key={`${item.day}-${item.code}`} className="relative flex gap-4 items-start">
                <div className={`relative z-10 w-14 h-14 rounded-full ${catCls} text-white flex items-center justify-center font-black text-lg shadow-lg shrink-0`}>
                  N{item.day}
                </div>
                <div className="flex-1 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm hover:shadow-md transition" style={{ borderLeftWidth: '6px', borderLeftColor: v?.color_hex || '#3b82f6' }}>
                  <div className="flex items-start justify-between flex-wrap gap-2 mb-1">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-2xl">{v?.emoji || '💉'}</span>
                        <h3 className="font-bold text-gray-900 dark:text-gray-100">{item.label}</h3>
                        {item.critical && <span className="text-[10px] bg-red-500 text-white rounded-full px-2 py-0.5 font-bold">⭐ THIẾT YẾU</span>}
                        {v?.is_required && <span className="text-[10px] bg-orange-500 text-white rounded-full px-2 py-0.5 font-bold">⚖️ BẮT BUỘC</span>}
                      </div>
                      {v?.target_disease && <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">📋 Phòng: <b>{v.target_disease}</b></div>}
                    </div>
                  </div>

                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{item.desc}</p>

                  {v && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 text-xs">
                      {v.dose && <div><b>💊 Liều:</b> {v.dose}</div>}
                      <div><b>{ROUTE_META[v.route].emoji} Cách:</b> {ROUTE_META[v.route].label}</div>
                      {v.repeat_interval_days && <div><b>↻ Nhắc:</b> mỗi {v.repeat_interval_days} ngày</div>}
                      {v.recommended_brands && v.recommended_brands.length > 0 && (
                        <div className="col-span-full"><b>🏭 Hãng:</b> {v.recommended_brands.join(' · ')}</div>
                      )}
                      {v.notes && <div className="col-span-full italic text-gray-600 dark:text-gray-400">💡 {v.notes}</div>}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="mt-6 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl p-4 text-sm">
        <p className="font-bold mb-1">💡 Lưu ý từ chuyên gia:</p>
        <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
          <li>Lịch trên là <b>chuẩn cốt lõi</b> — anh có thể chỉnh theo thực tế trại</li>
          <li><b>Cúm H5N1 + ND nhắc mỗi 6 tháng</b> cho gà trưởng thành — đặc biệt gà chiến</li>
          <li>Nhịn nước 2h trước khi tiêm Gumboro pha nước — không dùng nước có Clo</li>
          <li>Bảo quản vaccine 2-8°C, lấy ra 30 phút trước tiêm</li>
          <li>Kiểm tra hạn vaccine + lô — chỉ dùng vaccine còn hạn</li>
          <li>Tiêm vào sáng sớm hoặc chiều mát — tránh nắng nóng</li>
          <li>Theo dõi gà 24h sau tiêm — phát hiện phản ứng sớm</li>
        </ul>
      </div>
    </div>
  )
}
