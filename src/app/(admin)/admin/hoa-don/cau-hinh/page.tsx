import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getCurrentUserPermissions } from '@/lib/rbac/guard'
import { ProvidersClient } from '@/components/admin/invoices/ProvidersClient'
import { InvoiceTabs } from '@/components/admin/invoices/InvoiceTabs'

export const revalidate = 0

export default async function InvoiceProvidersPage() {
  const ctx = await getCurrentUserPermissions()
  if (!ctx) redirect('/auth/login')
  if (!ctx.can('hoa_don', 'read')) {
    return (
      <div className="text-sm text-gray-500">
        Bạn chưa có quyền truy cập module Hóa đơn điện tử.
      </div>
    )
  }

  const supabase = await createClient()

  const [providersRes, settingsRes] = await Promise.all([
    supabase
      .from('invoice_providers')
      .select('*')
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase.from('system_settings').select('value').eq('key', 'farm_info').maybeSingle(),
  ])

  const farmInfo =
    ((settingsRes.data as { value?: Record<string, string | undefined> } | null)?.value ?? {}) as {
      tax_code?: string
      legal_name?: string
      name?: string
      legal_address?: string
      address?: string
      phone?: string
      email_business?: string
      bank_account?: string
      bank_name?: string
    }

  const sellerDefaults = {
    tax_code: farmInfo.tax_code ?? '',
    name: farmInfo.legal_name || farmInfo.name || '',
    address: farmInfo.legal_address || farmInfo.address || '',
    phone: farmInfo.phone ?? '',
    email: farmInfo.email_business ?? '',
    bank_account: farmInfo.bank_account ?? '',
    bank_name: farmInfo.bank_name ?? '',
  }

  return (
    <div>
      <div className="mb-1">
        <h1 className="text-2xl font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
          🧾 Hóa đơn điện tử
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Cấu hình tích hợp với nhà cung cấp HĐĐT — hỗ trợ Viettel S-Invoice, VNPT-Invoice, MISA meInvoice và NCC tuỳ chỉnh.
        </p>
      </div>

      <InvoiceTabs />

      <ProvidersClient
        initial={providersRes.data ?? []}
        sellerDefaults={sellerDefaults}
        canWrite={ctx.can('hoa_don', 'write')}
        canDelete={ctx.can('hoa_don', 'delete')}
      />
    </div>
  )
}
