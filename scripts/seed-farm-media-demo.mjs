#!/usr/bin/env node
/**
 * Seed dữ liệu demo cho /thu-vien (farm_media table).
 * Chạy: FARM_ID=... OWNER_ID=... node scripts/seed-farm-media-demo.mjs
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const FARM_ID = process.env.FARM_ID
const OWNER_ID = process.env.OWNER_ID
if (!url || !key || !FARM_ID) { console.error('Missing env'); process.exit(1) }
const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

// Verified working image URLs (chicken / farm scenes)
const IMG = {
  chuong: [
    'https://commons.wikimedia.org/wiki/Special:FilePath/Chicken_coop.jpg?width=1200',
    'https://images.pexels.com/photos/195226/pexels-photo-195226.jpeg?auto=compress&cs=tinysrgb&w=1280',
    'https://images.pexels.com/photos/2255801/pexels-photo-2255801.jpeg?auto=compress&cs=tinysrgb&w=1280',
    'https://images.pexels.com/photos/302280/pexels-photo-302280.jpeg?auto=compress&cs=tinysrgb&w=1280',
  ],
  san_pham: [
    'https://commons.wikimedia.org/wiki/Special:FilePath/Asil_chicken.jpg?width=1200',
    'https://commons.wikimedia.org/wiki/Special:FilePath/Shamo_chicken.jpg?width=1200',
    'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=1200&q=80',
    'https://images.unsplash.com/photo-1612170153139-6f881ff067e0?w=1200&q=80',
    'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=1200&q=80',
    'https://images.unsplash.com/photo-1518779578993-ec3579fee39f?w=1200&q=80',
    'https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83?w=1200&q=80',
  ],
  hoat_dong: [
    'https://images.pexels.com/photos/1314550/pexels-photo-1314550.jpeg?auto=compress&cs=tinysrgb&w=1280',
    'https://images.pexels.com/photos/2255355/pexels-photo-2255355.jpeg?auto=compress&cs=tinysrgb&w=1280',
    'https://images.pexels.com/photos/1300355/pexels-photo-1300355.jpeg?auto=compress&cs=tinysrgb&w=1280',
  ],
}

const items = [
  // CHUỒNG TRẠI (4)
  { cat: 'chuong_trai', img: 0, title: 'Khu A — Trống chiến', desc: 'Lồng cá nhân 1 con/lồng, thông gió tốt, dễ vệ sinh.', featured: true, urls: IMG.chuong },
  { cat: 'chuong_trai', img: 1, title: 'Sân vận động ngoài trời', desc: 'Khu vận động rộng cho gà chiến chạy nhảy mỗi sáng.', urls: IMG.chuong },
  { cat: 'chuong_trai', img: 2, title: 'Khu cách ly khu E', desc: 'Khu cách ly riêng cho gà mới mua hoặc bị bệnh.', urls: IMG.chuong },
  { cat: 'chuong_trai', img: 3, title: 'Khu mái giống khu B', desc: 'Lồng đôi cho mái sinh sản với máy ấp đặt cạnh.', urls: IMG.chuong },

  // SẢN PHẨM (7)
  { cat: 'san_pham', img: 0, title: 'Hắc Long — Asil thuần', desc: 'Trống chiến 14 tháng tuổi, cân 3.2kg, đã vần 5 trận thắng.', featured: true, urls: IMG.san_pham },
  { cat: 'san_pham', img: 1, title: 'Bạch Hổ — Mã Lai cao to', desc: 'Trống chiến 12 tháng, chân vảy đẹp, đòn nhanh.', urls: IMG.san_pham },
  { cat: 'san_pham', img: 2, title: 'Phượng Hoàng — Mái giống', desc: 'Mái Asil thuần 18 tháng, đẻ đều 8-10 trứng/lứa.', urls: IMG.san_pham },
  { cat: 'san_pham', img: 3, title: 'Kim Kê — Lai F1', desc: 'Trống lai Asil × Nòi 10 tháng, lực đá rất mạnh.', urls: IMG.san_pham },
  { cat: 'san_pham', img: 4, title: 'Phong Vân — Nòi Bình Định', desc: 'Trống Nòi 15 tháng, đòn cánh đặc trưng vùng Bình Định.', urls: IMG.san_pham },
  { cat: 'san_pham', img: 5, title: 'Vô Địch — F2 cao cấp', desc: 'Lai 3 dòng (Asil/Mã Lai/Nòi), 13 tháng, tier Ngọc.', featured: true, urls: IMG.san_pham },
  { cat: 'san_pham', img: 6, title: 'Sấm Sét — Chiến Kê pro', desc: 'Trống đã thắng 7/8 trận giải, đang nghỉ vần.', urls: IMG.san_pham },

  // HOẠT ĐỘNG (5)
  { cat: 'hoat_dong', img: 0, title: 'Vần gà sáng sớm', desc: 'Vần 5 con trống chiến mỗi sáng 6h — sửa thế đá, tăng thể lực.', urls: IMG.hoat_dong },
  { cat: 'hoat_dong', img: 1, title: 'Tỉa lông trước trận', desc: 'Cắt tỉa lông cổ + cánh + đùi cho gà chiến chuẩn bị thi đấu.', urls: IMG.hoat_dong },
  { cat: 'hoat_dong', img: 2, title: 'Cho gà chiến ăn riêng', desc: 'Khẩu phần đặc biệt: 60% lúa, 20% thịt nạc, 10% rau, 10% trứng.', urls: IMG.hoat_dong },
  { cat: 'hoat_dong', img: 0, title: 'Tiêm phòng định kỳ', desc: 'Lịch tiêm Newcastle, Gumboro, Tụ huyết trùng theo độ tuổi.', urls: IMG.hoat_dong },
  { cat: 'hoat_dong', img: 1, title: 'Phun khử trùng', desc: 'Khử trùng chuồng định kỳ 2 tuần/lần bằng Iodine 1:300.', urls: IMG.hoat_dong },

  // SỰ KIỆN (3)
  { cat: 'su_kien', img: 0, title: 'Hội thi gà chọi Ninh Bình 2025', desc: 'Trại tham gia + giành 2 giải nhất, 1 giải nhì.', featured: true, urls: IMG.san_pham },
  { cat: 'su_kien', img: 4, title: 'Khách Bình Định ghé thăm', desc: 'Anh Tuấn về tận trại xem 5 con Asil, mua cặp về.', urls: IMG.san_pham },
  { cat: 'su_kien', img: 1, title: 'Lứa Asil đầu năm — 12 con nở', desc: 'Tỷ lệ nở 12/14 = 86%. Lứa con khoẻ, lông vàng đen sọc.', urls: IMG.san_pham },

  // KHÁC (2)
  { cat: 'khac', img: 2, title: 'Kho thuốc thú y', desc: 'Tủ thuốc đầy đủ: Amoxicillin, Tylosin, Vitamin tổng hợp...', urls: IMG.hoat_dong },
  { cat: 'khac', img: 5, title: 'Máy ấp trứng tự động', desc: 'Máy ấp 200 trứng, tự động xoay + điều nhiệt.', urls: IMG.san_pham },
]

async function main() {
  console.log(`📸 Seeding farm_media for ${FARM_ID}...`)

  const { count } = await sb.from('farm_media').select('id', { count: 'exact', head: true }).eq('farm_id', FARM_ID)
  if (count) {
    console.log(`✓ Skip — ${count} items already exist for this farm`)
    return
  }

  const rows = items.map((it, idx) => ({
    farm_id: FARM_ID,
    media_type: 'anh',
    storage_path: `demo/${FARM_ID.slice(-4)}/${idx}.jpg`,
    url: it.urls[it.img] ?? it.urls[0],
    thumbnail_url: null,
    category: it.cat,
    title: it.title,
    description: it.desc,
    is_featured: it.featured ?? false,
    display_order: idx,
    uploaded_by: OWNER_ID ?? null,
  }))

  const { error } = await sb.from('farm_media').insert(rows)
  if (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }
  console.log(`✓ Inserted ${rows.length} media items`)
}

main().catch((e) => { console.error(e); process.exit(1) })
