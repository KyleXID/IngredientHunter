# POC — 제품 카탈로그·이미지 수집

식약처 오픈API를 원천으로 제로·단백질 제품을 수집해 백엔드 시드(제품 카탈로그)와
이미지 후보를 만드는 POC. (배경: `docs/data-collection-slides.html`)

## 파이프라인

```
식약처 C002 품목제조보고 API ──▶ mfds_list.py ──▶ mfds_protein.csv / mfds_zero.csv
   (제로·단백질 키워드, 음료 제한 없이 전 제품)     (식약처 원본 컬럼 + 중복병합)
                                                          │
                                     backend/src/main/resources/seed/ 로 복사
                                                          │
                                     Spring Boot 기동 시 ProductSeeder 가 DB에 적재
                                                          ▼
                                     GET /api/products (조회·검색 API)

(선택) enrich_naver_image.py ──▶ 네이버 이미지검색 + 도메인·흰배경 필터 + rembg 누끼
                              ──▶ mfds_images.csv / gallery_clean.html / cutouts/*.png
```

## 파일

| 파일 | 설명 |
|---|---|
| `mfds_list.py` | 식약처 C002에서 `제로/무설탕/무가당`·`단백질/프로틴` 전 제품 수집. (품목명,업소명) 중복병합. 식약처 원본 컬럼 CSV |
| `mfds_protein.csv` / `mfds_zero.csv` | 수집 결과(단백질 4,439 · 제로 2,617). 컬럼: report_no·name·maker·prdlst_type·report_date·category·ingredient_count·ingredients_json·dup_count |
| `enrich_naver_image.py` | 제품 이미지 매칭. 상품 도메인 + 흰 배경 필터로 인물·잡음컷 제외, rembg로 누끼 |
| `weekly_collect.sh` | 주 1회 새벽 전량 재수집 + 시드 복사 |
| `launchd/io.heumlabs.mfds-weekly.plist` | 매주 수요일 03:00 자동 실행(launchd) |
| `enrich_mfds.py`·`naver_list.py`·`build_sheet.py` | 초기 네이버 기반 수집(구버전, 참고용) |

## 실행

```bash
# 전량 수집(식약처 19~09시에만 호출 가능)
MFDS_TARGET=0 python3 poc/mfds_list.py
# 이미지(누끼는 rembg 필요: pip install rembg onnxruntime)
IMG_LIMIT=40 python3 poc/enrich_naver_image.py
# 주 1회 자동화 등록
cp poc/launchd/io.heumlabs.mfds-weekly.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/io.heumlabs.mfds-weekly.plist
```

식약처 키(무료)는 식품안전나라(foodsafetykorea.go.kr) 발급 → `.env`의 `MFDS_KEY`.
네이버 키는 developers.naver.com → `.env`의 `NAVER_ID`·`NAVER_SECRET`.

## 현황 / 한계

- **수집**: 식약처가 유일한 안정 경로. **네이버 쇼핑 검색 API는 2026-07-31 종료**(대체 없음) → 가격·인기순 수집 불가.
- **API 시간 제한**: 식약처 품목제조보고 API는 **19:00~09:00만 호출 가능** → 자동화는 새벽 스케줄.
- **이미지**: 쇼핑 API 종료로 이미지 검색 API 사용. 도메인+흰배경 필터로 상당수 잡음 제거되나, **엉뚱한 상품·판촉 말풍선**은 휴리스틱으로 못 거름(비전 판별 필요, 보류). 우선순위 낮음.
- **허수**: 식약처 등록 데이터 일부는 실제 성분과 불일치(빈도 낮아 현재 무시).
- **DB 갱신**: 빈 DB면 앱 기동 시 자동 시딩. 기존 행 update(주간 갱신)는 upsert 재적재 잡을 후속으로.
