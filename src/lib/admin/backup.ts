import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import JSZip from 'jszip'

/**
 * Backup / restore helpers cho farm.
 *
 * Format file zip:
 *   manifest.json       — version, created_at, farm_id, table_counts
 *   farm.json           — record của bảng farms (cấu hình tier, owner, …)
 *   tables/{table}.json — array of rows
 *   README.txt          — hướng dẫn ngắn cho user
 *
 * Khi restore: xoá data cũ trong farm, insert lại theo thứ tự FK an toàn.
 */

const BACKUP_VERSION = 1

/** Tables backed up — order matters for restore (FK dependencies) */
export const BACKUP_TABLES = [
  // Structural seed
  'areas',
  'cage_rows',
  'cages',
  'expense_categories',
  'vaccines',
  'qr_tags',
  // Master records
  'cash_accounts',
  'customers',
  'suppliers',
  'medicines',
  'feeds',
  // Chickens depend on breeds (global), areas, cages, qr_tags
  'chickens',
  // Chicken-related
  'chicken_media',
  'chick_groups',
  'breeding_litters',
  'vaccinations',
  'training_sessions',
  // Sales / purchases depend on chickens + customers
  'purchases',
  'purchase_items',
  'sales_orders',
  'sales_items',
  // Inventory transactions
  'medicine_transactions',
  'feed_transactions',
  // Treasury
  'cash_transactions',
  'cash_transfers',
  // Operations
  'expenses',
  'payroll_payments',
  'staff_attendance',
  'staff_assignments',
  // Customer engagement
  'customer_reviews',
  'customer_alerts',
  // Diary
  'diary_entries',
  'diary_comments',
  // Marketing
  'news_articles',
  'farm_media',
  // Misc
  'alerts',
  'asset_events',
  'assets',
  'activity_logs',
  'ai_generations',
] as const

/** Reverse order for delete */
const DELETE_ORDER = [...BACKUP_TABLES].reverse()

export type BackupManifest = {
  version: number
  created_at: string
  farm_id: string
  farm_name: string
  app: string
  tables: Record<string, number>
}

/** Build a ZIP buffer with JSON dump of all tables for given farm */
export async function exportFarmBackup(
  admin: SupabaseClient,
  farmId: string
): Promise<{ buffer: Uint8Array; filename: string; manifest: BackupManifest }> {
  const zip = new JSZip()
  const tableCounts: Record<string, number> = {}

  // Farm record itself
  const { data: farmRow } = await admin.from('farms').select('*').eq('id', farmId).single()
  zip.file('farm.json', JSON.stringify(farmRow ?? {}, null, 2))
  const farmName = (farmRow as { name?: string; slug?: string } | null)?.name ?? 'farm'
  const farmSlug = (farmRow as { slug?: string } | null)?.slug ?? 'farm'

  // Each table
  const tablesFolder = zip.folder('tables')
  for (const t of BACKUP_TABLES) {
    const { data, error } = await admin.from(t).select('*').eq('farm_id', farmId)
    if (error) {
      // Skip tables that don't exist (migration drift) — don't break the whole backup
      if (/does not exist/i.test(error.message)) {
        tableCounts[t] = -1
        continue
      }
      throw new Error(`Lỗi đọc bảng ${t}: ${error.message}`)
    }
    const rows = data ?? []
    tableCounts[t] = rows.length
    tablesFolder?.file(`${t}.json`, JSON.stringify(rows, null, 2))
  }

  // system_settings (farm_info etc.) — these don't have farm_id but are scoped to current farm via RLS
  const { data: settings } = await admin.from('system_settings').select('*')
  zip.file('system_settings.json', JSON.stringify(settings ?? [], null, 2))

  const manifest: BackupManifest = {
    version: BACKUP_VERSION,
    created_at: new Date().toISOString(),
    farm_id: farmId,
    farm_name: farmName,
    app: 'gachoivietnb',
    tables: tableCounts,
  }
  zip.file('manifest.json', JSON.stringify(manifest, null, 2))

  // Friendly README
  const readme =
    `BACKUP — ${farmName}\n` +
    `=================================\n\n` +
    `File này là bản sao lưu toàn bộ dữ liệu của trại bạn.\n` +
    `Tạo lúc: ${new Date(manifest.created_at).toLocaleString('vi-VN')}\n` +
    `Tổng số bảng: ${Object.keys(tableCounts).length}\n\n` +
    `CÁCH KHÔI PHỤC:\n` +
    `1. Vào /admin/sao-luu\n` +
    `2. Chọn tab "Khôi phục"\n` +
    `3. Upload chính file .zip này\n` +
    `4. Xác nhận — hệ thống sẽ xoá data hiện tại và thay bằng data trong file.\n\n` +
    `CẢNH BÁO:\n` +
    `- Khôi phục sẽ XOÁ HẾT data hiện tại của trại — không thể hoàn tác.\n` +
    `- Hãy backup data hiện tại TRƯỚC KHI khôi phục để có chỗ lùi.\n` +
    `- Bản backup này chỉ khôi phục được vào hệ thống Gà Chọi Việt NB.\n`
  zip.file('README.txt', readme)

  const buffer = await zip.generateAsync({
    type: 'uint8array',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })

  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const filename = `backup-${farmSlug}-${ts}.zip`

  return { buffer, filename, manifest }
}

/** Restore a backup zip into a target farm. Wipes existing data first. */
export async function restoreFarmBackup(
  admin: SupabaseClient,
  farmId: string,
  zipBuffer: ArrayBuffer
): Promise<{ ok: true; restored: Record<string, number> } | { ok: false; error: string }> {
  let zip: JSZip
  try {
    zip = await JSZip.loadAsync(zipBuffer)
  } catch (e) {
    return { ok: false, error: 'File không phải zip hợp lệ: ' + (e instanceof Error ? e.message : 'unknown') }
  }

  // Validate manifest
  const manifestFile = zip.file('manifest.json')
  if (!manifestFile) return { ok: false, error: 'File backup không có manifest.json — sai định dạng.' }
  const manifestText = await manifestFile.async('string')
  let manifest: BackupManifest
  try {
    manifest = JSON.parse(manifestText) as BackupManifest
  } catch {
    return { ok: false, error: 'manifest.json không phải JSON hợp lệ.' }
  }
  if (manifest.app !== 'gachoivietnb') {
    return { ok: false, error: 'File này không phải backup của Gà Chọi Việt NB.' }
  }
  if (manifest.version !== BACKUP_VERSION) {
    return {
      ok: false,
      error: `Phiên bản backup không tương thích (file v${manifest.version}, cần v${BACKUP_VERSION}).`,
    }
  }

  // STEP 1 — Wipe existing data (delete in reverse FK order)
  for (const t of DELETE_ORDER) {
    const { error } = await admin.from(t).delete().eq('farm_id', farmId)
    if (error && !/does not exist/i.test(error.message)) {
      // continue best-effort
    }
  }

  // STEP 2 — Insert in dependency order
  const restored: Record<string, number> = {}
  for (const t of BACKUP_TABLES) {
    const file = zip.file(`tables/${t}.json`)
    if (!file) continue
    const txt = await file.async('string')
    let rows: unknown[]
    try {
      rows = JSON.parse(txt) as unknown[]
    } catch {
      continue
    }
    if (!Array.isArray(rows) || rows.length === 0) {
      restored[t] = 0
      continue
    }
    // Force farm_id to target farmId for safety (in case backup was edited)
    const fixed = rows.map((r) => ({ ...(r as Record<string, unknown>), farm_id: farmId }))

    // Insert in batches of 100
    let inserted = 0
    for (let i = 0; i < fixed.length; i += 100) {
      const batch = fixed.slice(i, i + 100)
      const { error } = await admin.from(t).insert(batch as never)
      if (!error) inserted += batch.length
    }
    restored[t] = inserted
  }

  // Re-sync medicines / feeds current_stock to backup values
  // (triggers on medicine_transactions / feed_transactions may have decremented them)
  for (const t of ['medicines', 'feeds']) {
    const file = zip.file(`tables/${t}.json`)
    if (!file) continue
    const txt = await file.async('string')
    let rows: Array<{ id: string; current_stock?: number | string }>
    try {
      rows = JSON.parse(txt) as typeof rows
    } catch {
      continue
    }
    for (const r of rows) {
      if (r.current_stock !== undefined) {
        await admin
          .from(t)
          .update({ current_stock: r.current_stock } as never)
          .eq('id', r.id)
      }
    }
  }

  return { ok: true, restored }
}

/** Update farms.last_backup_at after a successful download */
export async function markFarmBackupTaken(admin: SupabaseClient, farmId: string): Promise<void> {
  await admin
    .from('farms')
    .update({ last_backup_at: new Date().toISOString() } as never)
    .eq('id', farmId)
}
