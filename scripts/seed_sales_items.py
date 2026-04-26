"""
Backfill sales_items for existing sales_orders (seed gap).
Distributes each order's total_amount across 1-3 chickens.
Run: python scripts/seed_sales_items.py
"""
import json
import random
import sys
import urllib.request
import urllib.error
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
        with urllib.request.urlopen(r, timeout=10) as resp:
            body = resp.read().decode("utf-8")
            return json.loads(body) if body else None
    except urllib.error.HTTPError as e:
        print(f"[{method}] HTTP {e.code}: {e.read().decode('utf-8')[:200]}")
        return None

def main():
    env = load_env()
    base = env["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/") + "/rest/v1"
    key = env["SUPABASE_SERVICE_ROLE_KEY"]

    # Clear existing items
    req(base + "/sales_items", key, "DELETE", params="id=neq.00000000-0000-0000-0000-000000000000")

    orders = req(base + "/sales_orders", key, "GET",
                 params="select=id,order_code,total_amount&order=order_date.desc") or []
    chickens = req(base + "/chickens", key, "GET",
                   params="select=id&limit=100") or []
    if not orders or not chickens:
        print(f"Need orders (have {len(orders)}) and chickens (have {len(chickens)})")
        sys.exit(1)

    random.seed(42)
    items_payload = []
    used_ids = set()

    for o in orders:
        total = float(o["total_amount"])
        # Pick 1-3 items; price distribution roughly splits total
        n_items = random.choice([1, 1, 2, 2, 3])
        available = [c for c in chickens if c["id"] not in used_ids]
        if len(available) < n_items:
            available = chickens  # allow reuse if running out
        picks = random.sample(available, min(n_items, len(available)))

        # Distribute prices — first item gets ~55%, rest share remainder
        if n_items == 1:
            prices = [total]
        elif n_items == 2:
            prices = [round(total * 0.55, -4), round(total * 0.45, -4)]
            diff = total - sum(prices)
            prices[0] += diff
        else:
            prices = [round(total * 0.45, -4), round(total * 0.30, -4), round(total * 0.25, -4)]
            diff = total - sum(prices)
            prices[0] += diff

        for c, price in zip(picks, prices):
            items_payload.append({
                "sales_order_id": o["id"],
                "chicken_id": c["id"],
                "unit_price": int(price),
            })
            used_ids.add(c["id"])

        try:
            print(f"  {o['order_code']}: {len(picks)} items, total {int(total):,}")
        except UnicodeEncodeError:
            pass

    inserted = req(base + "/sales_items", key, "POST", body=items_payload)
    print(f"\nInserted {len(inserted or [])} sales_items across {len(orders)} orders.")

if __name__ == "__main__":
    main()
