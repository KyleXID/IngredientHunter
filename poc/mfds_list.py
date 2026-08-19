#!/usr/bin/env python3
"""식약처 C002 품목제조보고에서 '단백질'/'제로' 키워드 전체 상품을 뽑아 식약처 원본 컬럼 CSV로 만든다.
  · 음료 제한 없음 — 키워드가 품목명에 든 전체 품목(분말·바·과자 등 포함).
  · 중복 병합: 같은 (품목명, 업소명) 재등록을 1행으로 합치고 dup_count 기록.
  · 컬럼은 식약처 C002 원본 필드 기준(네이버쇼핑용 정규화 컬럼 없음).
출력: poc/mfds_protein.csv, poc/mfds_zero.csv
실행: python3 poc/mfds_list.py [protein|zero]   (.env의 MFDS_KEY, 식약처 09~19시 제한 밖에 실행)
      MFDS_TARGET=100 python3 poc/mfds_list.py   (카테고리당 상한, 0=전량 기본)
      python3 poc/mfds_list.py --selftest         (API 없이 병합·파싱 로직 검증)
"""
import os, sys, re, csv, json, time, urllib.parse, urllib.request
from collections import OrderedDict

ROOT = "/Users/ihyeongju/Develop/Private/IngredientHunter"
POC = os.path.join(ROOT, "poc")
BASE = "http://openapi.foodsafetykorea.go.kr/api"
TARGET = int(os.environ.get("MFDS_TARGET", "0"))       # 0 = 전량(상한 없음)
MAXRAW = int(os.environ.get("MFDS_MAXRAW", "10000"))   # 키워드당 raw 수집 상한(total_count까지)
DELAY = float(os.environ.get("MFDS_DELAY", "0.3"))     # 호출 간 딜레이(throttle 방지)

CATS = {"protein": ["단백질", "프로틴"], "zero": ["제로", "무설탕", "무가당"]}
OUT = {"protein": "mfds_protein.csv", "zero": "mfds_zero.csv"}
# 식약처 C002 원본 필드 기준 컬럼 (+ category=검색 버킷, dup_count=중복병합 수)
COLS = ["report_no", "name", "maker", "prdlst_type", "report_date",
        "category", "ingredient_count", "ingredients_json", "dup_count"]


def load_key():
    k = os.environ.get("MFDS_KEY", "")
    if k:
        return k
    envp = os.path.join(ROOT, ".env")
    if os.path.exists(envp):
        for line in open(envp, encoding="utf-8"):
            if line.strip().startswith("MFDS_KEY="):
                return line.split("=", 1)[1].strip()
    return ""


KEY = load_key()


def split_ingredients(raw):
    """괄호 깊이를 고려해 최상위 콤마로만 원재료를 분리(감미료(A,B) 통째 유지)."""
    parts, depth, buf = [], 0, ""
    for ch in raw:
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth -= 1
        if ch == "," and depth == 0:
            parts.append(buf.strip()); buf = ""
        else:
            buf += ch
    if buf.strip():
        parts.append(buf.strip())
    return [p for p in parts if p]


def fmt_date(s):
    """식약처 YYYYMMDD → YYYY-MM-DD."""
    s = (s or "").strip()
    return f"{s[:4]}-{s[4:6]}-{s[6:8]}" if len(s) == 8 and s.isdigit() else s


def dedup_key(name, maker):
    """중복 병합 키: 정규화 품목명 + 업소명(같은 제품 재등록을 합침)."""
    n = re.sub(r"\s+", "", re.sub(r"[^0-9a-z가-힣]", " ", (name or "").lower()))
    return (n, (maker or "").strip())


def api(query, start, end, retries=2):
    url = f"{BASE}/{KEY}/C002/json/{start}/{end}/PRDLST_NM={urllib.parse.quote(query)}"
    for i in range(retries + 1):
        try:
            with urllib.request.urlopen(url, timeout=20) as r:
                d = json.loads(r.read().decode("utf-8"))
            c = d.get("C002", {})
            code = c.get("RESULT", {}).get("CODE", "")
            if code and code != "INFO-000":                       # 503(제한)·500 등
                raise RuntimeError(f"{code} {c.get('RESULT', {}).get('MSG', '')}")
            return c.get("row", []), int(c.get("total_count", 0) or 0)
        except RuntimeError:
            raise
        except Exception:
            if i < retries:
                time.sleep(1); continue
            return [], 0
    return [], 0


def collect(query, maxraw=MAXRAW):
    """키워드 하나를 100개씩 페이지네이션해 원시 행을 모은다(보고번호로 중복 제거)."""
    out, start, CH = OrderedDict(), 1, 100
    while len(out) < maxraw:
        rows, total = api(query, start, start + CH - 1)
        if not rows:
            break
        for r in rows:
            out.setdefault(r.get("PRDLST_REPORT_NO") or r.get("PRDLST_NM"), r)
        start += CH
        if total and start > total:
            break
        time.sleep(DELAY)
    return list(out.values())


def normalize_row(r, category):
    ings = split_ingredients(r.get("RAWMTRL_NM") or "")
    return {
        "report_no": r.get("PRDLST_REPORT_NO", ""),
        "name": (r.get("PRDLST_NM") or "").strip(),
        "maker": (r.get("BSSH_NM") or "").strip(),
        "prdlst_type": r.get("PRDLST_DCNM", ""),
        "report_date": fmt_date(r.get("PRMS_DT", "")),
        "category": category,
        "ingredient_count": len(ings),
        "ingredients_json": json.dumps(ings, ensure_ascii=False) if ings else "",
    }


def process(raw, category):
    """카테고리(키워드) 전체 상품 → (품목명,업소명) 중복 병합. 순수함수(테스트 대상)."""
    uniq = OrderedDict()
    for row in raw:
        r = normalize_row(row, category)
        if not r["name"]:
            continue
        k = dedup_key(r["name"], r["maker"])
        if k in uniq:
            uniq[k]["dup_count"] += 1
        else:
            r["dup_count"] = 1
            uniq[k] = r
    items = list(uniq.values())
    return items[:TARGET] if TARGET > 0 else items


def write_csv(category, items):
    out = os.path.join(POC, OUT[category])
    with open(out, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=COLS, extrasaction="ignore")
        w.writeheader(); w.writerows(items)
    ing = sum(1 for r in items if r["ingredients_json"])
    print(f"[{category}] 상품 {len(items)} · 원재료있음 {ing} ({ing*100//max(len(items),1)}%) → {OUT[category]}")


def run(cats=None):
    for cat in (cats or list(CATS)):
        raw = OrderedDict()
        for q in CATS[cat]:
            for r in collect(q):
                raw.setdefault(r.get("PRDLST_REPORT_NO") or r.get("PRDLST_NM"), r)
        write_csv(cat, process(list(raw.values()), cat))


def selftest():
    sample = [
        {"PRDLST_NM": "동원 제로 콜라", "BSSH_NM": "동원", "PRDLST_REPORT_NO": "1", "PRDLST_DCNM": "탄산음료",
         "PRMS_DT": "20240101", "RAWMTRL_NM": "정제수,감미료(수크랄로스,아세설팜칼륨)"},
        {"PRDLST_NM": "동원  제로콜라", "BSSH_NM": "동원", "PRDLST_REPORT_NO": "2", "PRDLST_DCNM": "탄산음료",
         "PRMS_DT": "20240102", "RAWMTRL_NM": "정제수"},                                  # 같은 품목명+업소 → 병합
        {"PRDLST_NM": "제로 초코쿠키", "BSSH_NM": "롯데", "PRDLST_REPORT_NO": "3", "PRDLST_DCNM": "과자류",
         "PRMS_DT": "20230505", "RAWMTRL_NM": "밀가루,코코아"},                            # 음료 아님도 포함(전체 상품)
    ]
    out = process(sample, "zero")
    assert len(out) == 2, f"콜라(병합)+쿠키 = 2 기대, got {len(out)}"
    cola = next(r for r in out if "콜라" in r["name"])
    assert cola["dup_count"] == 2, cola["dup_count"]
    assert cola["ingredient_count"] == 2, "정제수 + 감미료(...) = 2"
    assert cola["report_date"] == "2024-01-01", cola["report_date"]
    cookie = next(r for r in out if "쿠키" in r["name"])
    assert cookie["ingredient_count"] == 2 and cookie["prdlst_type"] == "과자류", "음료 제한 없이 과자도 포함"
    print("selftest OK")


if __name__ == "__main__":
    if "--selftest" in sys.argv:
        selftest(); sys.exit(0)
    if not KEY:
        print("MFDS_KEY 없음(.env 또는 환경변수)."); sys.exit(1)
    sel = [a for a in sys.argv[1:] if a in CATS]
    try:
        run(sel or None)
    except RuntimeError as e:
        print(f"\n⚠ 식약처 API 오류: {e}")
        print("→ 09:00~19:00 서비스 제한(ERROR-503) 가능성. 19시 이후 재실행 필요.")
