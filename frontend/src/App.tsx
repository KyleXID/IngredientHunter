import { useState, type ChangeEvent } from 'react'
import './App.css'

type Risk = 'good' | 'warn' | 'bad' | 'unknown'
interface Ingredient {
  name: string
  risk: Risk
  reason?: string
  evidence?: string
  consensus?: string
  source?: string
}
interface Result {
  product?: string
  summary?: { grade?: Risk; caution_count?: number; note?: string }
  ingredients?: Ingredient[]
  error?: string
}

const RISK_KO: Record<string, string> = { good: '양호', warn: '주의', bad: '위험', unknown: '정보없음' }

export default function App() {
  const [preview, setPreview] = useState<string | null>(null)
  const [imgB64, setImgB64] = useState<string | null>(null)
  const [mediaType, setMediaType] = useState<string>('image/jpeg')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<Result | null>(null)

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setMediaType(f.type || 'image/jpeg')
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      setPreview(dataUrl)
      setImgB64(dataUrl.split(',')[1])
    }
    reader.readAsDataURL(f)
  }

  async function analyze() {
    if (!imgB64) return
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: imgB64, mediaType }),
      })
      const data: Result = await res.json()
      if (data.error) throw new Error(data.error)
      setResult(data)
    } catch (ex) {
      setError('오류: ' + (ex as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="wrap">
      <h1>성분 스캐너 <span className="brand">POC</span></h1>
      <p className="sub">성분표 사진을 올리면 원재료를 읽어 리스크 KB 근거로 평가함. (디자인 적용 전 최소 UI · React + Spring)</p>

      <div className="uploader">
        <input type="file" accept="image/*" capture="environment" onChange={onFile} />
        {preview && <img className="preview" src={preview} alt="미리보기" />}
        <button onClick={analyze} disabled={!imgB64 || loading}>
          {loading ? '분석 중…' : '분석하기'}
        </button>
      </div>

      {loading && <div className="status">원재료 추출 → 리스크 KB 대조 중…</div>}
      {error && <div className="err">{error}</div>}

      {result && (
        <div className="result">
          <div className="top">
            <div className={'grade ' + (result.summary?.grade ?? 'unknown')}>
              {RISK_KO[result.summary?.grade ?? 'unknown']}
            </div>
            <div>
              <div className="name">{result.product ?? '제품(추정)'}</div>
              <div className="note">
                {result.summary?.note ?? `주의 성분 ${result.summary?.caution_count ?? 0}개`}
              </div>
            </div>
          </div>
          {(result.ingredients ?? []).map((it, i) => (
            <div className="ing" key={i}>
              <div className="h">
                <span className="nm">{it.name}</span>
                <span className={'badge ' + it.risk}>{RISK_KO[it.risk] ?? it.risk}</span>
              </div>
              {it.reason && <div className="reason">{it.reason}</div>}
              <div className="meta">
                {it.evidence && <span className="lv">{it.evidence}</span>}
                {it.consensus && it.consensus !== '-' && <span className="lv">{it.consensus}</span>}
                {it.source && <span>출처: {it.source}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
