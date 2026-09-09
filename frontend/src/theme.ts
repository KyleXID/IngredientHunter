/* 디자인 토큰 — 화면에서 hex·px 직접 사용 금지, 여기서만 정의. */

/** Color — 회색 10단계 + 브랜드 블루 + 판정 3색 */
export const C = {
  blue: '#3182F6',
  blueStrong: '#1B64DA',
  blueSurface: '#EFF4FF',
  gray900: '#191F28',
  gray700: '#333D4B',
  gray600: '#4E5968',
  gray500: '#6B7684',
  gray400: '#8B95A1',
  gray300: '#B0B8C1',
  gray200: '#D1D6DB',
  gray100: '#E5E8EB',
  gray50: '#F2F4F6',
  gray25: '#F9FAFB',
  white: '#FFFFFF',
} as const

/** Font family — index.css 정의 3종 */
export const F = {
  sb: "'Pretendard Variable:SemiBold', sans-serif",
  md: "'Pretendard:Medium', sans-serif",
  rg: "'Pretendard:Regular', sans-serif",
} as const

/** Spacing — 4의 배수 */
export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, x3: 32, x4: 40 } as const

/** Type scale — 7단계 */
export const TXT = {
  hero: { fontFamily: F.sb, fontWeight: 600, fontSize: 36, lineHeight: 1.28, letterSpacing: '-0.05em', color: C.gray900 },
  title: { fontFamily: F.sb, fontWeight: 600, fontSize: 24, lineHeight: 1.38, letterSpacing: '-0.035em', color: C.gray900 },
  section: { fontFamily: F.sb, fontWeight: 600, fontSize: 19, lineHeight: 1.42, letterSpacing: '-0.03em', color: C.gray900 },
  strong: { fontFamily: F.sb, fontWeight: 600, fontSize: 16, lineHeight: 1.45, letterSpacing: '-0.03em', color: C.gray900 },
  label: { fontFamily: F.md, fontWeight: 500, fontSize: 15, lineHeight: 1.45, letterSpacing: '-0.02em', color: C.gray700 },
  body: { fontFamily: F.rg, fontWeight: 400, fontSize: 15, lineHeight: 1.62, letterSpacing: '-0.02em', color: C.gray600 },
  caption: { fontFamily: F.rg, fontWeight: 400, fontSize: 13, lineHeight: 1.55, letterSpacing: '-0.01em', color: C.gray500 },
} as const

/** Radius */
export const R = { chip: 999, xs: 8, sm: 10, md: 14, lg: 16, xl: 20 } as const

/** Layout — navH=0 (라우터 전환, DemoNav 제거) */
export const L = { pageX: 20, pageTop: 32, control: 54, field: 54, navH: 0 } as const

export type VerdictKey = 'safe' | 'warning' | 'harmful'

export const VERDICT: Record<VerdictKey, { title: string; tone: string; toneText: string; surface: string; badge: string }> = {
  safe: { title: '주의 및 유해 성분 없음', tone: '#00A05A', toneText: '#00764A', surface: '#ECF6F1', badge: '안전' },
  warning: { title: '주의 성분 포함', tone: '#D97706', toneText: '#B45309', surface: '#FBF4E9', badge: '주의' },
  harmful: { title: '유해 성분 포함', tone: '#F04452', toneText: '#D22A3A', surface: '#FBEDEE', badge: '유해' },
}
