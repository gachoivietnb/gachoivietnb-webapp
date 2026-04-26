'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  farmName: string
  lastBackupAt: string | null
}

export function BackupManagerClient({ farmName, lastBackupAt }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<'backup' | 'restore'>('backup')
  const [downloading, setDownloading] = useState(false)
  const [restoring, setRestoring] = useState(false)
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

  async function downloadBackup() {
    setDownloading(true)
    try {
      const r = await fetch('/api/admin/backup/export')
      if (!r.ok) {
        const err = (await r.json().catch(() => ({}))) as { error?: string }
        showToast('err', '❌ ' + (err.error ?? `HTTP ${r.status}`))
        return
      }
      const blob = await r.blob()
      const cd = r.headers.get('content-disposition') ?? ''
      const fname = cd.match(/filename="([^"]+)"/)?.[1] ?? 'backup.zip'
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
      setDownloading(false)
    }
  }

  async function uploadRestore() {
    if (!restoreFile) return
    if (restoreConfirm !== 'KHOI-PHUC') {
      showToast('err', 'Vui lòng gõ đúng KHOI-PHUC để xác nhận')
      return
    }
    setRestoring(true)
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
      setRestoring(false)
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

      {/* Status banner */}
      <div
        className={
          'rounded-2xl p-4 md:p-5 border ' +
          (overdue
            ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800'
            : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800')
        }
      >
        <div className="flex items-start gap-3">
          <div className="text-3xl">{overdue ? '⚠️' : '✅'}</div>
          <div className="flex-1">
            <div
              className={
                'text-base md:text-lg font-bold ' +
                (overdue ? 'text-amber-900 dark:text-amber-200' : 'text-emerald-900 dark:text-emerald-200')
              }
            >
              {!lastBackupAt
                ? 'Chưa có bản sao lưu nào'
                : overdue
                  ? `Đã ${daysSince} ngày kể từ lần sao lưu cuối — Nên backup ngay!`
                  : `Lần backup cuối: ${daysSince === 0 ? 'hôm nay' : `${daysSince} ngày trước`}`}
            </div>
            <div
              className={
                'text-sm mt-0.5 ' +
                (overdue ? 'text-amber-800 dark:text-amber-300' : 'text-emerald-800 dark:text-emerald-300')
              }
            >
              {overdue
                ? 'Khuyến nghị: backup ít nhất 1 lần/tháng để phòng mất dữ liệu (mất điện, hư máy, lỡ tay xoá...).'
                : lastBackupAt
                  ? `Vào lúc: ${new Date(lastBackupAt).toLocaleString('vi-VN')}`
                  : 'Hãy tải ngay bản đầu tiên.'}
            </div>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {/* Local backup */}
          <section className="relative overflow-hidden bg-white dark:bg-gray-800 ring-1 ring-gray-200 dark:ring-gray-700 rounded-2xl shadow-sm">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
            <div className="p-5">
              <div className="flex items-start justify-between mb-2">
                <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <span className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center text-lg">💻</span>
                  Tải về máy
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-widest bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-full px-2 py-0.5 border border-emerald-200 dark:border-emerald-900">
                  Sẵn sàng
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                Tải toàn bộ dữ liệu trại của bạn về dạng <b>file ZIP nén</b> để lưu trên máy tính / USB / ổ cứng ngoài.
                File chứa toàn bộ JSON các bảng + manifest để có thể khôi phục lại dễ dàng.
              </p>
              <ul className="text-xs text-gray-700 dark:text-gray-300 space-y-1 mb-4 list-disc pl-5">
                <li>Chứa: gà, gia phả, đơn hàng, chi phí, nhật ký, ảnh URL, tiêm phòng, kho thuốc/cám…</li>
                <li>Định dạng nén deflate (level 6) — dung lượng nhỏ</li>
                <li>Tải xong sẽ được đánh dấu là "đã backup" để tắt nhắc nhở</li>
              </ul>
              <button
                onClick={downloadBackup}
                disabled={downloading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl px-4 py-3 shadow-md hover:shadow-lg transition flex items-center justify-center gap-2"
              >
                {downloading ? '⏳ Đang nén & tải...' : '📥 Tải backup ZIP về máy'}
              </button>
            </div>
          </section>

          {/* Google Drive — coming soon */}
          <section className="relative overflow-hidden bg-gray-50 dark:bg-gray-900/50 ring-1 ring-gray-200 dark:ring-gray-700 rounded-2xl shadow-sm opacity-90">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
            <div className="p-5">
              <div className="flex items-start justify-between mb-2">
                <h2 className="text-base font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <span className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center text-lg">☁️</span>
                  Google Drive
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-widest bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 rounded-full px-2 py-0.5 border border-amber-200 dark:border-amber-900">
                  Coming Soon
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                Tự động sao lưu định kỳ lên Google Drive folder của bạn — không cần nhớ tải về máy mỗi tháng.
              </p>
              <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1 mb-4 list-disc pl-5 italic">
                <li>Tự động backup mỗi tuần/tháng (cấu hình được)</li>
                <li>Lưu ra folder Drive riêng của trại</li>
                <li>Giữ N bản gần nhất (tự xoá cũ)</li>
                <li>Khôi phục từ Drive trực tiếp</li>
              </ul>
              <button
                disabled
                className="w-full bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-sm font-bold rounded-xl px-4 py-3 cursor-not-allowed"
              >
                🚧 Đang phát triển — sắp ra mắt
              </button>
            </div>
          </section>
        </div>
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
                  <li>Chỉ khôi phục được file zip do hệ thống Gà Chọi Việt NB tạo ra.</li>
                  <li>Sau khi khôi phục, kiểm kê tồn kho thuốc/cám thủ công (1 số trigger có thể đã chỉnh).</li>
                </ul>
              </div>
            </div>
          </div>

          <section className="bg-white dark:bg-gray-800 ring-1 ring-gray-200 dark:ring-gray-700 rounded-2xl p-5">
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              <span className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center text-lg">🔄</span>
              Chọn file backup
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
                  disabled={restoring || restoreConfirm !== 'KHOI-PHUC'}
                  className="w-full bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl px-4 py-3 shadow-md transition flex items-center justify-center gap-2"
                >
                  {restoring ? '⏳ Đang khôi phục... (có thể mất 1-2 phút)' : '🔄 Xoá dữ liệu hiện tại & nạp file này'}
                </button>
              </div>
            )}
          </section>
        </div>
      )}

      <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 leading-relaxed">
        💡 <b>Tip:</b> Sao lưu định kỳ <b>1 tháng/lần</b> — đầu tháng. Lưu file zip vào nhiều chỗ:
        máy tính, USB, email tự gửi, Google Drive cá nhân — đề phòng máy hỏng / mất.
      </p>
    </>
  )
}
