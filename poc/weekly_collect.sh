#!/usr/bin/env bash
# 주 1회 새벽 식약처 전량 수집 → CSV 갱신 → 백엔드 시드로 복사.
#   · 식약처 품목제조보고 API는 호출 가능 시간이 19:00~09:00 → launchd로 새벽 03:00 실행(io.heumlabs.mfds-weekly.plist).
#   · MFDS_TARGET=0 이면 상한 없이 전량 수집(단백질·제로 전 제품).
# 수동 실행:  bash poc/weekly_collect.sh
set -euo pipefail
ROOT="/Users/ihyeongju/Develop/Private/IngredientHunter"
cd "$ROOT"
mkdir -p poc/logs
LOG="poc/logs/collect_$(date +%Y%m%d_%H%M).log"
{
  echo "== 식약처 전량 수집 시작 $(date '+%Y-%m-%d %H:%M') =="
  MFDS_TARGET=0 python3 poc/mfds_list.py
  echo "== 백엔드 시드로 복사 =="
  cp poc/mfds_protein.csv poc/mfds_zero.csv backend/src/main/resources/seed/
  echo "== 완료 $(date '+%Y-%m-%d %H:%M') =="
  echo "DB 반영: 빈 DB면 앱 재기동 시 자동 시딩. 운영 갱신(기존 행 update)은 upsert 재적재 잡을 후속으로."
} 2>&1 | tee "$LOG"
