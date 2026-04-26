'use client'

import { useMemo, useState } from 'react'

export type StaffOverviewRow = {
  id: string
  full_name: string
  phone: string | null
  avatar_url: string | null
  role: string
  is_active: boolean
  created_at: string
  base_salary_monthly: number | string | null
  standard_work_days: number | null
  month_days: number
  month_hours: number
}

const ROLE_META: Record<string, { label: string; emoji: string; cls: string }> = {
  chu_trai: { label: 'Chủ trại', emoji: '👑', cls: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800' },
  nhan_vien: { label: 'Nhân viên', emoji: '👷', cls: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-800' },
  khach: { label: 'Khách', emoji: '👁', cls: 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-900/40 dark:text-gray-300 dark:border-gray-700' },
}

function formatVnd(n: number): string {
  return new Intl.NumberFormat('vi-VN').format(Math.round(n)) + ' đ'
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('vi-VN')
}

export function StaffOverviewClient({
  rows,
  isAdmin,
}: {
  rows: StaffOverviewRow[]
  isAdmin: boolean
}) {
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [salaryRange, setSalaryRange] = useState<'all' | 'low' | 'mid' | 'high'>('all')
  const [exporting, setExporting] = useState<'xlsx' | 'pdf' | null>(null)

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (filterRole && r.role !== filterRole) return false
      if (filterStatus === 'active' && !r.is_active) return false
      if (filterStatus === 'inactive' && r.is_active) return false
      const sal = Number(r.base_salary_monthly ?? 0)
      if (salaryRange === 'low' && sal >= 5_000_000) return false
      if (salaryRange === 'mid' && (sal < 5_000_000 || sal >= 10_000_000)) return false
      if (salaryRange === 'high' && sal < 10_000_000) return false
      if (search.trim()) {
        const s = search.toLowerCase()
        if (
          !r.full_name.toLowerCase().includes(s) &&
          !(r.phone ?? '').includes(s)
        ) return false
      }
      return true
    })
  }, [rows, search, filterRole, filterStatus, salaryRange])

  const stats = useMemo(() => {
    const total = rows.length
    const active = rows.filter((r) => r.is_active).length
    const totalSalary = rows
      .filter((r) => r.is_active)
      .reduce((s, r) => s + Number(r.base_salary_monthly ?? 0), 0)
    const avgSalary = active > 0 ? totalSalary / active : 0
    const totalHoursMonth = rows.reduce((s, r) => s + r.month_hours, 0)
    return { total, active, totalSalary, avgSalary, totalHoursMonth }
  }, [rows])

  async function exportExcel() {
    setExporting('xlsx')
    try {
      const XLSX = (await import('xlsx')).default ?? (await import('xlsx'))
      const wsData = [
        ['Họ tên', 'SĐT', 'Vai trò', 'Trạng thái', 'Lương cơ bản', 'Ngày công chuẩn', 'Ngày công tháng', 'Giờ công tháng', 'Ngày tham gia'],
        ...filtered.map((r) => [
          r.full_name,
          r.phone ?? '',
          ROLE_META[r.role]?.label ?? r.role,
          r.is_active ? 'Hoạt động' : 'Khoá',
          Number(r.base_salary_monthly ?? 0),
          r.standard_work_days ?? '',
          r.month_days,
          r.month_hours.toFixed(1),
          formatDate(r.created_at),
        ]),
      ]
      const ws = XLSX.utils.aoa_to_sheet(wsData)
      ws['!cols'] = [{ wch: 25 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 14 }]
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Nhan su')
      const ts = new Date().toISOString().slice(0, 10)
      XLSX.writeFile(wb, `bao-cao-nhan-su-${ts}.xlsx`)
    } finally {
      setExporting(null)
    }
  }

  async function exportPdf() {
    setExporting('pdf')
    try {
      const { jsPDF } = await import('jspdf')
      const autoTable = (await import('jspdf-autotable')).default
      const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' })
      doc.setFontSize(16)
      doc.text('BAO CAO NHAN SU', 14, 15)
      doc.setFontSize(10)
      doc.setTextColor(100)
      doc.text(`Ngay xuat: ${new Date().toLocaleString('vi-VN')}`, 14, 22)
      doc.text(`Tong: ${filtered.length} nhan vien`, 14, 27)

      autoTable(doc, {
        startY: 32,
        head: [['Ho ten', 'SDT', 'Vai tro', 'TT', 'Luong CB', 'NC chuan', 'NC thang', 'Gio thang', 'Ngay vao']],
        body: filtered.map((r) => [
          r.full_name,
          r.phone ?? '—',
          ROLE_META[r.role]?.label ?? r.role,
          r.is_active ? 'OK' : 'Khoa',
          formatVnd(Number(r.base_salary_monthly ?? 0)),
          String(r.standard_work_days ?? '—'),
          String(r.month_days),
          r.month_hours.toFixed(1) + 'h',
          formatDate(r.created_at),
        ]),
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
      })

      const ts = new Date().toISOString().slice(0, 10)
      doc.save(`bao-cao-nhan-su-${ts}.pdf`)
    } finally {
      setExporting(null)
    }
  }

  const hasFilter = !!search || !!filterRole || filterStatus !== 'all' || salaryRange !== 'all'

  return (
    <div className="space-y-3">
      {/* KPI */}
      {isAdmin && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat tone="blue" icon="👥" label="Tổng nhân sự" value={String(stats.total)} sub={`${stats.active} active`} />
          <Stat tone="emerald" icon="💰" label="Quỹ lương cơ bản" value={formatVnd(stats.totalSalary)} sub="Active only" />
          <Stat tone="violet" icon="📊" label="Lương trung bình" value={formatVnd(stats.avgSalary)} sub="Active only" />
          <Stat tone="amber" icon="⏱️" label="Giờ công tháng" value={`${stats.totalHoursMonth.toFixed(0)}h`} sub="Cộng tất cả NV" />
        </div>
      )}

      {/* Filter & export bar */}
      <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-3 md:p-4">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            📋 Báo cáo nhân sự
          </h2>
          <div className="flex gap-2">
            <button
              onClick={exportExcel}
              disabled={exporting !== null || filtered.length === 0}
              className="text-xs bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white font-bold rounded-lg px-3 py-1.5 shadow"
            >
              {exporting === 'xlsx' ? '⏳ Đang tạo...' : '📊 Xuất Excel'}
            </button>
            <button
              onClick={exportPdf}
              disabled={exporting !== null || filtered.length === 0}
              className="text-xs bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-700 hover:to-orange-700 disabled:opacity-50 text-white font-bold rounded-lg px-3 py-1.5 shadow"
            >
              {exporting === 'pdf' ? '⏳ Đang tạo...' : '📄 Xuất PDF'}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3">
          <input
            type="search"
            placeholder="🔍 Tên / SĐT..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-2 py-1.5 col-span-2"
          />
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-2 py-1.5"
          >
            <option value="">Mọi vai trò</option>
            {Object.entries(ROLE_META).map(([k, m]) => (
              <option key={k} value={k}>{m.emoji} {m.label}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
            className="text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-2 py-1.5"
          >
            <option value="all">Mọi trạng thái</option>
            <option value="active">🟢 Hoạt động</option>
            <option value="inactive">⚫ Khoá</option>
          </select>
          <select
            value={salaryRange}
            onChange={(e) => setSalaryRange(e.target.value as 'all' | 'low' | 'mid' | 'high')}
            className="text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-2 py-1.5"
          >
            <option value="all">Mọi mức lương</option>
            <option value="low">&lt; 5tr</option>
            <option value="mid">5-10tr</option>
            <option value="high">&gt;= 10tr</option>
          </select>
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
          <span>
            Hiện <strong className="text-gray-900 dark:text-gray-100">{filtered.length}</strong> / {rows.length} nhân sự
          </span>
          {hasFilter && (
            <button
              onClick={() => {
                setSearch('')
                setFilterRole('')
                setFilterStatus('all')
                setSalaryRange('all')
              }}
              className="text-rose-600 dark:text-rose-400 hover:underline"
            >
              Bỏ lọc
            </button>
          )}
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
            Không có nhân sự nào khớp lọc
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/40 text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                <tr>
                  <th className="text-left px-3 py-2">Nhân sự</th>
                  <th className="text-left px-3 py-2">Liên hệ</th>
                  <th className="text-left px-3 py-2">Vai trò</th>
                  <th className="text-right px-3 py-2">Lương CB</th>
                  <th className="text-right px-3 py-2">Tháng này</th>
                  <th className="text-left px-3 py-2">Ngày vào</th>
                  <th className="text-left px-3 py-2">TT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filtered.map((r) => {
                  const role = ROLE_META[r.role] ?? ROLE_META.nhan_vien
                  return (
                    <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/40">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {r.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={r.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
                              {(r.full_name.split(' ').slice(-1)[0] ?? '?')[0]}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-semibold text-gray-900 dark:text-gray-100 truncate">{r.full_name}</div>
                            {r.standard_work_days && (
                              <div className="text-[11px] text-gray-500 dark:text-gray-400">
                                {r.standard_work_days} ngày công chuẩn
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                        {r.phone ?? <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-3 py-2">
                        <span className={'text-[11px] px-2 py-0.5 rounded-full border font-bold ' + role.cls}>
                          {role.emoji} {role.label}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums font-semibold text-gray-900 dark:text-gray-100">
                        {r.base_salary_monthly ? formatVnd(Number(r.base_salary_monthly)) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="text-emerald-700 dark:text-emerald-400 font-bold tabular-nums">
                          {r.month_hours.toFixed(1)}h
                        </div>
                        <div className="text-[10px] text-gray-500 dark:text-gray-400">{r.month_days} ngày</div>
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-600 dark:text-gray-400">
                        {formatDate(r.created_at)}
                      </td>
                      <td className="px-3 py-2">
                        {r.is_active ? (
                          <span className="text-[11px] bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-full px-2 py-0.5 font-semibold">
                            🟢
                          </span>
                        ) : (
                          <span className="text-[11px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full px-2 py-0.5 font-semibold">
                            ⚫
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

const STAT_TONES: Record<string, { bg: string; ring: string; iconBg: string; iconText: string; valueText: string }> = {
  blue: { bg: 'bg-gradient-to-br from-blue-50 to-indigo-50/40 dark:from-blue-950/40 dark:to-indigo-950/30', ring: 'ring-blue-200 dark:ring-blue-900/60', iconBg: 'bg-blue-500/10', iconText: 'text-blue-600 dark:text-blue-400', valueText: 'text-blue-900 dark:text-blue-100' },
  amber: { bg: 'bg-gradient-to-br from-amber-50 to-orange-50/40 dark:from-amber-950/40 dark:to-orange-950/30', ring: 'ring-amber-200 dark:ring-amber-900/60', iconBg: 'bg-amber-500/10', iconText: 'text-amber-600 dark:text-amber-400', valueText: 'text-amber-900 dark:text-amber-100' },
  emerald: { bg: 'bg-gradient-to-br from-emerald-50 to-teal-50/40 dark:from-emerald-950/40 dark:to-teal-950/30', ring: 'ring-emerald-200 dark:ring-emerald-900/60', iconBg: 'bg-emerald-500/10', iconText: 'text-emerald-600 dark:text-emerald-400', valueText: 'text-emerald-900 dark:text-emerald-100' },
  violet: { bg: 'bg-gradient-to-br from-violet-50 to-purple-50/40 dark:from-violet-950/40 dark:to-purple-950/30', ring: 'ring-violet-200 dark:ring-violet-900/60', iconBg: 'bg-violet-500/10', iconText: 'text-violet-600 dark:text-violet-400', valueText: 'text-violet-900 dark:text-violet-100' },
}

function Stat({ tone, icon, label, value, sub }: { tone: keyof typeof STAT_TONES; icon: string; label: string; value: string; sub?: string }) {
  const t = STAT_TONES[tone]
  return (
    <div className={'relative overflow-hidden ' + t.bg + ' ring-1 ' + t.ring + ' rounded-2xl p-3 md:p-4'}>
      <div className={'absolute -right-3 -top-3 w-14 h-14 rounded-full ' + t.iconBg + ' blur-xl'} />
      <div className="relative">
        <div className={'w-9 h-9 rounded-xl ' + t.iconBg + ' ' + t.iconText + ' flex items-center justify-center text-lg mb-2'}>
          {icon}
        </div>
        <div className={'text-[10px] font-bold uppercase tracking-widest ' + t.iconText + ' opacity-80'}>{label}</div>
        <div className={'text-base md:text-lg font-bold ' + t.valueText + ' tabular-nums truncate'}>{value}</div>
        {sub && <div className={'text-[10px] mt-0.5 ' + t.iconText + ' opacity-70'}>{sub}</div>}
      </div>
    </div>
  )
}
