#!/usr/bin/env python3
"""식약처 카탈로그(mfds_*.csv) 제품에 '인물 없는 깨끗한 상품 컷'만 매칭하고, 원하면 누끼(배경제거)까지.
  · 후보: 네이버 이미지 검색(display=30).
  · 필터: (1) 출처가 쇼핑/상품 도메인인 것만(뉴스·블로그발 차트·연예인컷 제거)
          (2) 썸네일 테두리 '흰 배경' 판정(packshot) → 통과한 첫 후보 채택.
  · 누끼: rembg(설치 시) 로 배경 제거해 poc/cutouts/<report_no>.png 저장.
출력: poc/mfds_images.csv, poc/gallery_clean.html, poc/cutouts/*.png(누끼)
실행: python3 poc/enrich_naver_image.py [protein|zero]      (.env의 NAVER_ID/NAVER_SECRET)
      IMG_LIMIT=20 python3 poc/enrich_naver_image.py          (카테고리당 샘플)
      python3 poc/enrich_naver_image.py --selftest            (네트워크 없이 판정 검증)
설치(누끼): pip install rembg onnxruntime

# ponytail: 도메인 화이트리스트+흰배경으로 비상품 근사 제거. 더 세게는 Gemini 비전으로 '상품 사진' 판별 추가.
"""
import os, re, sys, io, csv, json, html, time, urllib.parse, urllib.request, urllib.error
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed
from PIL import Image

try:
    from rembg import remove as rembg_remove
    REMBG = True
except Exception:
    REMBG = False

ROOT = "/Users/ihyeongju/Develop/Private/IngredientHunter"
POC = os.path.join(ROOT, "poc")
CUTDIR = os.path.join(POC, "cutouts")
SHEETS = {"protein": "mfds_protein.csv", "zero": "mfds_zero.csv"}
LIMIT = int(os.environ.get("IMG_LIMIT", "40"))
MAXCHECK = int(os.environ.get("IMG_MAXCHECK", "20"))
WORKERS = int(os.environ.get("IMG_WORKERS", "3"))
DELAY = float(os.environ.get("IMG_DELAY", "0.15"))
WHITE_THRESH = int(os.environ.get("IMG_WHITE_THRESH", "235"))
WHITE_FRAC = float(os.environ.get("IMG_WHITE_FRAC", "0.85"))
CUTOUT = os.environ.get("IMG_CUTOUT", "1") == "1" and REMBG   # 누끼 여부
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
# 출처(link) 도메인이 상품/쇼핑이면 채택 — 뉴스·블로그·SNS발 비상품 제거
COMMERCE = re.compile(
    r"shopping-phinf|coupangcdn|gmarket|gdimg|gmkt|ssgcdn|sstatic|11st|011st|lotteon|"
    r"kurly|oasis|emart|gsshop|cjonstyle|musinsa|wconcept|oliveyoung|iherb|auction|interpark|tmon|wemakeprice",
    re.I)
ERRORS = Counter()


def creds():
    cid = os.environ.get("NAVER_ID", ""); sec = os.environ.get("NAVER_SECRET", "")
    if cid and sec:
        return cid, sec
    envp = os.path.join(ROOT, ".env")
    if os.path.exists(envp):
        kv = dict(l.strip().split("=", 1) for l in open(envp, encoding="utf-8")
                  if "=" in l and not l.startswith("#"))
        return kv.get("NAVER_ID", ""), kv.get("NAVER_SECRET", "")
    return "", ""


CID, CSEC = creds()


def is_white_bg(img_bytes):
    """테두리 픽셀의 흰색 비율로 packshot(흰 배경) 여부 판정. (통과여부, frac)."""
    try:
        im = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    except Exception:
        return False, 0.0
    w, h = im.size
    if w < 60 or h < 60:
        return False, 0.0
    px = im.load()
    sx, sy = max(1, w // 40), max(1, h // 40)
    border = []
    for x in range(0, w, sx):
        border.append(px[x, 0]); border.append(px[x, h - 1])
    for y in range(0, h, sy):
        border.append(px[0, y]); border.append(px[w - 1, y])
    white = sum(1 for r, g, b in border if r >= WHITE_THRESH and g >= WHITE_THRESH and b >= WHITE_THRESH)
    frac = white / len(border)
    return frac >= WHITE_FRAC, round(frac, 3)


def is_commerce(link):
    return bool(COMMERCE.search(link or ""))


def _get(url, timeout=15):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def img_search(query, retries=2):
    url = "https://openapi.naver.com/v1/search/image.json?" + urllib.parse.urlencode(
        {"query": query, "display": 30, "sort": "sim"})
    req = urllib.request.Request(url, headers={"X-Naver-Client-Id": CID, "X-Naver-Client-Secret": CSEC})
    for i in range(retries + 1):
        try:
            with urllib.request.urlopen(req, timeout=15) as r:
                return json.loads(r.read().decode()).get("items", [])
        except urllib.error.HTTPError as e:
            ERRORS[e.code] += 1
            if e.code == 429 and i < retries:
                time.sleep(1.5 * (i + 1)); continue
            return []
        except Exception as e:
            ERRORS[type(e).__name__] += 1
            if i < retries:
                time.sleep(1); continue
            return []
    return []


def find_clean(query):
    """상품 도메인 + 흰배경을 통과한 첫 후보 채택. (thumb, link, white_frac, checked)."""
    if DELAY:
        time.sleep(DELAY)
    items = img_search(query)
    best_frac, checked = 0.0, 0
    for it in items[:MAXCHECK]:
        link = it.get("link", ""); thumb = it.get("thumbnail") or ""
        if not thumb or not is_commerce(link):        # 비상품 출처 제외
            continue
        checked += 1
        try:
            b = _get(thumb)
        except Exception:
            ERRORS["dl"] += 1
            continue
        ok, frac = is_white_bg(b)
        best_frac = max(best_frac, frac)
        if ok:
            return thumb, link, frac, checked
    return "", "", best_frac, checked


def make_cutout(report_no, link, thumb):
    """rembg로 배경 제거해 cutouts/<report_no>.png 저장. 실패 시 ''."""
    if not (CUTOUT and report_no):
        return ""
    src = None
    for u in (link, thumb):
        try:
            src = _get(u); break
        except Exception:
            continue
    if not src:
        return ""
    try:
        out = rembg_remove(src)                       # PNG(알파) 바이트
        os.makedirs(CUTDIR, exist_ok=True)
        path = os.path.join(CUTDIR, f"{report_no}.png")
        open(path, "wb").write(out)
        return f"cutouts/{report_no}.png"
    except Exception:
        ERRORS["cutout"] += 1
        return ""


def run(cats=None):
    results = {}
    for cat in (cats or list(SHEETS)):
        rows = list(csv.DictReader(open(os.path.join(POC, SHEETS[cat]), encoding="utf-8-sig")))
        work = rows[:LIMIT] if LIMIT else rows
        n = len(work); ok = done = 0
        out = []
        with ThreadPoolExecutor(max_workers=WORKERS) as ex:
            futs = {ex.submit(find_clean, r.get("name", "")): r for r in work}
            for fut in as_completed(futs):
                r = futs[fut]
                thumb, link, frac, checked = fut.result()
                if thumb:
                    ok += 1
                out.append({"report_no": r.get("report_no", ""), "name": r.get("name", ""),
                            "category": cat, "image_url": link, "thumb_url": thumb,
                            "white_frac": frac, "cutout": ""})
                done += 1
                if done % 20 == 0 or done == n:
                    print(f"  [{cat} {done}/{n}] 상품컷 {ok} · 에러 {dict(ERRORS)}", flush=True)
        # 누끼(순차 — rembg는 CPU 무거워 스레드 밖에서)
        if CUTOUT:
            picks = [r for r in out if r["thumb_url"]]
            for i, r in enumerate(picks, 1):
                r["cutout"] = make_cutout(r["report_no"], r["image_url"], r["thumb_url"])
                if i % 10 == 0 or i == len(picks):
                    print(f"  [{cat}] 누끼 {i}/{len(picks)}", flush=True)
        print(f"[{cat}] 상품컷 {ok}/{n} ({ok*100//max(n,1)}%)" + (" · 누끼 on" if CUTOUT else ""))
        results[cat] = out
    write_outputs(results)


def write_outputs(results):
    allrows = [r for rows in results.values() for r in rows]
    with open(os.path.join(POC, "mfds_images.csv"), "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["report_no", "name", "category", "image_url", "thumb_url", "white_frac", "cutout"])
        w.writeheader(); w.writerows(allrows)
    parts = []
    for cat, rows in results.items():
        imgs = [r for r in rows if r["thumb_url"]]
        cells = "".join(
            f'<figure><img loading="lazy" src="{html.escape(r["cutout"] or r["thumb_url"])}" alt="">'
            f'<figcaption>{html.escape(r["name"])}</figcaption></figure>' for r in imgs)
        parts.append(f'<h2>{cat} — 상품컷 {len(imgs)}/{len(rows)}</h2><div class="grid">{cells}</div>')
    doc = ("<!doctype html><html lang=ko><meta charset=utf-8>"
           "<meta name=viewport content='width=device-width,initial-scale=1'>"
           "<title>제품 이미지(클린 packshot)</title><style>"
           "body{font-family:system-ui,'Apple SD Gothic Neo',sans-serif;margin:24px;background:#f7f5ee;color:#1b2a21;word-break:keep-all}"
           "h2{font-family:Georgia,serif;border-bottom:1px solid #ddd8c8;padding-bottom:6px;margin-top:32px}"
           ".grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:14px}"
           "figure{margin:0;background:#fff;border:1px solid #ddd8c8;border-radius:10px;padding:8px}"
           # 누끼 투명 확인용 체커보드
           "img{width:100%;height:120px;object-fit:contain;"
           "background:conic-gradient(#eee 90deg,#fff 0 180deg,#eee 0 270deg,#fff 0) 0 0/16px 16px}"
           "figcaption{font-size:11px;color:#5e655a;margin-top:6px;line-height:1.35}"
           "</style>" + "".join(parts) + "</html>")
    open(os.path.join(POC, "gallery_clean.html"), "w", encoding="utf-8").write(doc)
    print(f"→ poc/mfds_images.csv · poc/gallery_clean.html" + (f" · poc/cutouts/ (누끼)" if CUTOUT else ""))


def selftest():
    buf = io.BytesIO(); Image.new("RGB", (200, 200), (255, 255, 255)).save(buf, "PNG")
    assert is_white_bg(buf.getvalue()) == (True, 1.0)
    buf2 = io.BytesIO(); Image.new("RGB", (200, 200), (30, 30, 30)).save(buf2, "PNG")
    assert is_white_bg(buf2.getvalue()) == (False, 0.0)
    assert is_commerce("https://shopping-phinf.pstatic.net/x.jpg")
    assert is_commerce("https://img.coupangcdn.com/x.jpg")
    assert not is_commerce("https://blog.naver.com/x.jpg")
    assert not is_commerce("https://news.chosun.com/x.jpg")
    print(f"selftest OK (rembg={REMBG})")


if __name__ == "__main__":
    if "--selftest" in sys.argv:
        selftest(); sys.exit(0)
    if not (CID and CSEC):
        print("NAVER_ID/NAVER_SECRET 없음(.env 또는 환경변수)."); sys.exit(1)
    sel = [a for a in sys.argv[1:] if a in SHEETS]
    run(sel or None)
