import { BaseInvoiceProviderAdapter } from './mock-base'
import type { InvoiceProviderCode } from '../types'

/**
 * Custom adapter — cho các NCC ngoài 3 NCC chính.
 *
 * extra_config trong DB chứa:
 *   - issue_endpoint: URL POST phát hành
 *   - cancel_endpoint: URL POST huỷ
 *   - lookup_endpoint: URL GET tra cứu
 *   - auth_type: 'basic' | 'bearer' | 'apikey'
 *   - request_template: JSONata mapping (optional)
 *   - response_paths: { invoice_no, cqt_code } (jsonpath strings)
 *
 * Khi triển khai thật cần override theo schema NCC custom đó.
 */
export class CustomAdapter extends BaseInvoiceProviderAdapter {
  readonly code: InvoiceProviderCode = 'custom'
  readonly name = 'NCC tùy chỉnh'

  // TODO(real): áp dụng extra_config để gọi REST endpoint NCC tùy chỉnh
}
