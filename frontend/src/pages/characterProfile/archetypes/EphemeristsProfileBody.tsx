/**
 * EphemeristsProfileBody — antiquarian cartographer / lapis-and-gold codex
 * player-profile skin (#460). Ported from docs/design/profile/templates/
 * Ephemerists Profile.dc.html: a deep-blue lapis header framed by nested gold /
 * cream / ink rules, a faint graticule overlay, roman-numeral "GRADE" levels,
 * and foxed-parchment cards. Follows the global light/dark cascade via the
 * --eph-* / --faction-ephemerists-* tokens (the vellum surface flips in dark).
 *
 * Structure is DefaultProfileBody's locked spine via ProfileSkin. No hardcoded
 * hex — colours via --eph-* / --faction-ephemerists-* vars.
 */
import type { ReactNode } from 'react'

import type { ProfileBodyProps } from '../FactionProfileBody'
import { BadgeRow, ProfileSkin, SpectrumLaurel, type ProfileKit } from './profileSkin'

const INK = 'var(--eph-ink)'
const MUTED = 'var(--eph-muted)'
const GOLD = 'var(--eph-gold-light)'
const GOLD_DEEP = 'var(--eph-gold)'
const LAPIS = 'var(--eph-lapis)'
const VELLUM = 'var(--eph-vellum)'
const CREAM = 'var(--eph-parchment)'
const DISPLAY = 'var(--eph-display)' // Cinzel
const BODY = 'var(--eph-serif)' // EB Garamond
const SCRIPT = 'var(--eph-script)' // Cormorant Garamond

const ROMAN: readonly [number, string][] = [
  [1000, 'M'],
  [900, 'CM'],
  [500, 'D'],
  [400, 'CD'],
  [100, 'C'],
  [90, 'XC'],
  [50, 'L'],
  [40, 'XL'],
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I'],
]

function toRoman(value: number): string {
  if (value <= 0) return '·'
  let remaining = value
  let out = ''
  for (const [amount, symbol] of ROMAN) {
    while (remaining >= amount) {
      out += symbol
      remaining -= amount
    }
  }
  return out
}

function heading(title: string, eyebrow: string): ReactNode {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontFamily: SCRIPT, fontStyle: 'italic', fontSize: 13, color: MUTED, marginBottom: 4 }}>
        {eyebrow}
      </div>
      <h2
        style={{
          fontFamily: DISPLAY,
          fontSize: 26,
          letterSpacing: '0.06em',
          color: INK,
          margin: 0,
        }}
      >
        {title}
      </h2>
    </div>
  )
}

const kit: ProfileKit = {
  slug: 'ephemerists',
  pageBackground: 'var(--eph-vellum-deep)',
  pageOverlay: 'radial-gradient(rgba(42,29,18,0.05) 1px, transparent 1px)',
  ink: INK,
  muted: MUTED,
  accent: GOLD,
  surface: VELLUM,
  border: GOLD_DEEP,
  displayFont: DISPLAY,
  eyebrowFont: BODY,
  bodyFont: BODY,
  headerStyle: {
    background: `linear-gradient(160deg, ${LAPIS}, var(--eph-lapis-deep))`,
    border: `2px solid ${GOLD}`,
    boxShadow: `0 0 0 4px ${CREAM}, 0 0 0 6px var(--eph-ink), 0 18px 40px -20px rgba(0,0,0,0.6)`,
    padding: '34px 40px',
    marginBottom: 44,
    marginTop: 6,
  },
  headerDecoration: (
    <>
      <div
        aria-hidden
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: GOLD, zIndex: 3 }}
      />
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background:
            'repeating-linear-gradient(0deg, transparent, transparent 22px, rgba(212,171,85,0.08) 22px, rgba(212,171,85,0.08) 23px), repeating-linear-gradient(90deg, transparent, transparent 22px, rgba(212,171,85,0.08) 22px, rgba(212,171,85,0.08) 23px)',
        }}
      />
    </>
  ),
  nameSize: 48,
  nameExtra: { color: CREAM, textShadow: '0 2px 6px rgba(5,19,28,0.6)', letterSpacing: '0.02em' },
  playerEyebrow: 'Player · The Ephemerists',
  progressionStyle: {
    marginTop: 22,
    background: 'rgba(5,19,28,0.35)',
    border: `1px solid ${GOLD}`,
    boxShadow: `inset 0 0 0 3px rgba(5,19,28,0.25)`,
    padding: '16px 18px',
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    maxWidth: 440,
  },
  ringLabel: 'grade',
  barFill: `linear-gradient(90deg, ${GOLD_DEEP}, ${GOLD})`,
  barTrack: 'rgba(212,171,85,0.22)',
  formatLevel: toRoman,
  levelUnitLabel: 'pvncta this grade',
  nextLevelLabel: (next) => `next · grade ${toRoman(next)}`,
  sectionHeading: heading,
  praxisEyebrow: (name) => `Filed to the codex by ${name}`,
  praxisEmpty: {
    title: 'The codex holds no entry yet',
    body: 'Walk a road, and set the first record down.',
  },
  emptyStateStyle: {
    border: `1.5px dashed ${GOLD_DEEP}`,
    padding: 30,
    textAlign: 'center',
    background: VELLUM,
  },
  laurel: <SpectrumLaurel centerBg={CREAM} glyphColor={LAPIS} />,
  badgeTitle: 'Concordances',
  badgeBoardStyle: {
    border: `1px solid ${GOLD_DEEP}`,
    background: VELLUM,
    padding: '4px 14px',
  },
  badgeChipStyle: {
    fontFamily: DISPLAY,
    fontSize: 9,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: MUTED,
    marginLeft: 'auto',
    border: `1px solid ${GOLD_DEEP}`,
    padding: '3px 9px',
  },
  badgeRow: (badge, last) => (
    <BadgeRow
      badge={badge}
      last={last}
      dividerColor="rgba(176,134,58,0.28)"
      nameStyle={{ fontFamily: DISPLAY, fontSize: 14, color: INK, lineHeight: 1.2, letterSpacing: '0.03em' }}
      medallion={(glyph) => (
        <span
          style={{
            flexShrink: 0,
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: LAPIS,
            border: `1px solid ${GOLD}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: GOLD,
          }}
        >
          {glyph}
        </span>
      )}
    />
  ),
}

export default function EphemeristsProfileBody(props: ProfileBodyProps) {
  return <ProfileSkin props={props} kit={kit} />
}
