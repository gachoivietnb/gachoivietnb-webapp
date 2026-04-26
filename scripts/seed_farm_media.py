"""
Seed 20 farm_media demo items (all Unsplash URLs pre-verified to return 200).
Idempotent — deletes existing rows first.
Run: python scripts/seed_farm_media.py
"""
import json
import sys
import urllib.request
from pathlib import Path

ENV = Path(__file__).resolve().parent.parent / ".env.local"

def load_env():
    env = {}
    for line in ENV.read_text(encoding="utf-8").splitlines():
        if line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip()
    return env

def unsplash(pid, w=1600):
    return f"https://images.unsplash.com/{pid}?w={w}&auto=format&fit=crop&q=80"

def thumb(pid):
    return f"https://images.unsplash.com/{pid}?w=400&h=400&auto=format&fit=crop&q=70"

ITEMS = [
    # === CHUỒNG TRẠI (5) ===
    {"pid": "photo-1501706362039-c06b2d715385", "category": "chuong_trai",
     "title": "Khu chuồng trại chính",
     "description": "Hệ thống chuồng trại rộng rãi, thoáng mát, đảm bảo điều kiện tối ưu cho đàn gà chọi.",
     "is_featured": True, "display_order": 1},
    {"pid": "photo-1535275226173-7ee8b465f0c1", "category": "chuong_trai",
     "title": "Chuồng cách ly riêng biệt",
     "description": "Khu cách ly cho gà mới nhập trại và gà đang hồi phục sau thi đấu.",
     "is_featured": False, "display_order": 2},
    {"pid": "photo-1556155092-490a1ba16284", "category": "chuong_trai",
     "title": "Sân vườn thả rông",
     "description": "Không gian thả rông hơn 500m² giúp gà vận động tự nhiên, phát triển cơ bắp săn chắc.",
     "is_featured": False, "display_order": 3},
    {"pid": "photo-1471623817296-aa07ae5c9f47", "category": "chuong_trai",
     "title": "Đồng cỏ chăn thả",
     "description": "Đồng cỏ xanh mướt, gà đi lại tự do, hấp thu vitamin D từ nắng sớm tự nhiên.",
     "is_featured": False, "display_order": 4},
    {"pid": "photo-1500595046743-cd271d694d30", "category": "chuong_trai",
     "title": "Toàn cảnh trang trại",
     "description": "Toàn cảnh trang trại Gà Chọi Việt NB tại Hoa Lư, Ninh Bình — xanh mát, yên bình.",
     "is_featured": True, "display_order": 5},

    # === HOẠT ĐỘNG (5) ===
    {"pid": "photo-1613145997970-db84a7975fbb", "category": "hoat_dong",
     "title": "Cho gà ăn buổi sáng",
     "description": "Chế độ ăn khoa học: thóc ngâm, mồi tươi, rau xanh — chia 3 bữa/ngày đều đặn.",
     "is_featured": False, "display_order": 10},
    {"pid": "photo-1548199973-03cce0bbc87b", "category": "hoat_dong",
     "title": "Kỹ thuật om bóp nghệ rượu",
     "description": "Sư kê trại thực hành om bóp cho chiến kê — giúp da dày, săn chắc, chịu đòn tốt.",
     "is_featured": True, "display_order": 11},
    {"pid": "photo-1542838132-92c53300491e", "category": "hoat_dong",
     "title": "Vần hơi buổi chiều",
     "description": "Hai chiến kê vần hơi rèn thể lực dưới sự giám sát của sư kê kinh nghiệm.",
     "is_featured": False, "display_order": 12},
    {"pid": "photo-1589922583749-6b8473a85048", "category": "hoat_dong",
     "title": "Vệ sinh chuồng định kỳ",
     "description": "Phun khử trùng 2 lần/tuần, thay đệm lót mỗi 3 ngày để đảm bảo vệ sinh tối đa.",
     "is_featured": False, "display_order": 13},
    {"pid": "photo-1441122456239-401e92b73c65", "category": "hoat_dong",
     "title": "Khám sức khỏe định kỳ",
     "description": "Bác sĩ thú y kiểm tra sức khỏe đàn gà mỗi tháng, tiêm phòng đầy đủ 8 mũi cơ bản.",
     "is_featured": False, "display_order": 14},

    # === SỰ KIỆN (3) ===
    {"pid": "photo-1630090374791-c9eb7bab3935", "category": "su_kien",
     "title": "Giao lưu sư kê mùa xuân",
     "description": "Sự kiện giao lưu đầu năm 2026 — quy tụ hơn 50 anh em sư kê từ các tỉnh phía Bắc.",
     "is_featured": True, "display_order": 20},
    {"pid": "photo-1618346146499-5a503b5e4893", "category": "su_kien",
     "title": "Hội chợ gà giống Ninh Bình",
     "description": "Gà Chọi Việt NB tham gia triển lãm và trưng bày 15 chiến kê tại hội chợ tỉnh.",
     "is_featured": False, "display_order": 21},
    {"pid": "photo-1644217147354-17d6e38108c6", "category": "su_kien",
     "title": "Kỷ niệm 5 năm thành lập",
     "description": "Cột mốc 5 năm hành trình xây dựng và phát triển thương hiệu Gà Chọi Việt Ninh Bình.",
     "is_featured": False, "display_order": 22},

    # === SẢN PHẨM (5) — rooster portraits đẹp nhất ===
    {"pid": "photo-1548550023-2bdb3c5beed7", "category": "san_pham",
     "title": "Chiến kê Asil dòng điều",
     "description": "Gà Asil 14 tháng, 3.1kg, đã vần 6 buổi — một trong những chiến kê tốp đầu của trại.",
     "is_featured": True, "display_order": 30},
    {"pid": "photo-1554740760-5db7aca3ec66", "category": "san_pham",
     "title": "Gà Mã Lai cao to",
     "description": "Gà Mã Lai thuần chủng 15 tháng, cao 72cm, đòn hiểm, sức bền vô đối.",
     "is_featured": False, "display_order": 31},
    {"pid": "photo-1545251765-6aad90d25972", "category": "san_pham",
     "title": "Peru F1 lai nòi Việt",
     "description": "Con lai F1 giữa Peru thuần và gà nòi Bình Định — kết hợp sức mạnh và sự khéo léo.",
     "is_featured": False, "display_order": 32},
    {"pid": "photo-1605490552919-bb0a239812c1", "category": "san_pham",
     "title": "Gà điều xanh mã đẹp",
     "description": "Chiến kê điều xanh, lông mượt, mắt sáng, đã qua đào tạo bài bản 8 buổi vần.",
     "is_featured": False, "display_order": 33},
    {"pid": "photo-1623662795461-4d282ec436a2", "category": "san_pham",
     "title": "Gà nòi Bình Định",
     "description": "Giống gà nòi truyền thống, đòn tinh tế, tốc độ cao — niềm tự hào của trại.",
     "is_featured": True, "display_order": 34},

    # === KHÁC (2) ===
    {"pid": "photo-1569396327972-6231a5b05ea8", "category": "khac",
     "title": "Đàn gà con trong tuần đầu",
     "description": "Lứa gà con mới nở được chăm sóc đặc biệt trong 7 ngày đầu tại chuồng úm.",
     "is_featured": False, "display_order": 40},
    {"pid": "photo-1588597989061-b60ad0eefdbf", "category": "khac",
     "title": "Gà bố giống tuyển chọn",
     "description": "Gà bố giống đặc tuyển, gen di truyền ổn định qua 3 thế hệ liên tiếp.",
     "is_featured": False, "display_order": 41},
]

def build_rows():
    rows = []
    for it in ITEMS:
        rows.append({
            "media_type": "anh",
            "storage_path": f"demo/{it['category']}/{it['pid']}.jpg",
            "url": unsplash(it["pid"]),
            "thumbnail_url": thumb(it["pid"]),
            "category": it["category"],
            "title": it["title"],
            "description": it["description"],
            "is_featured": it["is_featured"],
            "display_order": it["display_order"],
        })
    return rows

def post_to_supabase(rows, url, service_key):
    endpoint = url.rstrip("/") + "/rest/v1/farm_media"
    req = urllib.request.Request(
        endpoint + "?id=neq.00000000-0000-0000-0000-000000000000",
        method="DELETE",
        headers={
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Prefer": "return=minimal",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            print(f"[delete existing] status={r.status}")
    except Exception as e:
        print(f"[delete existing] warn: {e}")

    data = json.dumps(rows, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        endpoint,
        data=data,
        method="POST",
        headers={
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            body = r.read().decode("utf-8")
            arr = json.loads(body)
            print(f"[insert] status={r.status} -> {len(arr)} items")
            counts = {}
            for a in arr:
                counts[a["category"]] = counts.get(a["category"], 0) + 1
            for k, v in sorted(counts.items()):
                print(f"  [{k}]  {v}")
    except urllib.error.HTTPError as e:
        print(f"[insert] HTTP {e.code}: {e.read().decode('utf-8')}")
        sys.exit(1)

if __name__ == "__main__":
    env = load_env()
    url = env.get("NEXT_PUBLIC_SUPABASE_URL")
    key = env.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print("Missing SUPABASE_URL or SERVICE_ROLE_KEY in .env.local")
        sys.exit(1)

    rows = build_rows()
    print(f"Prepared {len(rows)} farm_media items across 5 categories.")
    post_to_supabase(rows, url, key)
    print("\nVisit http://localhost:3000/thu-vien")
