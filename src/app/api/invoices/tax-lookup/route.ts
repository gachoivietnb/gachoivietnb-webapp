import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requirePermission } from '@/lib/rbac/guard'

const Schema = z.object({ tax_code: z.string().min(10).max(20) })

/**
 * Tra cứu MST từ API public.
 * Dùng masothue.com (không có API chính thức) — fallback gracefully.
 *
 * TODO(prod): chuyển sang API có hợp đồng (gdt.gov.vn / vinacheck) khi anh
 * sẵn sàng. Endpoint hiện tại chỉ là best-effort, có thể bị rate-limit.
 */
export async function POST(request: Request) {
  const ctx = await requirePermission('hoa_don', 'read')
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const parsed = Schema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'MST không hợp lệ' }, { status: 400 })

  const taxCode = parsed.data.tax_code.replace(/[\s-]/g, '')

  // Cố gắng dùng masothue.com (bóc HTML — không lý tưởng nhưng chạy được)
  try {
    const res = await fetch(`https://masothue.com/Search/?q=${encodeURIComponent(taxCode)}&type=auto`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GaChoiVietNB/1.0)',
        Accept: 'text/html',
      },
      next: { revalidate: 60 * 60 * 24 },
    })
    if (!res.ok) {
      return NextResponse.json({ found: false, message: 'Không tra được — server tra cứu lỗi' })
    }
    const html = await res.text()
    // Cố gắng extract tên DN + địa chỉ từ structured data
    const nameMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i)
    const addrMatch = html.match(/itemprop="address"[^>]*>([^<]+)</i)
    const repMatch = html.match(/Người đại diện[^<]*<\/[^>]+>\s*<[^>]+>([^<]+)</i)

    if (!nameMatch) {
      return NextResponse.json({
        found: false,
        message: 'Không tìm thấy MST. Vui lòng nhập tay.',
      })
    }

    return NextResponse.json({
      found: true,
      tax_code: taxCode,
      name: decodeHtml(nameMatch[1].trim()),
      address: addrMatch ? decodeHtml(addrMatch[1].trim()) : null,
      representative_name: repMatch ? decodeHtml(repMatch[1].trim()) : null,
    })
  } catch (e) {
    return NextResponse.json({
      found: false,
      message: 'Không kết nối được dịch vụ tra cứu — vui lòng nhập tay.',
      error: String(e),
    })
  }
}

function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
}
