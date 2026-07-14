/**
 * SnideProfileBody — S.N.I.D.E. ransom-note / crime-board player-profile skin
 * (#460). Ported from docs/design/profile/templates/SNIDE Profile.dc.html: hard
 * offset shadows, a jagged clip-path strip, skewed Impact headlines with a pink
 * drop-shadow, tape strips, halftone dot texture. SNIDE is ALWAYS DARK — its
 * --faction-snide-* tokens are identical in both themes, so the container scopes
 * data-theme="dark" to itself and never mutates the global theme.
 *
 * Structure is DefaultProfileBody's locked spine via ProfileSkin. No hardcoded
 * hex — colours via --faction-snide-* vars.
 */
import type { ReactNode } from 'react'

import type { ProfileBodyProps } from '../FactionProfileBody'
import { BadgeRow, ProfileSkin, SpectrumLaurel, type ProfileKit } from './profileSkin'

const INK = 'var(--faction-snide-ink)' // near-black
const PAPER = 'var(--faction-snide-paper)' // warm xerox
const ACID = 'var(--faction-snide-acid)' // acid green accent
const PINK = 'var(--faction-snide-pink)' // hot zine pink
const IMPACT = 'var(--faction-snide-font-impact)' // Anton
const TYPE = 'var(--faction-snide-font-type)' // Special Elite
const MARKER = 'var(--faction-snide-font-marker)' // Permanent Marker

const JAGGED =
  'polygon(0 0,4% 40%,8% 0,12% 40%,16% 0,20% 40%,24% 0,28% 40%,32% 0,36% 40%,40% 0,44% 40%,48% 0,52% 40%,56% 0,60% 40%,64% 0,68% 40%,72% 0,76% 40%,80% 0,84% 40%,88% 0,92% 40%,96% 0,100% 40%,100% 100%,0 100%)'

function heading(title: string, eyebrow: string): ReactNode {
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          fontFamily: TYPE,
          fontSize: 10,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: PAPER,
          marginBottom: 5,
        }}
      >
        {eyebrow}
      </div>
      <h2
        style={{
          fontFamily: IMPACT,
          fontSize: 34,
          letterSpacing: '0.02em',
          textTransform: 'uppercase',
          color: ACID,
          transform: 'skewX(-5deg)',
          margin: 0,
          textShadow: `2px 2px 0 ${PINK}`,
        }}
      >
        {title}
      </h2>
      <div style={{ height: 2, marginTop: 8, borderTop: `2px dashed ${PINK}` }} />
    </div>
  )
}

const kit: ProfileKit = {
  slug: 'snide',
  dataTheme: 'dark',
  pageBackground: INK,
  pageOverlay: 'radial-gradient(rgba(182,255,46,0.05) 1px, transparent 1px)',
  ink: PAPER,
  muted: 'var(--faction-snide-card-muted)',
  accent: ACID,
  surface: INK,
  border: ACID,
  displayFont: IMPACT,
  eyebrowFont: TYPE,
  bodyFont: TYPE,
  headerStyle: {
    background: INK,
    border: `1px solid ${ACID}`,
    boxShadow: '8px 10px 0 rgba(0,0,0,0.55)',
    padding: '38px 34px 30px',
    marginBottom: 40,
  },
  headerDecoration: (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 14,
        background: ACID,
        clipPath: JAGGED,
        zIndex: 3,
      }}
    />
  ),
  credentialFrame: (card) => (
    <div style={{ transform: 'rotate(-1.5deg)', filter: 'drop-shadow(6px 8px 0 rgba(0,0,0,0.5))' }}>
      {card}
    </div>
  ),
  nameSize: 60,
  nameExtra: { transform: 'skewX(-5deg)', textShadow: `3px 3px 0 ${PINK}`, textTransform: 'uppercase' },
  playerEyebrow: 'Player · S.N.I.D.E.',
  progressionStyle: {
    marginTop: 22,
    background: INK,
    border: `2px solid ${ACID}`,
    padding: '16px 18px',
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    maxWidth: 440,
  },
  ringLabel: 'lvl',
  barFill:
    'repeating-linear-gradient(45deg, var(--faction-snide-acid) 0 6px, var(--faction-snide-acid-deep) 6px 12px)',
  barTrack: 'rgba(255,255,255,0.12)',
  nextLevelLabel: (next) => `next · lvl ${next}`,
  sectionHeading: heading,
  praxisEyebrow: (name) => `cases closed by ${name}`,
  praxisEmpty: {
    title: 'No priors. Yet.',
    body: "Clean record's a bad look around here. Go pull a job.",
  },
  emptyStateStyle: {
    border: `2px dashed ${ACID}`,
    padding: 30,
    textAlign: 'center',
    background: INK,
  },
  laurel: <SpectrumLaurel centerBg={PAPER} glyphColor={INK} rotate={-8} />,
  badgeTitle: 'The record',
  badgeBoardStyle: {
    border: `2px solid ${ACID}`,
    background: PAPER,
    padding: '4px 14px',
  },
  badgeChipStyle: {
    fontFamily: TYPE,
    fontSize: 9,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: PINK,
    marginLeft: 'auto',
    border: `1px solid ${PINK}`,
    padding: '3px 9px',
  },
  badgeRow: (badge, last) => (
    <BadgeRow
      badge={badge}
      last={last}
      dividerColor="rgba(20,17,11,0.25)"
      nameStyle={{ fontFamily: MARKER, fontSize: 16, color: INK, lineHeight: 1.15 }}
      medallion={(glyph) => (
        <span
          style={{
            flexShrink: 0,
            width: 34,
            height: 34,
            background: INK,
            transform: 'skewX(-5deg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: ACID,
          }}
        >
          {glyph}
        </span>
      )}
    />
  ),
}

export default function SnideProfileBody(props: ProfileBodyProps) {
  return <ProfileSkin props={props} kit={kit} />
}
