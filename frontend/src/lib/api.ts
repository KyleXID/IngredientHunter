import type { VerdictKey } from '../theme'

/* 백엔드 계약(AnalyzeResult) 미러 — 결과 화면이 그대로 사용 */
export interface IngredientCard {
  name: string
  type: 'warning' | 'harmful'
  effect: string | null
  dose: string | null
  evidence: string | null
}

export interface AnalyzeResult {
  verdict: VerdictKey
  productName: string
  totalDetected: number
  noDietEffect: boolean
  ingredients: IngredientCard[]
  /** 읽어낸 원재료 이름 전체 — 판정 여부와 무관. 서버가 안 주는 버전도 있으므로 optional */
  detectedNames?: string[]
}

/** GET /api/health-survey — 그룹형 */
export interface ConditionItem { id: string; label: string; desc: string | null }
export interface ConditionGroup { group: string; items: ConditionItem[] }

/** GET /api/products — 요약 행(검색 결과) */
export interface ProductRow {
  reportNo: string
  name: string
  maker: string | null
  category?: string
  ingredientsJson?: string | null
}

/** POST /api/analyze 요청 */
export interface AnalyzeInput {
  productReportNo?: string
  productName?: string
  imageBase64?: string
  mediaType?: string
  ingredientNames?: string[]
  conditions?: string[]
  consent?: boolean
  healthConsent?: boolean
  cookieId?: string
}

async function toJson<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json() as Promise<T>
}

export async function getHealthSurvey(): Promise<ConditionGroup[]> {
  return toJson<ConditionGroup[]>(await fetch('/api/health-survey'))
}

/**
 * 검색 자동완성 — 서버사이드: 띄어쓰기 무시 매칭 + 이름(공백무시) 중복 제거(이름당 대표 1건).
 * (카탈로그는 report_no 단위 미러라 동일 제품이 여러 건 → 서버에서 정리)
 */
export async function searchProducts(q: string, size = 8): Promise<ProductRow[]> {
  if (!q.trim()) return []
  const res = await fetch(`/api/products/search?q=${encodeURIComponent(q)}&limit=${size}`)
  return toJson<ProductRow[]>(res)
}

export async function analyze(body: AnalyzeInput): Promise<AnalyzeResult> {
  const res = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  return toJson<AnalyzeResult>(res)
}

/** 로그인 없이 기기 구분용 쿠키 id — localStorage 보관(비식별) */
/** 무작위 id. crypto.randomUUID 는 보안 컨텍스트(HTTPS·localhost)에서만 있어서,
 *  실기기 테스트처럼 사내망 IP 의 http 로 열면 없다. 그대로 부르면 예외가 나고
 *  분석 시작이 조용히 죽는다. getRandomValues 는 http 에서도 있으므로 그걸로 만든다. */
function randomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const b = crypto.getRandomValues(new Uint8Array(16))
    b[6] = (b[6] & 0x0f) | 0x40 // version 4
    b[8] = (b[8] & 0x3f) | 0x80 // variant
    const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
  }
  // 둘 다 없는 환경. 식별자로만 쓰이므로 충돌만 피하면 된다.
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`
}

export function getCookieId(): string {
  const KEY = 'zerodrink_cid'
  let id = localStorage.getItem(KEY)
  if (!id) {
    id = randomId()
    localStorage.setItem(KEY, id)
  }
  return id
}
