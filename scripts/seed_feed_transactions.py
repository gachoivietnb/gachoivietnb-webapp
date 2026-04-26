"""
Seed realistic 90-day feed_transactions demo data.
The DB trigger update_feed_stock() auto-adjusts feeds.current_stock on INSERT,
so we just reset stock to 0 and replay events in chronological order.

Run: python scripts/seed_feed_transactions.py
"""
import json
import random
import sys
import urllib.request
import urllib.error
from datetime import date, timedelta
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

def req(url, key, method="GET", body=None, params=""):
    if params:
        url = url + "?" + params
    data = json.dumps(body, ensure_ascii=False).encode("utf-8") if body is not None else None
    r = urllib.request.Request(
        url, data=data, method=method,
        headers={
            "apikey": key, "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        },
    )
    try:
        with urllib.request.urlopen(r, timeout=15) as resp:
            body = resp.read().decode("utf-8")
            return json.loads(body) if body else None
    except urllib.error.HTTPError as e:
        try:
            print(f"[{method}] HTTP {e.code}: {e.read().decode('utf-8')[:200]}")
        except Exception:
            pass
        return None

def safe_print(msg):
    try:
        print(msg)
    except UnicodeEncodeError:
        print(msg.encode('ascii', 'replace').decode('ascii'))

def main():
    env = load_env()
    base = env["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/") + "/rest/v1"
    key = env["SUPABASE_SERVICE_ROLE_KEY"]

    # 1. Fetch all feeds
    feeds = req(base + "/feeds", key, params="select=id,code,name_vi,unit,cost_per_unit&is_active=eq.true&order=code") or []
    if not feeds:
        print("No feeds found"); sys.exit(1)
    safe_print(f"Found {len(feeds)} feeds")

    feed_by_code = {f["code"]: f for f in feeds}

    # 2. Bump stock high to allow trigger to subtract without going negative
    for f in feeds:
        req(base + "/feeds", key, "PATCH",
            body={"current_stock": 999999},
            params=f"id=eq.{f['id']}")

    # 3. Delete existing transactions (trigger reverses stock; safe with high buffer)
    req(base + "/feed_transactions", key, "DELETE", params="id=neq.00000000-0000-0000-0000-000000000000")

    # 4. Reset current_stock to 0 — clean slate
    for f in feeds:
        req(base + "/feeds", key, "PATCH",
            body={"current_stock": 0},
            params=f"id=eq.{f['id']}")

    # 4. Build a chronological list of transactions (trigger updates stock as we INSERT)
    # Profile per feed: (intake_qty_per_batch, intake_freq_days, daily_use_qty, daily_use_freq_days)
    profiles = {
        "FEED-001": {  # Cám viên GT-10 — dùng chính
            "first_intake": 800,
            "intake_qty": 500,
            "intake_every": 18,
            "daily_use_min": 12,
            "daily_use_max": 18,
            "use_every": 1,
        },
        "FEED-002": {  # Lúa ngô xay
            "first_intake": 500,
            "intake_qty": 300,
            "intake_every": 22,
            "daily_use_min": 8,
            "daily_use_max": 12,
            "use_every": 1,
        },
        "FEED-003": {  # Cám con GT-01 — dùng ít, gà con
            "first_intake": 200,
            "intake_qty": 120,
            "intake_every": 25,
            "daily_use_min": 1.5,
            "daily_use_max": 3,
            "use_every": 1,
        },
        "FEED-004": {  # Thóc lứt
            "first_intake": 400,
            "intake_qty": 250,
            "intake_every": 20,
            "daily_use_min": 6,
            "daily_use_max": 10,
            "use_every": 1,
        },
        "FEED-005": {  # Rau xanh — nhanh hỏng, mua nhiều lần
            "first_intake": 60,
            "intake_qty": 50,
            "intake_every": 5,
            "daily_use_min": 4,
            "daily_use_max": 8,
            "use_every": 2,
        },
    }

    suppliers = ["NCC Phú Lộc", "Đại lý Tân An", "Cám An Khánh", "Chợ đầu mối"]
    areas = ["Khu A", "Khu B", "Khu C", "Khu D"]

    today = date.today()
    start = today - timedelta(days=90)

    txs = []  # list of dicts to insert
    random.seed(99)

    for code, prof in profiles.items():
        if code not in feed_by_code:
            continue
        feed = feed_by_code[code]
        unit_cost = float(feed["cost_per_unit"] or 15000)
        sim_stock = 0.0  # client-side simulation to avoid going negative

        # Build all events for this feed and sort chronologically
        events = []
        # Nhập events
        intake_day = 0
        first = True
        while intake_day <= 90:
            qty = (prof["first_intake"] if first else prof["intake_qty"]) * random.uniform(0.92, 1.08)
            first = False
            events.append((intake_day, 0, "nhap", round(qty, 1)))
            intake_day += prof["intake_every"]
        # Xuất events
        use_day = 1
        while use_day <= 90:
            qty = random.uniform(prof["daily_use_min"], prof["daily_use_max"])
            events.append((use_day, 1, "xuat", round(qty, 1)))
            use_day += prof["use_every"]

        events.sort(key=lambda e: (e[0], e[1]))

        for day, prio, ttype, qty in events:
            d = start + timedelta(days=day)
            if ttype == "nhap":
                sim_stock += qty
                buy_cost = float(feed["cost_per_unit"] or 15000) * random.uniform(0.95, 1.05)
                txs.append({
                    "feed_id": feed["id"],
                    "transaction_type": "nhap",
                    "quantity": qty,
                    "transaction_date": d.isoformat(),
                    "cost": round(qty * buy_cost),
                    "notes": f"Nhập từ {random.choice(suppliers)}",
                    "_sort_day": day,
                    "_sort_priority": 0,
                })
            else:  # xuat
                # Skip if not enough stock (avoids check constraint violation)
                if sim_stock - qty < 0:
                    continue
                sim_stock -= qty
                txs.append({
                    "feed_id": feed["id"],
                    "transaction_type": "xuat",
                    "quantity": qty,
                    "transaction_date": d.isoformat(),
                    "cost": round(qty * unit_cost),
                    "notes": f"Cho ăn {random.choice(areas)}",
                    "_sort_day": day,
                    "_sort_priority": 1,
                })

    # Sort chronologically (so trigger applies in correct order)
    txs.sort(key=lambda t: (t["_sort_day"], t["_sort_priority"]))

    # Strip helper keys
    for t in txs:
        del t["_sort_day"]
        del t["_sort_priority"]

    safe_print(f"Inserting {len(txs)} transactions...")

    # Bulk insert in batches of 50 (PostgREST handles large arrays but trigger fires per row)
    inserted = 0
    BATCH = 50
    for i in range(0, len(txs), BATCH):
        batch = txs[i : i + BATCH]
        result = req(base + "/feed_transactions", key, "POST", body=batch)
        if result is None:
            safe_print(f"  Batch {i // BATCH + 1} FAILED")
            break
        inserted += len(result)
        safe_print(f"  Batch {i // BATCH + 1}: +{len(result)}")

    safe_print(f"\nDone. Inserted {inserted}/{len(txs)} transactions.")

    # Verify final stock per feed
    safe_print("\nFinal stock per feed:")
    feeds_after = req(base + "/feeds", key, params="select=code,name_vi,unit,current_stock&is_active=eq.true&order=code") or []
    for f in feeds_after:
        safe_print(f"  {f['code']:12} {f['name_vi'][:25]:25} = {f['current_stock']} {f['unit']}")

if __name__ == "__main__":
    main()
