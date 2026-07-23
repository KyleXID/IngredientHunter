#!/usr/bin/env python3
"""네이버 쇼핑 검색 오픈API로 카테고리별 top-N 제품 리스트를 수집·정규화한다.
쿠팡 2페이지가 로그인 벽이라, 무인증으로 100개를 뽑는 리스트 소스로 네이버를 사용.
정규화 로직(clean_name·번들·라인)은 build_sheet.py를 재사용한다.

출력: poc/naver_protein.csv, poc/naver_zero.csv  (원재료/영양은 enrich_mfds.py에서 채움)
실행: python3 poc/naver_list.py        (.env의 NAVER_ID/NAVER_SECRET 자동 로드)
정렬: 오픈API는 판매인기순이 없어 관련도(sim)순 — 1회성 후보 리스트 용도.
"""
import os, sys, re, csv, json, html, time, urllib.parse, urllib.request
from collections import Counter
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_sheet import clean_name, line_key, flavors_in, BUNDLE, VOL, CNT, BRAND_ALIAS

ROOT = "/Users/ihyeongju/Develop/Private/IngredientHunter"
POC = os.path.join(ROOT, "poc")
QUERIES = [("protein", "단백질음료", "naver_protein.csv"),
           ("zero",    "제로음료",   "naver_zero.csv")]
TARGET = 100

def creds():
    cid = os.environ.get("NAVER_ID", ""); sec = os.environ.get("NAVER_SECRET", "")
    if cid and sec: return cid, sec
    envp = os.path.join(ROOT, ".env")
    if os.path.exists(envp):
        kv = dict(l.strip().split("=", 1) for l in open(envp, encoding="utf-8") if "=" in l and not l.startswith("#"))
        return kv.get("NAVER_ID", ""), kv.get("NAVER_SECRET", "")
    return "", ""

CID, CSEC = creds()

def search(query, need=TARGET):
    """display=100 페이지네이션으로 need개 수집(중복 productId 제거)."""
    out, start = {}, 1
    while len(out) < need and start <= 1000:
        url = "https://openapi.naver.com/v1/search/shop.json?" + urllib.parse.urlencode(
            {"query": query, "display": 100, "start": start, "sort": "sim"})
        req = urllib.request.Request(url, headers={"X-Naver-Client-Id": CID, "X-Naver-Client-Secret": CSEC})
        with urllib.request.urlopen(req, timeout=15) as r:
            items = json.loads(r.read().decode()).get("items", [])
        if not items: break
        for it in items:
            pid = it.get("productId") or it.get("link")
            if pid not in out:
                out[pid] = it
        start += 100
        time.sleep(0.2)
    return list(out.values())[:need]

def normalize(category, it):
    title = html.unescape(re.sub(r"</?b>", "", it.get("title", ""))).strip()
    cname = clean_name(title)
    brand = it.get("brand") or it.get("maker") or (cname.split()[0] if cname else "")
    brand = BRAND_ALIAS.get(brand, brand)
    fl = flavors_in(title)
    is_bundle = bool(BUNDLE.search(title)) or len(fl) >= 3
    vol = VOL.search(title); cnt = CNT.search(title)
    return {
        "product_id": it.get("productId", ""),
        "brand": brand,
        "clean_name": cname,
        "flavor": "여러맛" if is_bundle else (fl[0] if fl else ""),
        "volume": (vol.group(1) + vol.group(2).lower()) if vol else "",
        "pack_count": cnt.group(1) if cnt else "",
        "price": it.get("lprice", ""),
        "is_bundle": "Y" if is_bundle else "",
        "product_line": line_key(cname),
        "full_name": title,
        "maker": it.get("maker", ""),
        "mall": it.get("mallName", ""),
        "category": " > ".join(x for x in [it.get("category3", ""), it.get("category4", "")] if x),
        "naver_link": it.get("link", ""),
        "ingredients_json": "",
        "nutrition_json": "",
        "source": "naver_shop",
    }

def build(category, query, out_name):
    raw = search(query)
    items = [normalize(category, it) for it in raw]
    gc = Counter(i["product_line"] for i in items)
    for i in items:
        i["dup_group_size"] = gc[i["product_line"]]
    cols = ["product_id","brand","clean_name","flavor","volume","pack_count","price","is_bundle",
            "product_line","dup_group_size","full_name","maker","mall","category","naver_link",
            "ingredients_json","nutrition_json","source"]
    out = os.path.join(POC, out_name)
    with open(out, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=cols); w.writeheader(); w.writerows(items)
    bundles = sum(1 for i in items if i["is_bundle"])
    print(f"[{category}] '{query}' → {len(items)}개 · 번들 {bundles} · 단일 {len(items)-bundles} → {out_name}")
    return items

if __name__ == "__main__":
    if not (CID and CSEC):
        print("NAVER_ID/NAVER_SECRET 없음(.env 또는 환경변수)."); sys.exit(1)
    results = {}
    for cat, q, out in QUERIES:
        results[cat] = build(cat, q, out)
    print("\n--- 단일제품 샘플(protein 상위 6) ---")
    for i in [x for x in results.get("protein", []) if not x["is_bundle"]][:6]:
        print(f"  {i['brand']:10} | {i['clean_name'][:30]:30} | {i['flavor']:5} | {i['volume']:6} | {i['price']}원")
