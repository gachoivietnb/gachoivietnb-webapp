#!/usr/bin/env node
/**
 * Seed thêm nhiều diary entries phong phú: với ảnh, comments, mentions,
 * link tới chicken/area cụ thể.
 * Chạy: FARM_ID=... OWNER_ID=... node scripts/seed-diary-rich.mjs
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const FARM_ID = process.env.FARM_ID
const OWNER_ID = process.env.OWNER_ID
if (!url || !key || !FARM_ID || !OWNER_ID) {
  console.error('Missing env')
  process.exit(1)
}
const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

const dayOffset = (d) => { const dt = new Date(); dt.setDate(dt.getDate() - d); return dt.toISOString().slice(0,10) }
const rand = (a) => a[Math.floor(Math.random() * a.length)]
const randInt = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a
const pic = (id) => `https://picsum.photos/seed/${id}/800/600`

async function main() {
  console.log(`📔 Seeding rich diary for farm ${FARM_ID}...`)

  const { data: chickens } = await sb.from('chickens').select('id, name, chicken_code').eq('farm_id', FARM_ID).eq('status', 'dang_nuoi').limit(20)
  const { data: areas } = await sb.from('areas').select('id, code, name_vi').eq('farm_id', FARM_ID)

  // Templates với content phong phú + variety
  const templates = [
    {
      cat: 'cho_an', mood: 'tot', title: 'Cho ăn sáng đợt cám mới',
      content: 'Mở bao cám Con Cò mới về - đậm mùi, hạt to. Trộn với rau muống và lúa, cho cả đàn ăn.\n\nGà ăn rất nhiệt tình - đặc biệt mấy con trống chiến.',
      tags: ['#cho-an', '#cám-mới'], imgs: 2, weather: 'nắng', d: 0,
    },
    {
      cat: 'thu_y', mood: 'lo_lang', title: 'Phát hiện gà ho khan',
      content: 'Sáng nay phát hiện 2 con ở khu A có dấu hiệu ho khan, mỏ chảy nhớt nhẹ.\n\nĐã tách riêng sang khu cách ly E và cho uống Tylosin + Vitamin C.\n\nTheo dõi 3 ngày tới.',
      tags: ['#sức-khoẻ', '#cách-ly', '#hô-hấp'], imgs: 1, weather: 'mưa', d: 1, area_idx: 4,
    },
    {
      cat: 'huan_luyen', mood: 'rat_tot', title: 'Vần gà sáng - Hắc Long phong độ đỉnh',
      content: 'Vần 5 con trống chiến lúc 6h sáng. **Hắc Long** thể lực vượt trội, đá nhanh, gài thế tốt. Đặt cược trận tới hứa hẹn.\n\nMã Lai vẫn còn yếu chân sau, cần tập thêm.',
      tags: ['#luyện-tập', '#vần-gà', '#chiến-kê'], imgs: 3, weather: 'nắng', d: 2,
    },
    {
      cat: 'thu_y', mood: 'binh_thuong', title: 'Tiêm Newcastle lần 2 cho lứa choai',
      content: 'Hôm nay tiêm vaccine Newcastle lần 2 cho 15 con choai 21 ngày tuổi. Tất cả đều khỏe, không phản ứng.\n\nLịch tiếp: Gumboro lần 2 ngày 28/12.',
      tags: ['#vaccine', '#newcastle'], imgs: 2, weather: 'mát', d: 3,
    },
    {
      cat: 've_sinh', mood: 'binh_thuong', title: 'Tổng vệ sinh khu A',
      content: 'Dọn sạch tất cả lồng khu A. Phun thuốc sát trùng bằng Bencocid pha loãng 1:200.\n\nThay nước uống, lau máng ăn. Để khô tự nhiên 30 phút trước khi đưa gà về lại.',
      tags: ['#vệ-sinh', '#sát-trùng'], imgs: 2, weather: 'nắng', d: 5, area_idx: 0,
    },
    {
      cat: 'kinh_doanh', mood: 'rat_tot', title: 'Bán cặp Asil cho khách Bình Định',
      content: 'Bán 1 cặp gà Asil cho **Anh Tuấn** ở Bình Định, giá 12.000.000đ.\n\nKhách rất hài lòng, đã thanh toán chuyển khoản. Đã ship qua xe khách.\n\nKhách hứa giới thiệu thêm 2-3 người nữa từ Quy Nhơn.',
      tags: ['#bán-hàng', '#asil', '#khách-vip'], imgs: 1, weather: 'nắng', d: 7,
    },
    {
      cat: 'cham_soc', mood: 'tot', title: 'Bổ sung vitamin tổng hợp',
      content: 'Trộn vitamin tổng hợp ADE-B-Complex vào nước uống cho cả đàn 3 ngày liên tiếp.\n\nLiều: 1g/lít nước. Theo dõi tình trạng lông và phân.',
      tags: ['#chăm-sóc', '#vitamin'], imgs: 1, weather: 'nắng', d: 10,
    },
    {
      cat: 'sinh_san', mood: 'rat_tot', title: 'Mái Bạch Hổ đẻ trứng đầu',
      content: '**Bạch Hổ** đẻ 8 trứng đầu tiên! Mái 8 tháng tuổi, ghép với Hắc Long.\n\nTrứng to đều, vỏ dày. Đã chuyển vào máy ấp - dự kiến nở 21 ngày sau.',
      tags: ['#sinh-sản', '#trứng', '#bạch-hổ'], imgs: 2, weather: 'nắng', d: 14,
    },
    {
      cat: 'cong_viec', mood: 'binh_thuong', title: 'Họp đầu tháng với nhân viên',
      content: 'Họp 30 phút với 2 nhân viên về:\n- Phân công ca trực\n- Báo cáo tồn kho cám\n- Lên kế hoạch mua thuốc tháng tới\n- Review những gà có vấn đề\n\nThống nhất: từ tuần sau trực 6h-18h.',
      tags: ['#họp', '#quản-lý'], imgs: 0, weather: 'nắng', d: 18,
    },
    {
      cat: 'su_co', mood: 'rat_xau', title: 'Mất điện 4 tiếng - quạt thông gió ngừng',
      content: 'Khu vực mất điện từ 11h đến 15h chiều. Nhiệt độ chuồng tăng lên 38°C.\n\nĐã mở hết các cửa thoáng + xịt nước làm mát chuồng.\n\nMay không có gà nào bị sốc nhiệt. Cần đầu tư máy phát điện dự phòng.',
      tags: ['#sự-cố', '#mất-điện', '#cấp-cứu'], imgs: 1, weather: 'nắng', d: 20,
    },
    {
      cat: 'quan_sat', mood: 'binh_thuong', title: 'Ghi nhận hành vi gà mới mua',
      content: 'Quan sát 5 con gà mới mua từ trại Long Phụng:\n- 2 con thích nghi nhanh, ăn ngay\n- 1 con stress, hơi rút cổ\n- 2 con khoẻ nhưng nhút nhát\n\nTiếp tục cách ly 7 ngày trước khi nhập đàn.',
      tags: ['#quan-sát', '#gà-mới'], imgs: 1, weather: 'nắng', d: 25, area_idx: 4,
    },
    {
      cat: 'huan_luyen', mood: 'tot', title: 'Vần Phong Vân - sửa thế đá',
      content: '**Phong Vân** trước hay đá đầu, dễ bị đối thủ phản đòn. Nay tập sửa thế đá ngang sườn.\n\n3 hiệp 5 phút. Tiến bộ rõ rệt - hiệp cuối đã quen thế mới.',
      tags: ['#luyện-tập', '#kỹ-thuật'], imgs: 2, weather: 'nắng', d: 28,
    },
    {
      cat: 'cho_an', mood: 'binh_thuong', title: 'Cho gà chiến ăn riêng',
      content: 'Tách 8 con gà chiến top ra cho ăn riêng theo công thức:\n- 60% lúa\n- 20% thịt nạc luộc\n- 10% rau xanh\n- 10% trứng + vitamin\n\nMục tiêu: tăng cơ, giảm mỡ.',
      tags: ['#dinh-dưỡng', '#chiến-kê'], imgs: 1, weather: 'nắng', d: 30,
    },
    {
      cat: 'thu_y', mood: 'lo_lang', title: 'Khu C có 1 con choai chết đột ngột',
      content: 'Sáng nay phát hiện 1 con choai khu C chết. Không có dấu hiệu báo trước.\n\nKiểm tra xác: bụng chướng nhẹ, da hơi xanh. Nghi cầu trùng hoặc ngộ độc thức ăn.\n\nĐã isolation toàn bộ khu C. Lấy mẫu gửi xét nghiệm tại Chi cục Thú y.',
      tags: ['#tử-vong', '#nguy-hiểm'], imgs: 0, weather: 'mưa', d: 33, area_idx: 2,
    },
    {
      cat: 'kinh_doanh', mood: 'tot', title: 'Đăng bài Zalo - 5 đơn hỏi giá',
      content: 'Đăng bài quảng cáo cặp Mã Lai mới về trên Zalo. Sau 2 tiếng có 5 người inbox hỏi giá.\n\n2 người đã hẹn xem trực tiếp cuối tuần.\n\nGiá rao: 8tr/cặp. Đợi xem khách thực tế bao nhiêu.',
      tags: ['#zalo', '#marketing'], imgs: 2, weather: 'nắng', d: 35,
    },
    {
      cat: 'cham_soc', mood: 'tot', title: 'Tỉa lông cho gà chiến trước trận',
      content: 'Tỉa lông cổ + cánh + đùi cho 3 con gà chiến chuẩn bị trận sắp tới.\n\nDùng kéo y tế đã sát trùng. Cẩn thận tránh cắt vào da.\n\nSau khi tỉa, gà thoáng và nhanh nhẹn hơn rõ rệt.',
      tags: ['#chăm-sóc', '#tỉa-lông'], imgs: 3, weather: 'nắng', d: 38,
    },
    {
      cat: 've_sinh', mood: 'binh_thuong', title: 'Phun khử trùng định kỳ',
      content: 'Phun khử trùng định kỳ 2 tuần/lần. Toàn bộ chuồng + sân chơi.\n\nDùng Iodine pha 1:300, phun bằng máy phun áp lực.\n\nTổng thời gian: 1.5 tiếng.',
      tags: ['#vệ-sinh', '#sát-trùng', '#định-kỳ'], imgs: 1, weather: 'nắng', d: 40,
    },
    {
      cat: 'thu_y', mood: 'tot', title: 'Tẩy giun cho cả đàn',
      content: 'Tẩy giun đợt 3 tháng. Dùng Levamisol pha vào nước uống.\n\nLiều: 5ml/10 con. Sau 1 ngày kiểm tra phân thấy có giun ra - hiệu quả.\n\nLần tới: tháng 4 sang năm.',
      tags: ['#tẩy-giun'], imgs: 0, weather: 'nắng', d: 45,
    },
    {
      cat: 'sinh_san', mood: 'tot', title: '12 con con nở từ lứa Asil',
      content: 'Lứa Asil ấp 21 ngày đã nở 12/14 trứng. Tỷ lệ 86%.\n\nCon nở khoẻ, lông vàng/đen sọc đẹp. Đã chuyển vào máy úm 32°C.\n\nDự kiến 7 ngày sau giảm xuống 30°C.',
      tags: ['#sinh-sản', '#nở', '#asil'], imgs: 4, weather: 'nắng', d: 50,
    },
    {
      cat: 'cong_viec', mood: 'tot', title: 'Cập nhật danh sách gà bán',
      content: 'Rà lại danh sách gà đang bán. Cập nhật giá theo tình hình thị trường:\n- Gà chiến: 3-5tr\n- Gà mái giống: 2-3tr\n- Gà choai: 800k-1.2tr\n\nChụp ảnh mới cho 8 con đăng lại Zalo.',
      tags: ['#bán-hàng', '#cập-nhật'], imgs: 1, weather: 'nắng', d: 55,
    },
  ]

  // Insert entries
  let inserted = 0
  for (const t of templates) {
    const imgs = []
    for (let i = 0; i < t.imgs; i++) {
      imgs.push(pic(`${FARM_ID.slice(-4)}-${t.d}-${i}`))
    }
    const linkedChicken = t.cat === 'huan_luyen' || t.cat === 'sinh_san' || t.cat === 'thu_y'
      ? rand(chickens) : null
    const { data, error } = await sb.from('diary_entries').insert([{
      farm_id: FARM_ID,
      author_id: OWNER_ID,
      diary_date: dayOffset(t.d),
      category: t.cat,
      mood: t.mood,
      title: t.title,
      content: t.content,
      tags: t.tags,
      attachments: imgs,
      weather: t.weather,
      related_chicken_id: linkedChicken?.id ?? null,
      related_area_id: t.area_idx !== undefined ? areas[t.area_idx]?.id : null,
      is_pinned: t.d === 7 || t.d === 14, // pin vài entries quan trọng
    }]).select('id').single()
    if (error) {
      // skip duplicates by checking content match
      if (!error.message.includes('duplicate')) console.error(`entry ${t.d}:`, error.message)
      continue
    }
    inserted++
    // Add some comments to important entries
    if ([7, 14, 20, 33, 50].includes(t.d)) {
      const comments = {
        7: ['Anh Tuấn đã chuyển khoản đủ. Cảm ơn anh!', 'Gà giao đến nơi an toàn rồi nhé chủ trại'],
        14: ['Chúc mừng! Trứng đẹp quá', 'Mong sớm có lứa con khoẻ'],
        20: ['May quá không có thiệt hại! Đầu tư máy phát điện đi anh', 'Đăng ký gửi đề xuất mua máy phát'],
        33: ['Có kết quả xét nghiệm chưa anh? Mình cũng gặp tình trạng tương tự', 'Vẫn đang chờ. Sẽ update khi có'],
        50: ['Tỷ lệ 86% là cao đó! Tốt lắm!', 'Bao giờ có gà con bán anh? Em đặt 5 con'],
      }
      for (const c of comments[t.d]) {
        await sb.from('diary_comments').insert([{
          farm_id: FARM_ID,
          entry_id: data.id,
          author_id: OWNER_ID,
          content: c,
        }])
      }
    }
  }
  console.log(`✓ Inserted ${inserted} new entries`)

  // Stats
  const { count: total } = await sb.from('diary_entries').select('id', { count: 'exact', head: true }).eq('farm_id', FARM_ID)
  const { count: cmCount } = await sb.from('diary_comments').select('id', { count: 'exact', head: true }).eq('farm_id', FARM_ID)
  console.log(`📊 Total: ${total} entries, ${cmCount} comments`)
}

main().catch((e) => { console.error(e); process.exit(1) })
