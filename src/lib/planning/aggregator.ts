import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Tổng hợp việc cần làm cho farm dựa trên dữ liệu hiện có.
 * Trả về danh sách PlanItem có due_date — caller có thể group theo horizon.
 */

export type PlanCategory =
  | 'vaccine' | 'breeding' | 'qr_tag' | 'training' | 'mating'
  | 'stock' | 'expiry' | 'asset_maint'
  | 'sales' | 'finance'
  | 'system'
  | 'diary'   // việc do user note từ Nhật ký

export type Priority = 'critical' | 'high' | 'medium' | 'low'

export type PlanItem = {
  id: string
  category: PlanCategory
  priority: Priority
  emoji: string
  title: string
  description: string
  due_date: string // ISO yyyy-mm-dd
  action_label?: string
  action_url?: string
  // Optional metadata cho plans manual từ Nhật ký
  source?: 'auto' | 'diary'
  plan_id?: string                  // diary_plans.id — để mark done
  due_time?: string | null
  assignee_name?: string | null
}

const today = () => new Date().toISOString().slice(0, 10)
const dayOffset = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

const monthsBetween = (iso: string) => {
  const ms = Date.now() - new Date(iso).getTime()
  return ms / (1000 * 60 * 60 * 24 * 30)
}

const daysFromToday = (iso: string) => {
  const ms = new Date(iso).getTime() - new Date(today()).getTime()
  return Math.round(ms / (1000 * 60 * 60 * 24))
}

export async function buildFarmPlan(
  sb: SupabaseClient,
  farmId: string
): Promise<PlanItem[]> {
  const items: PlanItem[] = []
  const t = today()
  const next30 = dayOffset(30)

  // ====== 1. VACCINATIONS sắp đến hạn (30 ngày) ======
  const { data: vacs } = await sb
    .from('vaccinations')
    .select('id, scheduled_date, status, chicken:chickens(id, chicken_code, name), vaccines(name_vi)')
    .eq('farm_id', farmId)
    .eq('status', 'cho_tiem')
    .lte('scheduled_date', next30)
    .order('scheduled_date')
    .limit(100)

  for (const v of (vacs ?? []) as Array<{
    id: string
    scheduled_date: string
    chicken: { id: string; chicken_code: string; name: string | null } | null
    vaccines: { name_vi: string } | null
  }>) {
    if (!v.chicken) continue
    const days = daysFromToday(v.scheduled_date)
    items.push({
      id: 'vac-' + v.id,
      category: 'vaccine',
      priority: days < 0 ? 'critical' : days <= 1 ? 'high' : days <= 7 ? 'medium' : 'low',
      emoji: '💉',
      title: `Tiêm ${v.vaccines?.name_vi ?? 'vaccine'} cho ${v.chicken.name ?? v.chicken.chicken_code}`,
      description:
        days < 0
          ? `Quá hạn ${-days} ngày — cần tiêm ngay`
          : days === 0
            ? 'Hôm nay đến lịch tiêm'
            : days === 1
              ? 'Mai đến lịch tiêm'
              : `Còn ${days} ngày`,
      due_date: v.scheduled_date,
      action_label: 'Mở hồ sơ gà',
      action_url: `/admin/ho-so-ga/${v.chicken.id}`,
    })
  }

  // ====== 2. BREEDING — lứa sắp nở (30 ngày) ======
  const { data: litters } = await sb
    .from('breeding_litters')
    .select('id, litter_code, expected_hatch_date, status, eggs_total, eggs_fertile')
    .eq('farm_id', farmId)
    .eq('status', 'dang_ap')
    .not('expected_hatch_date', 'is', null)
    .lte('expected_hatch_date', next30)
    .order('expected_hatch_date')

  for (const l of (litters ?? []) as Array<{
    id: string; litter_code: string; expected_hatch_date: string;
    eggs_total: number | null; eggs_fertile: number | null;
  }>) {
    const days = daysFromToday(l.expected_hatch_date)
    items.push({
      id: 'lit-' + l.id,
      category: 'breeding',
      priority: days <= 1 ? 'high' : days <= 7 ? 'medium' : 'low',
      emoji: '🐣',
      title: `Lứa ${l.litter_code} dự kiến nở`,
      description: `${l.eggs_fertile ?? l.eggs_total ?? 0} trứng — ${
        days < 0
          ? `Đã đến ngày nở ${-days} ngày trước, kiểm tra ngay`
          : days === 0
            ? 'Hôm nay là ngày dự nở'
            : days === 1
              ? 'Mai dự nở — chuẩn bị máy úm'
              : `Còn ${days} ngày`
      }`,
      due_date: l.expected_hatch_date,
      action_label: 'Mở chi tiết lứa',
      action_url: `/admin/sinh-san`,
    })
  }

  // ====== 3. QR TAG — gà choai đủ tuổi đeo QR (>=3 tháng) chưa có tag ======
  const threeMonthsAgo = new Date()
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
  const { data: needTags } = await sb
    .from('chickens')
    .select('id, chicken_code, name, birth_date, qr_tag_id')
    .eq('farm_id', farmId)
    .eq('status', 'dang_nuoi')
    .is('qr_tag_id', null)
    .lte('birth_date', threeMonthsAgo.toISOString().slice(0, 10))
    .order('birth_date')
    .limit(50)

  if ((needTags ?? []).length) {
    items.push({
      id: 'qr-batch',
      category: 'qr_tag',
      priority: 'medium',
      emoji: '🔳',
      title: `${needTags!.length} con gà đủ tuổi cần đeo thẻ QR`,
      description: `Gà ≥3 tháng nhưng chưa gắn QR — đeo để truy xuất nguồn gốc, gia phả`,
      due_date: t,
      action_label: 'Tới module QR',
      action_url: '/admin/generate-qr',
    })
  }

  // ====== 4. MATING — mái 6-12 tháng chưa ghép ======
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  const { data: matures } = await sb
    .from('chickens')
    .select('id, chicken_code, name, birth_date, gender')
    .eq('farm_id', farmId)
    .eq('status', 'dang_nuoi')
    .eq('gender', 'mai')
    .lte('birth_date', sixMonthsAgo.toISOString().slice(0, 10))
    .limit(20)

  // Quick check: any active breeding for these females?
  if (matures && matures.length > 0) {
    const ids = matures.map((m) => m.id as string)
    const { data: active } = await sb
      .from('breeding_litters')
      .select('female_id')
      .eq('farm_id', farmId)
      .in('female_id', ids)
      .in('status', ['dang_ap', 'da_no'])
    const inBreeding = new Set((active ?? []).map((b) => (b as { female_id: string }).female_id))
    const free = matures.filter((m) => !inBreeding.has(m.id as string))
    if (free.length > 0) {
      items.push({
        id: 'mating-free',
        category: 'mating',
        priority: 'low',
        emoji: '💕',
        title: `${free.length} mái đủ tuổi sinh sản chưa ghép đôi`,
        description: `Mái ≥6 tháng tuổi sẵn sàng — chọn trống tốt để ghép, tăng đàn con`,
        due_date: t,
        action_label: 'Tới sinh sản',
        action_url: '/admin/sinh-san',
      })
    }
  }

  // ====== 5. STOCK LOW — thuốc / cám sắp hết ======
  const { data: lowMeds } = await sb
    .from('medicines')
    .select('id, name_vi, current_stock, min_stock_alert, unit')
    .eq('farm_id', farmId)
    .eq('is_active', true)
  for (const m of (lowMeds ?? []) as Array<{
    id: string; name_vi: string; current_stock: number; min_stock_alert: number; unit: string;
  }>) {
    if (m.current_stock <= m.min_stock_alert) {
      items.push({
        id: 'stock-med-' + m.id,
        category: 'stock',
        priority: m.current_stock === 0 ? 'critical' : m.current_stock <= m.min_stock_alert / 2 ? 'high' : 'medium',
        emoji: '💊',
        title: `${m.name_vi} sắp hết — còn ${m.current_stock} ${m.unit}`,
        description: `Tối thiểu ${m.min_stock_alert} ${m.unit} · ${m.current_stock === 0 ? 'HẾT — không có thuốc dùng' : 'Đặt mua ngay để không gián đoạn điều trị'}`,
        due_date: t,
        action_label: 'Tới kho thuốc',
        action_url: '/admin/suc-khoe',
      })
    }
  }

  const { data: lowFeeds } = await sb
    .from('feeds')
    .select('id, name_vi, current_stock, min_stock_alert, unit')
    .eq('farm_id', farmId)
    .eq('is_active', true)
  for (const f of (lowFeeds ?? []) as Array<{
    id: string; name_vi: string; current_stock: number; min_stock_alert: number; unit: string;
  }>) {
    if (f.current_stock <= f.min_stock_alert) {
      items.push({
        id: 'stock-feed-' + f.id,
        category: 'stock',
        priority: f.current_stock === 0 ? 'critical' : f.current_stock <= f.min_stock_alert / 2 ? 'high' : 'medium',
        emoji: '🌾',
        title: `${f.name_vi} sắp hết — còn ${f.current_stock} ${f.unit}`,
        description: `Tối thiểu ${f.min_stock_alert} ${f.unit} · Đặt mua trước khi hết để gà không đứt bữa`,
        due_date: t,
        action_label: 'Tới kho cám',
        action_url: '/admin/suc-khoe',
      })
    }
  }

  // ====== 6. EXPIRY — thuốc cận date (30 ngày) ======
  const { data: expMeds } = await sb
    .from('medicines')
    .select('id, name_vi, expiry_date')
    .eq('farm_id', farmId)
    .eq('is_active', true)
    .not('expiry_date', 'is', null)
    .lte('expiry_date', next30)
  for (const m of (expMeds ?? []) as Array<{ id: string; name_vi: string; expiry_date: string }>) {
    const days = daysFromToday(m.expiry_date)
    items.push({
      id: 'exp-med-' + m.id,
      category: 'expiry',
      priority: days < 0 ? 'critical' : days <= 7 ? 'high' : 'medium',
      emoji: '⏳',
      title: `${m.name_vi} ${days < 0 ? 'đã hết hạn' : 'sắp hết hạn'}`,
      description: days < 0
        ? `Quá hạn ${-days} ngày — không dùng nữa, vứt đi`
        : `Còn ${days} ngày tới hạn — dùng trước khi hết hoặc đặt thuốc mới thay thế`,
      due_date: m.expiry_date,
      action_label: 'Tới kho thuốc',
      action_url: '/admin/suc-khoe',
    })
  }

  // ====== 7. ASSET MAINTENANCE (30 ngày) ======
  const { data: assetsMaint } = await sb
    .from('assets')
    .select('id, name, next_maintenance_date, status')
    .eq('farm_id', farmId)
    .not('next_maintenance_date', 'is', null)
    .lte('next_maintenance_date', next30)
    .neq('status', 'da_thanh_ly')
  for (const a of (assetsMaint ?? []) as Array<{ id: string; name: string; next_maintenance_date: string; status: string }>) {
    const days = daysFromToday(a.next_maintenance_date)
    items.push({
      id: 'asset-' + a.id,
      category: 'asset_maint',
      priority: days < 0 ? 'high' : days <= 7 ? 'medium' : 'low',
      emoji: '🛠',
      title: `Bảo trì ${a.name}`,
      description: days < 0
        ? `Quá lịch ${-days} ngày — nguy cơ hỏng đột ngột`
        : days === 0
          ? 'Hôm nay đến lịch'
          : `Còn ${days} ngày`,
      due_date: a.next_maintenance_date,
      action_label: 'Tới tài sản',
      action_url: '/admin/tai-san',
    })
  }

  // ====== 8. SALES — đơn đặt cọc chưa giao quá 7 ngày ======
  const { data: depositOrders } = await sb
    .from('sales_orders')
    .select('id, order_code, customer_id, deposit_date, total_amount, deposit_amount, customers(name)')
    .eq('farm_id', farmId)
    .eq('status', 'dat_coc')
    .order('deposit_date', { ascending: true })
    .limit(20)
  for (const o of (depositOrders ?? []) as Array<{
    id: string; order_code: string; deposit_date: string | null;
    deposit_amount: number; total_amount: number;
    customers: { name: string } | null;
  }>) {
    const since = o.deposit_date ? Math.round((Date.now() - new Date(o.deposit_date).getTime()) / 86400000) : 0
    if (since >= 3) {
      items.push({
        id: 'order-' + o.id,
        category: 'sales',
        priority: since >= 14 ? 'high' : since >= 7 ? 'medium' : 'low',
        emoji: '📦',
        title: `Đơn ${o.order_code} đợi giao — ${o.customers?.name ?? 'Khách'}`,
        description: `Đặt cọc đã ${since} ngày · Còn lại: ${new Intl.NumberFormat('vi-VN').format((o.total_amount ?? 0) - (o.deposit_amount ?? 0))}đ`,
        due_date: t,
        action_label: 'Tới đơn hàng',
        action_url: `/admin/ban-ra`,
      })
    }
  }

  // ====== 9. SYSTEM — backup quá 25 ngày ======
  const { data: farm } = await sb.from('farms').select('last_backup_at').eq('id', farmId).maybeSingle()
  const lastBackup = (farm as { last_backup_at: string | null } | null)?.last_backup_at
  const daysSinceBackup = lastBackup
    ? Math.floor((Date.now() - new Date(lastBackup).getTime()) / 86400000)
    : null
  if (!lastBackup || (daysSinceBackup !== null && daysSinceBackup >= 25)) {
    items.push({
      id: 'backup-overdue',
      category: 'system',
      priority: !lastBackup || daysSinceBackup! >= 30 ? 'high' : 'medium',
      emoji: '💾',
      title: !lastBackup ? 'Chưa có bản sao lưu nào' : `Đã ${daysSinceBackup} ngày chưa backup`,
      description: 'Khuyến nghị backup mỗi tháng — phòng máy hỏng, mất điện, lỡ tay xoá',
      due_date: t,
      action_label: 'Tới sao lưu',
      action_url: '/admin/sao-luu',
    })
  }

  // ====== 10. DIARY PLANS — việc user note từ Nhật ký ======
  const { data: diaryPlans } = await sb
    .from('diary_plans')
    .select(
      'id, title, description, due_date, due_time, priority, category, assignee:profiles(full_name), diary_entry_id'
    )
    .eq('status', 'pending')
    .order('due_date')
  type DiaryPlanRow = {
    id: string
    title: string
    description: string | null
    due_date: string
    due_time: string | null
    priority: Priority
    category: string
    assignee: { full_name: string } | { full_name: string }[] | null
    diary_entry_id: string | null
  }
  const DIARY_CAT_EMOJI: Record<string, string> = {
    cong_viec: '🛠', cham_soc: '🐔', cho_an: '🌾', ve_sinh: '🧹',
    huan_luyen: '🥊', sinh_san: '🥚', thu_y: '💉', kinh_doanh: '💵',
    su_co: '⚠️', bao_tri: '🔧', khac: '📌',
  }
  for (const p of (diaryPlans ?? []) as unknown as DiaryPlanRow[]) {
    const assigneeName = Array.isArray(p.assignee) ? p.assignee[0]?.full_name : p.assignee?.full_name
    items.push({
      id: `diary-plan-${p.id}`,
      category: 'diary',
      priority: p.priority,
      emoji: DIARY_CAT_EMOJI[p.category] ?? '📔',
      title: p.title,
      description: [
        p.description,
        assigneeName ? `Phụ trách: ${assigneeName}` : null,
        p.due_time ? `⏰ ${p.due_time.slice(0, 5)}` : null,
        '📔 Note từ Nhật ký công việc',
      ].filter(Boolean).join(' · '),
      due_date: p.due_date,
      action_label: 'Mở nhật ký',
      action_url: p.diary_entry_id ? `/admin/nhat-ky-cong-viec?entry=${p.diary_entry_id}` : '/admin/nhat-ky-cong-viec',
      source: 'diary',
      plan_id: p.id,
      due_time: p.due_time,
      assignee_name: assigneeName ?? null,
    })
  }

  // Sort by priority then due_date
  const priOrder: Record<Priority, number> = { critical: 0, high: 1, medium: 2, low: 3 }
  items.sort((a, b) => {
    if (priOrder[a.priority] !== priOrder[b.priority]) return priOrder[a.priority] - priOrder[b.priority]
    return a.due_date.localeCompare(b.due_date)
  })

  return items
}
