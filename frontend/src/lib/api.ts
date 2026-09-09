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
  note: string | null
  ingredients: IngredientCard[]
}

/** GET /api/health-survey — 그룹형 */
export interface ConditionItem { id: string; label: string; desc: string | null }
export interface ConditionGroup { group: string; items: ConditionItem[] }

/** GET /api/products — 요약 행(검색 결과) */
export interface ProductRow {
  reportNo: string
  name: string
  maker: string | null
  category: string
  ingredientsJson: string | null
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

/** 검색: Spring Page 에서 content 만 꺼내 반환 */
export async function searchProducts(q: string, size = 8): Promise<ProductRow[]> {
  if (!q.trim()) return []
  const res = await fetch(`/api/products?q=${encodeURIComponent(q)}&size=${size}`)
  const page = await toJson<{ content: ProductRow[] }>(res)
  return page.content ?? []
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
export function getCookieId(): string {
  const KEY = 'zerodrink_cid'
  let id = localStorage.getItem(KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(KEY, id)
  }
  return id
}
