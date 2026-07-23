#!/usr/bin/env bash
# 개발 서버 한 번에: Postgres(docker) + 백엔드(:8080) + 프론트(:5173)
#   사용:  ./dev.sh          (종료: Ctrl+C — 셋 다 같이 종료)
# .env 가 있으면 로드해서 ANTHROPIC_API_KEY·DB_PORT 등을 백엔드에 자동 주입한다.
set -uo pipefail
cd "$(dirname "$0")"

# .env 로드(있으면 export)
if [ -f .env ]; then set -a; . ./.env; set +a; fi
export DB_PORT="${DB_PORT:-5432}"

echo "▶ Postgres (docker compose · 포트 ${DB_PORT})"
docker compose up -d

# 종료 시(Ctrl+C 포함) 백엔드·프론트 모두 정리
trap 'echo; echo "▷ 종료 중…"; kill 0 2>/dev/null' EXIT INT TERM

echo "▶ 백엔드 시작 (:8080)"
( cd backend && ./gradlew bootRun ) &

echo "▶ 프론트 시작 (:5173)"
( cd frontend && { [ -d node_modules ] || npm install; } && npm run dev ) &

echo "─ 준비되면 http://localhost:5173 접속 · 종료는 Ctrl+C ─"
wait
