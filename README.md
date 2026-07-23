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
cp .env.example .env     # 로컬 값 (로컬에 pg가 5432를 쓰면 DB_PORT=5433 로)
./dev.sh                 # DB(docker)+백엔드(:8080)+프론트(:5173) 한 번에 · 종료 Ctrl+C
```

`.env`의 `ANTHROPIC_API_KEY`·`DB_PORT`는 `dev.sh`가 백엔드에 자동 주입한다. 개별 실행이 필요하면:

```bash
docker compose up -d
cd backend && DB_PORT=5433 ./gradlew bootRun     # 백엔드 (http://localhost:8080)
cd frontend && npm install && npm run dev        # 프론트 (http://localhost:5173)
```

로컬에 이미 Postgres가 5432를 점유하면 `docker-compose.override.yml`(git 미추적)로 컨테이너를 5433에 올리고 `DB_PORT=5433`을 쓴다.

## 마일스톤

M0 세팅 → M1 성분 리스크 지식베이스 → M2 분석 API → M3 프론트+PWA → M4 확장.
