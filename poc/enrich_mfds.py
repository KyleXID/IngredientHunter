#!/usr/bin/env python3
"""Phase 2 — 두 시트(coupang_protein.csv / coupang_zero.csv)를 식약처 오픈API로 보강.
  · 서비스: 식품(첨가물)품목제조보고(원재료) C002 — 식품안전나라(foodsafetykorea) 인증키
  · 매칭:   PRDLST_NM 부분검색을 여러 변형(정제명·무공백·핵심토큰·브랜드)으로 시도 →
            응답 품목명과 유사도 최고를 선택(임계값 미만은 미매칭=비전 판독 폴백 대상)
  · 출력:   각 시트의 ingredients_json + mfds_matched_name / mfds_report_no / match_score 갱신

실행:  python3 poc/enrich_mfds.py          (.env의 MFDS_KEY 자동 로드)
      python3 poc/enrich_mfds.py --demo   (키 없이 출력 형태만)

참고: 공공데이터/식약처 서비스가 09:00~19:00 제한 공지 중(2026-07-07~). 제한시간 밖에 실행 권장.
"""
import os, sys, json, csv, re, time, urllib.parse, urllib.request
from difflib import SequenceMatcher

ROOT = "/Users/ihyeongju/Develop/Private/IngredientHunter"
POC = os.path.join(ROOT, "poc")
SHEETS = ["naver_protein.csv", "naver_zero.csv"]
BASE = "http://openapi.foodsafetykorea.go.kr/api"

def load_key():
    k = os.environ.get("MFDS_KEY", "")
    if k: return k
    envp = os.path.join(ROOT, ".env")
    if os.path.exists(envp):
        for line in open(envp, encoding="utf-8"):
            if line.strip().startswith("MFDS_KEY="):
                return line.split("=", 1)[1].strip()
    return ""

KEY = load_key()
LIMIT = int(os.environ.get("ENRICH_LIMIT", "0"))   # >0 이면 시트당 상위 N개만(샘플, 별도 .sample.csv)
DELAY = float(os.environ.get("ENRICH_DELAY", "0.3"))  # 제품 간 딜레이(초) — throttle 방지

def api(pairs, start=1, end=20, retries=2):
    cond = "/".join(f"{k}={urllib.parse.quote(str(v))}" for k, v in pairs.items())
    url = f"{BASE}/{KEY}/C002/json/{start}/{end}" + ("/" + cond if cond else "")
    for i in range(retries + 1):
        try:
            with urllib.request.urlopen(url, timeout=20) as r:
                d = json.loads(r.read().decode("utf-8"))
            c = d.get("C002", {})
            code = c.get("RESULT", {}).get("CODE", "")
            if code and code != "INFO-000":
                if "500" in code:  # 서비스 제한/서버오류
                    raise RuntimeError(f"{code} {c.get('RESULT',{}).get('MSG','')}")
                return []
            return c.get("row", [])
        except RuntimeError:
            raise
        except Exception:
            if i < retries: time.sleep(1); continue
            return []
    return []

def split_ingredients(raw):
    parts, depth, buf = [], 0, ""
    for ch in raw:
        if ch == "(": depth += 1
        elif ch == ")": depth -= 1
        if ch == "," and depth == 0:
            parts.append(buf.strip()); buf = ""
        else: buf += ch
    if buf.strip(): parts.append(buf.strip())
    return [p for p in parts if p]

def sim(a, b):
    na, nb = a.replace(" ", ""), b.replace(" ", "")
    ratio = SequenceMatcher(None, na, nb).ratio()
    ta, tb = set(a.split()), set(b.split())
    jacc = len(ta & tb) / len(ta | tb) if (ta | tb) else 0
    return 0.6 * ratio + 0.4 * jacc

def match(clean, brand):
    """여러 쿼리 변형으로 후보 수집 후 유사도 최고 선택."""
    toks = clean.split()
    queries = [clean, clean.replace(" ", ""), " ".join(toks[:2]) if len(toks) >= 2 else clean, brand]
    cand = {}
    for q in dict.fromkeys([q for q in queries if q]):
        for row in api({"PRDLST_NM": q}):
            cand[row.get("PRDLST_REPORT_NO", row.get("PRDLST_NM"))] = row
        if len(cand) >= 40: break
    best, best_s = None, 0.0
    for row in cand.values():
        s = sim(clean, row.get("PRDLST_NM", ""))
        if s > best_s: best, best_s = row, s
    return (best, round(best_s, 3)) if best and best_s >= 0.45 else (None, round(best_s, 3))

DEMO = {"base_name":"셀렉스 프로핏 SPORTS 초콜릿",
    "ingredients":["정제수","분리유청단백(덴마크산)","코코아파우더(스페인산)","변성전분","영양강화제 5종",
        "차카테킨","산도조절제","유화제 2종","결정셀룰로스","카라기난","CMC","수크랄로스(감미료)",
        "아세설팜칼륨(감미료)","규소수지","향료 5종","탄닌산"],
    "nutrition":{"serving_ml":330,"kcal":99,"sodium_mg":350,"carbohydrate_g":2.9,"sugar_g":0,"fat_g":0.8,"protein_g":20}}

def demo():
    print("=== 출력 형태 데모 (셀렉스 프로핏 라벨) ===")
    print("ingredients_json =", json.dumps(DEMO["ingredients"], ensure_ascii=False))
    print("nutrition_json   =", json.dumps(DEMO["nutrition"], ensure_ascii=False))

def enrich_sheet(name):
    path = os.path.join(POC, name)
    rows = list(csv.DictReader(open(path, encoding="utf-8-sig")))
    work = rows[:LIMIT] if LIMIT else rows
    ok = 0
    for r in work:
        row, score = match(r["clean_name"], r.get("brand", ""))
        r.setdefault("mfds_matched_name", ""); r.setdefault("mfds_report_no", ""); r.setdefault("match_score", "")
        if row:
            ings = split_ingredients(row.get("RAWMTRL_NM", ""))
            r["ingredients_json"] = json.dumps(ings, ensure_ascii=False)
            r["mfds_matched_name"] = row.get("PRDLST_NM", "")
            r["mfds_report_no"] = row.get("PRDLST_REPORT_NO", "")
            r["match_score"] = score
            ok += 1
            print(f"  ✓ {r['clean_name']} → {row.get('PRDLST_NM','')} · 원재료 {len(ings)}", flush=True)
        else:
            r["match_score"] = score
            print(f"  - {r['clean_name']} → 매칭 실패(비전 판독 폴백)", flush=True)
        time.sleep(DELAY)
    cols = list(rows[0].keys())
    for extra in ("mfds_matched_name", "mfds_report_no", "match_score"):
        if extra not in cols: cols.append(extra)
    out = path.replace(".csv", ".sample.csv") if LIMIT else path
    to_write = work if LIMIT else rows
    with open(out, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=cols, extrasaction="ignore"); w.writeheader(); w.writerows(to_write)
    print(f"[{name}] {len(work)}개 중 매칭 {ok}개 ({ok*100//max(len(work),1)}%) → {os.path.basename(out)}", flush=True)

if __name__ == "__main__":
    if "--demo" in sys.argv or not KEY:
        if not KEY: print("MFDS_KEY 없음 → 데모 모드.\n")
        demo(); sys.exit(0)
    try:
        for s in SHEETS: enrich_sheet(s)
    except RuntimeError as e:
        print(f"\n⚠ 식약처 API 오류: {e}")
        print("→ 서비스 제한시간(09:00~19:00, 2026-07-07~) 가능성. 제한 밖에 재실행 필요.")
