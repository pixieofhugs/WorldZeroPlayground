/**
 * EverymenProfileBody — WPA labor-poster profile kit (#460): ink borders, hard
 * offset shadow, gold strip, sunburst, dot-grid paper, Bebas heads. The paper
 * flips in dark; `INK` does not.
 */
import type { ReactNode } from 'react'

import type { ProfileBodyProps } from '../FactionProfileBody'
import { BadgeRow, ProfileSkin, SpectrumLaurel, type ProfileDress } from './profileSkin'
import { factionBodyVars } from '../../../utils/factionBodyFace'

const INK = 'var(--everymen-ink)' // near-black both themes; on the red banner
// Text and rules on the paper (#2227): equals `INK` by day, cream at night.
const PAPER_TEXT = 'var(--everymen-paper-text)'
const MUTED = 'var(--everymen-muted)'
const RED = 'var(--everymen-red)'
const GOLD = 'var(--everymen-gold)'
const CREAM = 'var(--everymen-cream)'
const PAPER = 'var(--everymen-paper)'
const BEBAS = 'var(--font-accent)' // Bebas Neue
const MONO = 'var(--faction-everymen-body-font)' // Courier Prime

function heading(title: ReactNode, eyebrow: string): ReactNode {
  return (
    <div style={{ marginBottom: 'var(--space-lg)' }}>
      <div
        style={{
          fontFamily: MONO,
          fontSize: 'var(--text-base)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: MUTED,
          marginBottom: 'var(--space-xs)',
        }}
      >
        {eyebrow}
      </div>
      <h2
        style={{
          fontFamily: BEBAS,
          fontSize: 'var(--text-heading)',
          letterSpacing: '0.03em',
          color: PAPER_TEXT,
          margin: 0,
          // The poster drop shadow, one drawing on four surfaces (#1609).
          textShadow: `2px 2px 0 color-mix(in srgb, ${INK} 12%, transparent)`,
        }}
      >
        {title}
      </h2>
      <div
        style={{
          height: 4,
          marginTop: 'var(--space-sm)',
          background: `repeating-linear-gradient(90deg, ${RED} 0 14px, ${GOLD} 14px 28px)`,
        }}
      />
    </div>
  )
}

const dress: ProfileDress = {
  slug: 'everymen',
  pageVars: factionBodyVars('everymen'),
  pageBackground: PAPER,
  // Dot-grid texture (#2139) in the ink that flips WITH the paper.
  pageOverlay: `radial-gradient(color-mix(in srgb, ${PAPER_TEXT} 5%, transparent) 1px, transparent 1px)`,
  // Page and panels are PAPER (#2227); the tagline overrides to cream.
  ink: PAPER_TEXT,
  muted: MUTED,
  accent: GOLD,
  surface: CREAM,
  border: INK,
  displayFont: BEBAS,
  eyebrowFont: MONO,
  bodyFont: MONO,
  headerStyle: {
    background: `linear-gradient(150deg, ${RED}, var(--everymen-red-deep))`,
    border: `3px solid ${INK}`,
    // ornament (#1609): a printed register mark, not elevation; 40% is the
    // shared register strength (#2302).
    boxShadow: '8px 10px 0 color-mix(in srgb, var(--color-print-offset) 40%, transparent)',
    padding: 'var(--space-2xl) var(--space-3xl)',
    marginBottom: 'var(--space-4xl)',
    marginTop: 'var(--space-sm)',
  },
  headerDecoration: (
    <>
      <div
        aria-hidden
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, background: GOLD, zIndex: 3 }}
      />
      {/* The faction's one ornament (#2195); `knockout` on the red banner. */}
      <div aria-hidden className="em-burst em-burst-knockout" />
    </>
  ),
  taglineExtra: { color: CREAM, textShadow: `3px 3px 0 color-mix(in srgb, ${INK} 30%, transparent)`, letterSpacing: '0.02em' },
  progressionStyle: {
    marginTop: 'var(--space-xl)',
    background: INK,
    borderLeft: `5px solid ${GOLD}`,
    padding: 'var(--space-lg)',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-lg)',
    maxWidth: 440,
  },
  barFill: `linear-gradient(90deg, ${GOLD}, ${RED})`,
  // On the panel's INK slab (near-black both themes).
  barTrack: `color-mix(in srgb, ${CREAM} 16%, transparent)`,
  sectionHeading: heading,
  // Cream is ornament ink here, never a slab (#2227).
  emptyStateStyle: {
    border: `2px dashed ${PAPER_TEXT}`,
    padding: 'var(--space-2xl)',
    textAlign: 'center',
    background: PAPER,
  },
  laurel: <SpectrumLaurel centerBg={CREAM} glyphColor={RED} rotate={-8} />,
  badgeBoardStyle: {
    border: `3px solid ${PAPER_TEXT}`,
    background: PAPER,
    padding: 'var(--space-xs) var(--space-lg)',
  },
  badgeChipStyle: {
    fontFamily: MONO,
    fontSize: 'var(--text-md)',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: MUTED,
    marginLeft: 'auto',
    border: `1px solid ${PAPER_TEXT}`,
    padding: 'var(--space-xs) var(--space-sm)',
  },
  badgeRow: (badge, last) => (
    <BadgeRow
      badge={badge}
      last={last}
      dividerColor={`color-mix(in srgb, ${PAPER_TEXT} 18%, transparent)`}
      nameStyle={{ fontFamily: BEBAS, letterSpacing: '0.02em', color: PAPER_TEXT, lineHeight: 1.15 }}
      medallion={(glyph) => (
        <span
          style={{
            flexShrink: 0,
            width: 34,
            height: 34,
            borderRadius: '50%',
            background: RED,
            border: `2px solid ${INK}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: CREAM,
          }}
        >
          {glyph}
        </span>
      )}
    />
  ),
}

export default function EverymenProfileBody(props: ProfileBodyProps) {
  return (
    <ProfileSkin
      props={props}
      kit={dress}
    />
  )
}
