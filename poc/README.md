# POC — 쿠팡 제품 리스트 → 성분/영양 사전 DB

데이터 수집 방향 검증용 POC. 쿠팡 검색 결과를 정규화해 카테고리별 시트로 만들고,
식약처 오픈API로 원재료(전성분)를 보강한다. (배경: `docs/data-collection-slides.html`)

## 파이프라인

```
쿠팡 검색 스크래핑 → 정규화·중복제거·번들 플래그(build_sheet.py) → CSV 시트
                                                    ↓
                         식약처 품목제조보고(원재료) API 매칭(enrich_mfds.py) → 원재료 array
                                                    ↓ (매칭 실패분)
                                          라벨 이미지 비전 판독 폴백
```

## 파일

| 파일 | 설명 |
|---|---|
| `coupang_protein*.json` / `coupang_zero*.json` | Playwright로 뽑은 쿠팡 검색 원시 덤프 |
| `build_sheet.py` | 덤프 → 정규화(팩·기획 토큰 제거·브랜드·번들 플래그) → CSV |
| `coupang_protein.csv` / `coupang_zero.csv` | 카테고리별 정규화 시트(나중에 DB insert) |
| `enrich_mfds.py` | 식약처 C002 API로 원재료 보강(+매칭 점수) |

## 실행

```bash
python3 poc/build_sheet.py                 # 시트 재생성
python3 poc/enrich_mfds.py --demo          # 출력 형태만 확인(키 불필요)
python3 poc/enrich_mfds.py                  # .env의 MFDS_KEY로 원재료 매칭
```

식약처 키(무료)는 식품안전나라(foodsafetykorea.go.kr)에서 발급 → `.env`의 `MFDS_KEY`에 설정.

## 현재 상태 / 한계

- 리스트: 무인증 스크래핑은 검색 1페이지(각 ~50개)가 상한임. 2페이지부터 로그인 필요 →
  100개 확장은 네이버 쇼핑 오픈API(공식·페이지네이션) 또는 인증 세션이 필요함.
- 정규화: 브랜드·용량 휴리스틱이라 일부 오차 있음(예: 제품라인을 브랜드로 인식). 규칙 보강 여지.
- 매칭: 쿠팡 마케팅명 ≠ 식약처 품목명이라 완전일치 실패율 있음 → 유사도 매칭 + 미매칭은 비전 판독 폴백.
- 식약처 API: 2026-07-07~ 09:00~19:00 서비스 제한 공지 중. 제한시간 밖에 실행 권장.
