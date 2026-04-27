import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserPermissions } from '@/lib/rbac/guard'
import { CATEGORY_META, type SupplierCategory } from '@/lib/suppliers/types'
import { SupplierActions } from '@/components/admin/suppliers/SupplierActions'

export const revalidate = 0

const fmtVnd = (n: number) => Number(n || 0).toLocaleString('vi-VN')

export default async function SupplierDetail({ params, searchParams }: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ edit?: string }>
}) {
  const { id } = await params
  const sp = await searchParams
  const ctx = await getCurrentUserPermissions()
  if (!ctx) redirect('/auth/login')
  if (!ctx.can('nha_cung_cap', 'read')) {
    return <div className="text-sm text-gray-500">Không có quyền.</div>
  }

  const supabase = await createClient()
  const [supRes, purchasesRes] = (await Promise.all([
    supabase.from('supplier_stats').select('*').eq('id', id).single(),
    supabase
      .from('purchases')
      .select('id, purchase_code, purchase_date, total_quantity, total_amount, notes')
      .eq('supplier_id', id)
      .order('purchase_date', { ascending: false })
      .limit(50),
  ])) as [
    { data: Record<string, unknown> | null },
    { data: Array<Record<string, unknown>> | null }
  ]

  if (!supRes.data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Không tìm thấy NCC</p>
        <Link href="/admin/nha-cung-cap" className="text-blue-600 hover:underline">← Về danh sách</Link>
      </div>
    )
  }

  const s = supRes.data as Record<string, unknown>
  const purchases = (purchasesRes.data ?? []) as Array<{ id: string; purchase_code: string; purchase_date: string; total_quantity: number; total_amount: number; notes: string | null }>

  if (sp.edit === '1') {
    const { SupplierForm } = await import('@/components/admin/suppliers/SupplierForm')
    return (
      <div>
        <h1 className="text-2xl font-bold mb-1">✏️ Sửa NCC</h1>
        <p className="text-sm text-gray-500 mb-4"><Link href={`/admin/nha-cung-cap/${id}`} className="text-blue-600 hover:underline">← Hủy</Link></p>
        <SupplierForm editing={s as never} />
      </div>
    )
  }

  const category = (s.supplier_category as SupplierCategory | null) ?? 'khac'
  const cm = CATEGORY_META[category]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className={`rounded-2xl overflow-hidden border-2 ${cm.borderCls} bg-white dark:bg-gray-800 shadow-md`}>
        <div className={`h-4 bg-gradient-to-r ${cm.gradient}`} />
        <div className="p-5">
          <div className="flex items-start gap-4 flex-wrap">
            <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${cm.gradient} text-white flex items-center justify-center text-4xl shadow-lg`}>
              {(s.avatar_url as string | null) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.avatar_url as string} alt="" className="w-full h-full object-cover rounded-2xl" />
              ) : cm.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono text-gray-500">{s.code as string}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold bg-gradient-to-r ${cm.gradient} text-white`}>
                  {cm.emoji} {cm.label}
                </span>
                {(s.is_active as boolean) === false && (
                  <span className="text-[10px] bg-gray-300 text-gray-700 rounded-full px-2 py-0.5">⏸ Tạm ngưng</span>
                )}
                {(s.rating as number | null) && (
                  <span className="text-amber-600 font-bold text-sm">{'⭐'.repeat(s.rating as number)}</span>
                )}
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{s.name as string}</h1>
              {(s.products_summary as string | null) && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">📦 {s.products_summary as string}</p>
              )}
            </div>
            <SupplierActions supplierId={id} canWrite={ctx.can('nha_cung_cap', 'write')} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            <Stat label="Tổng đơn" value={(s.total_orders as number).toString()} emoji="📦" />
            <Stat label="Tổng tiền giao dịch" value={`${fmtVnd(Number(s.total_amount))}đ`} emoji="💰" />
            <Stat label="Đơn 30 ngày" value={(s.orders_30d as number).toString()} emoji="📅" />
            <Stat label="Lần gần nhất" value={(s.last_order_date as string | null) ? (s.last_order_date as string).split('-').reverse().join('/') : '—'} emoji="🕐" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Info cột trái */}
        <div className="lg:col-span-2 space-y-4">
          {/* Liên hệ */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <h3 className="font-bold text-sm mb-3">📞 Liên hệ</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <Info label="Người liên hệ" value={(s.contact_person as string | null) ?? '—'} emoji="👤" />
              <Info label="SĐT" value={(s.phone as string | null) ?? '—'} emoji="📞" link={s.phone ? `tel:${s.phone}` : undefined} />
              <Info label="Zalo" value={(s.zalo as string | null) ?? '—'} emoji="💬" />
              <Info label="Email" value={(s.email as string | null) ?? '—'} emoji="📧" link={s.email ? `mailto:${s.email}` : undefined} />
              <Info label="Tỉnh/Thành" value={(s.province as string | null) ?? '—'} emoji="📍" />
              <Info label="Địa chỉ" value={(s.address as string | null) ?? '—'} emoji="🏠" />
            </div>
          </div>

          {/* Tài chính */}
          {(s.tax_code || s.payment_terms || (s.credit_limit as number) > 0) && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl p-4">
              <h3 className="font-bold text-sm mb-3">💰 Tài chính & thanh toán</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <Info label="MST" value={(s.tax_code as string | null) ?? '—'} emoji="🧾" />
                <Info label="Điều khoản TT" value={(s.payment_terms as string | null) ?? '—'} emoji="📋" />
                <Info label="Hạn mức công nợ" value={(s.credit_limit as number) > 0 ? `${fmtVnd(s.credit_limit as number)}đ` : '—'} emoji="💳" />
              </div>
            </div>
          )}

          {/* Lịch sử mua */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <div className="px-4 py-2 border-b bg-gray-50 dark:bg-gray-900/40 flex items-center justify-between">
              <h3 className="font-bold text-sm">📦 Lịch sử mua hàng ({purchases.length})</h3>
              <Link href={`/admin/mua-vao/them-moi?supplier=${id}`} className="text-xs bg-emerald-500 text-white rounded px-3 py-1.5 font-semibold">
                + Tạo phiếu mua
              </Link>
            </div>
            {purchases.length === 0 ? (
              <p className="p-6 text-center text-xs text-gray-400">Chưa có giao dịch nào</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-[11px] uppercase text-gray-500 border-b">
                  <tr>
                    <th className="text-left p-2">Mã phiếu</th>
                    <th className="text-left p-2">Ngày</th>
                    <th className="text-right p-2">SL</th>
                    <th className="text-right p-2">Tổng tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((p) => (
                    <tr key={p.id} className="border-t border-gray-100 dark:border-gray-700 hover:bg-blue-50/30">
                      <td className="p-2">
                        <Link href={`/admin/mua-vao/${p.id}`} className="font-mono text-xs text-blue-600 hover:underline">{p.purchase_code}</Link>
                      </td>
                      <td className="p-2 text-xs">{p.purchase_date.split('-').reverse().join('/')}</td>
                      <td className="p-2 text-right font-mono">{p.total_quantity}</td>
                      <td className="p-2 text-right font-mono text-emerald-700 dark:text-emerald-400">{fmtVnd(Number(p.total_amount))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-3">
          {/* Tags */}
          {(s.tags as string[] | null) && (s.tags as string[]).length > 0 && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3">
              <h3 className="font-bold text-xs mb-2">🏷 TAGS</h3>
              <div className="flex flex-wrap gap-1">
                {(s.tags as string[]).map((t) => (
                  <span key={t} className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded px-2 py-0.5">#{t}</span>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {(s.notes as string | null) && (
            <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900 rounded-xl p-3">
              <h3 className="font-bold text-xs mb-1">📝 GHI CHÚ</h3>
              <p className="text-sm whitespace-pre-line">{s.notes as string}</p>
            </div>
          )}

          <Link href="/admin/nha-cung-cap" className="block text-center text-xs text-gray-500 hover:underline">
            ← Về danh sách
          </Link>
        </div>
      </div>
    </div>
  )
}

function Info({ label, value, emoji, link }: { label: string; value: string; emoji?: string; link?: string }) {
  const content = (
    <div className="flex items-start gap-2">
      {emoji && <span>{emoji}</span>}
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase text-gray-500 font-semibold">{label}</div>
        <div className="text-sm truncate">{value}</div>
      </div>
    </div>
  )
  return link && value !== '—' ? <a href={link} className="block hover:bg-gray-50 dark:hover:bg-gray-700/30 rounded p-1">{content}</a> : <div className="p-1">{content}</div>
}

function Stat({ label, value, emoji }: { label: string; value: string; emoji: string }) {
  return (
    <div className="text-center">
      <div className="text-2xl">{emoji}</div>
      <div className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold">{label}</div>
      <div className="font-bold text-sm">{value}</div>
    </div>
  )
}
