import { BaseInvoiceProviderAdapter } from './mock-base'
import type { InvoiceProviderCode } from '../types'

/**
 * Viettel S-Invoice adapter
 *
 * Tài liệu: https://business.viettel.vn/sinvoice  (cần đăng ký tài khoản)
 * API thực tế: REST + SOAP, endpoint dạng `https://api-vinvoice.viettel.vn`
 *
 * Khi triển khai thật cần override:
 *   - testConnection(): gọi /auth/login
 *   - issue(): POST /InvoiceAPI/InvoiceWS/createInvoice + signFile
 *   - cancel(): POST /InvoiceAPI/InvoiceUtilsWS/cancelTransactionInvoice
 *   - lookup(): POST /InvoiceAPI/InvoiceUtilsWS/getInvoice
 *   - downloadPdf(): POST /InvoiceAPI/InvoiceUtilsWS/getInvoiceRepresentationFile
 */
export class ViettelAdapter extends BaseInvoiceProviderAdapter {
  readonly code: InvoiceProviderCode = 'viettel'
  readonly name = 'Viettel S-Invoice'

  // TODO(real): override issue/cancel/lookup khi có credential thật
}
