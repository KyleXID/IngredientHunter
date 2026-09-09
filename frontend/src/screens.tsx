import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { C, F, S, TXT, R, L, VERDICT } from './theme'
import {
  Screen, Body, PageTitle, SectionLabel, Button, Collapse, TextLink, Card, Notice,
  VerdictBadge, CheckBox, ConsentRow, HowItWorksModal, ConsentModal, ShareModal, summarize,
  rowDivider, ROW_TEXT_INSET,
  IconSearch, IconCamera, IconImage, IconArrowRight, IconChevronLeft, IconCheck,
  IconWarning, IconDanger, IconInfo, IconRefresh, IconShare, IconClose,
} from './ui'
import { analyze, getHealthSurvey, searchProducts, getCookieId } from './lib/api'
import type { ConditionGroup, IngredientCard, ProductRow } from './lib/api'
import { useFlow } from './lib/flow'

const QUICK_SEARCHES = ['코카콜라 제로', '펩시 제로슈거', '칠성사이다 제로', '몬스터 제로', '아이시스 에코']

/* ═══ 인트로: 제품명 검색(실 API) + 인기 칩 + 사진 분석 ═══ */
export function IntroScreen() {
  const nav = useNavigate()
  const { setSource } = useFlow()
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const [results, setResults] = useState<ProductRow[]>([])
  const [showHow, setShowHow] = useState(false)

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    let live = true
    searchProducts(query).then((r) => { if (live) setResults(r) }).catch(() => { if (live) setResults([]) })
    return () => { live = false }
  }, [query])

  const showDropdown = focused && query.length > 0

  const pick = (p: ProductRow) => {
    setSource({ productReportNo: p.reportNo, productName: p.name })
    nav('/survey')
  }

  return (
    <>
      {showHow && <HowItWorksModal onClose={() => setShowHow(false)} />}
      <Screen
        footer={
          <>
            <Button icon={<IconCamera size={19} />} onClick={() => nav('/photo')}>사진 찍고 분석하기</Button>
            <TextLink onClick={() => setShowHow(true)} iconRight={<IconInfo size={16} color={C.gray300} />}>어떻게 분석하나요</TextLink>
          </>
        }
      >
        <Body>
          <Collapse open={!focused} maxHeight={240}>
            <PageTitle hero title={<>배 아프다는 대체당,<br />이 제품에는 없을까?</>} desc="전성분 표를 찍거나 제품명을 검색하면, 조심해야 할 성분을 찾아드려요." />
          </Collapse>

          <div className="relative">
            <div
              className="flex items-center transition-all duration-150"
              style={{ gap: S.md, height: L.field, padding: `0 ${S.lg}px`, borderRadius: R.md, backgroundColor: focused ? C.white : C.gray25, border: `${focused ? 1.5 : 1}px solid ${focused ? C.blue : C.gray100}` }}
            >
              <IconSearch size={20} color={focused ? C.blue : C.gray400} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setTimeout(() => setFocused(false), 150)}
                placeholder="제품명으로 검색"
                className="flex-1 bg-transparent outline-none min-w-0"
                style={{ ...TXT.strong, fontSize: 17 }}
              />
              {query && (
                <button aria-label="검색어 지우기" onMouseDown={(e) => e.preventDefault()} onClick={() => setQuery('')} className="shrink-0 flex items-center justify-center transition-opacity active:opacity-60" style={{ width: 24, height: 24, borderRadius: R.chip, backgroundColor: C.gray100 }}>
                  <IconClose size={14} color={C.gray500} />
                </button>
              )}
            </div>

            {showDropdown && (
              <div className="absolute left-0 right-0 overflow-hidden z-10 anim-fade-up" style={{ top: '100%', marginTop: S.sm, backgroundColor: C.white, borderRadius: R.md, border: `1px solid ${C.gray100}`, boxShadow: '0 12px 32px rgba(25,31,40,0.10)' }}>
                <div style={{ maxHeight: '46vh', overflowY: 'auto' }}>
                  {results.map((p, i) => (
                    <button key={p.reportNo} className="w-full flex items-center text-left transition-colors" style={{ gap: S.md, padding: S.lg, paddingLeft: ROW_TEXT_INSET, borderTop: rowDivider(i) }} onMouseDown={(e) => e.preventDefault()} onClick={() => pick(p)}>
                      <span className="flex-1" style={{ ...TXT.label, color: C.gray900 }}>{p.name}</span>
                      <IconArrowRight size={16} color={C.gray300} />
                    </button>
                  ))}
                  <div className="flex items-center justify-between" style={{ gap: S.md, padding: S.lg, paddingLeft: ROW_TEXT_INSET, borderTop: results.length > 0 ? `1px solid ${C.gray50}` : 'none' }}>
                    <p style={TXT.label}>{results.length > 0 ? '찾는 제품이 없나요?' : '찾는 제품이 없어요'}</p>
                    <button className="shrink-0 flex items-center transition-opacity active:opacity-60" style={{ gap: S.xs, padding: `${S.sm}px ${S.md}px`, borderRadius: R.chip, backgroundColor: C.blueSurface }} onMouseDown={(e) => e.preventDefault()} onClick={() => nav('/photo')}>
                      <IconCamera size={15} color={C.blue} />
                      <span style={{ ...TXT.caption, fontFamily: F.md, fontWeight: 500, color: C.blue }}>직접 찍기</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <Collapse open={!focused} maxHeight={140}>
            <div className="flex flex-wrap" style={{ gap: S.sm, marginTop: S.md }}>
              {QUICK_SEARCHES.map((q) => (
                <button key={q} onClick={() => { setQuery(q); setFocused(true) }} className="transition-all duration-150 active:scale-[0.96]" style={{ padding: `${S.sm}px ${S.md}px`, borderRadius: R.chip, backgroundColor: C.gray50, ...TXT.caption, color: C.gray600 }}>
                  {q}
                </button>
              ))}
            </div>
          </Collapse>
        </Body>
      </Screen>
    </>
  )
}

/* ═══ 건강설문: DB(/api/health-survey) 로드 + 개인화 선택 + 동의 ═══ */
export function SurveyScreen() {
  const nav = useNavigate()
  const { source, setPending } = useFlow()
  const [groups, setGroups] = useState<ConditionGroup[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [agreed, setAgreed] = useState(false)
  const [showConsent, setShowConsent] = useState(false)

  useEffect(() => { getHealthSurvey().then(setGroups).catch(() => setGroups([])) }, [])

  const toggle = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id); else next.add(id)
    setSelected(next)
  }

  const picked = selected.size > 0
  const consentLabel = picked ? '건강 정보·사용 기록 분석에 동의해요' : '사용 기록 분석에 동의해요'
  // 법령: 동의는 선택. 미동의여도 분석은 진행(로그만 미적재).
  const ctaLabel = picked ? `${selected.size}개 선택 · 분석 시작` : '분석하기'

  const submit = () => {
    setPending({
      ...source,
      conditions: Array.from(selected),
      consent: agreed,
      healthConsent: agreed && picked,
      cookieId: getCookieId(),
    })
    nav('/loading')
  }

  return (
    <>
      {showConsent && <ConsentModal onClose={() => setShowConsent(false)} />}
      <Screen
        footer={
          <>
            <div style={{ marginBottom: S.lg, padding: '0 2px' }}>
              <ConsentRow on={agreed} onToggle={() => setAgreed((v) => !v)} onDetail={() => setShowConsent(true)}>{consentLabel}</ConsentRow>
            </div>
            <Button onClick={submit}>{ctaLabel}</Button>
            <TextLink onClick={() => nav(-1)} iconLeft={<IconChevronLeft size={16} color={C.gray400} />}>뒤로가기</TextLink>
          </>
        }
      >
        <Body>
          <PageTitle title={<>해당하는 건강 상태를<br />모두 골라주세요</>} desc="고른 상태에 맞춰 조심해야 할 성분을 더 정확하게 찾아드려요. 해당하는 항목이 없으면 고르지 않아도 괜찮아요." />
          {groups.map(({ group, items }, gi) => (
            <div key={group} style={{ marginTop: gi === 0 ? 0 : S.xxl }}>
              <SectionLabel>{group}</SectionLabel>
              <Card padded={false}>
                {items.map(({ id, label, desc }, i) => {
                  const on = selected.has(id)
                  return (
                    <button key={id} onClick={() => toggle(id)} className="w-full text-left flex items-center transition-colors duration-150" style={{ gap: S.md, padding: `${S.lg}px ${S.lg}px`, borderTop: rowDivider(i), backgroundColor: on ? C.blueSurface : C.white }}>
                      <CheckBox on={on} size={22} />
                      <div className="flex-1 min-w-0">
                        <p style={{ ...TXT.label, color: on ? C.blueStrong : C.gray900 }}>{label}</p>
                        <p style={{ ...TXT.caption, color: on ? C.blue : C.gray400, marginTop: 2 }}>{desc}</p>
                      </div>
                    </button>
                  )
                })}
              </Card>
            </div>
          ))}
        </Body>
      </Screen>
    </>
  )
}

/* ═══ 촬영 가이드: 파일 선택 → base64 → 설문 ═══ */
export function PhotoGuideScreen() {
  const nav = useNavigate()
  const { setSource } = useFlow()
  const fileRef = useRef<HTMLInputElement>(null)

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1] ?? ''
      setSource({ imageBase64: base64, mediaType: f.type || 'image/jpeg' })
      nav('/survey')
    }
    reader.readAsDataURL(f)
  }

  const tips = [
    '원재료명이 잘리지 않게 담아주세요',
    '밝은 곳에서 그림자가 지지 않게 찍어주세요',
    '카메라를 흔들리지 않게 잡아주세요',
    '글자가 또렷하게 보일 만큼 가까이 찍어주세요',
  ]
  return (
    <Screen
      footer={
        <>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={onFile} />
          <div className="flex" style={{ gap: S.md }}>
            <Button variant="secondary" icon={<IconImage size={19} color={C.gray600} />} onClick={() => fileRef.current?.click()}>앨범에서 고르기</Button>
            <Button icon={<IconCamera size={19} />} onClick={() => fileRef.current?.click()}>사진 찍기</Button>
          </div>
          <TextLink onClick={() => nav('/')} iconLeft={<IconChevronLeft size={16} color={C.gray400} />}>뒤로가기</TextLink>
        </>
      }
    >
      <Body>
        <PageTitle title={<>원재료명을<br />찍어주세요</>} />
        <LabelExample />
        <div style={{ marginTop: S.xxl, display: 'flex', flexDirection: 'column', gap: S.md }}>
          {tips.map((tip) => (
            <div key={tip} className="flex items-start gap-2.5">
              <div className="shrink-0" style={{ marginTop: 2 }}><IconCheck size={17} color={C.blue} /></div>
              <p style={{ ...TXT.label, color: C.gray700 }}>{tip}</p>
            </div>
          ))}
        </div>
      </Body>
    </Screen>
  )
}

function LabelExample() {
  const rows: { label: string; value: string; target?: boolean }[] = [
    { label: '제품명', value: '제로 레몬 스파클링' },
    { label: '내용량', value: '350 mL  |  0 kcal' },
    { label: '원재료명', value: '정제수, 탄산가스, 구연산, 수크랄로스(감미료), 아세설팜칼륨(감미료), 레몬향(합성향료), 안식향산나트륨(보존료), 비타민C', target: true },
    { label: '유통기한', value: '별도 표기일까지' },
    { label: '제조원', value: '(주)헬씨드링크 / 경기도 성남시' },
  ]
  return (
    <Card padded={false}>
      {rows.map((row, i) => (
        <div key={row.label} className="flex" style={{ borderTop: i === 0 ? 'none' : `1px solid ${C.gray100}`, backgroundColor: row.target ? C.blueSurface : C.white }}>
          <div className="shrink-0" style={{ width: 88, padding: `${S.md}px ${S.md}px`, backgroundColor: row.target ? C.blueSurface : C.gray25 }}>
            <span className="whitespace-nowrap" style={{ ...TXT.caption, fontFamily: F.md, fontWeight: 500, color: row.target ? C.blueStrong : C.gray300 }}>{row.label}</span>
          </div>
          <div className="flex-1" style={{ padding: `${S.md}px ${S.lg}px` }}>
            <span style={{ ...TXT.caption, color: row.target ? C.gray900 : C.gray300, fontFamily: row.target ? F.md : F.rg, fontWeight: row.target ? 500 : 400 }}>{row.value}</span>
          </div>
        </div>
      ))}
    </Card>
  )
}

/* ═══ 로딩: 실제 analyze 호출 → 결과/오류로 ═══ */
const LOADING_STEPS = ['성분 읽어오는 중', '공식 자료와 대조하는 중', '위험도 가려내는 중', '결과 정리하는 중']

export function LoadingScreen() {
  const nav = useNavigate()
  const { pending, setResult } = useFlow()
  const [step, setStep] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setStep((v) => Math.min(v + 1, LOADING_STEPS.length - 1)), 520)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!pending) { nav('/', { replace: true }); return }
    let live = true
    analyze(pending)
      .then((r) => { if (live) { setResult(r); nav('/result', { replace: true }) } })
      .catch(() => { if (live) nav('/error/service', { replace: true }) })
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Screen>
      <div className="flex flex-col items-center justify-center h-full" style={{ padding: `0 ${L.pageX + 20}px` }}>
        <svg width="44" height="44" viewBox="0 0 48 48" fill="none" className="animate-spin">
          <circle cx="24" cy="24" r="20" stroke={C.gray50} strokeWidth="4" />
          <path d="M24 4C35.05 4 44 12.95 44 24" stroke={C.blue} strokeWidth="4" strokeLinecap="round" />
        </svg>
        <p key={step} className="anim-fade-in text-center" style={{ ...TXT.section, marginTop: S.xxl }}>{LOADING_STEPS[step]}</p>
        <div style={{ width: '100%', maxWidth: 200, height: 4, borderRadius: R.chip, backgroundColor: C.gray50, marginTop: S.xl, overflow: 'hidden' }}>
          <div style={{ width: `${((step + 1) / LOADING_STEPS.length) * 100}%`, height: '100%', borderRadius: R.chip, backgroundColor: C.blue, transition: 'width 420ms cubic-bezier(0.2, 0.8, 0.2, 1)' }} />
        </div>
        <p style={{ ...TXT.caption, marginTop: S.md }}>{step + 1} / {LOADING_STEPS.length} 단계</p>
      </div>
    </Screen>
  )
}

/* ═══ 결과: flow.result 렌더 ═══ */
function IngredientRiskCard({ data, index = 0 }: { data: IngredientCard; index?: number }) {
  return (
    <div className="anim-fade-up" style={{ animationDelay: `${index * 70}ms` }}>
      <Card>
        <div className="flex items-start justify-between" style={{ gap: S.md, marginBottom: S.md }}>
          <span style={TXT.section}>{data.name}</span>
          <VerdictBadge verdict={data.type} />
        </div>
        {data.effect && <p style={{ ...TXT.body, marginBottom: S.lg }}>{data.effect}</p>}
        <div style={{ backgroundColor: C.gray25, borderRadius: R.sm, padding: S.lg }}>
          {[{ k: '하루 기준', v: data.dose }, { k: '근거', v: data.evidence }].map((row, i) => (
            <div key={row.k} style={{ marginTop: i === 0 ? 0 : S.md }}>
              <p style={{ ...TXT.caption, color: C.gray400, marginBottom: 2 }}>{row.k}</p>
              <p style={{ ...TXT.caption, color: C.gray700 }}>{row.v ?? '-'}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

export function ResultScreen() {
  const nav = useNavigate()
  const { result, reset } = useFlow()
  const [showShare, setShowShare] = useState(false)

  useEffect(() => { if (!result) nav('/', { replace: true }) }, [result, nav])
  if (!result) return null

  const v = VERDICT[result.verdict]
  const VIcon = result.verdict === 'safe' ? IconCheck : result.verdict === 'warning' ? IconWarning : IconDanger

  return (
    <>
      {showShare && <ShareModal verdict={result.verdict} productName={result.productName} total={result.totalDetected} ingredients={result.ingredients} onClose={() => setShowShare(false)} />}
      <Screen
        footer={
          <div className="flex" style={{ gap: S.md }}>
            <Button variant="secondary" icon={<IconRefresh size={18} color={C.gray600} />} onClick={() => { reset(); nav('/') }}>새로 분석하기</Button>
            <Button icon={<IconShare size={18} />} onClick={() => setShowShare(true)}>이미지로 공유</Button>
          </div>
        }
      >
        <Body>
          <h1 style={{ ...TXT.title, fontSize: 22 }}>{result.productName}</h1>
          <div className="flex items-center" style={{ gap: S.md, marginTop: S.xl, padding: `${S.lg}px ${S.xl}px`, borderRadius: R.lg, backgroundColor: v.surface }}>
            <div className="shrink-0 anim-pop"><VIcon size={22} color={v.tone} /></div>
            <div className="flex-1 min-w-0">
              <p style={{ ...TXT.section, color: v.tone }}>{v.title}</p>
              <p style={{ ...TXT.caption, color: v.toneText, marginTop: 2 }}>{summarize(result.totalDetected, result.ingredients)}</p>
            </div>
          </div>
          {result.noDietEffect && (
            <div style={{ marginTop: S.lg }}><Notice plain>분석 결과, 다이어트 효과가 없는 감미료가 포함됐어요.</Notice></div>
          )}
          {result.note && <p style={{ ...TXT.body, marginTop: S.xl }}>{result.note}</p>}
          {result.ingredients.length > 0 && (
            <div style={{ marginTop: S.xxl, display: 'flex', flexDirection: 'column', gap: S.md }}>
              {result.ingredients.map((ing, i) => <IngredientRiskCard key={ing.name} data={ing} index={i} />)}
            </div>
          )}
        </Body>
      </Screen>
    </>
  )
}

/* ═══ 오류 ═══ */
export function ErrorScreen() {
  const nav = useNavigate()
  const { type } = useParams<{ type: string }>()
  const isService = type !== 'unclear'
  return (
    <Screen
      footer={
        <div className="flex" style={{ gap: S.md }}>
          <Button variant="secondary" onClick={() => nav('/')}>처음으로</Button>
          <Button onClick={() => nav(isService ? '/' : '/photo')}>{isService ? '다시 시도하기' : '다시 찍기'}</Button>
        </div>
      }
    >
      <div className="flex flex-col items-center justify-center h-full text-center" style={{ padding: `0 ${L.pageX + 12}px` }}>
        <div className="flex items-center justify-center anim-pop" style={{ width: 56, height: 56, borderRadius: R.chip, backgroundColor: C.gray50, marginBottom: S.xl }}><IconInfo size={28} color={C.gray300} /></div>
        <p style={{ ...TXT.section, marginBottom: S.sm }}>{isService ? '지금은 분석할 수 없어요' : '사진을 읽지 못했어요'}</p>
        <p style={{ ...TXT.body, maxWidth: 280 }}>{isService ? '서비스에 일시적인 문제가 생겼어요. 잠시 후 다시 시도해 주세요.' : '글자가 흐릿하거나 표가 잘렸을 수 있어요. 밝은 곳에서 다시 찍어주세요.'}</p>
      </div>
    </Screen>
  )
}
