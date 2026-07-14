/**
 * EverymenProfileBody — WPA / labor-poster player-profile skin (#460). Ported
 * from docs/design/profile/templates/Everymen Profile.dc.html: 3px ink borders
 * with a hard offset shadow, a gold top strip, a faint sunburst behind the
 * header, dot-grid paper texture, and condensed Bebas headings with an ink drop-
 * shadow. Follows the global light/dark cascade via --everymen-* /
 * --faction-everymen-* tokens (the paper surface flips in dark).
 *
 * Structure is DefaultProfileBody's locked spine via ProfileSkin. No hardcoded
 * hex — colours via --everymen-* / --faction-everymen-* vars.
 */
import type { ReactNode } from 'react'

import type { ProfileBodyProps } from '../FactionProfileBody'
import { BadgeRow, ProfileSkin, SpectrumLaurel, type ProfileKit } from './profileSkin'

const INK = 'var(--everymen-ink)'
const MUTED = 'var(--everymen-muted)'
const RED = 'var(--everymen-red)'
const GOLD = 'var(--everymen-gold)'
const CREAM = 'var(--everymen-cream)'
const PAPER = 'var(--everymen-paper)'
const BEBAS = 'var(--font-accent)' // Bebas Neue
const MONO = 'var(--font-body)' // Courier Prime

const SUNBURST =
  'repeating-conic-gradient(from 0deg at 50% 40%, rgba(255,255,255,0.05) 0deg 6deg, transparent 6deg 12deg)'

function heading(title: string, eyebrow: string): ReactNode {
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          fontFamily: MONO,
          fontSize: 10,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: MUTED,
          marginBottom: 5,
        }}
      >
        {eyebrow}
      </div>
      <h2
        style={{
          fontFamily: BEBAS,
          fontSize: 34,
          letterSpacing: '0.03em',
          color: INK,
          margin: 0,
          textShadow: '2px 2px 0 rgba(0,0,0,0.12)',
        }}
      >
        {title}
      </h2>
      <div
        style={{
          height: 4,
          marginTop: 8,
          background: `repeating-linear-gradient(90deg, ${RED} 0 14px, ${GOLD} 14px 28px)`,
        }}
      />
    </div>
  )
}

const kit: ProfileKit = {
  slug: 'everymen',
  pageBackground: PAPER,
  pageOverlay: 'radial-gradient(rgba(34,26,18,0.05) 1px, transparent 1px)',
  ink: INK,
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
    boxShadow: '8px 10px 0 rgba(0,0,0,0.4)',
    padding: '34px 40px',
    marginBottom: 44,
    marginTop: 6,
  },
  headerDecoration: (
    <>
      <div
        aria-hidden
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, background: GOLD, zIndex: 3 }}
      />
      <div
        aria-hidden
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: SUNBURST }}
      />
    </>
  ),
  nameSize: 72,
  nameExtra: { color: CREAM, textShadow: '3px 3px 0 rgba(0,0,0,0.3)', letterSpacing: '0.02em' },
  playerEyebrow: 'Player · The Everymen',
  progressionStyle: {
    marginTop: 22,
    background: INK,
    borderLeft: `5px solid ${GOLD}`,
    padding: '16px 18px',
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    maxWidth: 440,
  },
  ringLabel: 'lvl',
  barFill: `linear-gradient(90deg, ${GOLD}, ${RED})`,
  barTrack: 'rgba(255,255,255,0.16)',
  nextLevelLabel: (next) => `NEXT · LVL ${next}`,
  sectionHeading: heading,
  praxisEyebrow: (name) => `Work ${name} finished`,
  praxisEmpty: {
    title: 'No work on the board yet',
    body: 'Answer a call. Put in the first shift.',
  },
  emptyStateStyle: {
    border: `2px dashed ${INK}`,
    padding: 30,
    textAlign: 'center',
    background: CREAM,
  },
  laurel: <SpectrumLaurel centerBg={CREAM} glyphColor={RED} rotate={-8} />,
  badgeTitle: 'Citations',
  badgeBoardStyle: {
    border: `3px solid ${INK}`,
    background: CREAM,
    padding: '4px 14px',
  },
  badgeChipStyle: {
    fontFamily: MONO,
    fontSize: 9,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: MUTED,
    marginLeft: 'auto',
    border: `1px solid ${INK}`,
    padding: '3px 9px',
  },
  badgeRow: (badge, last) => (
    <BadgeRow
      badge={badge}
      last={last}
      dividerColor="rgba(34,26,18,0.18)"
      nameStyle={{ fontFamily: BEBAS, fontSize: 18, letterSpacing: '0.02em', color: INK, lineHeight: 1.15 }}
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
  return <ProfileSkin props={props} kit={kit} />
}
