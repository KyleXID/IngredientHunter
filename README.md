# IngredientHunter

제로칼로리·단백질 음료의 **성분표를 촬영하면 성분별 리스크를 분석**해 주는 웹.
웹 우선 + PWA(홈 화면 바로가기), 네이티브 앱은 추후.

자세한 방향·마일스톤·하네스는 [`CLAUDE.md`](./CLAUDE.md) 참고.

## 구조 (모노레포)

```
backend/    Kotlin + Spring Boot 4.1 (JPA, Flyway, Postgres)
frontend/   React + Vite + TypeScript
docker-compose.yml   로컬 Postgres
```

## 로컬 실행

```bash
cp .env.example .env          # 값 채우기 (DB 기본값은 그대로 동작)
docker compose up -d          # Postgres 기동

cd backend && ./gradlew bootRun    # 백엔드 (http://localhost:8080)
cd frontend && npm install && npm run dev   # 프론트 (http://localhost:5173)
```

## 마일스톤

M0 세팅 → M1 성분 리스크 지식베이스 → M2 분석 API → M3 프론트+PWA → M4 확장.
