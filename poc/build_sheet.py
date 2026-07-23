#!/usr/bin/env python3
"""쿠팡 검색 덤프를 카테고리별 시트(CSV)로 만든다 — 단백질/제로 각각 별도 시트.
  · 입력: poc/coupang_protein*.json, poc/coupang_zero*.json (Playwright 덤프, 여러 페이지 가능)
  · 처리: product_id 중복제거 → 이름 정규화(팩·수량·기획 토큰 제거) → 번들/변형 플래그
  · 출력: poc/coupang_protein.csv, poc/coupang_zero.csv
원재료/영양 컬럼은 Phase2(enrich_mfds.py)에서 채운다.
"""
import json, re, csv, os, glob, unicodedata

ROOT = "/Users/ihyeongju/Develop/Private/IngredientHunter"
POC = os.path.join(ROOT, "poc")

# 맛(flavor) — line_key 산출 시 제거. 카테고리어(제로/콜라/사이다)는 라인 식별에 필요하므로 제외.
FLAVORS = ["초코바나나","초콜릿","초코","딸기","바나나","멜론","카라멜","밀크티","밀크바닐라","바닐라",
    "모카","고소한맛","고소한","오리지널","오리지날","플레인","샤인머스켓","샤인머스캣","머스켓","그레이프",
    "포도","레몬","복숭아","청사과","사과","자몽","오렌지","파인애플","라임향","라임","유자","피치","커피"]

# 브랜드 보정(제품라인→실제 브랜드). 필요시 계속 추가.
BRAND_ALIAS = {"더단백":"빙그레","하이뮨":"일동후디스","셀렉스":"매일","프로핏":"매일",
    "테이크핏":"테이크핏","연세두유":"연세","보성홍차":"동원","갈배사이다":"해태htb"}

BUNDLE = re.compile(r"(기획|세트|모음|혼합|믹스|묶음|박스|\d+\s*종|종\s*(모음|세트|기획)|\+)")
VOL = re.compile(r"(\d+(?:\.\d+)?)\s*(ml|mL|ML|L|g|kg)\b")
CNT = re.compile(r"(\d+)\s*개")

def clean_name(name):
    s = re.sub(r"\[[^\]]*\]", " ", name)          # [태그] 제거
    s = s.split(",")[0]                            # 포장 꼬리(", 250ml, 18개") 절단
    s = re.sub(r"\([^)]*\)", " ", s)               # (덴마크산)·(맛 나열) 제거
    s = re.sub(r"\d+(?:\.\d+)?\s*(?:ml|mL|ML|L|g|kg)\b", " ", s)      # 용량
    s = re.sub(r"\d+\s*(?:개입|개|팩|캔|박스|세트|종|p|P)\b", " ", s)  # 수량·단위
    s = re.sub(r"(기획|모음|혼합|믹스|묶음|증정|총|세트|무라벨|업소용|배달용)", " ", s)
    return re.sub(r"\s+", " ", s).strip()

def line_key(cname):
    s = cname
    for f in FLAVORS:
        s = s.replace(f, " ")
    return re.sub(r"\s+", " ", s).strip()

def flavors_in(name):
    hits = [f for f in FLAVORS if f in name]
    # 상위 매칭 우선(초코바나나가 초코보다 먼저)
    dedup = []
    for f in hits:
        if not any(f in d and f != d for d in dedup):
            dedup.append(f)
    return dedup

def load(pattern):
    rows = []
    for p in sorted(glob.glob(os.path.join(POC, pattern))):
        rows += json.load(open(p, encoding="utf-8"))
    return rows

def build(category, pattern, out_name):
    raw = load(pattern)
    merged = {}
    for r in raw:
        if r["id"] in merged:
            continue
        cname = clean_name(r["name"])
        brand_tok = cname.split()[0] if cname else ""
        brand = BRAND_ALIAS.get(brand_tok, brand_tok)
        fl = flavors_in(r["name"])
        is_bundle = bool(BUNDLE.search(r["name"])) or len(fl) >= 3
        vol = VOL.search(r["name"]); cnt = CNT.search(r["name"])
        merged[r["id"]] = {
            "product_id": r["id"],
            "brand": brand,
            "clean_name": cname,
            "full_name": r["name"],
            "flavor": "여러맛" if is_bundle else (fl[0] if fl else ""),
            "volume": (vol.group(1) + vol.group(2).lower()) if vol else "",
            "pack_count": cnt.group(1) if cnt else "",
            "price": r["price"],
            "is_bundle": "Y" if is_bundle else "",
            "product_line": line_key(cname),
            "coupang_url": r["url"],
            "ingredients_json": "",
            "nutrition_json": "",
            "source": "coupang_search",
        }
    items = list(merged.values())
    # 변형 중복 그룹 크기(같은 product_line 몇 개인지)
    from collections import Counter
    gc = Counter(i["product_line"] for i in items)
    for i in items:
        i["dup_group_size"] = gc[i["product_line"]]

    cols = ["product_id","brand","clean_name","flavor","volume","pack_count","price",
            "is_bundle","product_line","dup_group_size","full_name","coupang_url",
            "ingredients_json","nutrition_json","source"]
    out = os.path.join(POC, out_name)
    with open(out, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=cols); w.writeheader(); w.writerows(items)

    bundles = sum(1 for i in items if i["is_bundle"])
    dupgroups = sum(1 for k, v in gc.items() if v > 1)
    print(f"[{category}] {len(raw)}행 → 중복제거 {len(items)}개 · 번들 {bundles}개 · 변형그룹 {dupgroups}개 → {out_name}")
    return items, gc

if __name__ == "__main__":
    p_items, p_gc = build("단백질", "coupang_protein*.json", "coupang_protein.csv")
    z_items, z_gc = build("제로",   "coupang_zero*.json",    "coupang_zero.csv")
    # 변형 그룹 예시(단백질에서 가장 큰 그룹)
    print("\n--- 변형/번들 중복 예시 (단백질 · 같은 product_line) ---")
    big = max(p_gc, key=p_gc.get)
    for i in p_items:
        if i["product_line"] == big:
            tag = "[번들]" if i["is_bundle"] else "      "
            print(f"  {tag} {i['brand']} | {i['clean_name']} | {i['flavor']}")
