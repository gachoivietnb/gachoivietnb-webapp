import { SITE_NAME } from '@/lib/utils/constants'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

type Props = {
  profile: { full_name: string; role: string }
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((w) => w[0]?.toUpperCase())
    .join('')
    .slice(0, 2) || '?'
}

export default async function AdminHeader({ profile }: Props) {
  const supabase = await createClient()
  const { count: unreadAlerts } = await supabase
    .from('alerts')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'chua_doc')

  const badge = Math.min(unreadAlerts ?? 0, 99)

  return (
    <header className="sticky top-0 z-20 bg-white/90 backdrop-blur dark:bg-gray-800/90 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3 md:hidden">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 text-white flex items-center justify-center font-bold text-base shadow-sm">
          G
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
            {SITE_NAME}
          </div>
          <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
            gachoivietnb.com · Admin
          </div>
        </div>
      </div>
      <div className="hidden md:block" />

      <div className="flex items-center gap-2">
        <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-900 rounded-full px-2.5 py-0.5 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
          Online
        </span>

        <ThemeToggle />

        <Link
          href="/admin/nhat-ky"
          className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition text-lg"
          aria-label="Cảnh báo"
        >
          🔔
          {badge > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center px-1">
              {badge}
            </span>
          )}
        </Link>

        <div
          className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-xs font-semibold shadow-sm"
          title={`${profile.full_name} — ${profile.role === 'chu_trai' ? 'Chủ trại' : 'Nhân viên'}`}
        >
          {initials(profile.full_name)}
        </div>
      </div>
    </header>
  )
}
