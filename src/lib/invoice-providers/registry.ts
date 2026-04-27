import type { IInvoiceProvider, ProviderConfig, InvoiceProviderCode } from './types'
import { ViettelAdapter } from './adapters/viettel'
import { VnptAdapter } from './adapters/vnpt'
import { MisaAdapter } from './adapters/misa'
import { CustomAdapter } from './adapters/custom'

export function getProviderAdapter(config: ProviderConfig): IInvoiceProvider {
  switch (config.provider_code) {
    case 'viettel': return new ViettelAdapter(config)
    case 'vnpt':    return new VnptAdapter(config)
    case 'misa':    return new MisaAdapter(config)
    case 'custom':  return new CustomAdapter(config)
    default:
      throw new Error(`Unknown provider_code: ${(config as { provider_code: string }).provider_code}`)
  }
}

export const PROVIDER_OPTIONS: Array<{
  code: InvoiceProviderCode
  label: string
  description: string
  helpUrl: string
}> = [
  {
    code: 'viettel',
    label: 'Viettel S-Invoice',
    description: 'Hóa đơn điện tử Viettel (sinvoice.vn)',
    helpUrl: 'https://business.viettel.vn/sinvoice',
  },
  {
    code: 'vnpt',
    label: 'VNPT-Invoice',
    description: 'Hóa đơn điện tử VNPT/Vinaphone (vnpt-invoice.vn)',
    helpUrl: 'https://vnpt-invoice.vn',
  },
  {
    code: 'misa',
    label: 'MISA meInvoice',
    description: 'Hóa đơn điện tử MISA (meinvoice.vn)',
    helpUrl: 'https://www.misa.vn/meinvoice',
  },
  {
    code: 'custom',
    label: 'NCC tuỳ chỉnh',
    description: 'Tự cấu hình endpoint cho NCC HĐĐT khác (BKAV, EFY, M-Invoice…)',
    helpUrl: '#',
  },
]
