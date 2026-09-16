/* 브라우저 로컬 저장(비식별) — 설문 선택 영속 + 최근 본 제품 기록. */

const SURVEY_KEY = 'zerodrink_survey'
const HISTORY_KEY = 'zerodrink_history'
const HISTORY_MAX = 5   // 인기 제품 칩 개수와 맞춘다

/** noneGroups — '해당없음'을 고른 그룹 이름. 화면 전용이라 서버로는 보내지 않는다. */
export interface SavedSurvey { conditions: string[]; noneGroups: string[]; agreeHealth: boolean; agreeLog: boolean; completed: boolean }
export interface HistoryItem { reportNo: string; name: string }

function read<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key)
    return v ? (JSON.parse(v) as T) : fallback
  } catch {
    return fallback
  }
}
function write(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* 저장 불가(사생활 모드 등) 시 무시 */ }
}

export function loadSurvey(): SavedSurvey {
  const s = read<SavedSurvey>(SURVEY_KEY, { conditions: [], noneGroups: [], agreeHealth: false, agreeLog: false, completed: false })
  return { ...s, noneGroups: s.noneGroups ?? [] }   // 이전 버전 저장분 방어
}
export function saveSurvey(s: SavedSurvey) {
  write(SURVEY_KEY, s)
}

export function loadHistory(): HistoryItem[] {
  return read<HistoryItem[]>(HISTORY_KEY, [])
}
export function addHistory(item: HistoryItem) {
  const list = loadHistory().filter((h) => h.reportNo !== item.reportNo)
  list.unshift(item)
  write(HISTORY_KEY, list.slice(0, HISTORY_MAX))
}
export function removeHistory(reportNo: string) {
  write(HISTORY_KEY, loadHistory().filter((h) => h.reportNo !== reportNo))
}
export function clearHistory() {
  write(HISTORY_KEY, [])
}
