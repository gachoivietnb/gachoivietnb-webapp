import { requireSuperAdmin, createAdminClient } from '@/lib/multitenancy/super-admin'
import { UsersManagerClient, type UserRow, type FarmRef } from '@/components/admin/super-admin/UsersManagerClient'

export const revalidate = 0

export default async function SuperAdminUsersPage() {
  const auth = await requireSuperAdmin()
  if (!auth.ok) {
    return (
      <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-xl p-8 text-center max-w-lg mx-auto mt-10">
        <div className="text-5xl mb-3">🚫</div>
        <h1 className="text-lg font-bold text-rose-900 dark:text-rose-200 mb-1">Không có quyền</h1>
      </div>
    )
  }

  const admin = createAdminClient()

  const [profilesRes, farmsRes, authList] = await Promise.all([
    admin
      .from('profiles')
      .select('id, full_name, phone, role, is_active, farm_id, created_at, farm:farms(name, slug)')
      .order('created_at', { ascending: false })
      .limit(500),
    admin.from('farms').select('id, name, slug').order('name'),
    admin.auth.admin.listUsers({ page: 1, perPage: 500 }),
  ])

  const byId = new Map<string, { email: string | undefined; last_sign_in_at: string | null }>()
  for (const u of authList.data?.users ?? []) {
    byId.set(u.id, { email: u.email, last_sign_in_at: u.last_sign_in_at ?? null })
  }

  const users: UserRow[] = ((profilesRes.data ?? []) as Array<Record<string, unknown>>).map((p) => {
    const id = p.id as string
    const meta = byId.get(id)
    const f = (p.farm as { name: string; slug: string } | null) ?? null
    return {
      id,
      full_name: (p.full_name as string) ?? '',
      phone: (p.phone as string | null) ?? null,
      role: (p.role as 'chu_trai' | 'nhan_vien' | 'khach') ?? 'nhan_vien',
      is_active: !!p.is_active,
      farm_id: (p.farm_id as string) ?? '',
      farm_name: f?.name ?? '—',
      farm_slug: f?.slug ?? '',
      email: meta?.email ?? null,
      last_sign_in_at: meta?.last_sign_in_at ?? null,
      created_at: (p.created_at as string) ?? '',
    }
  })

  const farms: FarmRef[] = (farmsRes.data ?? []) as FarmRef[]

  return (
    <div>
      <div className="mb-5">
        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-full px-2.5 py-0.5 mb-2">
          👑 Super Admin
        </div>
        <h1 className="text-2xl font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
          👥 Quản lý người dùng toàn hệ thống
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Tạo tài khoản chủ trại / nhân viên · Reset mật khẩu · Phân quyền · Đổi farm
        </p>
      </div>

      <UsersManagerClient initialUsers={users} farms={farms} currentUserId={auth.user.id} />
    </div>
  )
}
