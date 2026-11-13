/**
 * CovenProfileBody — Cozy Coven profile kit on ward paper (#460, #1209): cat
 * watermark, braided section heads, Caveat lettering. The watermark is the
 * shared `covenSlip` mark used on five surfaces (#2041). The laurel stays the
 * shared `SpectrumLaurel`: site furniture (ADR-0028), only the medallion tinted.
 *
 * INK: `DEEP` is 4.44:1 on the page, so `accent` may only sit on `surface`.
 */
import type { ReactNode } from 'react'

import type { ProfileBodyProps } from '../FactionProfileBody'
import {
  Braid,
  CAPTION,
  CARD,
  BORDER,
  CovenCat,
  DEEP,
  DISPLAY,
  HAND,
  INK,
  PAGE,
  READING,
  SHADOW,
  SOFT,
  Spark,
} from '../../../components/factionMarks/covenSlip'
import { BadgeRow, ProfileSkin, SpectrumLaurel, type ProfileDress } from './profileSkin'
import { factionBodyVars } from '../../../utils/factionBodyFace'

const CHROME = 'var(--font-faction-script)' // Caveat
const BAR = `linear-gradient(90deg, var(--faction-coven-slip-pk), ${DEEP})`

/**
 * Header sparks (#1630): `[left%, top%, size, delay]` from the design. A
 * hand-composed scatter (§4a ornament), so not on the spacing rungs; percentages
 * re-flow at both widths.
 */
const SPARKS: ReadonlyArray<readonly [number, number, number, number]> = [
  [7, 18, 22, 0],
  [22, 72, 14, 1.4],
  [41, 12, 17, 2.6],
  [58, 64, 12, 0.7],
  [72, 28, 20, 3.4],
  [86, 78, 15, 1.9],
  [93, 34, 11, 4.2],
  [63, 88, 16, 2.2],
]

function Sparkfield() {
  return (
    <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
      {SPARKS.map(([left, top, size, delay]) => (
        <span
          key={`${left}-${top}`}
          className="cvn-profile-spark"
          style={{ left: `${left}%`, top: `${top}%`, ['--cvn-spark-delay' as string]: `${delay}s` }}
        >
          <Spark size={size} color="var(--faction-coven-slip-gold)" />
        </span>
      ))}
    </div>
  )
}

/**
 * Cat watermark (#2041). 240px sized by weight on the banner, not the card's
 * 190px. Bottom-right on every mount (#2135).
 */
function Watermark() {
  return <CovenCat size={240} style={{ right: 16, bottom: 16, opacity: 0.08 }} />
}

/** Section heading — the display face, a braid, then the gloss. */
function heading(title: ReactNode, eyebrow: string): ReactNode {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)', flexWrap: 'wrap' }}>
      <span
        style={{
          fontFamily: DISPLAY,
          fontWeight: 600,
          fontSize: 'var(--text-heading)',
          lineHeight: 1.06,
          letterSpacing: '0.02em',
          color: INK,
        }}
      >
        {title}
      </span>
      <Braid style={{ flex: 1 }} />
      <span style={{ ...CAPTION, flex: '0 0 auto' }}>{eyebrow}</span>
    </div>
  )
}

const dress: ProfileDress = {
  slug: 'coven',
  pageVars: factionBodyVars('coven'),
  pageBackground: PAGE,
  ink: INK,
  muted: SOFT,
  accent: DEEP,
  surface: CARD,
  border: BORDER,
  displayFont: DISPLAY,
  eyebrowFont: CHROME,
  bodyFont: READING,
  headerStyle: {
    background: CARD,
    // NO EDGE (#2131, §5): it holds two framed panels; no nested borders.
    borderRadius: 16,
    padding: 'var(--space-2xl)',
    marginBottom: 'var(--space-2xl)',
    boxShadow: SHADOW,
  },
  // Inert layers behind the content (lifted to z-index 2).
  headerDecoration: (
    <>
      <Watermark />
      <Sparkfield />
    </>
  ),
  taglineExtra: { fontFamily: HAND },
  progressionStyle: {
    marginTop: 'var(--space-xl)',
    background: CARD,
    border: `1.5px solid ${BORDER}`,
    borderRadius: 12,
    padding: 'var(--space-lg)',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-lg)',
    maxWidth: 440,
  },
  barFill: BAR,
  barTrack: BORDER,
  sectionHeading: heading,
  emptyStateStyle: {
    border: `1.5px dashed ${BORDER}`,
    borderRadius: 14,
    padding: 'var(--space-2xl)',
    textAlign: 'center',
    background: CARD,
  },
  laurel: <SpectrumLaurel centerBg={CARD} glyphColor={DEEP} rotate={-8} />,
  badgeBoardStyle: {
    border: `2px solid ${BORDER}`,
    borderRadius: 14,
    background: CARD,
    padding: 'var(--space-xs) var(--space-lg)',
  },
  badgeChipStyle: {
    ...CAPTION,
    marginLeft: 'auto',
    border: `1.5px solid ${BORDER}`,
    borderRadius: 20,
    padding: 'var(--space-xs) var(--space-sm)',
  },
  badgeRow: (badge, last) => (
    <BadgeRow
      badge={badge}
      last={last}
      dividerColor={BORDER}
      nameStyle={{ fontFamily: HAND, color: INK, lineHeight: 1.15 }}
      medallion={(glyph) => (
        <span
          style={{
            flexShrink: 0,
            width: 34,
            height: 34,
            borderRadius: '50%',
            background:
              'linear-gradient(150deg, var(--faction-coven-slip-from), var(--faction-coven-slip-lav))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: DEEP,
            border: `1.5px solid ${BORDER}`,
          }}
        >
          {glyph}
        </span>
      )}
    />
  ),
}

export default function CovenProfileBody(props: ProfileBodyProps) {
  return (
    <ProfileSkin
      props={props}
      kit={dress}
    />
  )
}
