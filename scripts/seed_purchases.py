"""
Seed demo purchase orders + suppliers so the Báo cáo Mua Vào has data to display.
Run: python scripts/seed_purchases.py
"""
import json
import sys
import urllib.request
import urllib.error
import uuid
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

def req(url, service_key, method="GET", body=None, params=""):
    if params:
        url = url + "?" + params
    data = json.dumps(body, ensure_ascii=False).encode("utf-8") if body is not None else None
    r = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        },
    )
    try:
        with urllib.request.urlopen(r, timeout=10) as resp:
            body = resp.read().decode("utf-8")
            return json.loads(body) if body else None
    except urllib.error.HTTPError as e:
        print(f"[{method}] {url}: HTTP {e.code}: {e.read().decode('utf-8')[:200]}")
        return None

def main():
    env = load_env()
    base = env["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/") + "/rest/v1"
    key = env["SUPABASE_SERVICE_ROLE_KEY"]

    # 1. Clean existing demo purchases
    req(base + "/purchase_items", key, "DELETE", params="purchase_id=not.is.null")
    req(base + "/purchases", key, "DELETE", params="id=neq.00000000-0000-0000-0000-000000000000")
    req(base + "/suppliers", key, "DELETE", params="id=neq.00000000-0000-0000-0000-000000000000")

    # 2. Create 2 suppliers
    suppliers_data = [
        {"name": "Trại gà Hoàng Long", "phone": "0912345601", "address": "Bắc Ninh", "notes": "NCC Asil thuần"},
        {"name": "Anh Tuấn - Ninh Bình", "phone": "0912345602", "address": "Hoa Lư, Ninh Bình", "notes": "NCC Tre nòi"},
    ]
    created_suppliers = req(base + "/suppliers", key, "POST", body=suppliers_data) or []
    if not created_suppliers:
        print("Failed to create suppliers")
        sys.exit(1)
    print(f"Created {len(created_suppliers)} suppliers")

    # 3. Fetch existing chickens (id + chicken_code)
    chickens = req(base + "/chickens", key, "GET", params="select=id,chicken_code&limit=30") or []
    if len(chickens) < 10:
        print(f"Need ≥ 10 chickens for demo; found {len(chickens)}")
        sys.exit(1)
    print(f"Using {len(chickens)} existing chickens")

    # 4. Create 5 purchase orders with items
    today = date.today()
    purchase_specs = [
        # (days_ago, supplier_idx, chicken_idxs, prices_per_item)
        (3, 0, [0, 1, 2], [4_000_000, 4_500_000, 3_800_000]),
        (12, 1, [3, 4], [5_200_000, 4_800_000]),
        (25, 0, [5, 6, 7, 8], [3_500_000, 3_700_000, 4_100_000, 3_900_000]),
        (48, 1, [9, 10], [6_200_000, 5_800_000]),
        (72, 0, [11, 12, 13], [4_400_000, 4_600_000, 4_200_000]),
    ]

    for i, (days_ago, sup_idx, c_idxs, prices) in enumerate(purchase_specs, start=1):
        if sup_idx >= len(created_suppliers) or max(c_idxs) >= len(chickens):
            continue
        supplier = created_suppliers[sup_idx]
        items_chickens = [chickens[idx] for idx in c_idxs]
        p_date = (today - timedelta(days=days_ago)).isoformat()
        p_code = f"PN-{p_date.replace('-', '')}-{i:03d}"
        total_qty = len(items_chickens)
        total_amount = sum(prices)

        purchase = req(base + "/purchases", key, "POST", body={
            "purchase_code": p_code,
            "supplier_id": supplier["id"],
            "purchase_date": p_date,
            "total_quantity": total_qty,
            "total_amount": total_amount,
            "notes": f"Demo phiếu #{i} từ {supplier['name']}",
        })
        if not purchase:
            continue
        pid = purchase[0]["id"]

        items = [
            {"purchase_id": pid, "chicken_id": c["id"], "unit_price": price}
            for c, price in zip(items_chickens, prices)
        ]
        req(base + "/purchase_items", key, "POST", body=items)
        try:
            print(f"  #{i} [{p_date}] {p_code} - {total_qty} chickens - {total_amount:,} VND")
        except UnicodeEncodeError:
            pass

    print("\nDone. Visit /admin/mua-vao or /admin/mua-vao/bao-cao")

if __name__ == "__main__":
    main()
