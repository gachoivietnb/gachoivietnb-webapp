// =====================================================
// Types cho Supabase Database
//
// File này sẽ được OVERWRITE bởi lệnh sau khi tạo Supabase project:
//   npx supabase gen types typescript --project-id <YOUR_PROJECT_ID> > src/types/database.ts
//
// Hiện tại chỉ khai báo các bảng đang được dùng ở Phần 1 để TS compile được.
// Shape tuân theo format của supabase-js (Row/Insert/Update/Relationships).
// =====================================================

type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
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
        Insert: {
          id: string
          full_name: string
          phone?: string | null
          avatar_url?: string | null
          role?: 'chu_trai' | 'nhan_vien' | 'khach'
          is_active?: boolean
          assigned_areas?: string[]
        }
        Update: {
          id?: string
          full_name?: string
          phone?: string | null
          avatar_url?: string | null
          role?: 'chu_trai' | 'nhan_vien' | 'khach'
          is_active?: boolean
          assigned_areas?: string[]
        }
        Relationships: []
      }
      breeds: {
        Row: {
          id: string
          code: string
          name_vi: string
          origin: string | null
          description: string | null
          characteristics: Json | null
          tier: 'cao_cap' | 'trung_cap' | 'pho_thong' | 'dac_biet'
          default_avatar_url: string | null
          is_active: boolean
          display_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          code: string
          name_vi: string
          origin?: string | null
          description?: string | null
          tier?: 'cao_cap' | 'trung_cap' | 'pho_thong' | 'dac_biet'
          is_active?: boolean
          display_order?: number
        }
        Update: {
          code?: string
          name_vi?: string
          origin?: string | null
          description?: string | null
          tier?: 'cao_cap' | 'trung_cap' | 'pho_thong' | 'dac_biet'
          is_active?: boolean
          display_order?: number
        }
        Relationships: []
      }
      qr_tags: {
        Row: {
          id: string
          tag_number: string
          status: 'chua_su_dung' | 'dang_su_dung' | 'hong_mat'
          chicken_id: string | null
          assigned_at: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          tag_number: string
          status?: 'chua_su_dung' | 'dang_su_dung' | 'hong_mat'
          chicken_id?: string | null
        }
        Update: {
          tag_number?: string
          status?: 'chua_su_dung' | 'dang_su_dung' | 'hong_mat'
          chicken_id?: string | null
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          key: string
          value: Json
          description: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          key: string
          value: Json
          description?: string | null
        }
        Update: {
          key?: string
          value?: Json
          description?: string | null
        }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: {
      user_role: 'chu_trai' | 'nhan_vien' | 'khach'
      breed_tier: 'cao_cap' | 'trung_cap' | 'pho_thong' | 'dac_biet'
      area_type: 'trong' | 'mai' | 'duc' | 'ghep_doi' | 'cach_ly' | 'gia_pho_tong'
      cage_status: 'trong' | 'dang_co_ga' | 'bao_tri'
      qr_tag_status: 'chua_su_dung' | 'dang_su_dung' | 'hong_mat'
      chicken_gender: 'trong' | 'mai' | 'chua_xac_dinh'
      chicken_source: 'mua' | 'no_tai_trai'
      chicken_status: 'dang_nuoi' | 'dang_cach_ly' | 'da_ban' | 'chet' | 'loai_thai'
      media_type: 'anh' | 'video'
      litter_status: 'dang_ap' | 'da_no' | 'that_bai'
      vaccination_status: 'cho_tiem' | 'da_tiem' | 'bo_qua'
      transaction_type: 'nhap' | 'xuat'
      customer_tier: 'vip' | 'thuong'
      order_status: 'hoi_mua' | 'dat_coc' | 'da_giao' | 'huy'
      alert_priority: 'thap' | 'trung_binh' | 'cao' | 'khan_cap'
      alert_status: 'chua_doc' | 'da_doc' | 'da_xu_ly'
    }
    CompositeTypes: { [_ in never]: never }
  }
}

export type UserRole = Database['public']['Enums']['user_role']
export type ChickenStatus = Database['public']['Enums']['chicken_status']
export type ChickenGender = Database['public']['Enums']['chicken_gender']
export type OrderStatus = Database['public']['Enums']['order_status']
