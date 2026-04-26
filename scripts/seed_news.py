"""
Parse 6 news articles from supabase/seed_demo.sql and POST them to Supabase REST API.
Run: python scripts/seed_news.py
"""
import json
import re
import sys
import urllib.request
from pathlib import Path

SEED = Path(__file__).resolve().parent.parent / "supabase" / "seed_demo.sql"
ENV = Path(__file__).resolve().parent.parent / ".env.local"

def load_env():
    env = {}
    for line in ENV.read_text(encoding="utf-8").splitlines():
        if line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip()
    return env

def extract_news_block(sql):
    start = sql.index("-- NEWS ARTICLES")
    end = sql.index("-- DONE — verify counts")
    return sql[start:end]

def parse_tuples(block):
    # Split on $md$ — every even chunk (0,2,4...) is metadata, odd is body
    chunks = block.split("$md$")
    # chunks[0] = INSERT header + "  (" + 4 fields before body of article 1
    # chunks[1] = body of article 1
    # chunks[2] = rest-of-tuple-1 + comma + "  (" + fields-before-body of article 2
    # ...
    # chunks[12] = last bit after article 6 body, up through "  );"

    articles = []
    for i in range(6):
        body = chunks[1 + i * 2]
        # The tuple's other fields live in chunks[2*i] (pre-body) and chunks[2*i+2] (post-body)
        pre = chunks[2 * i]
        post = chunks[2 * i + 2] if (2 * i + 2) < len(chunks) else ""

        # Pre-body section: last "  (\n    'slug',\n    'title',\n    'excerpt',\n    "
        # Extract 3 leading string literals (slug, title, excerpt)
        pre_tail = pre.rsplit("  (\n", 1)[-1]
        m_pre = re.findall(r"'((?:[^'\\]|\\.|'')*)'", pre_tail)
        slug, title, excerpt = m_pre[0], m_pre[1], m_pre[2]

        # Post-body section:
        # ,\n    'cover',\n    'category',\n    'published',\n    ARRAY[...],
        # \n    'seo_title',\n    'seo_desc',\n    'source_url',\n    'source_name',
        # \n    NOW() - INTERVAL 'N days',\n    NNN\n  ),
        # The string literals we want (in order): cover, category, status, seo_title, seo_desc, source_url, source_name
        # Between category and seo_title is ARRAY[...] which also has quoted strings → grab tags separately
        m_post_strs = re.findall(r"'((?:[^'\\]|\\.|'')*)'", post)
        # Skip the 'days' literal inside INTERVAL
        # Expected order: cover, category, status, tag1, tag2, ..., seo_title, seo_desc, source_url, source_name, "N days"
        # Extract ARRAY
        m_array = re.search(r"ARRAY\[(.*?)\]", post)
        tags = [t.strip().strip("'") for t in m_array.group(1).split(",")] if m_array else []
        n_tags = len(tags)

        cover = m_post_strs[0]
        category = m_post_strs[1]
        status = m_post_strs[2]
        # next n_tags entries are tags (already got)
        after_tags_idx = 3 + n_tags
        seo_title = m_post_strs[after_tags_idx]
        seo_description = m_post_strs[after_tags_idx + 1]
        source_url = m_post_strs[after_tags_idx + 2]
        source_name = m_post_strs[after_tags_idx + 3]
        # interval literal = m_post_strs[after_tags_idx + 4]  e.g. "1 days"
        interval_lit = m_post_strs[after_tags_idx + 4]
        days_match = re.match(r"(\d+)\s+days?", interval_lit)
        days_ago = int(days_match.group(1)) if days_match else 0

        # view_count: grab integer just before "  )," (or "  );")
        m_views = re.search(r"(\d+)\s*\n\s*\)[,;]", post)
        view_count = int(m_views.group(1)) if m_views else 0

        import datetime
        pub_dt = (datetime.datetime.utcnow() - datetime.timedelta(days=days_ago)).isoformat() + "Z"

        articles.append({
            "slug": slug,
            "title": title,
            "excerpt": excerpt,
            "body_markdown": body,
            "cover_image_url": cover,
            "category": category,
            "status": status,
            "tags": tags,
            "seo_title": seo_title,
            "seo_description": seo_description,
            "source_url": source_url,
            "source_name": source_name,
            "published_at": pub_dt,
            "view_count": view_count,
        })
    return articles

def post_to_supabase(articles, url, service_key):
    endpoint = url.rstrip("/") + "/rest/v1/news_articles"
    # First, delete any existing rows to make this idempotent
    req = urllib.request.Request(
        endpoint + "?slug=neq.__never__",
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

    # Bulk insert
    data = json.dumps(articles, ensure_ascii=False).encode("utf-8")
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
            print(f"[insert] status={r.status}")
            arr = json.loads(body)
            for a in arr:
                print(f"  ✓ {a['slug']}  (id={a['id'][:8]})")
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

    sql = SEED.read_text(encoding="utf-8")
    block = extract_news_block(sql)
    articles = parse_tuples(block)
    print(f"Parsed {len(articles)} articles from seed_demo.sql:")
    for a in articles:
        print(f"  - {a['slug']}  ({a['category']}, {len(a['body_markdown'])} chars, {len(a['tags'])} tags)")

    post_to_supabase(articles, url, key)
    print("\nDone. Visit http://localhost:3000/tin-tuc")
