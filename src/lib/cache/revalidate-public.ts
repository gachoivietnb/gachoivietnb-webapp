import 'server-only'
import { revalidatePath } from 'next/cache'

/**
 * Event-based revalidation cho website public.
 *
 * Các trang public (/, /ban, /giong, /ga/[tag]…) đang ISR theo thời gian
 * (revalidate=3600 → có thể cũ tới 1 giờ). Gọi các hàm này NGAY trong endpoint
 * mutation để khách thấy dữ liệu mới lập tức thay vì chờ hết chu kỳ ISR.
 * revalidatePath an toàn khi gọi trong Route Handler (API route).
 */

/** Sau khi thêm/sửa/xóa/bán gà → trang bán & trang chủ tươi ngay. */
export function revalidatePublicChickens() {
  revalidatePath('/')
  revalidatePath('/ban')
  revalidatePath('/giong')
  revalidatePath('/ga/[tagNumber]', 'page')
}

/** Sau khi đăng/sửa/xóa tin tức. */
export function revalidatePublicNews() {
  revalidatePath('/tin-tuc')
  revalidatePath('/tin-tuc/[slug]', 'page')
}
