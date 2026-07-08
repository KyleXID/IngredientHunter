# IngredientHunter — 성분 리스크 분석 웹

화해(화장품 리뷰)의 건강식품 버전. 제로칼로리·단백질 음료의 성분표를 **촬영하면
성분별 리스크를 분석**해 카드로 보여준다. 초기 범위는 제로칼로리·단백질 음료 한정.

## 핵심 루프

사진 촬영 → 성분표 읽기(비전) → 성분 파싱 → **성분 리스크 지식베이스** 매칭 → 리포트 카드

제품의 해자는 UI가 아니라 **교차검증된 성분 리스크 지식베이스**다.
(`제로칼로리_단백질음료_성분_리스크_리포트.md`가 씨앗 데이터. 3인 교차검증/확증·기각/근거레벨/출처 구조가 화해 대비 신뢰성 차별점.)

## 스택 / 구조

- **모노레포**: `backend/` (Kotlin + Spring Boot 4.1, JPA, Flyway, Postgres) · `frontend/` (React + Vite + TS)
- **분석**: MVP는 비전 LLM 한 방(사진 → 리스크 DB를 컨텍스트로 → 구조화 JSON). 전용 OCR 파이프라인은 만들지 않는다. 정확도/비용이 실측상 부족할 때만 CLOVA OCR + 성분사전 매칭으로 분리.
- **배포 대상**: 웹 우선 + **PWA**(홈 화면 바로가기). 네이티브 앱은 추후 — 백엔드 그대로 재사용.
- **DB**: Postgres (로컬은 `docker compose up -d`). 스키마는 Flyway 마이그레이션으로만 변경.

## 마일스톤

- **M0 세팅** ✅ 진행 중: 모노레포·CLAUDE.md·스킬 배선·Postgres·CI 뼈대
- **M1 지식베이스** ⭐: MD → 구조화 DB (`성분 ↔ 리스크 ↔ 근거레벨 ↔ 출처 ↔ 컨센서스vs논쟁`)
- **M2 분석 API**: 사진 업로드 → 비전 분석 → 리스크 리포트 JSON (엔드포인트 1개부터)
- **M3 프론트 + PWA**: 촬영/업로드 → 결과 카드 → 홈 추가
- **M4 확장**: OCR 분리·제품 히스토리·성분사전 확장·피드백 루프·(추후) 네이티브 앱

## UX 참고 — Yuka (yuka.io)

우리와 가장 가까운 레퍼런스(식품·화장품 스캐너). 훔쳐올 패턴:

- **결과 화면**: 종합 점수/등급을 맨 위에 크게 → 아래에 **좋은 점 / 나쁜 점 분리**. 성분은 접었다 펴는 섹션.
- **색 코딩**: 초록(양호)–주황(주의)–빨강(나쁨). 당·나트륨 같은 수치는 **초록→빨강 스펙트럼 바**로 (숫자 단독 대신 맥락).
- **아이콘 요약**: "첨가물 6개", "당 과다" 같은 칩.
- **대안 추천**: 나쁨 제품 옆에 양호 대안을 화살표로 연결(추후 제품 DB 생기면).
- **히스토리**: 스캔 목록 + 스와이프 삭제.
- 온보딩 뒤 강제 회원가입은 이탈 요인으로 지적됨 → **가입은 최대한 뒤로 미룬다**(스캔 먼저).

**우리와의 차이(중요)**:
- Yuka는 **바코드 + 대규모 제품 DB**(8600만 사용자) 기반. 우리는 그런 DB가 없으니 MVP는 **성분표 사진을 비전으로 읽어 분석**. 바코드는 제품 DB 확보 후 M4에서.
- Yuka의 0–100 **정밀 점수는 자체 스코어링 모델**이 있어야 함. 우리 지식베이스는 정성적(근거레벨·컨센서스vs논쟁)이라 MVP는 **성분별 리스크 배지 + "주의 성분 N개" 요약**으로 시작. 합성 점수는 데이터가 뒷받침될 때 도입.

## 톤앤무드 참고 — AG1 (The New Company 리브랜딩)

키워드: **"life + science" / 근거 기반 / 백과사전적(encyclopedic) / 에디토리얼·미니멀·모듈러**. 과하게 꾸미지 않고 "정보를 품격 있게 전달". 우리 리포트의 교차검증·출처 강조와 결이 정확히 맞음.

- **색**: 크림/오프화이트 배경 + 그린 액센트 + 그레이, 경고는 레드. (양호=그린이 브랜드색과도 일치)
- **타이포**: 세리프(제목, 클래식의 현대화) + 클린 산세리프(데이터·본문) 페어링.
- **레이아웃**: 다이어그램·시각 척도·모듈형 카드로 "백과사전처럼" 성분 정보를 구성. 근거·출처를 숨기지 말고 디자인 요소로.
- **사진**: 스튜디오+라이프스타일, 깔끔하고 신뢰감.

→ 종합 방향: **"믿을 수 있는 성분 백과사전"** 톤. 화해의 친근함보다 **근거·투명성**을 전면에. (디자인 시스템은 M3에서 `design-system` 스킬로 토큰화)

## 작업 원칙 (Ponytail)

- 필요해지기 전엔 안 만든다. 추상화·설정·인터페이스는 두 번째 구현이 생길 때.
- 스키마 변경은 Flyway 마이그레이션 + 엔티티 동시에. `ddl-auto=validate` 유지(자동 생성 금지).
- 성분 리스크 데이터는 **반드시 출처·근거레벨·확신도**를 함께 저장. 근거 없는 주장 넣지 않음.

## 하네스 (단계별 스킬)

이미 설치된 `everything-claude-code` 스킬을 재사용한다. 새로 설치할 것 없음.

| 단계 | 스킬 |
|---|---|
| 백엔드 | `kotlin-patterns`, `kotlin-testing`, `springboot-patterns`, `springboot-security`, `springboot-tdd`, `springboot-verification`, `jpa-patterns`, `api-design` |
| DB | `postgres-patterns`, `database-migrations` |
| 프론트 | `frontend-patterns`, `coding-standards`, `design-system`, `e2e-testing`, `browser-qa` |
| 성분DB 리서치 | `deep-research`, `exa-search`, `market-research`, `data-scraper-agent` |
| 문서/라벨 파싱 | `nutrient-document-processing` |
| 배포·보안 | `docker-patterns`, `deployment-patterns`, `senior-devops`, `security-review` |

리뷰 서브에이전트(코드 작성 후 호출): `kotlin-reviewer`, `typescript-reviewer`, `security-reviewer`, `database-reviewer`, `architect`, `planner`.

전용 에이전트(추후 M1에서 생성 예정): `ingredient-risk-curator` — MD의 3인 교차검증 방식으로 성분 근거를 수집·검증해 DB에 적재.

## 명령

- 백엔드: `cd backend && ./gradlew build` (테스트는 Postgres 필요 → 먼저 `docker compose up -d`)
- 프론트: `cd frontend && npm install && npm run dev`
- DB: `docker compose up -d` / `docker compose down`

## 응답 언어

모든 응답·커밋·PR은 한국어. 코드 주석은 영어 허용.
