import { createContext, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { AnalyzeInput, AnalyzeResult } from './api'

/**
 * 분석 플로우 상태 — 화면 간(인트로/촬영 → 설문 → 로딩 → 결과) 데이터 전달.
 *  source  : 무엇을 분석할지(제품 or 이미지) — 인트로/촬영에서 설정
 *  pending : source + 건강조건 + 동의 — 설문에서 확정, 로딩이 analyze 호출
 *  result  : 분석 결과 — 로딩이 설정, 결과 화면이 사용
 */
interface FlowValue {
  source: AnalyzeInput
  setSource: (s: AnalyzeInput) => void
  pending: AnalyzeInput | null
  setPending: (p: AnalyzeInput | null) => void
  result: AnalyzeResult | null
  setResult: (r: AnalyzeResult | null) => void
  reset: () => void
}

const FlowContext = createContext<FlowValue | null>(null)

export function FlowProvider({ children }: { children: ReactNode }) {
  const [source, setSource] = useState<AnalyzeInput>({})
  const [pending, setPending] = useState<AnalyzeInput | null>(null)
  const [result, setResult] = useState<AnalyzeResult | null>(null)
  const value = useMemo<FlowValue>(
    () => ({
      source, setSource, pending, setPending, result, setResult,
      reset: () => { setSource({}); setPending(null); setResult(null) },
    }),
    [source, pending, result],
  )
  return <FlowContext.Provider value={value}>{children}</FlowContext.Provider>
}

export function useFlow(): FlowValue {
  const ctx = useContext(FlowContext)
  if (!ctx) throw new Error('useFlow must be used within FlowProvider')
  return ctx
}
