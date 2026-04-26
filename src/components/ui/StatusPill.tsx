import { cn } from '@/lib/utils/cn'

const VARIANTS: Record<string, string> = {
  green: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-900',
  amber: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900',
  blue: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900',
  red: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900',
  purple: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900',
  gray: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700/50 dark:text-gray-300 dark:border-gray-600',
}

const DOT: Record<string, string> = {
  green: 'bg-green-500',
  amber: 'bg-amber-500',
  blue: 'bg-blue-500',
  red: 'bg-red-500',
  purple: 'bg-purple-500',
  gray: 'bg-gray-400',
}

export function StatusPill({
  variant = 'gray',
  dot = true,
  children,
  className,
}: {
  variant?: keyof typeof VARIANTS
  dot?: boolean
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        VARIANTS[variant],
        className
      )}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full', DOT[variant])} />}
      {children}
    </span>
  )
}

export const CHICKEN_STATUS_VARIANT: Record<string, { variant: keyof typeof VARIANTS; label: string }> = {
  dang_nuoi: { variant: 'green', label: 'Đang nuôi' },
  dang_cach_ly: { variant: 'amber', label: 'Cách ly' },
  da_ban: { variant: 'blue', label: 'Đã bán' },
  chet: { variant: 'red', label: 'Đã chết' },
  loai_thai: { variant: 'gray', label: 'Loại thải' },
}

export const ORDER_STATUS_VARIANT: Record<string, { variant: keyof typeof VARIANTS; label: string }> = {
  hoi_mua: { variant: 'gray', label: 'Hỏi mua' },
  dat_coc: { variant: 'amber', label: 'Đặt cọc' },
  da_thanh_toan: { variant: 'blue', label: 'Đã thanh toán' },
  da_giao: { variant: 'green', label: 'Đã giao' },
  huy: { variant: 'red', label: 'Hủy' },
}
