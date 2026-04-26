'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const TOC = [
  { id: 'tong-quan', label: 'Tổng quan', emoji: '🎯' },
  { id: 'so-sanh', label: 'So sánh giải pháp', emoji: '⚖️' },
  { id: 'vong-chan', label: 'Thông số vòng chân', emoji: '⭕' },
  { id: 'thoi-diem', label: 'Thời điểm đeo', emoji: '📅' },
  { id: 'the-qr', label: 'Thông số thẻ QR', emoji: '🏷' },
  { id: 'chat-lieu', label: 'Chất liệu', emoji: '🧪' },
  { id: 'chi-phi', label: 'Chi phí', emoji: '💰' },
  { id: 'quy-trinh', label: 'Quy trình đeo', emoji: '🪜' },
  { id: 'bao-tri', label: 'Vận hành & bảo trì', emoji: '🔧' },
  { id: 'nguon-mua', label: 'Nguồn mua', emoji: '🛒' },
] as const

export function QrTagsGuide() {
  const [activeId, setActiveId] = useState<string>('tong-quan')

  // Scroll spy
  useEffect(() => {
    const handler = () => {
      const offsets = TOC.map((t) => {
        const el = document.getElementById(t.id)
        if (!el) return { id: t.id, top: Infinity }
        const rect = el.getBoundingClientRect()
        return { id: t.id, top: Math.abs(rect.top - 120) }
      })
      offsets.sort((a, b) => a.top - b.top)
      setActiveId(offsets[0].id)
    }
    window.addEventListener('scroll', handler, { passive: true })
    handler()
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <div className="space-y-4">
      {/* HERO */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-cyan-600 to-teal-600 text-white shadow-xl print:bg-blue-700">
        <div className="absolute inset-0 opacity-15 pointer-events-none print:hidden">
          <span className="absolute top-3 right-6 text-9xl">🔳</span>
          <span className="absolute -bottom-3 left-8 text-6xl">🐓</span>
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.18),transparent_60%)]" />
        <div className="relative p-6 md:p-7">
          <div className="text-xs uppercase tracking-widest opacity-80">Tài liệu kỹ thuật · gachoivietnb.com</div>
          <h1 className="text-2xl md:text-3xl font-black mt-1">Hệ thống thẻ QR quản lý gà chọi</h1>
          <p className="text-sm md:text-base opacity-90 mt-1.5 max-w-3xl leading-relaxed">
            Hướng dẫn đầy đủ về <b>kiến trúc 2 thành phần</b> (vòng silicon xoắn + thẻ QR PET) — cho phép định danh từng con bằng điện thoại với chi phí ~3.000-5.000đ/con, dùng được suốt vòng đời.
          </p>

          <div className="flex flex-wrap gap-2 mt-4">
            <Link
              href="/admin/generate-qr"
              className="bg-white text-cyan-700 hover:bg-cyan-50 rounded-xl px-4 py-2 font-bold shadow flex items-center gap-1.5 text-sm"
            >
              🔳 Mở module In thẻ QR
            </Link>
            <button
              onClick={() => window.print()}
              className="bg-white/15 hover:bg-white/25 backdrop-blur text-white rounded-xl px-4 py-2 font-bold border border-white/30 text-sm"
            >
              🖨 In tài liệu (mang đi xưởng)
            </button>
          </div>

          {/* Quick facts strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mt-4">
            <Fact emoji="⭕" label="Vòng silicon" value="Ø32mm" sub="Shore A45 · 1 size duy nhất" />
            <Fact emoji="🏷" label="Thẻ PET" value="25×35mm" sub="QR 18×18mm · laminate" />
            <Fact emoji="💰" label="Giá / bộ" value="~3-5k đ" sub="Vòng + thẻ + lắp ráp" />
            <Fact emoji="📅" label="Thời gian dùng" value="Suốt đời" sub="Vòng 3-5 năm · Thẻ 2-4 năm" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4">
        {/* TOC sticky */}
        <aside className="lg:sticky lg:top-4 lg:self-start print:hidden">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-3 shadow-sm">
            <div className="text-[10.5px] uppercase tracking-wider font-bold text-gray-500 dark:text-gray-400 mb-2 px-2">
              📑 Mục lục
            </div>
            <ul className="space-y-0.5">
              {TOC.map((t, i) => {
                const active = activeId === t.id
                return (
                  <li key={t.id}>
                    <a
                      href={`#${t.id}`}
                      className={
                        'flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition ' +
                        (active
                          ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold shadow'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50')
                      }
                    >
                      <span className="font-mono w-4 opacity-60">{i + 1}.</span>
                      <span className="text-base leading-none">{t.emoji}</span>
                      <span className="truncate">{t.label}</span>
                    </a>
                  </li>
                )
              })}
            </ul>
          </div>
        </aside>

        {/* CONTENT */}
        <div className="space-y-4 min-w-0">
          {/* 1. TỔNG QUAN */}
          <Section id="tong-quan" emoji="🎯" title="1. Tổng quan hệ thống" tone="from-blue-500 to-indigo-600">
            <p>
              Mục tiêu: <b>định danh từng con gà bằng mã QR</b> với 4 nguyên tắc:
            </p>
            <ul className="my-2 space-y-1.5 list-none">
              <li className="flex gap-2"><span className="text-emerald-500">✓</span> <b>1 kích thước vòng duy nhất</b> dùng xuyên suốt vòng đời gà</li>
              <li className="flex gap-2"><span className="text-emerald-500">✓</span> <b>In 1 lần 1000 thẻ</b> có số thứ tự 0001–1000 + mã QR</li>
              <li className="flex gap-2"><span className="text-emerald-500">✓</span> <b>Vòng và thẻ tách biệt</b> — thay thế độc lập khi cần</li>
              <li className="flex gap-2"><span className="text-emerald-500">✓</span> <b>Quét ngay bằng điện thoại</b> — không cần thiết bị đặc biệt</li>
            </ul>

            {/* Diagram 2 thành phần */}
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border border-blue-200 dark:border-blue-900 rounded-xl p-4 my-3">
              <div className="text-center font-bold text-sm mb-3">🏗 Kiến trúc 2 thành phần</div>
              <div className="flex items-center justify-center gap-2 md:gap-4 flex-wrap">
                <ComponentBlock
                  emoji="⭕"
                  title="VÒNG SILICON XOẮN"
                  details={['Gắn trên chân', 'Dùng suốt đời', 'Tự điều chỉnh size']}
                  tone="from-emerald-500 to-teal-600"
                />
                <div className="text-3xl text-gray-400">+</div>
                <ComponentBlock
                  emoji="🏷"
                  title="THẺ QR PET"
                  details={['Treo vào vòng', 'Thay khi cần', 'In 1 lần 1000 thẻ']}
                  tone="from-blue-500 to-cyan-600"
                />
                <div className="text-3xl text-gray-400">=</div>
                <ComponentBlock
                  emoji="🐓"
                  title="ĐỊNH DANH HOÀN CHỈNH"
                  details={['1 con = 1 ID', 'Không trùng', 'Suốt vòng đời']}
                  tone="from-orange-500 to-red-600"
                  highlight
                />
              </div>
            </div>

            <h4 className="font-bold text-sm mt-3 mb-2">Tại sao là 2 thành phần riêng biệt?</h4>
            <Table
              headers={['Lợi ích', 'Mô tả']}
              rows={[
                ['🔄 Linh hoạt thay thế', 'Thẻ hỏng → thay thẻ, giữ vòng. Vòng hỏng → thay vòng, giữ thẻ'],
                ['💵 Tối ưu chi phí', 'Không bao giờ phải bỏ cả bộ'],
                ['🆔 Không gián đoạn ID', 'Số thứ tự theo gà suốt đời, không thay đổi'],
                ['🚿 Dễ vệ sinh', 'Tháo thẻ khi tắm gà, đeo lại sau'],
              ]}
            />
          </Section>

          {/* 2. SO SÁNH */}
          <Section id="so-sanh" emoji="⚖️" title="2. So sánh 3 giải pháp định danh" tone="from-violet-500 to-fuchsia-600">
            <Table
              highlightCol={2}
              headers={['Tiêu chí', 'Chip RFID/NFC', 'Thẻ QR vật lý', 'Khắc laser cựa']}
              rows={[
                ['Chi phí / con', '120k-350k đ', '3k-8k đ', '20k-50k đ'],
                ['Thiết bị quét', 'Đầu đọc 500k-2tr', 'Điện thoại thường', 'Điện thoại thường'],
                ['Tự thực hiện', 'Cần kỹ thuật viên', 'Tự làm được', 'Cần máy laser'],
                ['Thông tin hiển thị', 'Không nhìn được', 'In trực tiếp lên thẻ', 'Giới hạn'],
                ['Thay khi hỏng', 'Phải bắn lại', 'Thay thẻ mới', 'Khắc lại'],
                ['Phù hợp quy mô', 'Lớn (100+ con)', 'Mọi quy mô', 'Trung bình'],
              ]}
            />
            <Callout tone="emerald" title="Kết luận">
              Thẻ QR vật lý là <b>lựa chọn tối ưu</b> cho trại gà chọi quy mô nhỏ-vừa (dưới 100 con). Tỷ lệ chi phí/hiệu quả tốt nhất, không cần thiết bị riêng, và tự lắp ráp được.
            </Callout>

            <h4 className="font-bold text-sm mt-4 mb-2">Tại sao không kẹp thẻ thẳng lên chân?</h4>
            <p>
              Nếu in thẻ cứng và kẹp thẳng vào cổ chân (không có vòng):
            </p>
            <ul className="my-2 list-disc pl-5 space-y-1">
              <li>Gà con 3-4 tuần: cổ chân 10-12mm → thẻ phải nhỏ hoặc lỏng → dễ tuột</li>
              <li>Gà trưởng thành: cổ chân 20-30mm → cần thẻ lớn hơn → phải thay</li>
              <li><b>Phải có ít nhất 2-3 kích thước thẻ</b> → không đạt mục tiêu &quot;in 1 lần&quot;</li>
            </ul>
            <Callout tone="blue" title="Giải pháp">
              Dùng vòng xoắn silicon (tự điều chỉnh) làm nền, thẻ QR chỉ <b>treo vào vòng</b>.
            </Callout>
          </Section>

          {/* 3. VÒNG CHÂN */}
          <Section id="vong-chan" emoji="⭕" title="3. Thông số kỹ thuật vòng chân" tone="from-emerald-500 to-teal-600">
            <h4 className="font-bold text-sm mb-2">Kiểu vòng: Xoắn lò xo mở (Spiral Open Ring)</h4>
            <p>
              Đây là kiểu vòng dùng phổ biến cho chim cảnh, áp dụng cho gà chọi với size lớn hơn.
            </p>
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200 dark:border-emerald-900 rounded-xl p-4 my-3">
              <h5 className="font-bold text-sm mb-2">Nguyên lý hoạt động</h5>
              <ul className="space-y-1 text-sm">
                <li>🔄 Dây silicon/nhựa xoắn thành hình lò xo mở</li>
                <li>📈 Tự giãn khi gà lớn — không siết chặt vào chân</li>
                <li>🔓 Không có điểm khoá → không có điểm yếu cơ học</li>
                <li>🛠 Đeo vào/tháo ra không cần dụng cụ</li>
              </ul>
            </div>

            <h4 className="font-bold text-sm mb-2">So sánh các kiểu vòng</h4>
            <Table
              headers={['Kiểu vòng', 'Ưu/nhược']}
              rows={[
                ['❌ Vòng kín', 'Cần 2-3 size khác nhau khi gà lớn → tốn kém'],
                ['❌ Vòng khoá', 'Chốt dễ gãy, gà có thể móc vào lưới chuồng'],
                ['✅ Vòng xoắn', '1 size dùng từ gà 3 tuần đến trưởng thành'],
              ]}
            />

            <h4 className="font-bold text-sm mt-4 mb-2">Thông số kích thước — 1 size duy nhất</h4>
            <Table
              headers={['Thông số', 'Giá trị', 'Ghi chú']}
              rows={[
                ['Đường kính trong', '30-32mm', 'Phù hợp cổ chân gà trưởng thành lớn nhất (Mã Lai ~30mm)'],
                ['Đường kính ngoài', '35-38mm', 'Tính cả độ dày dây'],
                ['Độ dày dây', '3-4mm', 'Đủ cứng để giữ thẻ, đủ mềm để không cứa chân'],
                ['Bề rộng vòng', '8-10mm', 'Đủ chỗ xỏ lỗ thẻ QR'],
                ['Chu vi dây xoắn', '90-95mm', 'Chiều dài dây trước khi xoắn'],
                ['Số vòng xoắn', '2-3 vòng', 'Đủ để tự điều chỉnh, không quá lỏng'],
              ]}
            />

            <Callout tone="amber" title="Test trước khi đặt số lượng lớn">
              <ol className="list-decimal pl-5 space-y-1">
                <li>In hình tròn đường kính 32mm trên giấy</li>
                <li>Đặt lên cổ chân gà Nòi/Mã Lai trưởng thành để check</li>
                <li>Vòng nên lỏng hơn chân ~2-4mm (đủ máu lưu thông, không tuột)</li>
              </ol>
            </Callout>
          </Section>

          {/* 4. THỜI ĐIỂM ĐEO */}
          <Section id="thoi-diem" emoji="📅" title="4. Thời điểm đeo theo từng dòng gà" tone="from-orange-500 to-red-600">
            <Table
              headers={['Dòng gà', 'Cân lúc nở', 'Tuổi đeo được', 'Cân lúc đeo', 'Cổ chân lúc đeo', 'Cổ chân TT']}
              rows={[
                ['🥇 Gà Nòi', '35-45g', '3-4 tuần', '150-250g', '10-12mm', '20-26mm'],
                ['🥈 Gà Asil', '35-45g', '3-4 tuần', '150-250g', '10-12mm', '18-24mm'],
                ['🐓 Mã Lai (Shamo)', '40-55g', '4-5 tuần', '200-300g', '11-13mm', '22-30mm'],
                ['🐤 Gà Tre', '20-28g', '3 tuần', '80-130g', '8-10mm', '14-18mm'],
              ]}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
              <Callout tone="rose" title="❌ Tại sao không đeo sớm hơn">
                <ul className="list-disc pl-4 space-y-1">
                  <li><b>Dưới 2 tuần:</b> Gà quá nhỏ, cổ chân chưa cứng. Vòng nặng hơn chân → stress, ảnh hưởng phát triển</li>
                  <li><b>2-3 tuần (gà Tre):</b> Vòng 32mm sẽ lỏng nhưng vẫn giữ được vì xoắn — có thể đeo</li>
                </ul>
              </Callout>
              <Callout tone="amber" title="⚠️ Tại sao không đeo muộn hơn">
                <ul className="list-disc pl-4 space-y-1">
                  <li>Gà lớn hơn khó giữ yên khi đeo</li>
                  <li>Gà chưa quen vòng → căng thẳng, gãi liên tục vài ngày đầu</li>
                  <li>Đeo sớm (3-5 tuần) gà coi vòng như một phần cơ thể</li>
                </ul>
              </Callout>
            </div>

            <Callout tone="blue" title="🔍 Xử lý đặc biệt cho gà Mã Lai (kiểm tra lúc 6 tháng)">
              Mã Lai có cổ chân lớn nhất (đến 30mm). Kiểm tra:
              <ul className="list-disc pl-4 mt-1 space-y-1">
                <li><b>Thò 1 ngón tay được dễ dàng:</b> ✅ Đúng size</li>
                <li><b>Không thò được 1 ngón:</b> 🔴 Vòng quá chật → thay vòng lớn hơn 1mm</li>
                <li><b>Thò 2 ngón dễ dàng:</b> 🟡 Vòng quá lỏng → kiểm tra thẻ có hay tuột không</li>
              </ul>
            </Callout>
          </Section>

          {/* 5. THẺ QR */}
          <Section id="the-qr" emoji="🏷" title="5. Thông số kỹ thuật thẻ QR" tone="from-cyan-500 to-blue-600">
            <h4 className="font-bold text-sm mb-2">Thiết kế thẻ — Layout</h4>

            {/* Mockup thẻ SVG */}
            <div className="flex justify-center my-3">
              <div className="bg-white dark:bg-gray-100 border-2 border-dashed border-gray-300 dark:border-gray-400 rounded-xl p-6 shadow-sm">
                <svg viewBox="0 0 250 350" className="w-44 h-auto">
                  {/* card outline */}
                  <rect x="2" y="2" width="246" height="346" rx="14" fill="white" stroke="#94a3b8" strokeWidth="2" />
                  {/* hole */}
                  <circle cx="125" cy="35" r="12" fill="white" stroke="#cbd5e1" strokeWidth="2" />
                  <text x="125" y="38" fontSize="9" fill="#94a3b8" textAnchor="middle">4mm</text>
                  {/* QR placeholder */}
                  <rect x="55" y="80" width="140" height="140" fill="black" />
                  {[
                    [0, 0], [1, 0], [2, 0], [3, 0], [4, 0],
                    [0, 1], [4, 1],
                    [0, 2], [4, 2],
                    [0, 3], [4, 3],
                    [0, 4], [1, 4], [2, 4], [3, 4], [4, 4],
                  ].map(([x, y], i) => (
                    <rect key={i} x={62 + x * 18} y={87 + y * 18} width="14" height="14" fill="white" />
                  ))}
                  {/* center pattern white */}
                  <rect x="100" y="125" width="50" height="50" fill="white" />
                  <rect x="115" y="140" width="20" height="20" fill="black" />
                  {/* label below QR */}
                  <text x="125" y="245" fontSize="20" fontWeight="bold" fill="#0f172a" textAnchor="middle">GCV-0001</text>
                  <text x="125" y="270" fontSize="11" fill="#475569" textAnchor="middle">gachoivietnb.com</text>
                  <text x="125" y="288" fontSize="9" fill="#94a3b8" textAnchor="middle">PET 0.3mm · laminate UV</text>
                  {/* Dimensions */}
                  <text x="240" y="180" fontSize="10" fill="#3b82f6" fontWeight="bold" transform="rotate(90, 240, 180)">35mm</text>
                  <text x="125" y="335" fontSize="10" fill="#3b82f6" fontWeight="bold" textAnchor="middle">25mm</text>
                </svg>
              </div>
            </div>

            <Table
              headers={['Thành phần', 'Kích thước', 'Ghi chú']}
              rows={[
                ['Thẻ tổng thể', '25 × 35mm', 'Vừa đủ QR 18mm + thông tin phụ'],
                ['Vùng QR code', '18 × 18mm', 'Tối thiểu để điện thoại quét từ 10-15cm'],
                ['Số thứ tự', 'Font 10pt+', 'In rõ: GCV-0001'],
                ['Lỗ treo', 'Ø4mm', 'Cách mép trên 4mm'],
                ['Vùng logo', 'Mặt sau', 'gachoivietnb.com + SĐT'],
              ]}
            />

            <h4 className="font-bold text-sm mt-4 mb-2">Nội dung mã QR</h4>
            <p>Mỗi mã QR trỏ đến URL dạng:</p>
            <pre className="bg-gray-900 text-emerald-300 rounded-lg p-3 my-2 text-xs overflow-x-auto">{`https://gachoivietnb.com/ga/0001
https://gachoivietnb.com/ga/0002
...
https://gachoivietnb.com/ga/1000`}</pre>
            <p>
              Khi quét → mở trang thông tin con gà: dòng giống, ngày nở, bố mẹ, lịch tiêm phòng, lịch thi đấu.
            </p>

            <Callout tone="violet" title="🛠 Lưu ý kỹ thuật">
              <ul className="list-disc pl-4 space-y-1">
                <li>Mã QR <b>phiên bản 2-3</b> — ô vuông lớn hơn, dễ quét ở kích thước nhỏ</li>
                <li>Error Correction Level <b>M (15%)</b> — đọc được kể cả khi thẻ bị trầy nhẹ</li>
                <li>Đen tuyệt đối <code className="px-1 bg-gray-200 dark:bg-gray-700 rounded text-xs">#000000</code> trên nền trắng <code className="px-1 bg-gray-200 dark:bg-gray-700 rounded text-xs">#FFFFFF</code> — tối ưu</li>
                <li>Tránh nền vàng/đỏ/xanh đậm — giảm khả năng quét đáng kể</li>
              </ul>
            </Callout>
          </Section>

          {/* 6. CHẤT LIỆU */}
          <Section id="chat-lieu" emoji="🧪" title="6. Lựa chọn chất liệu" tone="from-amber-500 to-orange-600">
            <h4 className="font-bold text-sm mb-2">Chất liệu vòng — So sánh</h4>
            <Table
              highlightRow={0}
              headers={['Chất liệu', 'Giá / 1000', 'Bền', 'An toàn', 'Tự giãn', 'Khuyến nghị']}
              rows={[
                ['🥇 Silicon xoắn', '2-4tr đ', '3-5 năm', 'Rất tốt (y tế)', 'Cao', '★★★★★ Tốt nhất'],
                ['Nhựa ABS xoắn', '0.8-1.5tr đ', '1-2 năm', 'Tốt', 'Có', '★★★ Phổ thông'],
                ['Nhôm xoắn', '3-6tr đ', '5-10 năm', 'Cần bọc cao su', 'Ít', '★★★★ Bền nhưng cứng'],
                ['Inox xoắn', '5-10tr đ', '>10 năm', 'Cần bọc nhựa', 'Không', '★★★ Quá cứng'],
              ]}
            />

            <Callout tone="emerald" title="✅ Khuyến nghị: Silicon xoắn Shore A 40-50">
              <ul className="list-disc pl-4 space-y-1">
                <li>Mềm như da người → gà không bị trầy xước</li>
                <li>Đàn hồi tốt → tự giãn theo cổ chân gà lớn dần</li>
                <li>Chống nước hoàn toàn → tắm gà không cần tháo</li>
                <li>Kháng UV tốt hơn nhựa ABS → không giòn, nứt dưới nắng</li>
                <li>Màu sắc đa dạng → phân biệt dòng/lứa theo màu</li>
              </ul>
            </Callout>

            <h4 className="font-bold text-sm mt-5 mb-2">Chất liệu thẻ QR — So sánh</h4>
            <Table
              highlightRow={0}
              headers={['Chất liệu', 'Giá / 1000', 'Bền', 'Chống nước', 'QR sắc', 'Khuyến nghị']}
              rows={[
                ['🥇 PET 0.3mm + laminate', '600k-1tr đ', '2-4 năm', 'Tốt', 'Rất tốt', '★★★★★ Tốt nhất'],
                ['PVC 0.5mm', '500k-900k đ', '1-2 năm', 'Trung bình', 'Tốt', '★★★★ Phổ biến'],
                ['Giấy couche laminate', '300-500k đ', '6-12 tháng', 'Kém', 'Rất tốt', '★★★ Tạm thời'],
                ['PC trong suốt', '1.5-2.5tr đ', '5+ năm', 'Rất tốt', 'Tốt', '★★★★ Cao cấp'],
                ['Nhôm khắc laser', '3-5tr đ', '>10 năm', 'Hoàn hảo', 'Trung bình', '★★★ QR khó quét'],
              ]}
            />

            <Callout tone="emerald" title="✅ Khuyến nghị: PET 0.3mm phủ UV 2 mặt (laminate)">
              Dẻo nhẹ, QR sắc nét, chống nước, giá hợp lý, có lỗ đục sẵn. Cân bằng tốt nhất giữa độ bền và chi phí.
            </Callout>

            <h4 className="font-bold text-sm mt-5 mb-2">🎨 Phân biệt màu vòng theo dòng gà</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 my-3">
              {[
                { color: 'bg-green-500', text: 'text-white', label: '🟢 Xanh lá', breed: 'Gà Nòi thuần' },
                { color: 'bg-red-500', text: 'text-white', label: '🔴 Đỏ', breed: 'Gà Asil' },
                { color: 'bg-yellow-400', text: 'text-yellow-900', label: '🟡 Vàng', breed: 'Mã Lai lai' },
                { color: 'bg-white border-2 border-gray-300', text: 'text-gray-900', label: '⚪ Trắng', breed: 'Gà Tre' },
                { color: 'bg-blue-500', text: 'text-white', label: '🔵 Xanh dương', breed: 'Gà lai F1' },
                { color: 'bg-orange-500', text: 'text-white', label: '🟠 Cam', breed: 'Dự phòng / Giống' },
              ].map((c) => (
                <div key={c.label} className={`${c.color} ${c.text} rounded-xl p-3 shadow text-center`}>
                  <div className="text-sm font-bold">{c.label}</div>
                  <div className="text-xs opacity-90">{c.breed}</div>
                </div>
              ))}
            </div>
          </Section>

          {/* 7. CHI PHÍ */}
          <Section id="chi-phi" emoji="💰" title="7. Chi phí và kế hoạch đặt hàng" tone="from-yellow-500 to-amber-600">
            <h4 className="font-bold text-sm mb-2">Chi phí đặt hàng 1000 bộ (vòng + thẻ)</h4>
            <Table
              headers={['Hạng mục', 'SL', 'Đơn giá', 'Thành tiền']}
              rows={[
                ['Vòng silicon xoắn 32mm', '1.000 cái', '2-4k đ', '2-4tr đ'],
                ['Thẻ QR PET laminate 25×35mm', '1.000 thẻ', '600-1k đ', '600k-1tr đ'],
                ['Đục lỗ thẻ (nếu xưởng không làm)', '1 lần', '—', '50-100k đ'],
              ]}
              footer={['TỔNG', '', '', '2.65-5.1tr đ (~2.6-5.1k đ/bộ)']}
            />

            <h4 className="font-bold text-sm mt-4 mb-2">Chi phí thay thế khi hỏng</h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-xl p-3">
                <div className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold">Đơn lẻ 1 thẻ</div>
                <div className="text-base font-bold tabular-nums">~600-1k đ</div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-xl p-3">
                <div className="text-xs text-blue-700 dark:text-blue-300 font-semibold">Đơn lẻ 1 vòng</div>
                <div className="text-base font-bold tabular-nums">~2-4k đ</div>
              </div>
            </div>

            <h4 className="font-bold text-sm mt-4 mb-2">📅 Kế hoạch 3 giai đoạn đặt hàng</h4>
            <ol className="space-y-2 my-2">
              <Phase
                step={1}
                title="Thử nghiệm (50-100 bộ)"
                tone="from-blue-500 to-indigo-500"
                items={[
                  'Đặt 100 vòng + 100 thẻ → test với đàn gà thực tế',
                  'Kiểm tra vòng có vừa không, thẻ có quét tốt không',
                  'Thời gian: 2-4 tuần',
                ]}
              />
              <Phase
                step={2}
                title="Sản xuất chính (1000 bộ)"
                tone="from-emerald-500 to-teal-600"
                items={[
                  'Xác nhận thông số sau test → đặt số lượng lớn',
                  'Đặt Alibaba (vòng) + xưởng in trong nước (thẻ)',
                  'Thời gian: 2-4 tuần (vòng nhập) + 3-5 ngày (thẻ in)',
                ]}
              />
              <Phase
                step={3}
                title="Tái đặt hàng"
                tone="from-violet-500 to-fuchsia-600"
                items={[
                  'Thẻ QR: tái đặt khi hết hoặc cần số mới (1001-2000)',
                  'Vòng: tái đặt khi tồn kho dưới 100 cái',
                ]}
              />
            </ol>
          </Section>

          {/* 8. QUY TRÌNH */}
          <Section id="quy-trinh" emoji="🪜" title="8. Quy trình đeo thẻ từng bước" tone="from-rose-500 to-pink-600">
            {[
              {
                num: 1,
                title: 'Chuẩn bị dụng cụ',
                content: (
                  <ul className="list-none space-y-1">
                    <li>✓ Vòng silicon xoắn đúng size</li>
                    <li>✓ Thẻ QR có số thứ tự</li>
                    <li>✓ Sổ ghi chép hoặc phần mềm quản lý</li>
                    <li>✓ Điện thoại (quét QR test sau khi đeo)</li>
                    <li>✓ Người phụ giữ gà (1 người giữ, 1 người đeo)</li>
                  </ul>
                ),
              },
              {
                num: 2,
                title: 'Kiểm tra vòng + xỏ thẻ TRƯỚC khi đeo lên chân',
                content: (
                  <ol className="list-decimal pl-4 space-y-1">
                    <li>Kiểm tra vòng không bị nứt, sắc cạnh</li>
                    <li>Quét thử thẻ QR bằng điện thoại → đảm bảo mã đọc được</li>
                    <li>Xỏ thẻ QR vào dây xoắn vòng qua lỗ 4mm</li>
                  </ol>
                ),
              },
              {
                num: 3,
                title: 'Đeo vòng lên chân gà',
                content: (
                  <>
                    <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-3 text-sm mb-2 border border-emerald-200 dark:border-emerald-900">
                      <b>✅ Đúng:</b> Xoắn vòng mở ra → luồn qua cổ chân → thả ra → vòng tự thu lại
                    </div>
                    <div className="bg-rose-50 dark:bg-rose-950/30 rounded-lg p-3 text-sm border border-rose-200 dark:border-rose-900 space-y-1">
                      <div><b>❌ Sai 1:</b> Dùng lực kéo căng → có thể đứt vòng</div>
                      <div><b>❌ Sai 2:</b> Đeo lên ngón chân — phải đeo trên cổ chân, dưới khớp gối</div>
                    </div>
                    <p className="mt-2"><b>📍 Vị trí đúng:</b> Giữa cổ chân — <b>phía trên cựa và phía dưới khớp gối</b>. Không quá gần cựa (ảnh hưởng đòn đá), không quá cao (tuột xuống khớp).</p>
                  </>
                ),
              },
              {
                num: 4,
                title: 'Kiểm tra sau khi đeo',
                content: (
                  <ul className="list-none space-y-1.5">
                    <li><b>1️⃣ Test độ lỏng:</b> Thò 1 ngón tay giữa vòng và chân → đúng. Không thò được → quá chật, tháo ra.</li>
                    <li><b>2️⃣ Test thẻ:</b> Treo tự do, không kẹt vào da, không chặn vào cựa</li>
                    <li><b>3️⃣ Test quét:</b> Dùng điện thoại quét thẻ → mã đọc được → hoàn thành</li>
                    <li><b>4️⃣ Ghi chép:</b> Cập nhật số thứ tự vào hệ thống quản lý ngay</li>
                  </ul>
                ),
              },
              {
                num: 5,
                title: 'Theo dõi 48 giờ đầu',
                content: (
                  <ul className="list-none space-y-1">
                    <li>🐓 Gà sẽ gãi chân và mổ vào vòng trong 1-2 ngày đầu — <b>bình thường, không cần can thiệp</b></li>
                    <li>⚠️ Nếu thấy: chân sưng đỏ, gà không đứng được → tháo vòng kiểm tra</li>
                    <li>✅ Sau 48 giờ gà thích nghi hoàn toàn</li>
                  </ul>
                ),
              },
            ].map((s) => (
              <div key={s.num} className="flex gap-3 my-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-500 to-pink-600 text-white flex items-center justify-center text-base font-extrabold shrink-0 shadow">
                  {s.num}
                </div>
                <div className="flex-1 min-w-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm">
                  <div className="font-bold text-sm mb-2">{s.title}</div>
                  <div className="text-sm text-gray-700 dark:text-gray-300">{s.content}</div>
                </div>
              </div>
            ))}
          </Section>

          {/* 9. BẢO TRÌ */}
          <Section id="bao-tri" emoji="🔧" title="9. Vận hành và bảo trì" tone="from-slate-500 to-gray-700">
            <h4 className="font-bold text-sm mb-2">📅 Kiểm tra định kỳ</h4>
            <Table
              headers={['Tần suất', 'Việc cần kiểm tra']}
              rows={[
                ['Hàng ngày', 'Quan sát vòng còn nguyên vẹn không khi cho ăn'],
                ['Hàng tuần', 'Quét QR 10% đàn ngẫu nhiên — đảm bảo mã vẫn đọc được'],
                ['Hàng tháng', 'Kiểm tra độ lỏng vòng — đặc biệt gà đang tăng trưởng (3-8 tháng)'],
                ['6 tháng/lần', 'Kiểm tra toàn bộ đàn, thay thẻ bị mờ/hỏng'],
              ]}
            />

            <h4 className="font-bold text-sm mt-4 mb-2">🚨 Xử lý sự cố thường gặp</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <Callout tone="amber" title="Thẻ QR không quét được">
                <ol className="list-decimal pl-4 space-y-0.5">
                  <li>Lau sạch thẻ bằng khăn ẩm</li>
                  <li>Thử ánh sáng khác (tránh nắng phản chiếu)</li>
                  <li>Vẫn không quét → thay thẻ mới <b>cùng số thứ tự</b></li>
                </ol>
              </Callout>
              <Callout tone="rose" title="Vòng bị tuột">
                <p>Gà Tre nhỏ — vòng 32mm có thể lỏng quá. Giải pháp: dùng vòng <b>28mm</b> riêng cho đàn Gà Tre.</p>
              </Callout>
              <Callout tone="rose" title="Vòng bị nứt">
                <p>Thay vòng mới ngay — vòng nứt có cạnh sắc gây xước chân gà. Giữ thẻ cũ → xỏ vào vòng mới → ID không thay đổi.</p>
              </Callout>
              <Callout tone="amber" title="Gà tháo được vòng (hiếm)">
                <p>Thường do vòng quá lỏng hoặc gà học được cách móc. Chuyển sang vòng có <b>3 vòng xoắn</b> thay vì 2.</p>
              </Callout>
            </div>

            <h4 className="font-bold text-sm mt-4 mb-2">🚿 Vệ sinh thẻ và vòng</h4>
            <ul className="list-disc pl-5 space-y-1">
              <li><b>Hàng tuần:</b> Dùng khăn ẩm lau nhẹ thẻ QR</li>
              <li><b>Khi tắm gà:</b> Không cần tháo vòng silicon — chống nước tốt. Tháo thẻ PET nếu ngâm nước (phòng thủ)</li>
              <li><b>Khử trùng:</b> Xịt cồn 70% lên vòng khi gà vừa qua khỏi bệnh</li>
            </ul>
          </Section>

          {/* 10. NGUỒN MUA */}
          <Section id="nguon-mua" emoji="🛒" title="10. Nguồn mua và từ khoá tìm kiếm" tone="from-purple-500 to-pink-600">
            <h4 className="font-bold text-sm mb-2">🏪 Mua vòng chân</h4>

            <div className="space-y-2 my-2">
              <SourceCard
                emoji="🛍"
                title="Shopee / Lazada"
                subtitle="Test ban đầu (size chim cảnh nhỏ hơn — chỉ test cơ chế)"
                keywords={[
                  'vòng đeo chân chim xoắn nhôm số',
                  'vòng nhựa chim cảnh silicon',
                ]}
              />
              <SourceCard
                emoji="🌏"
                title="Alibaba.com"
                subtitle="Đặt số lượng lớn, đúng size — MOQ 500-1000 cái, 500-2k đ/cái, 7-25 ngày"
                keywords={[
                  'silicone poultry leg ring spiral open',
                  'chicken leg band 32mm custom',
                  'spiral open leg band color numbered',
                ]}
                spec="Yêu cầu: size 32mm, silicon Shore A45, bề rộng 8mm"
              />
              <SourceCard
                emoji="🏭"
                title="Xưởng nhựa trong nước"
                subtitle="Đặt làm riêng theo bản vẽ — Hà Nội (Định Công, Phố Huế), TP.HCM (Q.8, Bình Chánh)"
                keywords={['ép khuôn vòng xoắn silicon theo bản vẽ']}
                spec="MOQ 500-1000 cái, 2-4 tuần (cần làm khuôn lần đầu)"
              />
            </div>

            <h4 className="font-bold text-sm mt-4 mb-2">🖨 In thẻ QR</h4>
            <SourceCard
              emoji="📇"
              title="Xưởng in thẻ PVC/PET (Hà Nội, TP.HCM)"
              subtitle="600k-1.2tr đ / 1000 thẻ, 3-5 ngày làm việc"
              keywords={[
                'in thẻ QR PET laminate số thứ tự nhỏ',
                'in thẻ nhựa chống nước có lỗ đục',
              ]}
              spec="Báo: 25×35mm · PET 0.3mm · laminate 2 mặt · đục lỗ 4mm · 1000 thẻ số 0001-1000 · QR riêng từng thẻ"
            />

            <Callout tone="blue" title="📁 Cách tạo file QR gửi xưởng in">
              <ol className="list-decimal pl-4 space-y-1">
                <li>Tạo 1000 URL: <code className="px-1 bg-blue-100 dark:bg-blue-900 rounded text-xs">https://gachoivietnb.com/ga/0001</code> → <code className="px-1 bg-blue-100 dark:bg-blue-900 rounded text-xs">/ga/1000</code></li>
                <li>Dùng tool (qr-code-generator.com / goqr.me) hoặc Python <code className="px-1 bg-blue-100 dark:bg-blue-900 rounded text-xs">qrcode</code> để batch generate</li>
                <li>Xuất 1000 file PNG 300DPI, đặt tên <code className="px-1 bg-blue-100 dark:bg-blue-900 rounded text-xs">QR-0001.png</code> → <code className="px-1 bg-blue-100 dark:bg-blue-900 rounded text-xs">QR-1000.png</code></li>
                <li>Gửi kèm file thiết kế thẻ (AI/PSD) + folder ảnh QR cho xưởng in</li>
              </ol>
              <p className="mt-2 text-xs">
                💡 <b>Hoặc dùng module có sẵn:</b> vào <Link href="/admin/generate-qr" className="text-blue-600 dark:text-blue-400 font-bold underline">/admin/generate-qr</Link> → tạo & tải PDF 36 thẻ/trang A4 — in thẳng tại nhà thay vì gửi xưởng.
              </p>
            </Callout>

            <h4 className="font-bold text-sm mt-4 mb-2">✅ Checklist trước khi đặt hàng chính thức</h4>
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-xl p-4 space-y-1.5">
              {[
                'Đã test thử 10-20 vòng trên đàn gà thực tế',
                'Đã xác nhận size vòng phù hợp với cổ chân gà lớn nhất',
                'Đã test quét QR ở kích thước 18×18mm',
                'Đã có URL hệ thống quản lý sẵn sàng (gachoivietnb.com/ga/XXXX)',
                'Đã thiết kế layout thẻ hoàn chỉnh (mặt trước + mặt sau)',
                'Đã chọn màu vòng theo từng dòng gà',
                'Đã xác nhận xưởng in có thể đục lỗ 4mm',
                'Đã test thẻ laminate có chống nước',
              ].map((it) => (
                <label key={it} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded text-emerald-600" />
                  <span className="text-emerald-900 dark:text-emerald-100">{it}</span>
                </label>
              ))}
            </div>
          </Section>

          {/* Footer note */}
          <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center text-xs text-gray-500 dark:text-gray-400">
            📄 Tài liệu kỹ thuật phiên bản 1.0 · Biên soạn cho gachoivietnb.com · Xem thêm{' '}
            <Link href="/admin/generate-qr" className="text-blue-600 dark:text-blue-400 underline">
              module In thẻ QR
            </Link>{' '}
            để tự tạo PDF in tại nhà.
          </div>
        </div>
      </div>
    </div>
  )
}

/* ============================================================
 * Sub-components
 * ============================================================ */

function Section({
  id,
  emoji,
  title,
  tone,
  children,
}: {
  id: string
  emoji: string
  title: string
  tone: string
  children: React.ReactNode
}) {
  return (
    <section
      id={id}
      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden scroll-mt-20"
    >
      <div className={`px-4 md:px-5 py-3 bg-gradient-to-r ${tone} text-white flex items-center gap-2`}>
        <span className="text-2xl">{emoji}</span>
        <h2 className="text-base md:text-lg font-bold">{title}</h2>
      </div>
      <div className="p-4 md:p-5 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
        {children}
      </div>
    </section>
  )
}

function Fact({ emoji, label, value, sub }: { emoji: string; label: string; value: string; sub: string }) {
  return (
    <div className="bg-white/15 backdrop-blur rounded-xl p-3 border border-white/20">
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[10px] uppercase tracking-wider opacity-80">{label}</span>
        <span className="text-base">{emoji}</span>
      </div>
      <div className="font-bold text-base md:text-lg tabular-nums">{value}</div>
      <div className="text-[10px] opacity-75">{sub}</div>
    </div>
  )
}

function ComponentBlock({
  emoji, title, details, tone, highlight,
}: {
  emoji: string
  title: string
  details: string[]
  tone: string
  highlight?: boolean
}) {
  return (
    <div
      className={
        'rounded-xl p-3 border-2 text-center min-w-[130px] ' +
        (highlight
          ? 'border-orange-400 dark:border-orange-700 ring-2 ring-orange-300 dark:ring-orange-800'
          : 'border-transparent bg-white dark:bg-gray-900')
      }
    >
      <div className={`w-12 h-12 mx-auto rounded-xl bg-gradient-to-br ${tone} text-white flex items-center justify-center text-2xl shadow mb-1.5`}>
        {emoji}
      </div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">{title}</div>
      <div className="mt-1 text-[10.5px] text-gray-500 dark:text-gray-400 space-y-0.5">
        {details.map((d) => <div key={d}>• {d}</div>)}
      </div>
    </div>
  )
}

function Table({
  headers,
  rows,
  footer,
  highlightCol,
  highlightRow,
}: {
  headers: string[]
  rows: string[][]
  footer?: string[]
  highlightCol?: number
  highlightRow?: number
}) {
  return (
    <div className="overflow-x-auto -mx-4 md:mx-0 my-2">
      <table className="w-full text-sm border-collapse">
        <thead className="bg-gray-50 dark:bg-gray-900/50">
          <tr>
            {headers.map((h, i) => (
              <th
                key={i}
                className={
                  'px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 ' +
                  (i === highlightCol ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200' : '')
                }
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className={
                i === highlightRow
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 font-semibold'
                  : i % 2 === 1
                    ? 'bg-gray-50 dark:bg-gray-900/30'
                    : ''
              }
            >
              {row.map((c, j) => (
                <td
                  key={j}
                  className={
                    'px-3 py-2 border border-gray-200 dark:border-gray-700 align-top ' +
                    (j === highlightCol ? 'bg-emerald-50 dark:bg-emerald-950/30 font-semibold' : '')
                  }
                >
                  {c}
                </td>
              ))}
            </tr>
          ))}
          {footer && (
            <tr className="bg-blue-50 dark:bg-blue-950/40 font-extrabold">
              {footer.map((c, i) => (
                <td key={i} className="px-3 py-2 border border-blue-200 dark:border-blue-900">
                  {c}
                </td>
              ))}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function Callout({
  tone, title, children,
}: {
  tone: 'emerald' | 'amber' | 'blue' | 'rose' | 'violet'
  title: string
  children: React.ReactNode
}) {
  const cls: Record<typeof tone, string> = {
    emerald: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100',
    amber: 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-100',
    blue: 'bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-800 text-blue-900 dark:text-blue-100',
    rose: 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-100',
    violet: 'bg-violet-50 dark:bg-violet-950/30 border-violet-300 dark:border-violet-800 text-violet-900 dark:text-violet-100',
  }
  return (
    <div className={`rounded-xl border-l-4 px-4 py-3 my-3 ${cls[tone]}`}>
      <div className="font-bold text-sm mb-1">{title}</div>
      <div className="text-sm">{children}</div>
    </div>
  )
}

function Phase({
  step, title, items, tone,
}: {
  step: number
  title: string
  items: string[]
  tone: string
}) {
  return (
    <li className="flex gap-3">
      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${tone} text-white flex items-center justify-center text-base font-extrabold shrink-0 shadow`}>
        {step}
      </div>
      <div className="flex-1 min-w-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3">
        <div className="font-bold text-sm mb-1">{title}</div>
        <ul className="list-disc pl-4 text-sm text-gray-700 dark:text-gray-300 space-y-0.5">
          {items.map((it) => <li key={it}>{it}</li>)}
        </ul>
      </div>
    </li>
  )
}

function SourceCard({
  emoji, title, subtitle, keywords, spec,
}: {
  emoji: string
  title: string
  subtitle: string
  keywords: string[]
  spec?: string
}) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 shadow-sm">
      <div className="flex items-start gap-2 mb-1.5">
        <div className="text-2xl">{emoji}</div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm">{title}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</div>
        </div>
      </div>
      <div className="text-xs text-gray-700 dark:text-gray-300 mb-1">🔍 Từ khoá tìm:</div>
      <div className="flex flex-wrap gap-1 mb-2">
        {keywords.map((k) => (
          <code key={k} className="text-[10.5px] px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 font-mono">
            {k}
          </code>
        ))}
      </div>
      {spec && (
        <div className="text-[11px] text-gray-600 dark:text-gray-400 italic border-l-2 border-blue-300 dark:border-blue-700 pl-2">
          {spec}
        </div>
      )}
    </div>
  )
}
