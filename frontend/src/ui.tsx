import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
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
export const ROW_TEXT_INSET = 18
export const rowDivider = (i: number) => (i === 0 ? 'none' : `1px solid ${C.gray50}`)

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

export function SectionLabel({ children }: { children: ReactNode }) {
  return <p style={{ ...TXT.caption, fontFamily: F.md, fontWeight: 500, color: C.gray400, marginBottom: S.md }}>{children}</p>
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
      style={{ height: L.control, borderRadius: R.md, backgroundColor: bg, color: fg, fontFamily: F.sb, fontWeight: 600, fontSize: 17, letterSpacing: '-0.03em' }}
    >
      {icon}{children}
    </button>
  )
}

export function Collapse({ open, maxHeight, children }: { open: boolean; maxHeight: number; children: ReactNode }) {
  return (
    <div style={{ maxHeight: open ? maxHeight : 0, opacity: open ? 1 : 0, overflow: 'hidden', transition: 'max-height 280ms cubic-bezier(0.2,0.8,0.2,1), opacity 160ms ease-out' }}>
      {children}
    </div>
  )
}

export function TextLink({ children, onClick, iconLeft, iconRight }: { children: ReactNode; onClick: () => void; iconLeft?: ReactNode; iconRight?: ReactNode }) {
  return (
    <div className="flex justify-center" style={{ marginTop: S.md }}>
      <button onClick={onClick} className="flex items-center gap-1.5 transition-opacity active:opacity-60" style={{ ...TXT.label, color: C.gray500, height: 40, padding: `0 ${S.md}px` }}>
        {iconLeft}{children}{iconRight}
      </button>
    </div>
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
        { title: '언제까지 갖고 있나요', desc: '결과를 보여드리면 바로 지워요. 사용 기록 활용에도 동의했다면, 그 기록에 남는 부분은 6개월 보관해요.' },
        { title: '동의하지 않으면요', desc: '건강 상태에 맞춘 결과를 만들 수 없어요. 건강 상태를 고르지 않으면 이 동의 없이도 분석할 수 있어요.' },
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

export function ShareModal({ verdict, productName, total, ingredients, onClose }: { verdict: VerdictKey; productName: string; total: number; ingredients: IngredientCard[]; onClose: () => void }) {
  const v = VERDICT[verdict]
  return (
    <Sheet title="이미지로 공유" onClose={onClose} footer={<Button icon={<IconDownload size={19} />} onClick={onClose}>이미지 저장</Button>}>
      <div style={{ borderRadius: R.lg, overflow: 'hidden', border: `1px solid ${C.gray100}` }}>
        <div style={{ backgroundColor: v.surface, padding: `${S.xxl}px ${S.xl}px` }}>
          <p style={{ ...TXT.title, fontSize: 22 }}>{productName}</p>
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
  )
}
