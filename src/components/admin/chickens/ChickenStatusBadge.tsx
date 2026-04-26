const STATUS_MAP: Record<string, { label: string; color: string }> = {
  dang_nuoi: { label: 'Đang nuôi', color: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
  dang_cach_ly: { label: 'Cách ly', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300' },
  da_ban: { label: 'Đã bán', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
  chet: { label: 'Đã chết', color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
  loai_thai: { label: 'Loại thải', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
}

export function ChickenStatusBadge({ status }: { status: string }) {
  const cfg = STATUS_MAP[status] ?? { label: status, color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' }
  return (
    <span className={`text-xs px-2 py-1 rounded-full font-medium ${cfg.color}`}>
      {cfg.label}
    </span>
  )
}
