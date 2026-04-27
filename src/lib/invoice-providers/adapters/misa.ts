import { BaseInvoiceProviderAdapter } from './mock-base'
import type { InvoiceProviderCode } from '../types'

/**
 * MISA meInvoice adapter
 *
 * Tài liệu: https://www.misa.vn/meinvoice/api  (cần đăng ký gói meInvoice)
 * API: REST JSON — endpoint `https://api.meinvoice.vn`
 *
 * Khi triển khai thật cần override:
 *   - testConnection(): GET /api/auth — trả về token
 *   - issue(): POST /api/Invoice/Save + Issue
 *   - cancel(): POST /api/Invoice/Cancel
 *   - lookup(): GET /api/Invoice/{id}
 */
export class MisaAdapter extends BaseInvoiceProviderAdapter {
  readonly code: InvoiceProviderCode = 'misa'
  readonly name = 'MISA meInvoice'

  // TODO(real): override khi có credential thật
}
