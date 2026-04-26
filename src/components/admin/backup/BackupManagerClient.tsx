'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'

type HistoryEntry = {
  id: string
  level: string
  message: string
  created_at: string
  user_email: string | null
  size_kb: number | null
}

type Props = {
  farmName: string
  lastBackupAt: string | null
  history: HistoryEntry[]
}

export function BackupManagerClient({ farmName, lastBackupAt, history }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<'backup' | 'restore'>('backup')
  const [busy, setBusy] = useState<'zip' | 'excel' | 'restore' | null>(null)
  const [restoreFile, setRestoreFile] = useState<File | null>(null)
  const [restoreConfirm, setRestoreConfirm] = useState('')
  const [, startTransition] = useTransition()
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function showToast(kind: 'ok' | 'err', msg: string) {
    setToast({ kind, msg })
    setTimeout(() => setToast(null), 8000)
  }

  // Days since last backup
  const daysSince = lastBackupAt
    ? Math.floor((Date.now() - new Date(lastBackupAt).getTime()) / (1000 * 60 * 60 * 24))
    : null
  const overdue = !lastBackupAt || (daysSince !== null && daysSince >= 30)
  const healthy = !overdue && daysSince !== null && daysSince < 7

  async function downloadFile(endpoint: string, kind: 'zip' | 'excel') {
    setBusy(kind)
    try {
      const r = await fetch(endpoint)
      if (!r.ok) {
        const err = (await r.json().catch(() => ({}))) as { error?: string }
        showToast('err', '❌ ' + (err.error ?? `HTTP ${r.status}`))
        return
      }
      const blob = await r.blob()
      const cd = r.headers.get('content-disposition') ?? ''
      const fname = cd.match(/filename="([^"]+)"/)?.[1] ?? (kind === 'zip' ? 'backup.zip' : 'backup.xlsx')
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fname
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      showToast('ok', `✅ Đã tải ${fname} (${(blob.size / 1024).toFixed(0)} KB)`)
      startTransition(() => router.refresh())
    } catch (e) {
      showToast('err', '❌ ' + (e instanceof Error ? e.message : 'Lỗi không rõ'))
    } finally {
      setBusy(null)
    }
  }

  async function uploadRestore() {
    if (!restoreFile || restoreConfirm !== 'KHOI-PHUC') return
    setBusy('restore')
    try {
      const fd = new FormData()
      fd.append('file', restoreFile)
      fd.append('confirm', 'KHOI-PHUC')
      const r = await fetch('/api/admin/backup/restore', { method: 'POST', body: fd })
      const j = (await r.json()) as { ok?: boolean; restored?: Record<string, number>; error?: string }
      if (!r.ok || !j.ok) {
        showToast('err', '❌ ' + (j.error ?? `HTTP ${r.status}`))
        return
      }
      const totalRows = Object.values(j.restored ?? {}).reduce((a, b) => a + b, 0)
      showToast('ok', `✅ Khôi phục thành công — ${totalRows} dòng dữ liệu được nạp lại`)
      setRestoreFile(null)
      setRestoreConfirm('')
      if (fileInputRef.current) fileInputRef.current.value = ''
      startTransition(() => router.refresh())
    } catch (e) {
      showToast('err', '❌ ' + (e instanceof Error ? e.message : 'Lỗi không rõ'))
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      {toast && (
        <div
          className={
            'rounded-lg p-3 text-sm border ' +
            (toast.kind === 'ok'
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900 text-emerald-900 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200')
          }
        >
          {toast.msg}
        </div>
      )}

      {/* Hero status banner */}
      <div
        className={
          'relative overflow-hidden rounded-2xl p-5 md:p-6 ' +
          (overdue
            ? 'bg-gradient-to-br from-amber-50 via-orange-50 to-amber-50 dark:from-amber-950/30 dark:via-orange-950/30 dark:to-amber-950/30 border border-amber-300 dark:border-amber-800'
            : healthy
              ? 'bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-50 dark:from-emerald-950/30 dark:via-teal-950/30 dark:to-emerald-950/30 border border-emerald-300 dark:border-emerald-800'
              : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-50 dark:from-blue-950/30 dark:via-indigo-950/30 dark:to-blue-950/30 border border-blue-300 dark:border-blue-800')
        }
      >
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/40 dark:bg-white/5 blur-3xl pointer-events-none" />
        <div className="relative flex items-start gap-4 flex-wrap">
          <div className="text-5xl shrink-0">{overdue ? '⚠️' : healthy ? '✅' : '🛡'}</div>
          <div className="flex-1 min-w-0">
            <div
              className={
                'text-[10px] font-bold uppercase tracking-widest mb-0.5 ' +
                (overdue
                  ? 'text-amber-700 dark:text-amber-300'
                  : healthy
                    ? 'text-emerald-700 dark:text-emerald-300'
                    : 'text-blue-700 dark:text-blue-300')
              }
            >
              Trạng thái sao lưu — {farmName}
            </div>
            <div
              className={
                'text-xl md:text-2xl font-extrabold leading-tight ' +
                (overdue
                  ? 'text-amber-900 dark:text-amber-100'
                  : healthy
                    ? 'text-emerald-900 dark:text-emerald-100'
                    : 'text-blue-900 dark:text-blue-100')
              }
            >
              {!lastBackupAt
                ? 'Chưa có bản sao lưu nào'
                : overdue
                  ? `Đã ${daysSince} ngày — Nên backup ngay!`
                  : daysSince === 0
                    ? 'Đã backup hôm nay — Tuyệt vời!'
                    : `Backup gần nhất: ${daysSince} ngày trước`}
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 mt-1.5 leading-relaxed">
              {overdue
                ? 'Khuyến nghị backup ít nhất 1 lần/tháng. Một lúc rảnh tay 30 giây là đủ — đừng chần chừ để mất dữ liệu vì sự cố không lường trước.'
                : lastBackupAt
                  ? `Lần cuối: ${new Date(lastBackupAt).toLocaleString('vi-VN')}. Tốt lắm — nhớ duy trì lịch backup đều đặn.`
                  : 'Hãy tạo bản sao lưu đầu tiên ngay để bảo vệ công sức bạn đã đầu tư vào hệ thống.'}
            </p>
            {!overdue && lastBackupAt && (
              <button
                onClick={() => setTab('backup')}
                className="mt-3 text-xs bg-white/60 dark:bg-white/10 hover:bg-white/80 dark:hover:bg-white/20 text-gray-800 dark:text-gray-200 font-semibold rounded-lg px-3 py-1.5 transition"
              >
                📥 Backup mới
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 mt-4">
        <button
          onClick={() => setTab('backup')}
          className={
            'px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition ' +
            (tab === 'backup'
              ? 'border-blue-600 text-blue-700 dark:text-blue-300'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300')
          }
        >
          📥 Sao lưu
        </button>
        <button
          onClick={() => setTab('restore')}
          className={
            'px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition ' +
            (tab === 'restore'
              ? 'border-rose-600 text-rose-700 dark:text-rose-300'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300')
          }
        >
          🔄 Khôi phục
        </button>
      </div>

      {tab === 'backup' && (
        <>
          {/* 3 backup options */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
            {/* ZIP — RECOMMENDED */}
            <section className="relative overflow-hidden bg-white dark:bg-gray-800 ring-2 ring-blue-500 dark:ring-blue-700 rounded-2xl shadow-md hover:shadow-lg transition">
              <div className="absolute top-0 right-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-bl-lg shadow">
                ⭐ Khuyến nghị
              </div>
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
              <div className="p-5">
                <div className="text-3xl mb-2">📦</div>
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1">
                  Bản sao lưu đầy đủ (ZIP)
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  Dùng để KHÔI PHỤC khi bị mất dữ liệu
                </p>
                <ul className="text-xs text-gray-700 dark:text-gray-300 space-y-1 mb-4 list-disc pl-5">
                  <li>Đầy đủ 39+ bảng dữ liệu</li>
                  <li>Restore lại được nguyên trạng</li>
                  <li>Nén deflate — file rất nhỏ</li>
                  <li>Có manifest + README hướng dẫn</li>
                </ul>
                <button
                  onClick={() => downloadFile('/api/admin/backup/export', 'zip')}
                  disabled={busy !== null}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl px-4 py-2.5 shadow hover:shadow-lg transition"
                >
                  {busy === 'zip' ? '⏳ Đang nén...' : '📥 Tải ZIP về máy'}
                </button>
              </div>
            </section>

            {/* Excel */}
            <section className="relative overflow-hidden bg-white dark:bg-gray-800 ring-1 ring-gray-200 dark:ring-gray-700 rounded-2xl shadow-sm hover:shadow-md transition">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
              <div className="p-5">
                <div className="text-3xl mb-2">📊</div>
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1">
                  Bản xuất Excel
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  Để xem / báo cáo trên máy tính
                </p>
                <ul className="text-xs text-gray-700 dark:text-gray-300 space-y-1 mb-4 list-disc pl-5">
                  <li>Mỗi bảng = 1 sheet riêng</li>
                  <li>Mở bằng Excel / Google Sheets</li>
                  <li>Để duyệt, tổng kết, in báo cáo</li>
                  <li className="text-amber-700 dark:text-amber-400">
                    ⚠️ KHÔNG dùng để khôi phục
                  </li>
                </ul>
                <button
                  onClick={() => downloadFile('/api/admin/backup-all', 'excel')}
                  disabled={busy !== null}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl px-4 py-2.5 shadow hover:shadow-lg transition"
                >
                  {busy === 'excel' ? '⏳ Đang tạo Excel...' : '📊 Tải Excel về máy'}
                </button>
              </div>
            </section>

            {/* Google Drive — Coming Soon */}
            <section className="relative overflow-hidden bg-gray-50 dark:bg-gray-900/50 ring-1 ring-gray-200 dark:ring-gray-700 rounded-2xl shadow-sm">
              <div className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-bl-lg">
                Coming Soon
              </div>
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
              <div className="p-5">
                <div className="text-3xl mb-2 opacity-60">☁️</div>
                <h3 className="text-base font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Tự động lên Google Drive
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  Backup không cần nhớ
                </p>
                <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1 mb-4 list-disc pl-5 italic">
                  <li>Tự backup tuần/tháng</li>
                  <li>Lưu Drive folder của bạn</li>
                  <li>Giữ N bản gần nhất</li>
                  <li>Restore từ Drive trực tiếp</li>
                </ul>
                <button
                  disabled
                  className="w-full bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-sm font-bold rounded-xl px-4 py-2.5 cursor-not-allowed"
                >
                  🚧 Đang phát triển
                </button>
              </div>
            </section>
          </div>

          {/* Best practice tips */}
          <section className="bg-gradient-to-br from-violet-50/50 to-indigo-50/50 dark:from-violet-950/20 dark:to-indigo-950/20 border border-violet-200 dark:border-violet-900 rounded-2xl p-4 md:p-5 mt-4">
            <h3 className="text-base font-bold text-violet-900 dark:text-violet-200 mb-3 flex items-center gap-2">
              <span>💡</span> Quy tắc 3-2-1 — chuẩn vàng cho an toàn dữ liệu
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Tip
                num="3"
                title="Bản sao"
                desc="Giữ ít nhất 3 bản sao của dữ liệu quan trọng — 1 bản gốc + 2 bản backup."
              />
              <Tip
                num="2"
                title="Loại lưu trữ"
                desc="Trên 2 loại thiết bị khác nhau — vd máy tính + USB / ổ cứng ngoài / đám mây."
              />
              <Tip
                num="1"
                title="Off-site"
                desc="Ít nhất 1 bản ở vị trí khác — phòng cháy nổ, mất trộm, hỏng cả nhà."
              />
            </div>
            <ul className="text-xs text-violet-800 dark:text-violet-300 space-y-1 mt-3 list-disc pl-5">
              <li>Đặt lịch nhắc trên điện thoại: 1 tháng/lần — đầu tháng tải file ZIP</li>
              <li>Đổi tên file rõ ràng: <code className="bg-white/60 dark:bg-gray-900/60 px-1 rounded">backup-trai-T05-2026.zip</code></li>
              <li>Lưu vào Google Drive cá nhân + USB + email tự gửi mình</li>
              <li>Kiểm tra định kỳ: thử khôi phục vào chế độ test để chắc file backup hoạt động</li>
            </ul>
          </section>

          {/* Recent backup history */}
          {history.length > 0 && (
            <section className="bg-white dark:bg-gray-800 ring-1 ring-gray-200 dark:ring-gray-700 rounded-2xl p-4 md:p-5 mt-4">
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                <span>📜</span> Lịch sử sao lưu gần đây
              </h3>
              <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                {history.map((h) => (
                  <li key={h.id} className="py-2.5 flex items-center gap-3">
                    <span className="text-lg shrink-0">
                      {/restored from/i.test(h.message) ? '🔄' : '📥'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-900 dark:text-gray-100 truncate">{h.message}</div>
                      <div className="text-[11px] text-gray-500 dark:text-gray-400">
                        {new Date(h.created_at).toLocaleString('vi-VN')}
                        {h.user_email && ' · ' + h.user_email}
                        {h.size_kb !== null && ` · ${h.size_kb} KB`}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {tab === 'restore' && (
        <div className="mt-4 space-y-4">
          <div className="bg-rose-50 dark:bg-rose-950/30 border-2 border-rose-300 dark:border-rose-800 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <div className="text-3xl">⚠️</div>
              <div>
                <h3 className="text-lg font-bold text-rose-900 dark:text-rose-200 mb-1">
                  Cảnh báo trước khi khôi phục
                </h3>
                <ul className="text-sm text-rose-800 dark:text-rose-300 space-y-1.5 list-disc pl-5">
                  <li><b>TOÀN BỘ dữ liệu hiện tại của trại sẽ bị xoá</b> trước khi nạp data từ file backup.</li>
                  <li>Hãy <b>tải bản backup hiện tại</b> trước (tab Sao lưu) để có chỗ lùi nếu file bị lỗi.</li>
                  <li>Chỉ khôi phục được file ZIP do hệ thống Gà Chọi Việt NB tạo ra (file Excel KHÔNG khôi phục được).</li>
                  <li>Sau khi khôi phục, kiểm kê tồn kho thuốc/cám thủ công (1 số trigger có thể đã chỉnh).</li>
                </ul>
              </div>
            </div>
          </div>

          <section className="bg-white dark:bg-gray-800 ring-1 ring-gray-200 dark:ring-gray-700 rounded-2xl p-5">
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              <span className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center text-lg">🔄</span>
              Chọn file backup ZIP
            </h3>

            <input
              ref={fileInputRef}
              type="file"
              accept=".zip,application/zip"
              onChange={(e) => setRestoreFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-gray-700 dark:text-gray-300 file:mr-3 file:px-4 file:py-2 file:bg-rose-50 dark:file:bg-rose-950/30 file:text-rose-700 dark:file:text-rose-300 file:border file:border-rose-200 dark:file:border-rose-900 file:rounded-lg file:font-semibold file:cursor-pointer cursor-pointer"
            />

            {restoreFile && (
              <div className="mt-3 space-y-3">
                <div className="bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-sm">
                  <div className="font-mono text-gray-900 dark:text-gray-100 break-all">{restoreFile.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {(restoreFile.size / 1024).toFixed(1)} KB · {restoreFile.type || 'application/zip'}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-rose-900 dark:text-rose-200 mb-1.5">
                    Gõ <code className="bg-white dark:bg-gray-900 px-1.5 py-0.5 rounded font-mono text-rose-700 dark:text-rose-300">KHOI-PHUC</code> để xác nhận:
                  </label>
                  <input
                    type="text"
                    value={restoreConfirm}
                    onChange={(e) => setRestoreConfirm(e.target.value)}
                    placeholder="KHOI-PHUC"
                    className="w-full px-3 py-2 border-2 border-rose-300 dark:border-rose-800 dark:bg-gray-900 rounded-lg text-sm font-mono"
                  />
                </div>

                <button
                  onClick={uploadRestore}
                  disabled={busy === 'restore' || restoreConfirm !== 'KHOI-PHUC'}
                  className="w-full bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl px-4 py-3 shadow-md transition flex items-center justify-center gap-2"
                >
                  {busy === 'restore' ? '⏳ Đang khôi phục... (có thể mất 1-2 phút)' : '🔄 Xoá dữ liệu hiện tại & nạp file này'}
                </button>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  )
}

function Tip({ num, title, desc }: { num: string; title: string; desc: string }) {
  return (
    <div className="bg-white/70 dark:bg-gray-800/70 rounded-xl p-3 border border-violet-200/60 dark:border-violet-900/50">
      <div className="flex items-start gap-2.5">
        <div className="shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 text-white font-extrabold text-lg flex items-center justify-center shadow-sm">
          {num}
        </div>
        <div>
          <div className="text-sm font-bold text-violet-900 dark:text-violet-200">{title}</div>
          <p className="text-xs text-violet-800 dark:text-violet-300 mt-0.5 leading-relaxed">{desc}</p>
        </div>
      </div>
    </div>
  )
}
