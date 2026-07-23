#!/usr/bin/env python3
"""네이버 쇼핑 검색 오픈API로 카테고리별 '유니크 top-100' 제품 리스트를 만든다.
  · 넉넉히 수집(최대 MAXRAW) → 정규화(build_sheet 재사용) → 비음료·번들 제외
    → (라인+맛) 기준 중복 병합 → 관련도 상위 100개로 압축
출력: poc/naver_protein.csv, poc/naver_zero.csv  (원재료/영양은 enrich_mfds.py)
실행: python3 poc/naver_list.py   (.env의 NAVER_ID/NAVER_SECRET 자동 로드)
"""
import os, sys, re, csv, json, html, time, urllib.parse, urllib.request
from collections import Counter, OrderedDict
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_sheet import clean_name, line_key, flavors_in, BUNDLE, VOL, CNT, BRAND_ALIAS

ROOT = "/Users/ihyeongju/Develop/Private/IngredientHunter"
POC = os.path.join(ROOT, "poc")
QUERIES = [("protein", "단백질음료", "naver_protein.csv"),
           ("zero",    "제로음료",   "naver_zero.csv")]
TARGET = 100          # 최종 유니크 개수
MAXRAW = 400          # 중복/비음료 제거 대비 넉넉히 수집

DRINK_HINT = re.compile(r"(음료|드링크|워터|라떼|밀크|탄산|콜라|사이다|스파클링|에이드|아이스티|홍차|스무디|쉐이크|마시는|우유|두유|이온)")

# 카테고리 확정어(이게 없으면 해당 카테고리 제품이 아님) + 잡탕/유통 잡음어(있으면 제외)
REQUIRE = {"protein": re.compile(r"단백질|프로틴|protein", re.I),
           "zero":    re.compile(r"제로|zero|무설탕|무가당|다이어트|라이트", re.I)}
JUNK = re.compile(r"골라\s*담기|낱개|벌크|도매|사은품|음료수|캔음료|미니\s*캔|대용량|업소|편의점|뚱캔|담아|맛선택|맛골라")

def creds():
    cid = os.environ.get("NAVER_ID", ""); sec = os.environ.get("NAVER_SECRET", "")
    if cid and sec: return cid, sec
    envp = os.path.join(ROOT, ".env")
    if os.path.exists(envp):
        kv = dict(l.strip().split("=", 1) for l in open(envp, encoding="utf-8") if "=" in l and not l.startswith("#"))
        return kv.get("NAVER_ID", ""), kv.get("NAVER_SECRET", "")
    return "", ""

CID, CSEC = creds()

def search(query, maxraw=MAXRAW):
    out, start = OrderedDict(), 1
    while len(out) < maxraw and start <= 1000:
        url = "https://openapi.naver.com/v1/search/shop.json?" + urllib.parse.urlencode(
            {"query": query, "display": 100, "start": start, "sort": "sim"})
        req = urllib.request.Request(url, headers={"X-Naver-Client-Id": CID, "X-Naver-Client-Secret": CSEC})
        with urllib.request.urlopen(req, timeout=15) as r:
            items = json.loads(r.read().decode()).get("items", [])
        if not items: break
        for it in items:
            pid = it.get("productId") or it.get("link")
            out.setdefault(pid, it)
        start += 100
        time.sleep(0.2)
    return list(out.values())

def normalize(it):
    title = html.unescape(re.sub(r"</?b>", "", it.get("title", ""))).strip()
    cname = clean_name(title)
    brand = it.get("brand") or it.get("maker") or (cname.split()[0] if cname else "")
    brand = BRAND_ALIAS.get(brand, brand)
    fl = flavors_in(title)
    is_bundle = bool(BUNDLE.search(title)) or len(fl) >= 3
    vol = VOL.search(title); cnt = CNT.search(title)
    volume = (vol.group(1) + vol.group(2).lower()) if vol else ""
    return {
        "product_id": it.get("productId", ""), "brand": brand, "clean_name": cname,
        "flavor": "여러맛" if is_bundle else (fl[0] if fl else ""),
        "volume": volume, "pack_count": cnt.group(1) if cnt else "", "price": it.get("lprice", ""),
        "is_bundle": "Y" if is_bundle else "", "product_line": line_key(cname),
        "full_name": title, "maker": it.get("maker", ""), "mall": it.get("mallName", ""),
        "category": " > ".join(x for x in [it.get("category3", ""), it.get("category4", "")] if x),
        "naver_link": it.get("link", ""), "ingredients_json": "", "nutrition_json": "", "source": "naver_shop",
    }

def is_drink(r):
    return bool(DRINK_HINT.search(r["full_name"])) or r["volume"].endswith("l")

def build(category, query, out_name):
    raw = search(query)
    norm = [normalize(it) for it in raw]
    req = REQUIRE[category]
    drinks = [r for r in norm if is_drink(r)]
    singles = [r for r in drinks if not r["is_bundle"] and r["clean_name"]
               and req.search(r["full_name"]) and not JUNK.search(r["full_name"])]
    # (라인+맛) 중복 병합 — 관련도 순서 유지, 첫 등장만 채택, 병합 수 기록
    uniq = OrderedDict()
    for r in singles:
        key = (r["product_line"], r["flavor"])
        if key in uniq:
            uniq[key]["dup_count"] += 1
        else:
            r["dup_count"] = 1
            uniq[key] = r
    items = list(uniq.values())[:TARGET]
    cols = ["product_id","brand","clean_name","flavor","volume","pack_count","price","dup_count",
            "product_line","full_name","maker","mall","category","naver_link",
            "ingredients_json","nutrition_json","source"]
    out = os.path.join(POC, out_name)
    with open(out, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=cols, extrasaction="ignore"); w.writeheader(); w.writerows(items)
    print(f"[{category}] 수집 {len(raw)} → 음료 {len(drinks)} → 단일 {len(singles)} "
          f"→ 유니크 {len(uniq)} → top {len(items)} · {out_name}")
    return items

if __name__ == "__main__":
    if not (CID and CSEC):
        print("NAVER_ID/NAVER_SECRET 없음(.env 또는 환경변수)."); sys.exit(1)
    res = {}
    for cat, q, out in QUERIES:
        res[cat] = build(cat, q, out)
    print("\n--- protein 유니크 상위 8 ---")
    for i in res["protein"][:8]:
        print(f"  {i['brand']:10} | {i['clean_name'][:26]:26} | {i['flavor']:5} | {i['volume']:6} | 병합{i['dup_count']}")
