# Hướng Dẫn Hệ Thống Thẻ QR Quản Lý Gà Chọi
## Tài liệu kỹ thuật — Module in thẻ QR | gachoivietnb.com

---

## Mục Lục

1. [Tổng quan hệ thống](#1-tổng-quan-hệ-thống)
2. [Phân tích và lựa chọn giải pháp](#2-phân-tích-và-lựa-chọn-giải-pháp)
3. [Thông số kỹ thuật vòng chân](#3-thông-số-kỹ-thuật-vòng-chân)
4. [Thời điểm đeo theo từng dòng gà](#4-thời-điểm-đeo-theo-từng-dòng-gà)
5. [Thông số kỹ thuật thẻ QR](#5-thông-số-kỹ-thuật-thẻ-qr)
6. [Lựa chọn chất liệu](#6-lựa-chọn-chất-liệu)
7. [Chi phí và kế hoạch đặt hàng](#7-chi-phí-và-kế-hoạch-đặt-hàng)
8. [Quy trình đeo thẻ từng bước](#8-quy-trình-đeo-thẻ-từng-bước)
9. [Vận hành và bảo trì](#9-vận-hành-và-bảo-trì)
10. [Nguồn mua và từ khoá tìm kiếm](#10-nguồn-mua-và-từ-khoá-tìm-kiếm)

---

## 1. Tổng Quan Hệ Thống

### Mục tiêu

Xây dựng hệ thống định danh gà chọi bằng mã QR với nguyên tắc:
- **1 kích thước vòng duy nhất** dùng xuyên suốt vòng đời gà (tiết kiệm chi phí, không phải thay size)
- **In 1 lần 1000 thẻ** có số thứ tự 0001–1000 kèm mã QR
- **Vòng và thẻ tách biệt** — thay thế độc lập khi cần
- **Quét ngay bằng điện thoại** — không cần thiết bị đặc biệt

### Kiến trúc 2 thành phần

```
[VÒNG SILICON XOẮN] + [THẺ QR PET] = Bộ định danh hoàn chỉnh
     Gắn trên chân          Treo vào vòng
     Dùng suốt đời          Thay khi cần
     Tự điều chỉnh size     In 1 lần 1000 thẻ
```

### Tại sao là 2 thành phần riêng biệt?

| Lợi ích | Mô tả |
|---|---|
| Linh hoạt thay thế | Thẻ hỏng → thay thẻ, giữ vòng. Vòng hỏng → thay vòng, giữ thẻ |
| Tối ưu chi phí | Không bao giờ phải bỏ cả bộ |
| Không gián đoạn ID | Số thứ tự theo gà suốt đời, không thay đổi |
| Dễ vệ sinh | Tháo thẻ khi tắm gà, đeo lại sau |

---

## 2. Phân Tích Và Lựa Chọn Giải Pháp

### 2.1 So sánh 3 giải pháp định danh

| Tiêu chí | Chip RFID/NFC | Thẻ QR vật lý | Khắc laser cựa |
|---|---|---|---|
| Chi phí/con | 120.000–350.000đ | **3.000–8.000đ** | 20.000–50.000đ |
| Thiết bị quét | Đầu đọc riêng (500k–2tr) | **Điện thoại thường** | Điện thoại thường |
| Tự thực hiện | Cần kỹ thuật viên | **Tự làm được** | Cần máy laser |
| Thông tin hiển thị | Không nhìn được | **In trực tiếp lên thẻ** | Giới hạn |
| Thay thế khi hỏng | Phải bắn lại | **Thay thẻ mới** | Khắc lại |
| Phù hợp quy mô | Lớn (100+ con) | **Mọi quy mô** | Trung bình |

**Kết luận: Thẻ QR vật lý là lựa chọn tối ưu nhất** cho trại quy mô nhỏ–vừa (dưới 100 con).

### 2.2 Tại sao không dùng thẻ kẹp thẳng lên chân?

Nếu in thẻ cứng và kẹp thẳng vào cổ chân gà (không có vòng):
- Gà con 3–4 tuần: cổ chân 10–12mm → thẻ phải nhỏ hoặc lỏng → dễ tuột
- Gà trưởng thành: cổ chân 20–30mm → cần thẻ lớn hơn → phải thay
- **Phải có ít nhất 2–3 kích thước thẻ** → không đạt mục tiêu "in 1 lần"

**Giải pháp:** Dùng vòng xoắn silicon (tự điều chỉnh) làm nền, thẻ QR chỉ treo vào vòng.

---

## 3. Thông Số Kỹ Thuật Vòng Chân

### 3.1 Kiểu vòng: Xoắn lò xo mở (Spiral Open Ring)

Đây là kiểu vòng dùng phổ biến cho chim cảnh, có thể áp dụng cho gà chọi với size lớn hơn.

**Nguyên lý hoạt động:**
- Dây silicon/nhựa xoắn thành hình lò xo mở
- Tự giãn khi gà lớn — không siết chặt vào chân
- Không có điểm khoá → không có điểm yếu cơ học
- Đeo vào/tháo ra không cần dụng cụ

**Ưu điểm so với vòng kín và vòng khoá:**

```
Vòng kín:    Cần 2–3 size khác nhau khi gà lớn lên → tốn kém
Vòng khoá:   Chốt dễ gãy, gà có thể móc vào lưới chuồng
Vòng xoắn:   1 size dùng từ gà 3 tuần đến trưởng thành ✓
```

### 3.2 Thông số kích thước đề xuất — 1 size duy nhất

| Thông số | Giá trị | Ghi chú |
|---|---|---|
| **Đường kính trong** | **30–32mm** | Phù hợp cổ chân gà trưởng thành lớn nhất (Mã Lai ~30mm) |
| **Đường kính ngoài** | **35–38mm** | Tính cả độ dày dây |
| **Độ dày dây** | **3–4mm** | Đủ cứng để giữ thẻ, đủ mềm để không cứa chân |
| **Bề rộng vòng** | **8–10mm** | Đủ chỗ xỏ lỗ thẻ QR |
| **Chu vi dây xoắn** | **90–95mm** | Chiều dài dây trước khi xoắn |
| **Số vòng xoắn** | **2–3 vòng** | Đủ để tự điều chỉnh, không quá lỏng |

### 3.3 Kiểm tra vòng đúng kích thước

**Test đơn giản trước khi đặt hàng số lượng lớn:**
1. In hình tròn đường kính 32mm trên giấy
2. Đặt lên cổ chân gà Nòi/Mã Lai trưởng thành để check tương thích
3. Vòng nên lỏng hơn chân ~2–4mm (đủ để máu lưu thông, không tuột được)

---

## 4. Thời Điểm Đeo Theo Từng Dòng Gà

### 4.1 Bảng thời điểm đeo tối ưu

| Dòng gà | Cân lúc nở | Cổ chân lúc nở | Tuổi đeo được | Cân lúc đeo | Cổ chân lúc đeo | Cổ chân trưởng thành |
|---|---|---|---|---|---|---|
| **Gà Nòi** | 35–45g | ~6mm | **3–4 tuần** | 150–250g | 10–12mm | 20–26mm |
| **Gà Asil** | 35–45g | ~6mm | **3–4 tuần** | 150–250g | 10–12mm | 18–24mm |
| **Mã Lai (Shamo)** | 40–55g | ~7mm | **4–5 tuần** | 200–300g | 11–13mm | 22–30mm |
| **Gà Tre** | 20–28g | ~5mm | **3 tuần** | 80–130g | 8–10mm | 14–18mm |

### 4.2 Tại sao không đeo sớm hơn?

- **Dưới 2 tuần tuổi:** Gà quá nhỏ, cổ chân chưa đủ cứng. Vòng nặng hơn chân gà → gây stress, ảnh hưởng phát triển
- **2–3 tuần tuổi (gà Tre):** Cổ chân ~8mm, vòng 32mm sẽ lỏng hoàn toàn nhưng vẫn giữ được vì xoắn → **có thể đeo**
- **3–4 tuần (Nòi/Asil):** Đây là thời điểm tốt nhất — gà đủ lớn để mang vòng, cổ chân bắt đầu có độ cứng

### 4.3 Tại sao không đeo muộn hơn?

- Gà lớn hơn khó giữ yên khi đeo
- Nếu đeo lần đầu lúc trưởng thành → gà không quen → căng thẳng, gãi liên tục trong vài ngày đầu
- **Đeo sớm (3–5 tuần) gà thích nghi tốt hơn** — coi vòng như một phần cơ thể

### 4.4 Xử lý đặc biệt cho gà Mã Lai

Mã Lai có cổ chân lớn nhất (đến 30mm khi trưởng thành). Kiểm tra bổ sung lúc 6 tháng tuổi:
- Thò ngón tay vào giữa vòng và cổ chân gà
- Nếu không thò được 1 ngón → **vòng quá chật → cần thay vòng lớn hơn 1mm**
- Nếu thò được 2 ngón dễ dàng → **vòng quá lỏng → kiểm tra thẻ có hay bị tuột không**

---

## 5. Thông Số Kỹ Thuật Thẻ QR

### 5.1 Kích thước thẻ

```
┌─────────────────────────────┐  ← 25mm
│  [●]  Lỗ treo 4mm           │
│                              │
│  ┌──────────┐  GCV-0001     │  ← 35mm
│  │          │               │
│  │  QR Code │  [Logo trại]  │
│  │ 18×18mm  │               │
│  └──────────┘               │
│  gachoivietnb.com           │
└─────────────────────────────┘
```

| Thành phần | Kích thước | Ghi chú |
|---|---|---|
| **Thẻ tổng thể** | 25 × 35mm | Vừa đủ để QR 18mm + thông tin phụ |
| **Vùng QR code** | 18 × 18mm | Tối thiểu để điện thoại quét từ 10–15cm |
| **Số thứ tự** | Font 10pt trở lên | In rõ góc trên phải: GCV-0001 |
| **Lỗ treo** | 4mm, cách mép trên 4mm | Xỏ trực tiếp qua dây xoắn vòng |
| **Vùng logo/tên trại** | Mặt sau | gachoivietnb.com + SĐT |

### 5.2 Nội dung mã QR

Mỗi mã QR nên trỏ đến URL dạng:
```
https://gachoivietnb.com/ga/0001
https://gachoivietnb.com/ga/0002
...
https://gachoivietnb.com/ga/1000
```

Khi quét → mở trang thông tin con gà: dòng giống, ngày nở, bố mẹ, lịch tiêm phòng, lịch thi đấu.

> **Lưu ý kỹ thuật:** Mã QR phiên bản 2–3 (Version 2-3) tạo ô vuông lớn hơn, dễ quét hơn ở kích thước nhỏ. Khi tạo QR code, chọn **Error Correction Level M** (15%) — đủ để đọc được kể cả khi thẻ bị trầy nhẹ.

### 5.3 Màu sắc QR và nền

- **Tối ưu nhất:** Đen tuyệt đối (#000000) trên nền trắng (#FFFFFF)
- **Tránh:** Nền màu vàng, xanh đậm, đỏ — giảm khả năng quét đáng kể
- **Có thể dùng:** Đen trên nền vàng nhạt hoặc xanh nhạt nếu muốn màu sắc theo dòng gà — nhưng phải test trước

---

## 6. Lựa Chọn Chất Liệu

### 6.1 Chất liệu vòng — So sánh chi tiết

| Chất liệu | Giá / 1000 cái | Độ bền | An toàn | Tự giãn | Khuyến nghị |
|---|---|---|---|---|---|
| **Silicon xoắn** | 2.000.000–4.000.000đ | 3–5 năm | Rất tốt (y tế) | Cao | ★★★★★ **Tốt nhất** |
| Nhựa ABS xoắn | 800.000–1.500.000đ | 1–2 năm | Tốt | Có | ★★★ Phổ thông |
| Nhôm xoắn | 3.000.000–6.000.000đ | 5–10 năm | Cần bọc cao su | Ít | ★★★★ Bền nhưng cứng |
| Inox xoắn | 5.000.000–10.000.000đ | >10 năm | Cần bọc nhựa | Không | ★★★ Quá cứng |

**Khuyến nghị: Silicon xoắn Shore A 40–50**

Lý do:
- Mềm như da người → gà hoàn toàn không bị trầy xước
- Đàn hồi tốt → tự giãn theo cổ chân gà lớn dần
- Chống nước hoàn toàn → tắm gà không cần tháo vòng
- Kháng UV tốt hơn nhựa ABS → không giòn, nứt dưới nắng
- Màu sắc đa dạng → phân biệt dòng gà/lứa theo màu

### 6.2 Chất liệu thẻ QR — So sánh chi tiết

| Chất liệu | Giá / 1000 thẻ | Độ bền | Chống nước | QR sắc nét | Khuyến nghị |
|---|---|---|---|---|---|
| **PET 0.3mm + laminate** | 600.000–1.000.000đ | 2–4 năm | Tốt | Rất tốt | ★★★★★ **Tốt nhất** |
| PVC 0.5mm | 500.000–900.000đ | 1–2 năm | Trung bình | Tốt | ★★★★ Phổ biến |
| Giấy couche laminate | 300.000–500.000đ | 6–12 tháng | Kém | Rất tốt | ★★★ Tạm thời |
| Nhựa PC trong suốt | 1.500.000–2.500.000đ | 5+ năm | Rất tốt | Tốt | ★★★★ Cao cấp |
| Nhôm khắc laser | 3.000.000–5.000.000đ | >10 năm | Hoàn hảo | Trung bình | ★★★ QR khó quét |

**Khuyến nghị: PET 0.3mm phủ UV 2 mặt (laminate)**

Lý do:
- Dẻo nhẹ → không cứng, không gây xước gà khi va chạm
- QR in sắc nét → quét tốt trong nhiều điều kiện ánh sáng
- Chống nước khi phủ laminate → bền trong môi trường chuồng ẩm
- Giá hợp lý → tối ưu chi phí khi in số lượng lớn
- Có lỗ đục sẵn → xỏ vào vòng không cần dụng cụ

### 6.3 Phân biệt màu vòng theo dòng gà (gợi ý)

| Màu vòng | Dòng gà | Mục đích |
|---|---|---|
| Xanh lá | Gà Nòi thuần | Nhận biết từ xa |
| Đỏ | Gà Asil | Nhận biết từ xa |
| Vàng | Gà Mã Lai lai | Nhận biết từ xa |
| Trắng | Gà Tre | Nhận biết từ xa |
| Xanh dương | Gà lai F1 | Nhận biết từ xa |
| Cam | Dự phòng / Gà giống | Nhận biết từ xa |

---

## 7. Chi Phí Và Kế Hoạch Đặt Hàng

### 7.1 Chi phí đặt hàng 1000 bộ (vòng + thẻ)

| Hạng mục | Số lượng | Đơn giá | Thành tiền |
|---|---|---|---|
| Vòng silicon xoắn 32mm | 1.000 cái | 2.000–4.000đ | **2.000.000–4.000.000đ** |
| Thẻ QR PET laminate 25×35mm | 1.000 thẻ | 600–1.000đ | **600.000–1.000.000đ** |
| Đục lỗ thẻ (nếu xưởng in không làm) | 1 lần | — | **50.000–100.000đ** |
| **Tổng** | | | **2.650.000–5.100.000đ** |
| **Giá / 1 bộ** | | | **2.650đ–5.100đ** |

### 7.2 Chi phí thay thế khi hỏng

```
Thẻ QR bị hỏng (1000 thẻ mới):     500.000–1.000.000đ
Vòng silicon bị hỏng (1000 vòng):   2.000.000–4.000.000đ
Thay đơn lẻ 1 thẻ:                  ~600–1.000đ
Thay đơn lẻ 1 vòng:                 ~2.000–4.000đ
```

### 7.3 Kế hoạch đặt hàng theo giai đoạn

**Giai đoạn 1 — Thử nghiệm (50–100 bộ):**
- Đặt 100 vòng + 100 thẻ → test với đàn gà thực tế
- Kiểm tra vòng có vừa không, thẻ có quét tốt không
- Thời gian: 2–4 tuần

**Giai đoạn 2 — Sản xuất chính (1000 bộ):**
- Xác nhận thông số sau test → đặt số lượng lớn
- Đặt Alibaba (vòng) + xưởng in trong nước (thẻ)
- Thời gian giao hàng: 2–4 tuần (vòng nhập) + 3–5 ngày (thẻ in)

**Giai đoạn 3 — Tái đặt hàng:**
- Thẻ QR: tái đặt khi hết hoặc cần số mới (1001–2000)
- Vòng: tái đặt khi tồn kho dưới 100 cái

---

## 8. Quy Trình Đeo Thẻ Từng Bước

### Bước 1 — Chuẩn bị dụng cụ

```
Cần có:
✓ Vòng silicon xoắn đúng size
✓ Thẻ QR có số thứ tự
✓ Sổ ghi chép hoặc phần mềm quản lý
✓ Điện thoại (quét QR test sau khi đeo)
✓ Người phụ giữ gà (1 người giữ, 1 người đeo)
```

### Bước 2 — Kiểm tra vòng trước khi đeo

1. Kiểm tra vòng không bị nứt, sắc cạnh
2. Kiểm tra thẻ QR: quét thử bằng điện thoại → đảm bảo mã đọc được
3. Xỏ thẻ QR vào dây xoắn vòng qua lỗ 4mm **trước khi đeo lên chân gà**

### Bước 3 — Đeo vòng lên chân gà

```
Đúng: Xoắn vòng mở ra → luồn qua cổ chân → thả ra
      (Vòng xoắn tự thu lại quanh cổ chân)

Sai:  Dùng lực kéo căng → có thể làm đứt vòng
Sai:  Đeo lên ngón chân → phải đeo trên cổ chân, dưới khớp gối
```

**Vị trí đúng:** Vòng nằm ở giữa cổ chân — **phía trên cựa và phía dưới khớp gối**. Không đeo quá gần cựa (ảnh hưởng đòn đá) và không đeo quá cao (tuột xuống khớp).

### Bước 4 — Kiểm tra sau khi đeo

1. **Test độ lỏng:** Thò được 1 ngón tay giữa vòng và chân → đúng. Không thò được → quá chật, tháo ra.
2. **Test thẻ:** Thẻ treo tự do, không kẹt vào da, không chặn vào cựa
3. **Test quét:** Dùng điện thoại quét thẻ → mã đọc được → hoàn thành
4. **Ghi chép:** Cập nhật số thứ tự vào hệ thống quản lý ngay lúc này

### Bước 5 — Theo dõi 48 giờ đầu

- Gà sẽ gãi chân và mổ vào vòng trong 1–2 ngày đầu — **bình thường, không cần can thiệp**
- Quan sát nếu thấy: chân sưng đỏ, gà không đứng được → tháo vòng kiểm tra
- Sau 48 giờ gà thích nghi hoàn toàn

---

## 9. Vận Hành Và Bảo Trì

### 9.1 Kiểm tra định kỳ

| Tần suất | Việc cần kiểm tra |
|---|---|
| **Hàng ngày** | Quan sát vòng còn nguyên vẹn không khi cho ăn |
| **Hàng tuần** | Quét QR 10% đàn ngẫu nhiên — đảm bảo mã vẫn đọc được |
| **Hàng tháng** | Kiểm tra độ lỏng vòng — đặc biệt gà đang tăng trưởng nhanh (3–8 tháng) |
| **6 tháng/lần** | Kiểm tra toàn bộ đàn, thay thẻ bị mờ/hỏng |

### 9.2 Xử lý các sự cố thường gặp

**Thẻ QR không quét được:**
- Lau sạch thẻ bằng khăn ẩm
- Thử ánh sáng khác (tránh nắng trực tiếp gây phản chiếu)
- Nếu vẫn không quét → thay thẻ mới cùng số thứ tự

**Vòng bị tuột:**
- Gà Tre nhỏ nhất — vòng 32mm có thể lỏng quá
- Giải pháp: dùng vòng size nhỏ hơn (28mm) cho riêng đàn Gà Tre

**Vòng bị nứt:**
- Thay vòng mới ngay — vòng nứt có cạnh sắc gây xước chân gà
- Giữ thẻ cũ → xỏ vào vòng mới → số ID không thay đổi

**Gà tháo được vòng (hiếm gặp):**
- Thường do vòng quá lỏng hoặc gà học được cách móc
- Chuyển sang vòng có số vòng xoắn nhiều hơn (3 vòng thay vì 2)

### 9.3 Vệ sinh thẻ và vòng

```
Hàng tuần: Dùng khăn ẩm lau nhẹ thẻ QR
Khi tắm gà: Không cần tháo vòng silicon — chống nước tốt
            Tháo thẻ PET nếu tắm gà ngâm nước (phòng thủ)
Khử trùng: Xịt cồn 70% lên vòng khi gà vừa qua khỏi bệnh
```

---

## 10. Nguồn Mua Và Từ Khoá Tìm Kiếm

### 10.1 Mua vòng chân

**Shopee / Lazada (test ban đầu):**
- Từ khoá: `vòng đeo chân chim xoắn nhôm số`
- Từ khoá: `vòng nhựa chim cảnh silicon`
- Lưu ý: Size chim cảnh thường 8–18mm — chỉ dùng để test cơ chế, không đúng size cho gà

**Alibaba.com (đặt số lượng lớn, đúng size):**
- Từ khoá: `silicone poultry leg ring spiral open`
- Từ khoá: `chicken leg band 32mm custom`
- Từ khoá: `spiral open leg band color numbered`
- MOQ thường 500–1000 cái, giá 500–2.000đ/cái
- Yêu cầu cụ thể: **size 32mm, silicon Shore A45, bề rộng 8mm**
- Thời gian giao hàng: 15–25 ngày (tàu biển) hoặc 7–10 ngày (hàng không)

**Xưởng nhựa trong nước (đặt làm riêng):**
- Tìm tại: Hà Nội (làng Định Công, Phố Huế), TP.HCM (Quận 8, Bình Chánh)
- Yêu cầu: in ép khuôn vòng xoắn silicon theo bản vẽ
- MOQ: thường 500–1000 cái
- Thời gian: 2–4 tuần (cần làm khuôn lần đầu)

### 10.2 In thẻ QR

**Xưởng in thẻ PVC/PET (Hà Nội, TP.HCM):**
- Từ khoá tìm: `in thẻ QR PET laminate số thứ tự nhỏ`
- Từ khoá tìm: `in thẻ nhựa chống nước có lỗ đục`
- Báo thông số: 25×35mm, PET 0.3mm, laminate 2 mặt, đục lỗ 4mm, 1000 thẻ số thứ tự 0001–1000, có mã QR riêng từng thẻ
- Giá: 600.000–1.200.000đ / 1000 thẻ
- Thời gian: 3–5 ngày làm việc

**Cách tạo file QR để gửi xưởng in:**
1. Tạo 1000 URL dạng: `https://gachoivietnb.com/ga/0001` → `ga/1000`
2. Dùng tool online (qr-code-generator.com hoặc goqr.me) hoặc thư viện Python `qrcode` để batch generate
3. Xuất ra 1000 file PNG 300DPI, đặt tên `QR-0001.png` → `QR-1000.png`
4. Gửi kèm file thiết kế thẻ (AI/PSD) và folder ảnh QR cho xưởng in

### 10.3 Checklist trước khi đặt hàng chính thức

```
□ Đã test thử 10–20 vòng trên đàn gà thực tế
□ Đã xác nhận size vòng phù hợp với cổ chân gà lớn nhất
□ Đã test quét QR ở kích thước 18×18mm
□ Đã có URL hệ thống quản lý sẵn sàng (gachoivietnb.com/ga/XXXX)
□ Đã thiết kế layout thẻ hoàn chỉnh (mặt trước + mặt sau)
□ Đã chọn màu vòng theo từng dòng gà
□ Đã xác nhận xưởng in có thể đục lỗ 4mm
□ Đã test thẻ laminate có chống nước hay không
```

---

## Phụ Lục: Thông Số Nhanh Cho Claude Code

```json
{
  "ring": {
    "type": "spiral_open_silicon",
    "inner_diameter_mm": 32,
    "outer_diameter_mm": 36,
    "wire_thickness_mm": 3.5,
    "width_mm": 8,
    "material": "silicone_shore_a45",
    "color_system": {
      "noi": "green",
      "asil": "red",
      "malay": "yellow",
      "tre": "white",
      "lai_f1": "blue",
      "reserve": "orange"
    }
  },
  "tag": {
    "width_mm": 25,
    "height_mm": 35,
    "qr_size_mm": 18,
    "hole_diameter_mm": 4,
    "hole_from_top_mm": 4,
    "material": "pet_0.3mm_uv_laminate",
    "qr_version": "2-3",
    "error_correction": "M",
    "id_format": "GCV-{XXXX}",
    "id_range": "0001-1000",
    "url_pattern": "https://gachoivietnb.com/ga/{id}"
  },
  "timing": {
    "noi_asil_weeks": "3-4",
    "malay_weeks": "4-5",
    "tre_weeks": "3",
    "check_at_months": 6
  }
}
```

---

*Tài liệu được biên soạn cho hệ thống quản lý gà chọi tại gachoivietnb.com*
*Phiên bản: 1.0 | Cập nhật: 2025*
