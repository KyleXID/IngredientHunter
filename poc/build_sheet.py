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

# 맛(flavor) — clean_name에서 "첫 맛 토큰부터" 잘라 상품 라인명만 남긴다.
# 콜라/사이다/제로는 브랜드·라인 식별어라 맛에서 제외.
FLAVORS = ["초코바나나","초콜릿","초코","딸기","바나나","멜론","카라멜","밀크티","밀크바닐라","바닐라","모카",
    "고소한","오리지널","오리지날","플레인","흑임자","미숫가루","곡물","검은콩","아몬드","귀리","밤","쌀",
    "피스타치오","라떼","카페라떼","콜드브루","커피",
    "그레이프","청포도","포도","샤인머스켓","샤인머스캣","머스켓","레몬","라임","복숭아","청사과","사과","애플",
    "자몽","오렌지","파인애플","유자","피치","자두","매실","홍차","아이스티","얼그레이","우롱","녹차"]
FSET = set(FLAVORS)
CATEGORY_TAIL = {"음료","탄산음료","이온음료","혼합음료","프로틴음료","단백질음료","마시는","헬스음료","단백질"}

# 브랜드 보정(제품라인→실제 브랜드). 필요시 계속 추가.
BRAND_ALIAS = {"더단백":"빙그레","하이뮨":"일동후디스","셀렉스":"매일","프로핏":"매일",
    "테이크핏":"테이크핏","연세두유":"연세","보성홍차":"동원","갈배사이다":"해태htb"}

BUNDLE = re.compile(r"(기획|세트|모음|혼합|믹스|묶음|박스|버라이어티|\d+\s*종|\d+\s*가지|종\s*(모음|세트|기획)|\+)")
VOL = re.compile(r"(\d+(?:\.\d+)?)\s*(ml|mL|ML|L|g|kg)\b")
CNT = re.compile(r"(\d+)\s*개")

def _base(tok):
    t = tok.strip("()[]{}·,./-+ ")
    t = re.sub(r"\d+$", "", t)                     # 초코6 → 초코
    for suf in ("맛", "향"):
        if t.endswith(suf) and len(t) > 1: t = t[:-len(suf)]   # 그레이프맛→그레이프, 라임향→라임
    return t

def _is_flavor_tok(tok):
    t = tok.strip("()[]{}·,./-+ ")
    return _base(tok) in FSET or (t.endswith("맛") and len(t) > 1)

def clean_name(name):
    s = re.sub(r"\[[^\]]*\]", " ", name)           # [태그]
    s = s.split(",")[0]                             # 포장 꼬리 절단
    s = re.sub(r"\([^)]*\)", " ", s)                # 닫힌 괄호(맛 나열·원산지)
    s = re.sub(r"\([^)]*$", " ", s)                 # 안 닫힌 괄호 이후 전부
    s = re.sub(r"\d+(?:\.\d+)?\s*(?:ml|mL|ML|L|g|kg)\b", " ", s)      # 용량
    s = re.sub(r"\d+\s*(?:개입|개|팩|캔|박스|세트|종|포|입|p|P)\b", " ", s)  # 수량·단위
    s = re.sub(r"\d+\s*가지\s*맛?", " ", s)         # 6가지맛
    s = re.sub(r"(네이버단독|정기구독|정기배송|본사직영|무료배송|단독|한정|기획|모음|혼합|믹스|묶음|증정|총|세트|무라벨|업소용|배달용|각|씩)", " ", s)
    toks = [t for t in s.split() if t]
    cut = next((i for i, t in enumerate(toks) if i >= 1 and _is_flavor_tok(t)), None)
    if cut is not None: toks = toks[:cut]           # 첫 맛 토큰부터 절단 → 라인명만
    while toks and _base(toks[-1]) in CATEGORY_TAIL: toks.pop()   # 끝쪽 카테고리 서술어 제거
    return re.sub(r"\s+", " ", " ".join(toks)).strip()

def line_key(cname):
    return re.sub(r"\s+", "", cname).lower()

def flavors_in(name):
    out = []
    for tok in re.split(r"[\s,]+", name):
        b = _base(tok)
        if b in FSET and b not in out: out.append(b)
    return out

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
