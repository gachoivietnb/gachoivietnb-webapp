/**
 * Invoice provider abstraction (TT 78/2021/TT-BTC)
 *
 * Mỗi nhà cung cấp HĐĐT (Viettel S-Invoice, VNPT-Invoice, MISA meInvoice,
 * custom) implement interface này để hệ thống gọi đồng nhất qua registry.
 */

export type InvoiceProviderCode = 'viettel' | 'vnpt' | 'misa' | 'custom'

export type ProviderConfig = {
  id: string
  farm_id: string
  provider_code: InvoiceProviderCode
  name: string
  api_url: string | null
  api_username: string | null
  api_password_encrypted: string | null
  api_token: string | null
  seller_tax_code: string
  seller_name: string
  seller_address: string | null
  seller_phone: string | null
  seller_email: string | null
  seller_bank_account: string | null
  seller_bank_name: string | null
  default_template_code: string | null
  default_invoice_serial: string | null
  signing_serial: string | null
  signing_cert_alias: string | null
  extra_config: Record<string, unknown>
  test_mode: boolean
}

export type SellerInfo = {
  tax_code: string
  name: string
  address?: string | null
  phone?: string | null
  email?: string | null
  bank_account?: string | null
  bank_name?: string | null
}

export type BuyerInfo = {
  name: string
  tax_code?: string | null
  address?: string | null
  email?: string | null
  phone?: string | null
  buyer_type: 'ca_nhan' | 'doanh_nghiep'
  bank_account?: string | null
  bank_name?: string | null
  representative_name?: string | null
}

export type InvoiceItemInput = {
  product_code?: string | null
  description: string
  unit: string
  quantity: number
  unit_price: number
  discount_pct?: number
  tax_rate: number          // 0/5/8/10  (-1=KCT, -2=KKKNT)
}

export type IssueInvoiceInput = {
  internal_no: string
  issue_date: string        // YYYY-MM-DD
  template_code?: string | null
  invoice_serial?: string | null
  payment_method: 'TM' | 'CK' | 'TM_CK'
  currency?: string
  exchange_rate?: number
  seller: SellerInfo
  buyer: BuyerInfo
  items: InvoiceItemInput[]
  subtotal: number
  tax_amount: number
  total: number
  total_words: string
  notes?: string | null
}

export type IssueInvoiceResult = {
  ok: boolean
  invoice_no?: string
  cqt_code?: string
  cqt_lookup_code?: string
  pdf_url?: string
  xml_url?: string
  signed_at?: string
  request_payload?: unknown
  response_payload?: unknown
  error?: string
}

export type CancelInvoiceInput = {
  invoice_no: string
  invoice_serial: string
  template_code?: string | null
  reason: string
  cancel_date: string
}

export type CancelInvoiceResult = {
  ok: boolean
  response_payload?: unknown
  error?: string
}

export type LookupResult = {
  ok: boolean
  status?: 'da_phat_hanh' | 'da_huy' | 'cho_cap_ma' | 'tu_choi'
  cqt_code?: string
  pdf_url?: string
  response_payload?: unknown
  error?: string
}

export interface IInvoiceProvider {
  readonly code: InvoiceProviderCode
  readonly name: string
  readonly testMode: boolean

  /** Test kết nối + credential */
  testConnection(): Promise<{ ok: boolean; message: string }>

  /** Phát hành HĐ — gửi lên NCC, ký số, nhận mã CQT */
  issue(input: IssueInvoiceInput): Promise<IssueInvoiceResult>

  /** Huỷ HĐ đã phát hành */
  cancel(input: CancelInvoiceInput): Promise<CancelInvoiceResult>

  /** Tra cứu trạng thái HĐ trên NCC / CQT */
  lookup(invoice_no: string, invoice_serial: string): Promise<LookupResult>

  /** Tải PDF từ NCC (nếu chưa lưu local) */
  downloadPdf(invoice_no: string, invoice_serial: string): Promise<{ ok: boolean; data?: Uint8Array; error?: string }>
}
