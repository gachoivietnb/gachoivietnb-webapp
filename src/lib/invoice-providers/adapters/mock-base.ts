/**
 * Base mock adapter — implement luồng giả lập để test UI E2E mà chưa cần
 * credential thật của NCC. Tất cả 3 adapter (Viettel, VNPT, MISA) extend
 * lớp này và override những phần đặc thù.
 *
 * Khi `provider.test_mode = true` → dùng mock (CHƯA gửi đi đâu cả).
 * Khi `provider.test_mode = false` → adapter cụ thể PHẢI override để gọi API thật.
 */

import type {
  IInvoiceProvider,
  InvoiceProviderCode,
  IssueInvoiceInput,
  IssueInvoiceResult,
  CancelInvoiceInput,
  CancelInvoiceResult,
  LookupResult,
  ProviderConfig,
} from '../types'

export abstract class BaseInvoiceProviderAdapter implements IInvoiceProvider {
  abstract readonly code: InvoiceProviderCode
  abstract readonly name: string

  constructor(protected readonly config: ProviderConfig) {}

  get testMode(): boolean {
    return this.config.test_mode
  }

  async testConnection(): Promise<{ ok: boolean; message: string }> {
    if (this.testMode) {
      return { ok: true, message: '✓ Mock — kết nối giả lập OK (test_mode đang bật)' }
    }
    if (!this.config.api_url || !this.config.api_username) {
      return { ok: false, message: 'Thiếu URL hoặc username' }
    }
    return { ok: false, message: 'Adapter chưa hỗ trợ test thật — bật test_mode để chạy mock' }
  }

  async issue(input: IssueInvoiceInput): Promise<IssueInvoiceResult> {
    if (this.testMode) {
      return this.mockIssue(input)
    }
    return {
      ok: false,
      error: `Adapter "${this.code}" chưa hỗ trợ phát hành HĐ thật. Vui lòng bật test_mode hoặc liên hệ team triển khai.`,
    }
  }

  async cancel(input: CancelInvoiceInput): Promise<CancelInvoiceResult> {
    if (this.testMode) {
      return {
        ok: true,
        response_payload: {
          mock: true,
          cancelled_at: new Date().toISOString(),
          invoice_no: input.invoice_no,
          reason: input.reason,
        },
      }
    }
    return { ok: false, error: `Adapter "${this.code}" chưa hỗ trợ huỷ HĐ thật` }
  }

  async lookup(invoice_no: string): Promise<LookupResult> {
    if (this.testMode) {
      return {
        ok: true,
        status: 'da_phat_hanh',
        cqt_code: this.makeMockCqtCode(invoice_no),
        response_payload: { mock: true, invoice_no },
      }
    }
    return { ok: false, error: 'Chưa hỗ trợ lookup thật' }
  }

  async downloadPdf(): Promise<{ ok: boolean; data?: Uint8Array; error?: string }> {
    if (this.testMode) {
      return { ok: false, error: 'Mock mode — sử dụng PDF generate cục bộ' }
    }
    return { ok: false, error: 'Chưa hỗ trợ download từ NCC' }
  }

  protected mockIssue(input: IssueInvoiceInput): IssueInvoiceResult {
    const issuedAt = new Date()
    const yymm = issuedAt.toISOString().slice(2, 7).replace('-', '')
    const random = Math.floor(Math.random() * 1_000_000).toString().padStart(7, '0')
    const invoiceNo = random
    const cqtCode = this.makeMockCqtCode(invoiceNo)
    return {
      ok: true,
      invoice_no: invoiceNo,
      cqt_code: cqtCode,
      cqt_lookup_code: `M${yymm}${random}`,
      signed_at: issuedAt.toISOString(),
      request_payload: { mock: true, internal_no: input.internal_no, items: input.items.length },
      response_payload: {
        mock: true,
        provider: this.code,
        invoice_no: invoiceNo,
        cqt_code: cqtCode,
        message: 'Mock issued (test_mode)',
      },
    }
  }

  protected makeMockCqtCode(invoiceNo: string): string {
    const seed = (this.config.seller_tax_code || '0000').replace(/\D/g, '').slice(-4)
    return `M${seed}${invoiceNo}`.slice(0, 24)
  }
}
