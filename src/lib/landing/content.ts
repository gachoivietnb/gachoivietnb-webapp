import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

/* ============================================================
 * Types — these match the public page rendering
 * ============================================================ */

export type PricingTier = {
  name: string
  price: string // VND, e.g. "499.000" or "0"
  period: string // "tháng" | "14 ngày"
  desc: string
  bar: string // tailwind gradient classes
  cta: string
  ctaTone: string // tailwind classes for CTA button
  features: string[]
  featured: boolean
}

export type Testimonial = {
  name: string
  role: string
  avatar: string // initial letter
  avatarTone: string // tailwind gradient
  quote: string
  stars: number // 1-5
}

export type Faq = {
  q: string
  a: string
}

export type LandingContent = {
  pricing: PricingTier[]
  testimonials: Testimonial[]
  faqs: Faq[]
}

/* ============================================================
 * Zod schemas (used by API for validation)
 * ============================================================ */

export const PricingTierSchema = z.object({
  name: z.string().min(1).max(40),
  price: z.string().min(1).max(20),
  period: z.string().min(1).max(20),
  desc: z.string().max(200),
  bar: z.string().max(200),
  cta: z.string().min(1).max(60),
  ctaTone: z.string().max(300),
  features: z.array(z.string().min(1).max(120)).max(15),
  featured: z.boolean(),
})

export const TestimonialSchema = z.object({
  name: z.string().min(1).max(60),
  role: z.string().max(100),
  avatar: z.string().min(1).max(3),
  avatarTone: z.string().max(80),
  quote: z.string().min(10).max(500),
  stars: z.number().int().min(1).max(5),
})

export const FaqSchema = z.object({
  q: z.string().min(5).max(200),
  a: z.string().min(10).max(2000),
})

export const PricingArraySchema = z.array(PricingTierSchema).min(1).max(8)
export const TestimonialsArraySchema = z.array(TestimonialSchema).max(50)
export const FaqsArraySchema = z.array(FaqSchema).max(50)

/* ============================================================
 * DEFAULTS — used as fallback if DB has no row yet
 * Mirrors the originally hardcoded content in /phan-mem
 * ============================================================ */

export const DEFAULT_PRICING: PricingTier[] = [
  {
    name: 'Dùng thử',
    price: '0',
    period: '14 ngày',
    desc: 'Trải nghiệm full tính năng để xem có hợp không',
    bar: 'from-slate-400 to-slate-500',
    cta: 'Bắt đầu miễn phí',
    ctaTone:
      'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800',
    features: ['Đến 50 con gà', '1 user (chủ trại)', 'Tất cả tính năng', 'Hỗ trợ qua email'],
    featured: false,
  },
  {
    name: 'Cơ bản',
    price: '199.000',
    period: 'tháng',
    desc: 'Dành cho trại nhỏ, gia đình tự nuôi',
    bar: 'from-blue-500 to-indigo-500',
    cta: 'Đăng ký Cơ bản',
    ctaTone:
      'border-2 border-blue-500 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/30',
    features: [
      'Đến 200 con gà',
      '2 user',
      'Hồ sơ · gia phả · tiêm phòng',
      '📔 Nhật ký công việc (upload ảnh + comment)',
      '💰 Quản lý quỹ tiền · Sổ quỹ · Nhật ký thu chi',
      '📊 6 báo cáo cơ bản',
      'Mobile/PWA · Hỗ trợ Zalo',
    ],
    featured: false,
  },
  {
    name: 'Pro',
    price: '499.000',
    period: 'tháng',
    desc: 'Cho trang trại chuyên nghiệp · phổ biến nhất',
    bar: 'from-orange-500 via-red-500 to-rose-500',
    cta: 'Đăng ký Pro',
    ctaTone:
      'bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg hover:shadow-xl hover:scale-105',
    features: [
      'Đến 1.000 con gà',
      '5 user · phân quyền chi tiết',
      'Tất cả tính năng Cơ bản',
      '🤖 Phân tích AI báo cáo',
      '📔 Nhật ký công việc + AI tóm tắt',
      '✨ AI Marketing (Zalo/FB/SEO)',
      '📚 Bí Kíp Sư Kê 35 bài',
      '📊 9 báo cáo + xuất Excel/PDF',
      '🛠 Tài sản & CCDC + khấu hao auto',
      '☁️ Backup auto Google Drive',
      'Hỗ trợ ưu tiên 24/7',
    ],
    featured: true,
  },
  {
    name: 'Enterprise',
    price: '1.499.000',
    period: 'tháng',
    desc: 'Trại lớn · nhiều cơ sở · đội ngũ đông',
    bar: 'from-violet-500 to-purple-600',
    cta: 'Liên hệ tư vấn',
    ctaTone:
      'border-2 border-violet-500 text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-950/30',
    features: [
      'Không giới hạn gà',
      'Không giới hạn user',
      'Tất cả tính năng Pro',
      '🤖 AI Phân tích không giới hạn',
      '🏷 Logo riêng (white-label)',
      '🌐 Domain riêng',
      '🔌 API tích hợp',
      'Onboarding 1-1',
      'SLA 99.9% uptime',
    ],
    featured: false,
  },
]

export const DEFAULT_TESTIMONIALS: Testimonial[] = [
  {
    name: 'Anh Hùng',
    role: 'Trại gà Asil · Ninh Bình',
    avatar: 'H',
    avatarTone: 'from-orange-500 to-red-500',
    quote:
      'Trước phải ghi sổ rồi nhập Excel mệt. Giờ quét QR là ra ngay hồ sơ con gà. Khách thấy gia phả 5 đời là tin tưởng, bán giá cao hơn 30%.',
    stars: 5,
  },
  {
    name: 'Cô Phượng',
    role: 'Trại gà Mã Lai · Đồng Tháp',
    avatar: 'P',
    avatarTone: 'from-pink-500 to-rose-500',
    quote:
      'AI viết bài Zalo siêu hay. Mỗi tuần đăng 5-7 bài chỉ mất 10 phút. Đơn về nhiều hơn hẳn — tháng đầu doanh thu tăng gấp đôi.',
    stars: 5,
  },
  {
    name: 'Anh Tâm',
    role: 'Trại gà Nòi · Bình Định',
    avatar: 'T',
    avatarTone: 'from-blue-500 to-indigo-500',
    quote:
      'Bí Kíp Sư Kê là 1 mỏ vàng. Nhân viên mới đọc xong hiểu việc nhanh, đỡ phải training. Tôi chỉ trả 499k mà có cả 1 thư viện kiến thức.',
    stars: 5,
  },
]

export const DEFAULT_FAQS: Faq[] = [
  {
    q: 'Tôi không rành công nghệ thì có dùng được không?',
    a: 'Hoàn toàn được. Giao diện thiết kế cho người không IT — toàn tiếng Việt, có icon, có hướng dẫn. Setup ban đầu chỉ ~10 phút. Hỗ trợ Zalo 24/7 nếu kẹt chỗ nào.',
  },
  {
    q: 'Dữ liệu của tôi có an toàn không?',
    a: 'Có. Dữ liệu lưu trên hạ tầng đám mây tiêu chuẩn doanh nghiệp, backup tự động hằng ngày, mã hoá HTTPS đầu cuối. Mỗi trại là một tenant riêng biệt — không ai khác xem được.',
  },
  {
    q: 'Tôi có thể xuất dữ liệu ra Excel không?',
    a: 'Có. Mọi báo cáo (P&L, công nợ, nhập xuất tồn, giá vốn, bảng công…) đều xuất Excel/PDF 1 click. Backup toàn bộ ra file Excel multi-sheet bất kỳ lúc nào.',
  },
  {
    q: 'Tôi đang dùng Excel rồi, có chuyển dữ liệu sang được không?',
    a: 'Được. Hồ sơ gà có chức năng Import Excel — bạn dán danh sách hiện tại, hệ thống tự tạo. Nếu Excel của bạn quá đặc thù, đội kỹ thuật sẽ hỗ trợ migrate miễn phí cho gói Pro+.',
  },
  {
    q: 'Có dùng được trên điện thoại không?',
    a: 'Có. Web responsive đầy đủ + PWA (Add to Home Screen) trông như app native. Quét QR ngoài chuồng dùng camera điện thoại. Hoạt động offline khi mất sóng.',
  },
  {
    q: 'Tôi muốn huỷ thì sao?',
    a: 'Huỷ bất kỳ lúc nào trong tài khoản. Sau khi huỷ vẫn dùng đến hết kỳ đã trả. Dữ liệu của bạn được giữ 30 ngày — đủ thời gian quyết định quay lại hoặc xuất ra Excel.',
  },
  {
    q: 'Các tính năng AI có tốn thêm phí không?',
    a: 'Tính năng AI (Marketing tự sinh bài, Phân tích báo cáo, Tóm tắt nhật ký) yêu cầu khoá kết nối AI riêng do TRẠI tự đăng ký miễn phí từ Google AI Studio (https://aistudio.google.com/app/apikey). Phiên bản tiêu chuẩn miễn phí ~15 lần/phút, 1500 lần/ngày — đủ cho 1 trại quy mô vừa. Nếu vượt quota có thể nâng cấp gói tính phí của Google (~0,001-0,005 USD/lần gọi). Phần mềm không tính thêm phí AI — bạn chủ động quota và chi phí. Hệ thống có hướng dẫn từng bước trong /admin/huong-dan.',
  },
]

/* ============================================================
 * Loaders — public page calls these (anon-readable via RLS policy)
 * ============================================================ */

async function loadKey<T>(key: string, schema: z.ZodSchema<T>, fallback: T): Promise<T> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('landing_settings')
      .select('value')
      .eq('key', key)
      .maybeSingle<{ value: unknown }>()
    if (!data?.value) return fallback
    const parsed = schema.safeParse(data.value)
    return parsed.success ? parsed.data : fallback
  } catch {
    return fallback
  }
}

export async function getPricing(): Promise<PricingTier[]> {
  return loadKey('pricing', PricingArraySchema, DEFAULT_PRICING)
}

export async function getTestimonials(): Promise<Testimonial[]> {
  return loadKey('testimonials', TestimonialsArraySchema, DEFAULT_TESTIMONIALS)
}

export async function getFaqs(): Promise<Faq[]> {
  return loadKey('faqs', FaqsArraySchema, DEFAULT_FAQS)
}

export async function getLandingContent(): Promise<LandingContent> {
  const [pricing, testimonials, faqs] = await Promise.all([
    getPricing(),
    getTestimonials(),
    getFaqs(),
  ])
  return { pricing, testimonials, faqs }
}
