import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { C, F, S, TXT, R, L, VERDICT } from './theme'
import {
  Screen, Body, PageTitle, SectionLabel, InlineAction, ProductChip, ProductNameField, Button, Collapse, TextLink, TextLinkRow, Card,
  VerdictBadge, CheckBox, RadioMark, ConsentRow, NoticeStack, HowItWorksModal, HealthConsentModal, LogConsentModal, ShareModal, summarize,
  rowDivider, ROW_TEXT_INSET,
  IconSearch, IconCamera, IconImage, IconArrowRight, IconChevronLeft, IconCheck,
  IconWarning, IconDanger, IconInfo, IconRefresh, IconShare, IconClose,
} from './ui'
import { analyze, getHealthSurvey, searchProducts, getCookieId } from './lib/api'
import type { ConditionGroup, IngredientCard, ProductRow } from './lib/api'
import { useFlow } from './lib/flow'
import { addHistory, loadHistory, removeHistory, clearHistory, loadSurvey, saveSurvey } from './lib/storage'
import type { HistoryItem } from './lib/storage'

// 인트로 히어로 문구 — 3종 롤링(3초). 모두 2줄로 끊어 높이가 흔들리지 않게.
const HERO_VARIANTS: [string, string][] = [
  ['배 아프다는 대체당,', '이 제품에는 없을까?'],
  ['건강 걱정으로 챙긴', '제로음료, 정말 건강할까?'],
  ['매일 챙겨 먹는 보충제,', '나한테 괜찮을까?'],
]

// 하나만 고를 수 있는 설문 그룹 — 나머지는 중복 선택. 그룹명은 DB(health_survey.category) 값과 같아야 한다.
const SINGLE_CHOICE_GROUPS = ['생애주기']

// 검색 결과 리스트 최소 높이 — 자판이 크게 올라와도 최소 1행은 남긴다.
const LIST_MIN = 54

// 인기 제품 — 우리 DB(식약처 카탈로그)에 실제 존재하는 report_no. 클릭 시 바로 분석.
const POPULAR: { reportNo: string; name: string }[] = [
  { reportNo: '19800375002112', name: '코카콜라 제로' },
  { reportNo: '19930242053473', name: '펩시제로슈거' },
  { reportNo: '19780368002607', name: '칠성사이다제로' },
  { reportNo: '19970614083158', name: '스프라이트 제로' },
  { reportNo: '201005430661374', name: '나랑드사이다 제로 그린애플' },
]

/* ═══ 인트로: 제품명 검색(실 API) + 인기 칩 + 사진 분석 ═══ */
export function IntroScreen() {
  const nav = useNavigate()
  const { setSource, setPending } = useFlow()
  const savedSurvey = loadSurvey()
  const surveyDone = savedSurvey.completed
  const savedCount = savedSurvey.conditions.length
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const [results, setResults] = useState<ProductRow[]>([])
  const [showHow, setShowHow] = useState(false)
  const [history, setHistory] = useState<HistoryItem[]>(() => loadHistory())
  const [heroIndex, setHeroIndex] = useState(0)
  const [listMax, setListMax] = useState(0)
  const fieldRef = useRef<HTMLDivElement>(null)

  // 히어로 문구 롤링 — 검색 중엔 히어로가 접히므로 멈추고, 모션 최소화면 아예 안 돌린다.
  useEffect(() => {
    if (focused) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const t = setInterval(() => setHeroIndex((i) => (i + 1) % HERO_VARIANTS.length), 3000)
    return () => clearInterval(t)
  }, [focused])

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    let live = true
    searchProducts(query).then((r) => { if (live) setResults(r) }).catch(() => { if (live) setResults([]) })
    return () => { live = false }
  }, [query])

  const showDropdown = focused && query.length > 0

  /* 리스트 높이는 두 경계 중 먼저 만나는 쪽까지만 쓴다.
     - 평소: 하단 액션 영역의 윗선 (버튼에 맞추면 그 배경과 맞닿아 붙어 보인다)
     - 자판이 올라오면: 보이는 화면 아래끝 (position:fixed + vh/dvh 는 자판에 반응하지
       않으므로 visualViewport 가 유일한 단서다) */
  useLayoutEffect(() => {
    if (!showDropdown) return

    const update = () => {
      const el = fieldRef.current
      if (!el) return
      const vv = window.visualViewport
      const visibleBottom = vv ? vv.offsetTop + vv.height : window.innerHeight
      const block = document.querySelector('[data-footer-block]')
      const footerBlockTop = block?.getBoundingClientRect().top ?? Infinity
      const listTop = el.getBoundingClientRect().bottom + S.sm // 검색창 아래 8px 띄운 위치
      const room = Math.min(visibleBottom, footerBlockTop) - listTop - S.lg
      setListMax(Math.max(LIST_MIN, Math.round(room)))
    }

    update()
    // 히어로가 접히면서 검색창이 위로 올라가므로, 애니메이션이 끝난 뒤 다시 잰다
    const settle = setTimeout(update, 320)
    const vv = window.visualViewport
    vv?.addEventListener('resize', update)
    vv?.addEventListener('scroll', update)
    window.addEventListener('resize', update)
    return () => {
      clearTimeout(settle)
      vv?.removeEventListener('resize', update)
      vv?.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [showDropdown])

  const goProduct = (reportNo: string, name: string) => {
    addHistory({ reportNo, name })
    const s = loadSurvey()
    if (s.completed) {
      // 설문 완료 상태 → 저장된 건강정보로 바로 분석(설문 재노출 안 함). 수정은 "건강 정보 수정"에서.
      setPending({
        productReportNo: reportNo, productName: name,
        conditions: s.conditions, consent: s.agreeLog,
        healthConsent: s.agreeHealth && s.conditions.length > 0, cookieId: getCookieId(),
      })
      nav('/loading')
    } else {
      setSource({ productReportNo: reportNo, productName: name })
      nav('/survey')
    }
  }
  const pick = (p: ProductRow) => goProduct(p.reportNo, p.name)
  const pickHistory = (h: HistoryItem) => goProduct(h.reportNo, h.name)
  const removeOne = (reportNo: string) => { removeHistory(reportNo); setHistory(loadHistory()) }
  const clearAll = () => { clearHistory(); setHistory([]) }

  return (
    <>
      {showHow && <HowItWorksModal onClose={() => setShowHow(false)} />}
      <Screen
        footer={
          <>
            <Button icon={<IconCamera size={19} />} onClick={() => nav('/photo')}>사진 찍고 분석하기</Button>
            <TextLinkRow>
              <TextLink onClick={() => setShowHow(true)} iconRight={<IconInfo size={16} color={C.gray300} />}>어떻게 분석하나요</TextLink>
            </TextLinkRow>
          </>
        }
      >
        <Body>
          <Collapse open={!focused}>
            <PageTitle
              hero
              title={
                <span key={heroIndex} className="anim-fade-up block">
                  {HERO_VARIANTS[heroIndex][0]}
                  <br />
                  {HERO_VARIANTS[heroIndex][1]}
                </span>
              }
              desc="전성분 표를 찍거나 제품명을 검색하면, 조심해야 할 성분을 찾아드려요."
            />
          </Collapse>

          <div className="relative">
            <div
              ref={fieldRef}
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
                style={TXT.control}
              />
              {query && (
                <button aria-label="검색어 지우기" onMouseDown={(e) => e.preventDefault()} onClick={() => setQuery('')} className="shrink-0 flex items-center justify-center transition-opacity active:opacity-60" style={{ width: 24, height: 24, borderRadius: R.chip, backgroundColor: C.gray100 }}>
                  <IconClose size={14} color={C.gray500} />
                </button>
              )}
            </div>

            {showDropdown && (
              <div className="absolute left-0 right-0 overflow-hidden z-10 anim-fade-up" style={{ top: '100%', marginTop: S.sm, backgroundColor: C.white, borderRadius: R.md, border: `1px solid ${C.gray100}`, boxShadow: '0 12px 32px rgba(25,31,40,0.10)' }}>
                {/* 보이는 화면 높이에서 계산한 만큼만 열고, 넘치면 리스트만 스크롤한다.
                    대체 경로 줄은 리스트의 마지막 항목으로 들어간다. */}
                <div style={{ maxHeight: listMax, overflowY: 'auto' }}>
                  {results.map((p, i) => (
                    <button key={p.reportNo} className="w-full flex items-center text-left transition-colors" style={{ gap: S.md, padding: S.lg, paddingLeft: ROW_TEXT_INSET, borderTop: rowDivider(i) }} onMouseDown={(e) => e.preventDefault()} onClick={() => pick(p)}>
                      <span className="flex-1" style={{ ...TXT.label, color: C.gray900 }}>{p.name}</span>
                      <IconArrowRight size={16} color={C.gray300} />
                    </button>
                  ))}
                  <div className="flex items-center justify-between" style={{ gap: S.md, padding: S.lg, paddingLeft: ROW_TEXT_INSET, borderTop: rowDivider(results.length) }}>
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

          <Collapse open={!focused}>
            {history.length > 0 && (
              <div style={{ marginTop: S.lg }}>
                <SectionLabel action={<InlineAction onClick={clearAll}>모두 지우기</InlineAction>}>최근 본 제품</SectionLabel>
                <div className="flex flex-wrap" style={{ gap: S.sm }}>
                  {history.map((h) => (
                    <ProductChip key={h.reportNo} recent name={h.name} onClick={() => pickHistory(h)} onRemove={() => removeOne(h.reportNo)} />
                  ))}
                </div>
              </div>
            )}
            <div style={{ marginTop: S.lg }}>
              <SectionLabel>인기 제품</SectionLabel>
              <div className="flex flex-wrap" style={{ gap: S.sm }}>
                {POPULAR.map((p) => (
                  <ProductChip key={p.reportNo} name={p.name} onClick={() => goProduct(p.reportNo, p.name)} />
                ))}
              </div>
            </div>

            {/* 개인화가 걸려 있다는 신호 + 수정 진입점. 아직 고른 게 없으면 왜 넣으면 좋은지로 바꾼다.
                질환명은 적지 않는다 — 민감정보라 첫 화면에서 어깨너머로 보이면 안 된다. */}
            {surveyDone && (
              <div className="flex items-center justify-between" style={{ marginTop: S.xxl }}>
                <p style={{ ...TXT.caption, color: C.gray500 }}>
                  {savedCount > 0 ? `건강 정보 ${savedCount}개를 반영하고 있어요` : '건강 정보를 더하면 결과가 정확해져요'}
                </p>
                <InlineAction onClick={() => nav('/survey?edit=1')}>{savedCount > 0 ? '수정' : '추가'}</InlineAction>
              </div>
            )}
          </Collapse>
        </Body>
      </Screen>
    </>
  )
}

/* ═══ 건강설문: DB(/api/health-survey) 로드 + 개인화 선택 + 동의 ═══ */
export function SurveyScreen() {
  const nav = useNavigate()
  const [sp] = useSearchParams()
  const edit = sp.get('edit') === '1'   // 홈의 "건강 정보 수정"으로 진입(분석 아님, 저장만)
  const { source, setPending } = useFlow()
  const saved = useState(() => loadSurvey())[0]
  const [groups, setGroups] = useState<ConditionGroup[]>([])
  const [selected, setSelected] = useState<Set<string>>(() => new Set(saved.conditions))
  const [noneGroups, setNoneGroups] = useState<Set<string>>(() => new Set(saved.noneGroups))
  const [agreeHealth, setAgreeHealth] = useState<boolean>(saved.agreeHealth)  // 필수(건강상태 선택 시)
  const [agreeLog, setAgreeLog] = useState<boolean>(saved.agreeLog)            // 선택
  const [showHealth, setShowHealth] = useState(false)
  const [showLog, setShowLog] = useState(false)
  // 한 번 마친 사람이 다시 들어오면 전부 펼쳐 둔다(수정하러 온 것이므로 순차 노출이 방해된다)
  const revealAll = useState(() => saved.completed)[0]
  const groupRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const shownCount = useRef(0)

  useEffect(() => { getHealthSurvey().then(setGroups).catch(() => setGroups([])) }, [])
  // 설문 선택·동의를 로컬에 저장 → 다시 들어와도 유지(completed 플래그는 보존)
  useEffect(() => {
    saveSurvey({ conditions: Array.from(selected), noneGroups: Array.from(noneGroups), agreeHealth, agreeLog, completed: loadSurvey().completed })
  }, [selected, noneGroups, agreeHealth, agreeLog])

  /* 한 그룹을 고르면 다음 그룹이 아래에 나타난다. '해당없음'도 고른 것으로 친다. */
  const isDone = (g: ConditionGroup) => noneGroups.has(g.group) || g.items.some((i) => selected.has(i.id))
  const visible = revealAll ? groups : groups.filter((_, gi) => groups.slice(0, gi).every(isDone))

  // 새 그룹이 열리면 그 자리로 부드럽게 이동시킨다
  useEffect(() => {
    if (shownCount.current > 0 && visible.length > shownCount.current) {
      groupRefs.current[visible[visible.length - 1].group]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    shownCount.current = visible.length
  }, [visible.length])

  const clearHealthConsentIfEmpty = (next: Set<string>) => { if (next.size === 0) setAgreeHealth(false) }

  const pickItem = (group: string, id: string) => {
    const next = new Set(selected)
    if (SINGLE_CHOICE_GROUPS.includes(group)) {
      // 하나만 고르는 그룹 — 같은 그룹의 기존 선택을 먼저 비운다
      groups.find((g) => g.group === group)?.items.forEach((i) => next.delete(i.id))
      if (!selected.has(id)) next.add(id)
    } else {
      if (next.has(id)) next.delete(id); else next.add(id)
    }
    // 항목을 고르면 그 그룹의 '해당없음'은 풀린다
    const nextNone = new Set(noneGroups); nextNone.delete(group)
    clearHealthConsentIfEmpty(next)
    setSelected(next); setNoneGroups(nextNone)
  }

  const pickNone = (group: string) => {
    const nextNone = new Set(noneGroups)
    const next = new Set(selected)
    if (nextNone.has(group)) {
      nextNone.delete(group)
    } else {
      nextNone.add(group)
      // '해당없음'을 고르면 그 그룹에서 고른 것들은 모두 해제한다
      groups.find((g) => g.group === group)?.items.forEach((i) => next.delete(i.id))
    }
    clearHealthConsentIfEmpty(next)
    setSelected(next); setNoneGroups(nextNone)
  }

  // 모든 그룹에 답해야 진행할 수 있다('해당없음'도 답으로 친다)
  const unanswered = groups.find((g) => !isDone(g))
  // 건강 정보 동의는 건강상태를 골랐을 때만 필요하고 그땐 필수. 사용 기록 동의는 선택(버튼 안 막음).
  const picked = selected.size > 0
  const canProceed = !unanswered && (!picked || agreeHealth)
  const ctaLabel = unanswered
    ? `${unanswered.group} 항목을 골라주세요`
    : !canProceed
      ? '건강 정보 활용 동의에 체크해 주세요'
      : edit ? '저장' : picked ? `${selected.size}개 선택 · 분석 시작` : '분석하기'

  const submit = () => {
    // noneGroups 는 화면 전용 — conditions 에 섞이지 않는다
    saveSurvey({ conditions: Array.from(selected), noneGroups: Array.from(noneGroups), agreeHealth, agreeLog, completed: true })
    if (edit) { nav('/'); return }   // 편집 모드: 저장만 하고 홈으로
    setPending({
      ...source,
      conditions: Array.from(selected),
      consent: agreeLog,                       // 사용 기록(로그) 동의 = 선택
      healthConsent: agreeHealth && picked,    // 건강 정보(민감정보) 동의 = 필수
      cookieId: getCookieId(),
    })
    nav('/loading')
  }

  return (
    <>
      {showHealth && <HealthConsentModal onClose={() => setShowHealth(false)} />}
      {showLog && <LogConsentModal onClose={() => setShowLog(false)} />}
      <Screen
        footer={
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: S.md, marginBottom: S.lg, padding: '0 2px' }}>
              {picked && (
                <ConsentRow required on={agreeHealth} onToggle={() => setAgreeHealth((v) => !v)} onDetail={() => setShowHealth(true)}>
                  건강 정보 활용에 동의해요
                </ConsentRow>
              )}
              <ConsentRow on={agreeLog} onToggle={() => setAgreeLog((v) => !v)} onDetail={() => setShowLog(true)}>
                사용 기록 활용에 동의해요
              </ConsentRow>
            </div>
            <Button disabled={!canProceed} onClick={submit}>{ctaLabel}</Button>
            <TextLinkRow><TextLink onClick={() => nav(-1)} iconLeft={<IconChevronLeft size={16} color={C.gray400} />}>뒤로가기</TextLink></TextLinkRow>
          </>
        }
      >
        <Body>
          <PageTitle title={<>해당하는 건강 상태를<br />모두 골라주세요</>} desc="고른 상태에 맞춰 조심해야 할 성분을 더 정확하게 찾아드려요. 해당하는 항목이 없으면 '해당없음'을 골라주세요." />
          {visible.map((g, gi) => {
            const single = SINGLE_CHOICE_GROUPS.includes(g.group)
            const Mark = single ? RadioMark : CheckBox
            const noneOn = noneGroups.has(g.group)
            return (
              <div
                key={g.group}
                ref={(el) => { groupRefs.current[g.group] = el }}
                className={gi === 0 ? undefined : 'anim-fade-up'}
                style={{ marginTop: gi === 0 ? 0 : S.xxl, scrollMarginTop: S.lg }}
              >
                <SectionLabel>{g.group}</SectionLabel>
                <Card padded={false}>
                  {/* '해당없음'이 맨 위 — 해당 사항이 없는 사람이 가장 먼저 빠져나갈 수 있게 */}
                  <button onClick={() => pickNone(g.group)} className="w-full text-left flex items-center transition-colors duration-150" style={{ gap: S.md, padding: `${S.lg}px ${S.lg}px`, borderTop: rowDivider(0), backgroundColor: noneOn ? C.blueSurface : C.white }}>
                    <Mark on={noneOn} size={22} />
                    <p style={{ ...TXT.label, color: noneOn ? C.blueStrong : C.gray900 }}>해당없음</p>
                  </button>
                  {g.items.map(({ id, label, desc }, i) => {
                    const on = selected.has(id)
                    return (
                      <button key={id} onClick={() => pickItem(g.group, id)} className="w-full text-left flex items-center transition-colors duration-150" style={{ gap: S.md, padding: `${S.lg}px ${S.lg}px`, borderTop: rowDivider(i + 1), backgroundColor: on ? C.blueSurface : C.white }}>
                        <Mark on={on} size={22} />
                        <div className="flex-1 min-w-0">
                          <p style={{ ...TXT.label, color: on ? C.blueStrong : C.gray900 }}>{label}</p>
                          {desc && <p style={{ ...TXT.caption, color: on ? C.blue : C.gray400, marginTop: 2 }}>{desc}</p>}
                        </div>
                      </button>
                    )
                  })}
                </Card>
              </div>
            )
          })}
        </Body>
      </Screen>
    </>
  )
}

/* ═══ 촬영 가이드: 파일 선택 → base64 → 설문 ═══ */
export function PhotoGuideScreen() {
  const nav = useNavigate()
  const { setSource, setPending } = useFlow()
  const fileRef = useRef<HTMLInputElement>(null)

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1] ?? ''
      const media = f.type || 'image/jpeg'
      const s = loadSurvey()
      if (s.completed) {
        setPending({
          imageBase64: base64, mediaType: media,
          conditions: s.conditions, consent: s.agreeLog,
          healthConsent: s.agreeHealth && s.conditions.length > 0, cookieId: getCookieId(),
        })
        nav('/loading')
      } else {
        setSource({ imageBase64: base64, mediaType: media })
        nav('/survey')
      }
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
          <TextLinkRow><TextLink onClick={() => nav('/')} iconLeft={<IconChevronLeft size={16} color={C.gray400} />}>뒤로가기</TextLink></TextLinkRow>
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
  const rows = [{ k: '하루 기준', v: data.dose }, { k: '근거', v: data.evidence }]
    .filter((row): row is { k: string; v: string } => !!row.v?.trim())
  return (
    <div className="anim-fade-up" style={{ animationDelay: `${index * 70}ms` }}>
      <Card>
        <div className="flex items-start justify-between" style={{ gap: S.md, marginBottom: S.md }}>
          <span style={TXT.section}>{data.name}</span>
          <VerdictBadge verdict={data.type} />
        </div>
        {data.effect && <p style={{ ...TXT.body, marginBottom: S.lg }}>{data.effect}</p>}
        {/* 값이 없는 줄은 '-' 로 채우지 않고 빼둔다. 둘 다 없으면 상자도 그리지 않는다 */}
        {rows.length > 0 && (
          <div style={{ backgroundColor: C.gray25, borderRadius: R.sm, padding: S.lg }}>
            {rows.map((row, i) => (
              <div key={row.k} style={{ marginTop: i === 0 ? 0 : S.md }}>
                <p style={{ ...TXT.caption, color: C.gray400, marginBottom: 2 }}>{row.k}</p>
                <p style={{ ...TXT.caption, color: C.gray700 }}>{row.v}</p>
              </div>
            ))}
          </div>
        )}
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
          {/* key: 다른 결과로 바뀌면 입력 상태를 새 제품명으로 다시 시작한다 */}
          <ProductNameField key={result.productName} initialName={result.productName} />
          <div className="flex items-center" style={{ gap: S.md, marginTop: S.xl, padding: `${S.lg}px ${S.xl}px`, borderRadius: R.lg, backgroundColor: v.surface }}>
            <div className="shrink-0 anim-pop"><VIcon size={22} color={v.tone} /></div>
            <div className="flex-1 min-w-0">
              <p style={{ ...TXT.section, color: v.tone }}>{v.title}</p>
              <p style={{ ...TXT.caption, color: v.toneText, marginTop: 2 }}>{summarize(result.totalDetected, result.ingredients)}</p>
            </div>
          </div>
          {/* 안내 순서: 정보 제한 > 다이어트 효과 없음 > 카페인(백엔드에서 검출 여부가 오면 추가) */}
          <NoticeStack items={[result.note, result.noDietEffect && '제품에 포함된 감미료는 다이어트에 긍정적 효과는 없어요.']} />
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
