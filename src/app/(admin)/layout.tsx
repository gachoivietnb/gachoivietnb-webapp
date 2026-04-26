import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminSidebar from '@/components/layout/AdminSidebar'
import AdminBottomNav from '@/components/layout/AdminBottomNav'
import AdminHeader from '@/components/layout/AdminHeader'
import { ChatbotFloatingButton } from '@/components/admin/chatbot/ChatbotFloatingButton'
import { OnlineStatusBar } from '@/components/admin/OnlineStatusBar'
import { OnboardingTour } from '@/components/admin/OnboardingTour'

function isSuperAdminEmail(email: string | undefined): boolean {
  if (!email) return false
  const list = (process.env.SUPER_ADMIN_EMAILS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  return list.includes(email.toLowerCase())
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const isSuper = isSuperAdminEmail(user.email)

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, role, avatar_url, is_active, onboarding_completed, permissions')
    .eq('id', user.id)
    .single()

  const profileData = profile ?? {
    id: user.id,
    full_name: user.email ?? 'Người dùng',
    role: 'nhan_vien' as const,
    avatar_url: null,
    is_active: true,
    onboarding_completed: true,
    permissions: {},
  }

  const onboardingDone =
    (profileData as { onboarding_completed?: boolean }).onboarding_completed ?? true

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <AdminSidebar profile={profileData} isSuperAdmin={isSuper} />
      <div className="md:ml-64 pb-20 md:pb-0 min-h-screen flex flex-col">
        <AdminHeader profile={profileData} />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
      <AdminBottomNav />
      <ChatbotFloatingButton />
      <OnlineStatusBar />
      {!onboardingDone && (
        <OnboardingTour profile={{ id: profileData.id, onboarding_completed: false }} />
      )}
    </div>
  )
}
