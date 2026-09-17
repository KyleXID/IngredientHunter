import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { C, F, S, TXT, R, L, VERDICT } from './theme'
import type { VerdictKey } from './theme'
import type { IngredientCard } from './lib/api'

/* ═══ ICONS — 24 그리드 / stroke 1.7 / round cap ═══ */
type IconProps = { size?: number; color?: string }
const SW = 1.7

function Svg({ size = 20, children }: { size?: number; children: ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  )
}

export const IconSearch = ({ size, color = C.gray400 }: IconProps) => (
  <Svg size={size}><circle cx="11" cy="11" r="7" stroke={color} /><path d="M16.5 16.5L21 21" stroke={color} /></Svg>
)
export const IconCamera = ({ size, color = C.white }: IconProps) => (
  <Svg size={size}><rect x="3" y="7" width="18" height="13" rx="3.5" stroke={color} /><circle cx="12" cy="13.5" r="3.6" stroke={color} /><path d="M8.6 7L9.9 4.5h4.2L15.4 7" stroke={color} /></Svg>
)
export const IconImage = ({ size, color = C.gray600 }: IconProps) => (
  <Svg size={size}><rect x="3" y="4" width="18" height="16" rx="3.5" stroke={color} /><circle cx="8.6" cy="9.6" r="1.6" stroke={color} /><path d="M3.5 17.5L9 12l3.4 3.4L16 12l4.5 5" stroke={color} /></Svg>
)
export const IconArrowRight = ({ size, color = C.gray300 }: IconProps) => (
  <Svg size={size}><path d="M5 12h13M12.5 6.5L18 12l-5.5 5.5" stroke={color} /></Svg>
)
export const IconChevronLeft = ({ size, color = C.gray500 }: IconProps) => (
  <Svg size={size}><path d="M15 5l-7 7 7 7" stroke={color} /></Svg>
)
export const IconCheck = ({ size, color = C.white }: IconProps) => (
  <Svg size={size}><path d="M4.5 12.5l5 5 10-11" stroke={color} /></Svg>
)
export const IconWarning = ({ size, color = C.white }: IconProps) => (
  <Svg size={size}><circle cx="12" cy="12" r="9" stroke={color} /><path d="M12 7.2v5.6" stroke={color} /><circle cx="12" cy="16.3" r="1" fill={color} /></Svg>
)
export const IconDanger = ({ size, color = C.white }: IconProps) => (
  <Svg size={size}><path d="M12 3.4L21.4 20H2.6z" stroke={color} /><path d="M12 9.6v4.6" stroke={color} /><circle cx="12" cy="17.3" r="1" fill={color} /></Svg>
)
export const IconInfo = ({ size, color = C.gray300 }: IconProps) => (
  <Svg size={size}><circle cx="12" cy="12" r="9" stroke={color} /><path d="M12 11.2v5.4" stroke={color} /><circle cx="12" cy="7.8" r="1" fill={color} /></Svg>
)
export const IconRefresh = ({ size, color = C.gray600 }: IconProps) => (
  <Svg size={size}><path d="M20.4 15A9 9 0 1 1 18.3 5.7L21.5 8.7" stroke={color} /><path d="M21.5 3.6v5.1h-5.1" stroke={color} /></Svg>
)
export const IconShare = ({ size, color = C.white }: IconProps) => (
  <Svg size={size}><circle cx="17.5" cy="5.5" r="2.6" stroke={color} /><circle cx="6.5" cy="12" r="2.6" stroke={color} /><circle cx="17.5" cy="18.5" r="2.6" stroke={color} /><path d="M8.9 10.6l6.2-3.6M8.9 13.4l6.2 3.6" stroke={color} /></Svg>
)
export const IconDownload = ({ size, color = C.white }: IconProps) => (
  <Svg size={size}><path d="M12 4v11M7.5 10.5L12 15l4.5-4.5" stroke={color} /><path d="M4.5 19h15" stroke={color} /></Svg>
)
export const IconPencil = ({ size, color = C.gray400 }: IconProps) => (
  <Svg size={size}><path d="M16.4 3.6l4 4L8.4 19.6l-5 1 1-5z" stroke={color} /><path d="M14.4 5.6l4 4" stroke={color} /></Svg>
)
export const IconClose = ({ size, color = C.gray400 }: IconProps) => (
  <Svg size={size}><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" stroke={color} /></Svg>
)
export const IconScan = ({ size, color = C.blue }: IconProps) => (
  <Svg size={size}><path d="M4 8.5V6a2 2 0 012-2h2.5M15.5 4H18a2 2 0 012 2v2.5M20 15.5V18a2 2 0 01-2 2h-2.5M8.5 20H6a2 2 0 01-2-2v-2.5" stroke={color} /><path d="M8.5 10.5h7M8.5 14h4.5" stroke={color} /></Svg>
)
export const IconLayers = ({ size, color = C.blue }: IconProps) => (
  <Svg size={size}><path d="M12 3.5l8 4.2-8 4.2-8-4.2z" stroke={color} /><path d="M4 12.2l8 4.2 8-4.2M4 16.3l8 4.2 8-4.2" stroke={color} /></Svg>
)
export const IconShield = ({ size, color = C.blue }: IconProps) => (
  <Svg size={size}><path d="M12 3.2l7 2.8v5.4c0 4.1-2.9 7.5-7 8.4-4.1-.9-7-4.3-7-8.4V6z" stroke={color} /><path d="M9.2 11.8l2 2 3.6-3.8" stroke={color} /></Svg>
)
export const IconDocument = ({ size, color = C.blue }: IconProps) => (
  <Svg size={size}><path d="M13 3.5H6.5a1.5 1.5 0 00-1.5 1.5v14a1.5 1.5 0 001.5 1.5h11a1.5 1.5 0 001.5-1.5V9.5z" stroke={color} /><path d="M13 3.5v6h6" stroke={color} /><path d="M8.5 13.5h7M8.5 16.8h4.5" stroke={color} /></Svg>
)

/* ═══ PRIMITIVES ═══ */

/** 리스트 행 텍스트의 왼쪽 여백 — 돋보기 아이콘의 SVG 안쪽 여백만큼 밀어
 *  눈에 보이는 선을 맞춘 값이다. 스페이싱 스케일 밖의 광학 보정이므로 4의 배수가 아니다. */
export const ROW_TEXT_INSET = 18

/** 리스트 첫 행에는 구분선을 두지 않는다 — 여러 리스트에서 같은 규칙을 쓴다 */
export const rowDivider = (i: number) => (i === 0 ? 'none' : `1px solid ${C.gray50}`)

/** 제품명 — 평소엔 화면 제목처럼 보이고, 탭하면 입력 필드로 바뀐다.
 *  값이 있고 비포커스면 연필, 포커스면 전체삭제.
 *  (인식된 이름이 틀렸을 때 사용자가 바로 고칠 수 있는 자리다) */
export function ProductNameField({ name, onChange }: { name: string; onChange: (v: string) => void }) {
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const setName = onChange

  return (
    <div
      className="flex items-center transition-all duration-150"
      style={{
        gap: S.sm,
        // 비포커스일 때 글자가 페이지 좌측 정렬선에 맞도록 안쪽 여백만큼 당겨둔다
        margin: `0 -${S.md}px`,
        padding: `${S.sm}px ${S.md}px`,
        borderRadius: R.md,
        backgroundColor: focused ? C.white : 'transparent',
        border: `${focused ? 1.5 : 1}px solid ${focused ? C.blue : 'transparent'}`,
      }}
    >
      <input
        ref={inputRef}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={(e) => { if (e.key === 'Enter') inputRef.current?.blur() }}
        placeholder="제품명을 입력해 주세요"
        className="flex-1 bg-transparent outline-none min-w-0"
        style={TXT.productName}
      />
      {name && focused && (
        <button
          aria-label="전체 삭제"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setName('')}
          className="shrink-0 flex items-center justify-center transition-opacity active:opacity-60"
          style={{ width: 24, height: 24, borderRadius: R.chip, backgroundColor: C.gray100 }}
        >
          <IconClose size={14} color={C.gray500} />
        </button>
      )}
      {name && !focused && (
        <button
          aria-label="제품명 수정"
          onClick={() => {
            const el = inputRef.current
            if (!el) return
            el.focus()
            const end = el.value.length
            el.setSelectionRange(end, end)
          }}
          className="shrink-0 flex items-center justify-center transition-opacity active:opacity-60"
          style={{ width: 24, height: 24 }}
        >
          <IconPencil size={18} color={C.gray300} />
        </button>
      )}
    </div>
  )
}

/** 화면 뼈대: 스크롤 본문 + 하단 고정 액션(본문 위에 겹쳐 페이드) */
export function Screen({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  const footerRef = useRef<HTMLDivElement>(null)
  const [footerH, setFooterH] = useState(0)
  useEffect(() => {
    const el = footerRef.current
    if (!el) { setFooterH(0); return }
    const measure = () => setFooterH(el.offsetHeight)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [!!footer])
  return (
    <div style={{ position: 'fixed', top: L.navH, left: 0, right: 0, bottom: 0, backgroundColor: C.white }}>
      <div className="h-full overflow-y-auto anim-fade-up" style={{ paddingBottom: footerH }}>{children}</div>
      {footer && (
        <div
          ref={footerRef}
          data-footer-block
          className="absolute left-0 right-0 bottom-0"
          style={{
            padding: `${S.x3 + S.lg}px ${L.pageX}px calc(${S.xxl}px + env(safe-area-inset-bottom, 0px))`,
            background: `linear-gradient(to bottom, rgba(255,255,255,0), ${C.white} ${S.x3}px)`,
            pointerEvents: 'none',
          }}
        >
          <div style={{ pointerEvents: 'auto' }}>{footer}</div>
        </div>
      )}
    </div>
  )
}

export function Body({ children }: { children: ReactNode }) {
  return <div style={{ padding: `${L.pageTop}px ${L.pageX}px ${S.sm}px` }}>{children}</div>
}

export function PageTitle({ title, desc, hero = false }: { title: ReactNode; desc?: string; hero?: boolean }) {
  return (
    <div style={{ marginBottom: S.xxl }}>
      <h1 style={hero ? TXT.hero : TXT.title}>{title}</h1>
      {desc && <p style={{ ...TXT.body, marginTop: S.md }}>{desc}</p>}
    </div>
  )
}

/** 섹션 제목 — action 을 주면 같은 줄 오른쪽에 보조 액션을 붙인다(높이는 라벨 기준 유지) */
export function SectionLabel({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between" style={{ marginBottom: S.md }}>
      <p style={{ ...TXT.caption, fontFamily: F.md, fontWeight: 500, color: C.gray400 }}>{children}</p>
      {action}
    </div>
  )
}

/** 섹션 제목 옆의 작은 보조 액션 — 손가락이 닿을 높이(32)를 확보하되,
 *  위아래 음수 마진으로 줄 높이는 라벨과 같게 두고 오른쪽 여백만 시각 정렬선에 맞춘다. */
export function InlineAction({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="shrink-0 flex items-center transition-opacity active:opacity-60"
      style={{ ...TXT.caption, color: C.gray400, height: 32, margin: `-6px -${S.sm}px -6px 0`, padding: `0 ${S.sm}px` }}
    >
      {children}
    </button>
  )
}

export function Button({
  children, onClick, variant = 'primary', disabled = false, icon,
}: { children: ReactNode; onClick?: () => void; variant?: 'primary' | 'secondary'; disabled?: boolean; icon?: ReactNode }) {
  const bg = disabled ? C.gray100 : variant === 'primary' ? C.blue : C.gray50
  const fg = disabled ? C.gray400 : variant === 'primary' ? C.white : C.gray700
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center justify-center gap-2 transition-all duration-150 active:scale-[0.98]"
      style={{ height: L.control, borderRadius: R.md, backgroundColor: bg, ...TXT.control, color: fg }}
    >
      {icon}{children}
    </button>
  )
}

/** 접히는 영역 — 검색 포커스 중에 히어로·칩이 같은 모션으로 사라진다.
 *  높이는 내용에서 직접 잰다. 고정값을 두면 목록이 늘었을 때 조용히 잘린다. */
export function Collapse({ open, children }: { open: boolean; children: ReactNode }) {
  const innerRef = useRef<HTMLDivElement>(null)
  const [contentH, setContentH] = useState(0)
  useLayoutEffect(() => {
    const el = innerRef.current
    if (!el) return
    const measure = () => setContentH(el.scrollHeight)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return (
    <div style={{ maxHeight: open ? contentH : 0, opacity: open ? 1 : 0, overflow: 'hidden', transition: 'max-height 280ms cubic-bezier(0.2,0.8,0.2,1), opacity 160ms ease-out' }}>
      {/* flow-root: 자식 margin 이 밖으로 새지 않아야 높이를 정확히 잴 수 있다 */}
      <div ref={innerRef} style={{ display: 'flow-root' }}>{children}</div>
    </div>
  )
}

/** 하단 보조 링크 한 줄 — 링크가 하나든 둘이든 이 줄에 담는다 */
export function TextLinkRow({ children }: { children: ReactNode }) {
  return <div className="flex items-center justify-center" style={{ gap: S.md, marginTop: S.md }}>{children}</div>
}

/** 하단 보조 링크 (뒤로가기 / 어떻게 분석하나요 …) — 반드시 TextLinkRow 안에 둔다 */
export function TextLink({ children, onClick, iconLeft, iconRight }: { children: ReactNode; onClick: () => void; iconLeft?: ReactNode; iconRight?: ReactNode }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1.5 transition-opacity active:opacity-60" style={{ ...TXT.label, color: C.gray500, height: 40, padding: `0 ${S.md}px` }}>
      {iconLeft}{children}{iconRight}
    </button>
  )
}

export function Card({ children, padded = true }: { children: ReactNode; padded?: boolean }) {
  return (
    <div style={{ borderRadius: R.lg, border: `1px solid ${C.gray100}`, backgroundColor: C.white, overflow: 'hidden', padding: padded ? S.xl : 0 }}>
      {children}
    </div>
  )
}

export function Notice({ children, plain = false }: { children: ReactNode; plain?: boolean }) {
  return (
    <div className="flex items-start" style={{ gap: S.sm, backgroundColor: plain ? 'transparent' : C.gray25, borderRadius: plain ? 0 : R.md, padding: plain ? 0 : `${S.lg}px ${S.lg}px` }}>
      <div className="shrink-0" style={{ marginTop: 1 }}><IconInfo size={17} color={C.gray300} /></div>
      <p style={TXT.caption}>{children}</p>
    </div>
  )
}

/** 제품 칩 — 누르면 바로 분석으로 간다. 인기/최근이 같은 상자 규격을 쓰고 면만 다르다.
 *  · 기본(인기): 회색 면 + 투명 테두리
 *  · recent(최근 본): 흰 면 + 회색 테두리 — 강조하지 않으면서 구분만 한다.
 *  투명 테두리를 둬야 두 변형의 높이가 1px씩 어긋나지 않는다. */
export function ProductChip({ name, recent = false, onClick, onRemove }: {
  name: string; recent?: boolean; onClick: () => void; onRemove?: () => void
}) {
  return (
    <div
      className="flex items-center"
      style={{
        borderRadius: R.chip,
        backgroundColor: recent ? C.white : C.gray50,
        border: `1px solid ${recent ? C.gray100 : 'transparent'}`,
      }}
    >
      <button
        onClick={onClick}
        className="transition-all duration-150 active:scale-[0.96]"
        style={{ padding: `${S.sm}px ${onRemove ? 0 : S.md}px ${S.sm}px ${S.md}px`, ...TXT.caption, color: C.gray600 }}
      >
        {name}
      </button>
      {onRemove && (
        /* 여백은 아이콘 자체의 빈 공간(14 박스 안 글리프는 약 7)을 빼고 잡아야
           눈에 보이는 간격이 글자쪽 8 · 칩 끝 13 으로 읽힌다.
           패딩을 4씩 더 주고 음수 마진으로 되돌려, 보이는 자리는 그대로 두고
           손가락이 닿는 범위만 26 → 34 로 넓힌다. */
        <button
          onClick={onRemove}
          aria-label={`${name} 기록 삭제`}
          className="flex items-center justify-center transition-opacity active:opacity-60"
          style={{ padding: `0 ${S.md}px 0 ${S.sm}px`, margin: `0 -${S.xs}px 0 -${S.xs}px`, alignSelf: 'stretch' }}
        >
          <IconClose size={14} color={C.gray400} />
        </button>
      )}
    </div>
  )
}

/** 알약 배지 — 판정 배지·동의(필수/선택) 배지가 같은 규격. compact는 여백만 축소. */
export function Pill({ children, bg, fg, compact = false }: { children: ReactNode; bg: string; fg: string; compact?: boolean }) {
  return (
    <span className="shrink-0" style={{ padding: compact ? `2px ${S.sm}px` : `${S.xs}px ${S.md}px`, borderRadius: R.chip, backgroundColor: bg, color: fg, fontFamily: F.md, fontWeight: 500, fontSize: 12, letterSpacing: '-0.02em' }}>
      {children}
    </span>
  )
}

export function VerdictBadge({ verdict }: { verdict: VerdictKey }) {
  const v = VERDICT[verdict]
  return <Pill bg={v.surface} fg={v.toneText}>{v.badge}</Pill>
}

/** 토스트 — 화면을 막지 않고 잠깐 알리고 사라진다. 시트 위에도 떠야 해서 z 를 시트보다 높게 둔다.
 *  누를 것이 없으므로 포인터 이벤트를 받지 않는다(뒤 버튼을 가리지 않게). */
export function Toast({ message, onDone, duration = 2800 }: { message: string; onDone: () => void; duration?: number }) {
  const done = useRef(onDone)
  done.current = onDone
  useEffect(() => {
    const t = setTimeout(() => done.current(), duration)
    return () => clearTimeout(t)
  }, [message, duration])
  /* body 로 옮겨 그린다. Screen 의 스크롤 영역에는 transform 애니메이션이 걸려 있어
     그 안에 두면 position:fixed 의 기준이 그 요소가 되고, 하단 액션 영역 뒤로 깔린다. */
  return createPortal(
    <div className="fixed left-0 right-0 flex justify-center anim-fade-up" style={{ bottom: S.x3, zIndex: 60, padding: `0 ${L.pageX}px`, pointerEvents: 'none' }}>
      <p style={{ ...TXT.label, color: C.white, textAlign: 'center', backgroundColor: 'rgba(25,31,40,0.92)', padding: `${S.md}px ${S.lg}px`, borderRadius: R.md, boxShadow: '0 8px 24px rgba(25,31,40,0.24)' }}>{message}</p>
    </div>,
    document.body,
  )
}

/** 서비스 링크 공유 — 결과 이미지가 아니라 "이 앱 자체"를 알리는 글로벌 공유다.
 *  히어로 오른쪽 위에 아이콘만 둔다. 어느 화면에서 눌러도 같은 자리에 있어야
 *  '글로벌'이라는 말이 성립한다.
 *
 *  모바일은 OS 공유 시트(카카오톡·인스타 등), 공유가 막힌 데스크톱은 링크 복사.
 *  아이콘만 있어 글자를 바꿔 알릴 자리가 없으므로 결과는 토스트로 알린다.
 *  공유 주소는 항상 인트로(/) 고정 — 결과 화면 주소를 남에게 주면 맥락이 없다. */
export function ShareAppButton() {
  const [toast, setToast] = useState('')

  async function share() {
    const url = new URL(import.meta.env.BASE_URL, window.location.origin).href
    const data = { title: document.title, text: '전성분 표를 찍으면 조심해야 할 성분을 찾아줘요.', url }
    try {
      if (navigator.share) return await navigator.share(data)
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return // 사용자가 공유 시트를 닫은 것
      // 그 밖의 실패는 공유가 막힌 환경으로 보고 복사로 넘어간다
    }
    try {
      await navigator.clipboard.writeText(url)
      setToast('링크를 복사했어요.')
    } catch {
      setToast('링크를 복사하지 못했어요.')
    }
  }

  return (
    <>
      {toast && <Toast message={toast} onDone={() => setToast('')} />}
      {/* 40 탭 영역. 아이콘 박스의 빈 여백(약 2)까지 감안해 오른쪽으로 8 당겨야
          그림이 본문 오른쪽 선에 맞아 보인다. */}
      <button
        aria-label="서비스 링크 공유하기"
        onClick={share}
        className="flex items-center justify-center transition-opacity active:opacity-60"
        style={{ width: 40, height: 40, marginRight: -S.sm }}
      >
        <IconShare size={20} color={C.gray400} />
      </button>
    </>
  )
}

export function Sheet({ title, onClose, children, footer }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center anim-fade-in" style={{ top: L.navH, backgroundColor: 'rgba(25,31,40,0.48)', backdropFilter: 'blur(3px)', padding: L.pageX }} onClick={onClose}>
      <div className="w-full bg-white overflow-hidden flex flex-col anim-sheet" style={{ maxWidth: 400, maxHeight: '82dvh', borderRadius: R.xl, boxShadow: '0 20px 50px rgba(25,31,40,0.20)' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between shrink-0" style={{ padding: `${S.xl}px ${S.xl}px ${S.lg}px` }}>
          <p style={TXT.section}>{title}</p>
          <button onClick={onClose} className="flex items-center justify-center transition-opacity active:opacity-60" style={{ width: 32, height: 32, marginRight: -6 }}><IconClose size={20} /></button>
        </div>
        <div className="overflow-y-auto" style={{ padding: `${S.xs}px ${L.pageX}px ${S.xxl}px` }}>{children}</div>
        {footer && <div className="shrink-0" style={{ padding: `0 ${L.pageX}px ${S.xl}px` }}>{footer}</div>}
      </div>
    </div>
  )
}

export function CheckBox({ on, size = 22 }: { on: boolean; size?: number }) {
  return (
    <div className="shrink-0 flex items-center justify-center transition-all duration-150" style={{ width: size, height: size, borderRadius: R.xs, backgroundColor: on ? C.blue : C.white, border: `${on ? 1.5 : 1}px solid ${on ? C.blue : C.gray200}` }}>
      {on && <div className="anim-pop"><IconCheck size={size - 8} color={C.white} /></div>}
    </div>
  )
}

/** 라디오 표식 — 하나만 고르는 그룹에서 체크박스 대신 쓴다. 크기·색은 체크박스와 같다. */
export function RadioMark({ on, size = 22 }: { on: boolean; size?: number }) {
  return (
    <div className="shrink-0 flex items-center justify-center transition-all duration-150" style={{ width: size, height: size, borderRadius: R.chip, backgroundColor: on ? C.blue : C.white, border: `${on ? 1.5 : 1}px solid ${on ? C.blue : C.gray200}` }}>
      {on && <div className="anim-pop" style={{ width: size / 4, height: size / 4, borderRadius: R.chip, backgroundColor: C.white }} />}
    </div>
  )
}

/** 동의 한 줄 — 체크박스 + 필수/선택 배지 + 문구 + 자세히 보기 */
export function ConsentRow({ on, onToggle, children, onDetail, required = false }: { on: boolean; onToggle: () => void; children: ReactNode; onDetail?: () => void; required?: boolean }) {
  return (
    <div className="flex items-center" style={{ gap: S.sm }}>
      <button onClick={onToggle} className="flex items-center flex-1 min-w-0 text-left" style={{ gap: S.sm }}>
        <CheckBox on={on} size={22} />
        <Pill compact bg={required ? C.blueSurface : C.gray50} fg={required ? C.blue : C.gray500}>{required ? '필수' : '선택'}</Pill>
        <span className="whitespace-nowrap" style={TXT.label}>{children}</span>
      </button>
      {onDetail && (
        <button onClick={onDetail} className="shrink-0 flex items-center transition-opacity active:opacity-60" style={{ gap: S.xs, ...TXT.caption, color: C.gray400 }}>
          자세히 보기<IconInfo size={15} color={C.gray300} />
        </button>
      )}
    </div>
  )
}

/** 결과 안내 문구 묶음 — 넘겨준 순서대로 쌓는다(정보 제한 > 다이어트 효과 없음 > 카페인).
 *  빈 값은 건너뛰고, 남는 게 없으면 자리도 차지하지 않는다. */
export function NoticeStack({ items }: { items: (string | null | undefined | false)[] }) {
  const list = items.filter((t): t is string => !!t)
  if (list.length === 0) return null
  return (
    <div style={{ marginTop: S.lg, display: 'flex', flexDirection: 'column', gap: S.md }}>
      {list.map((t) => <Notice plain key={t}>{t}</Notice>)}
    </div>
  )
}

/** "검출 성분 8개 중 주의 2개" */
export function summarize(total: number, ingredients: IngredientCard[]): string {
  const harm = ingredients.filter((i) => i.type === 'harmful').length
  const warn = ingredients.filter((i) => i.type === 'warning').length
  const parts: string[] = []
  if (harm) parts.push(`유해 ${harm}개`)
  if (warn) parts.push(`주의 ${warn}개`)
  return parts.length ? `검출 성분 ${total}개 중 ${parts.join(' · ')}` : `검출 성분 ${total}개 중 주의·유해 성분 없음`
}

/* ═══ MODALS ═══ */
export function HowItWorksModal({ onClose }: { onClose: () => void }) {
  const steps = [
    { Icon: IconScan, title: '성분 읽어오기', desc: '찍은 전성분 표에서 원재료명과 영양성분을 하나씩 글자로 읽어와요.' },
    { Icon: IconLayers, title: '성분 대조하기', desc: '읽어온 성분을 식약처·WHO·EFSA·JECFA 공식 자료와 하나씩 대조해요.' },
    { Icon: IconShield, title: '위험도 가려내기', desc: '최신 연구와 ADI(하루에 먹어도 괜찮은 양) 기준을 보고 안전·주의·유해로 나눠요.' },
    { Icon: IconDocument, title: '근거 보여주기', desc: '왜 그렇게 판단했는지 연구 논문과 공식 가이드라인을 성분마다 보여줘요.' },
  ]
  return (
    <Sheet title="어떻게 분석하나요" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: S.xxl }}>
        {steps.map(({ Icon, title, desc }) => (
          <div key={title} className="flex gap-3.5">
            <div className="shrink-0 flex items-center justify-center" style={{ width: 40, height: 40, borderRadius: R.md, backgroundColor: C.blueSurface }}><Icon size={21} color={C.blue} /></div>
            <div className="flex-1" style={{ paddingTop: 2 }}>
              <p style={{ ...TXT.strong, marginBottom: S.xs }}>{title}</p>
              <p style={TXT.body}>{desc}</p>
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: S.xxl, backgroundColor: C.gray25, borderRadius: R.md, padding: `${S.lg}px ${S.xl}px` }}>
        <p style={{ ...TXT.caption, color: C.gray400, marginBottom: S.md }}>참조하는 공식 자료</p>
        {['식품의약품안전처(MFDS)', 'WHO / JECFA', 'EFSA (유럽식품안전청)', 'IARC 발암성 분류'].map((src) => (
          <p key={src} style={{ ...TXT.caption, color: C.gray700, marginTop: S.xs }}>{src}</p>
        ))}
      </div>
      <p style={{ ...TXT.caption, color: C.gray400, textAlign: 'center', marginTop: S.xl }}>
        이 서비스는 의학적 진단이나 처방을 대신하지 않아요.<br />건강이 걱정된다면 전문가와 상담해 주세요.
      </p>
    </Sheet>
  )
}

/** 동의 상세 모달 공통 껍데기 — 항목 목록 + 하단 고지 */
function ConsentSheet({ title, items, notice, onClose }: { title: string; items: { title: string; desc: string }[]; notice: string; onClose: () => void }) {
  return (
    <Sheet title={title} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: S.xl }}>
        {items.map((it) => (
          <div key={it.title}>
            <p style={{ ...TXT.strong, marginBottom: S.xs }}>{it.title}</p>
            <p style={TXT.body}>{it.desc}</p>
          </div>
        ))}
      </div>
      <div style={{ marginTop: S.xxl }}><Notice>{notice}</Notice></div>
    </Sheet>
  )
}

/** 건강 정보 활용 동의 상세 (필수) */
export function HealthConsentModal({ onClose }: { onClose: () => void }) {
  return (
    <ConsentSheet
      title="건강 정보를 이렇게 써요"
      onClose={onClose}
      items={[
        { title: '무엇을 받나요', desc: '직접 고른 건강 상태예요. 당뇨병, 고혈압, 임신 여부 같은 항목이에요.' },
        { title: '어디에 쓰나요', desc: '고른 상태에 맞춰 성분 위험도를 판단하고, 더 정확한 결과를 보여드리는 데 써요.' },
        { title: '어디에 보관하나요', desc: '고른 건강 상태는 서버가 아니라 지금 쓰는 브라우저에만 남겨요. 다음에 분석할 때 다시 고르지 않아도 되니까요. 브라우저 설정에서 언제든 지울 수 있어요.' },
        { title: '언제까지 갖고 있나요', desc: '결과를 보여드리면 서버에서는 바로 지워요. 사용 기록 활용에도 동의했다면, 그 기록에 남는 부분은 6개월 보관해요.' },
        { title: '동의하지 않으면요', desc: '건강 상태에 맞춘 결과를 만들 수 없어요. 모두 \'해당없음\'으로 고르면 이 동의 없이도 분석할 수 있어요.' },
      ]}
      notice="건강 상태는 민감정보라서 「개인정보 보호법」 제23조에 따라 따로 동의를 받고 있어요. 받은 정보는 위에 적은 목적 밖으로 쓰거나 다른 곳에 넘기지 않아요."
    />
  )
}

/** 사용 기록 활용 동의 상세 (선택) */
export function LogConsentModal({ onClose }: { onClose: () => void }) {
  return (
    <ConsentSheet
      title="사용 기록을 이렇게 써요"
      onClose={onClose}
      items={[
        { title: '무엇을 남기나요', desc: '기기를 구분하는 쿠키와 함께 서비스를 어떻게 사용하는지 남겨요. 건강 상태를 골랐다면 그 항목도 함께 남아요.' },
        { title: '개인을 알아볼 수 있나요', desc: '누구인지 알아볼 수 없는 형태로만 저장해요. 이름이나 연락처는 받지 않아요.' },
        { title: '어디에 쓰나요', desc: '서비스를 어떻게 사용하는지 살펴 개선하는 데 써요. 광고에는 쓰지 않아요.' },
        { title: '언제까지 갖고 있나요', desc: '남긴 기록은 6개월 동안 보관하고, 그 뒤에 지워요.' },
        { title: '동의하지 않으면요', desc: '동의하지 않아도 분석 결과는 그대로 볼 수 있어요. 다만 기록이 남지 않아 서비스 개선에는 반영되지 않아요.' },
      ]}
      notice="쿠키는 로그인 없이 기기를 구분하려고 써요. 브라우저에서 언제든 지울 수 있어요."
    />
  )
}

/** 공유 카드를 PNG 로 만든다. html2canvas-pro 는 무거우니 버튼을 누른 순간에만 받아온다.
 *  (-pro 를 쓰는 이유: Tailwind v4 가 깔아두는 oklch() 색을 원본 html2canvas 가 못 읽는다.) */
async function cardToBlob(el: HTMLElement): Promise<Blob | null> {
  const { default: html2canvas } = await import('html2canvas-pro')
  const canvas = await html2canvas(el, { scale: 2, backgroundColor: C.white, logging: false })
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
}

/** 파일명에 쓸 수 없는 문자를 걷어낸다. 제품명이 비면 기본값. */
function imageFileName(productName: string) {
  const base = productName.trim().replace(/[\\/:*?"<>|]/g, '').slice(0, 40)
  return `${base || '성분분석'}.png`
}

export function ShareModal({ verdict, productName, total, ingredients, onClose }: { verdict: VerdictKey; productName: string; total: number; ingredients: IngredientCard[]; onClose: () => void }) {
  const v = VERDICT[verdict]
  const cardRef = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState<'save' | 'share' | null>(null)
  const [toast, setToast] = useState('')

  function download(blob: Blob) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = imageFileName(productName)
    a.click()
    // 즉시 해제하면 일부 브라우저가 내려받기를 시작하기 전에 URL 이 사라진다.
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  async function run(mode: 'save' | 'share') {
    if (busy || !cardRef.current) return
    setBusy(mode)
    try {
      const blob = await cardToBlob(cardRef.current)
      if (!blob) return
      if (mode === 'save') return download(blob)

      const file = new File([blob], imageFileName(productName), { type: 'image/png' })
      /* 공유를 못 하는 환경(대부분 데스크톱)에서 말없이 저장해 버리면 사용자가 무엇이
         일어났는지 모른다. 어디서 되는지 알려주고, 저장은 옆 버튼으로 남겨 둔다. */
      if (!navigator.share || !navigator.canShare?.({ files: [file] })) {
        return setToast('휴대폰에서 다른 앱으로 공유할 수 있어요.')
      }
      await navigator.share({ files: [file], title: productName.trim() || v.title })
    } catch (e) {
      // 공유 시트를 사용자가 닫은 건 오류가 아니다.
      if ((e as Error)?.name !== 'AbortError') console.error(e)
    } finally {
      setBusy(null)
    }
  }

  /* 두 버튼은 기기와 상관없이 항상 같이 낸다. 공유 가능 여부로 버튼을 숨기면 화면이
     기기마다 달라져 검토가 안 되고, 정작 공유를 쓸 모바일에서만 보이게 된다.
     공유가 막힌 데스크톱에서는 run() 이 저장으로 떨어뜨린다. */
  const footer = (
    <div className="flex" style={{ gap: S.sm }}>
      <div className="flex-1"><Button variant="secondary" disabled={!!busy} icon={<IconDownload size={19} color={C.gray700} />} onClick={() => run('save')}>{busy === 'save' ? '만드는 중' : '이미지 저장'}</Button></div>
      <div className="flex-1"><Button disabled={!!busy} icon={<IconShare size={19} />} onClick={() => run('share')}>{busy === 'share' ? '만드는 중' : '공유'}</Button></div>
    </div>
  )

  return (
    <>
    {toast && <Toast message={toast} onDone={() => setToast('')} />}
    <Sheet title="이미지로 공유" onClose={onClose} footer={footer}>
      <div ref={cardRef} style={{ borderRadius: R.lg, overflow: 'hidden', border: `1px solid ${C.gray100}` }}>
        {/* 제품명을 모를 수 있다(사진 분석에서 이름을 못 읽고 사용자가 적지도 않은 경우).
            그때는 제목 자리를 비우지 않고 판정 문구를 올린다 — 카드만 봐도 무엇에 대한 결과인지 남는다. */}
        <div style={{ backgroundColor: v.surface, padding: `${S.xxl}px ${S.xl}px` }}>
          <p style={TXT.productName}>{productName.trim() || v.title}</p>
          <p style={{ ...TXT.caption, color: v.toneText, marginTop: S.xs }}>{summarize(total, ingredients)}</p>
        </div>
        <div style={{ padding: `${S.lg}px ${S.xl}px ${S.xl}px`, backgroundColor: C.white }}>
          {ingredients.length > 0 ? (
            ingredients.map((ing, i) => (
              <div key={ing.name} className="flex items-center justify-between gap-3" style={{ paddingTop: i === 0 ? 0 : S.md, marginTop: i === 0 ? 0 : S.md, borderTop: rowDivider(i) }}>
                <span style={TXT.label}>{ing.name}</span>
                <VerdictBadge verdict={ing.type} />
              </div>
            ))
          ) : (
            <p style={TXT.caption}>조심할 성분은 없었어요.</p>
          )}
          {ingredients.length > 0 && <p style={{ ...TXT.caption, color: C.gray300, marginTop: S.lg }}>식약처·WHO·EFSA 기준</p>}
        </div>
      </div>
    </Sheet>
    </>
  )
}
