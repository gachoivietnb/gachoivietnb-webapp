import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

const TABLES = [
  'profiles',
  'areas',
  'cage_rows',
  'cages',
  'breeds',
  'qr_tags',
  'chickens',
  'breeding_litters',
  'chick_groups',
  'vaccines',
  'vaccinations',
  'medicines',
  'medicine_transactions',
  'feeds',
  'feed_transactions',
  'diseases',
  'disease_outbreaks',
  'training_sessions',
  'suppliers',
  'purchases',
  'purchase_items',
  'customers',
  'sales_orders',
  'sales_items',
  'expense_categories',
  'expenses',
  'staff_attendance',
  'staff_assignments',
  'activity_logs',
  'alerts',
  'customer_reviews',
  'system_settings',
  'backup_logs',
]

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single<{ role: string }>()

  if (profile?.role !== 'chu_trai') {
    return NextResponse.json({ error: 'Chỉ chủ trại được backup' }, { status: 403 })
  }

  const wb = XLSX.utils.book_new()
  const counts: Record<string, number> = {}

  for (const table of TABLES) {
    try {
      const { data, error } = await supabase.from(table).select('*')
      if (error) {
        console.error(`Backup ${table}:`, error.message)
        continue
      }
      const rows = (data ?? []) as Record<string, unknown>[]
      if (rows.length > 0) {
        const flattened = rows.map((r) => {
          const out: Record<string, unknown> = {}
          for (const [k, v] of Object.entries(r)) {
            out[k] = v !== null && typeof v === 'object' ? JSON.stringify(v) : v
          }
          return out
        })
        const ws = XLSX.utils.json_to_sheet(flattened)
        XLSX.utils.book_append_sheet(wb, ws, table.substring(0, 31))
        counts[table] = rows.length
      }
    } catch (err) {
      console.error(`Backup ${table} error:`, err)
    }
  }

  const meta: (string | number)[][] = [
    ['Backup timestamp', new Date().toLocaleString('vi-VN')],
    ['Exported by', user.email ?? user.id],
    ['Tables with data', Object.keys(counts).length],
    [],
    ['Table', 'Rows'],
    ...Object.entries(counts).map(([t, c]) => [t, c]),
  ]
  const metaWs = XLSX.utils.aoa_to_sheet(meta)
  XLSX.utils.book_append_sheet(wb, metaWs, '_metadata')

  const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer

  await supabase.from('backup_logs').insert({
    backup_type: 'manual_excel',
    exported_by: user.id,
    rows_exported: counts,
    file_size_bytes: buffer.byteLength,
  } as never)

  const filename = `gachoivietnb-backup-${new Date().toISOString().split('T')[0]}.xlsx`
  return new NextResponse(buffer, {
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
