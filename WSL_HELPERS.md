# WSL + Docker + Supabase — Cheat sheet

## Vào Ubuntu
```bash
# Từ bất cứ terminal Windows nào:
wsl                                 # default distro (Ubuntu)
# hoặc
wsl -d Ubuntu                       # explicit

# Vào thư mục project (cùng folder Windows nhưng Linux path):
cd /mnt/e/GaChoiVietNB/WebApp
```

## Quản lý Docker (trong Ubuntu)
```bash
docker ps                            # list containers đang chạy
docker ps -a                         # tất cả (kể cả đã stop)
docker logs -f <container-name>      # stream log
docker stats                         # realtime CPU/RAM
docker system prune -f               # xoá container + image cũ không dùng
sudo systemctl restart docker        # nếu daemon gặp vấn đề
```

## Supabase local stack (trong project folder)
```bash
# Lần đầu:
supabase init                        # tạo supabase/ folder
supabase start                       # khởi động Postgres+GoTrue+PostgREST+Storage+Studio (~30-60s)

# Hàng ngày:
supabase status                      # xem URL + keys
supabase stop                        # tắt stack khi không dùng
supabase start                       # bật lại

# Khi thay đổi schema:
supabase db reset                    # reset DB và apply tất cả migrations
supabase migration new <name>        # tạo migration mới (trống)
supabase db push                     # (giai đoạn 2) push lên cloud

# Generate TS types:
supabase gen types typescript --local > src/types/database.ts
```

## URLs sau khi `supabase start`
| URL | Gì |
|---|---|
| http://localhost:54321 | API endpoint (dùng trong .env.local NEXT_PUBLIC_SUPABASE_URL) |
| http://localhost:54322 | Postgres (DB direct) |
| http://localhost:54323 | **Supabase Studio** (GUI) |
| http://localhost:54324 | Inbucket (test email) |

## Next.js app
```bash
# Ở Windows PowerShell/CMD hoặc WSL đều được:
cd E:\GaChoiVietNB\WebApp        # Windows
# hoặc
cd /mnt/e/GaChoiVietNB/WebApp    # WSL

npm run dev                       # → localhost:3000
```

## Tắt WSL hoàn toàn khi không dùng (tiết kiệm RAM)
```bash
# Từ Windows PowerShell:
wsl --shutdown
```

## Restart Docker daemon
```bash
sudo systemctl restart docker
# hoặc nếu systemctl lỗi:
sudo service docker restart
```

## Thông tin user Ubuntu mặc định
- Username: `phu`
- Password: `changeme` (đổi bằng `passwd` nếu cần — không bắt buộc vì có passwordless sudo)
- Home: `/home/phu/`
- Passwordless sudo: ✓ (dùng `sudo` không cần nhập password)
