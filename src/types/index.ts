export type Profile = {
  id: string
  full_name: string
  phone: string | null
  avatar_url: string | null
  role: 'chu_trai' | 'nhan_vien' | 'khach'
  is_active: boolean
  assigned_areas: string[]
  created_at: string
  updated_at: string
}
