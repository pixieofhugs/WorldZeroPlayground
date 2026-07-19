/**
 * AlbescentProfileBody — the unranked order / pure-white monastic player-profile
 * skin (#460). Ported from docs/design/profile/templates/Albescent Profile.dc.
 * html: quiet, austere, generous whitespace, thin hairline borders, soft small
 * shadows, widely-letterspaced tiny mono eyebrows. The whole faction is COLORLESS
 * by design — the only accent is ink-on-white, so the FDL laurel here is drawn in
 * an INK OUTLINE (thin double ring, NO spectrum gradient). Albescent is ALWAYS
 * LIGHT — its --faction-albescent-* tokens are identical in both themes, so the
 * container scopes data-theme="light" to itself and never mutates the global
 * theme.
 *
 * Structure is DefaultProfileBody's locked spine via ProfileSkin. No hardcoded
 * hex — colours via --faction-albescent-* vars.
 */
import type { ReactNode } from 'react'

import type { ProfileBodyProps } from '../FactionProfileBody'
import { BadgeRow, LaurelGlyph, ProfileSkin, type ProfileKit } from './profileSkin'

const INK = 'var(--faction-albescent-card-text)' // near-black
const MUTED = 'var(--faction-albescent-card-muted)'
const ACCENT = 'var(--faction-albescent-card-accent)'
const SURFACE = 'var(--faction-albescent-surface)' // pure white
const PAGE = 'var(--faction-albescent-page)' // cream backdrop
const BORDER = 'var(--faction-albescent-border)'
const RULE = 'var(--faction-albescent-border-rule)'
const SERIF = 'var(--faction-albescent-card-font)' // Cormorant Garamond
const MONO = 'var(--faction-albescent-mono)' // Courier Prime

/** The colorless ink-outline laurel: a thin double ring, no spectrum gradient. */
function InkLaurel() {
  return (
    <span
      title="Top praxis"
      style={{
        position: 'absolute',
        top: -11,
        right: 14,
        zIndex: 20,
        width: 44,
        height: 44,
        borderRadius: '50%',
        background: SURFACE,
        border: `1px solid ${INK}`,
        boxShadow: `0 0 0 3px ${SURFACE}, 0 0 0 4px ${INK}, 0 4px 10px rgba(0,0,0,0.12)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: INK,
      }}
    >
      <LaurelGlyph size={17} />
    </span>
  )
}

function heading(title: string, eyebrow: string): ReactNode {
  return (
    <div style={{ marginBottom: 'var(--space-lg)' }}>
      <div
        style={{
          fontFamily: MONO,
          fontSize: 'var(--text-sm)',
          letterSpacing: '0.24em',
          textTransform: 'uppercase',
          color: MUTED,
          marginBottom: 'var(--space-sm)',
        }}
      >
        {eyebrow}
      </div>
      <h2 style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: 'var(--text-heading)', color: INK, margin: 0 }}>
        {title}
      </h2>
    </div>
  )
}

const kit: ProfileKit = {
  slug: 'albescent',
  dataTheme: 'light',
  pageBackground: PAGE,
  ink: INK,
  muted: MUTED,
  accent: INK,
  surface: SURFACE,
  border: BORDER,
  displayFont: SERIF,
  eyebrowFont: MONO,
  bodyFont: SERIF,
  headerStyle: {
    background: SURFACE,
    border: `1px solid ${BORDER}`,
    boxShadow: '0 4px 20px -12px rgba(0,0,0,0.18)',
    padding: 'var(--space-3xl) var(--space-4xl)',
    marginBottom: 'var(--space-4xl)',
  },
  nameSize: 62,
  nameExtra: { fontStyle: 'italic', fontWeight: 300 },
  playerEyebrow: 'Player · Albescent · the unranked order',
  progressionStyle: {
    marginTop: 'var(--space-xl)',
    background: SURFACE,
    border: `1px solid ${RULE}`,
    padding: 'var(--space-lg) var(--space-xl)',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-lg)',
    maxWidth: 440,
  },
  ringLabel: 'lvl',
  barFill: INK,
  barTrack: 'var(--faction-albescent-text-faint)',
  nextLevelLabel: (next) => `next · lvl ${next}`,
  sectionHeading: heading,
  praxisEyebrow: (name) => `Entered into the record by ${name}`,
  praxisEmpty: {
    title: 'The record holds no entry yet',
    body: 'Take up a duty, and return it well.',
  },
  emptyStateStyle: {
    border: `1px dashed ${ACCENT}`,
    padding: 'var(--space-2xl)',
    textAlign: 'center',
    background: SURFACE,
  },
  laurel: <InkLaurel />,
  badgeTitle: 'Commendations',
  badgeBoardStyle: {
    border: `1px solid ${BORDER}`,
    background: SURFACE,
    padding: 'var(--space-xs) var(--space-lg)',
  },
  badgeChipStyle: {
    fontFamily: MONO,
    fontSize: 'var(--text-sm)',
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: MUTED,
    marginLeft: 'auto',
    border: `1px solid ${BORDER}`,
    padding: 'var(--space-xs) var(--space-sm)',
  },
  badgeRow: (badge, last) => (
    <BadgeRow
      badge={badge}
      last={last}
      dividerColor={RULE}
      nameStyle={{ fontFamily: SERIF, fontStyle: 'italic', color: INK, lineHeight: 1.2 }}
      medallion={(glyph) => (
        <span
          style={{
            flexShrink: 0,
            width: 30,
            height: 30,
            borderRadius: '50%',
            background: SURFACE,
            border: `1px solid ${INK}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: INK,
          }}
        >
          {glyph}
        </span>
      )}
    />
  ),
}

export default function AlbescentProfileBody(props: ProfileBodyProps) {
  return <ProfileSkin props={props} kit={kit} />
}
