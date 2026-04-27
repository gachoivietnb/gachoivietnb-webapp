import { BaseInvoiceProviderAdapter } from './mock-base'
import type { InvoiceProviderCode } from '../types'

/**
 * VNPT-Invoice (Vinaphone / VNPT) adapter
 *
 * Tài liệu: https://vnpt-invoice.vn  (cần đăng ký doanh nghiệp)
 * API: SOAP/REST hỗn hợp — endpoint dạng `https://{tax-code}-tt78.vnpt-invoice.com.vn`
 *
 * Khi triển khai thật cần override:
 *   - testConnection(): gọi /BusinessService.asmx?op=loginToken
 *   - issue(): /PublishService.asmx?op=ImportAndPublishInv
 *   - cancel(): /BusinessService.asmx?op=CancelInv
 */
export class VnptAdapter extends BaseInvoiceProviderAdapter {
  readonly code: InvoiceProviderCode = 'vnpt'
  readonly name = 'VNPT-Invoice'

  // TODO(real): override khi có credential thật
}
