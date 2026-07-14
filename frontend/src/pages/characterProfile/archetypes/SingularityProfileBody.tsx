/**
 * SingularityProfileBody — terminal / phosphor-on-void CRT player-profile skin
 * (#460). Ported from docs/design/profile/templates/Singularity Profile.dc.html:
 * a void panel with a faint blue graticule grid, green scanline overlay, `> `
 * command-prompt eyebrows, boxy hairline-blue borders, and a green-glow progress
 * bar. Singularity is ALWAYS DARK — its --faction-singularity-* tokens are
 * identical in both themes, so the container scopes data-theme="dark" to itself
 * and never mutates the global theme.
 *
 * Structure is DefaultProfileBody's locked spine via ProfileSkin. No hardcoded
 * hex — colours via --faction-singularity-* vars.
 */
import type { ReactNode } from 'react'

import type { ProfileBodyProps } from '../FactionProfileBody'
import { BadgeRow, ProfileSkin, SpectrumLaurel, type ProfileKit } from './profileSkin'

const VOID = 'var(--faction-singularity-card-bg)' // terminal black
const PHOSPHOR = 'var(--faction-singularity-card-accent)' // green
const SIGNAL = 'var(--faction-singularity-card-muted)' // blue chrome
const BORDER = 'var(--faction-singularity-border-hard)'
const FONT = 'var(--font-faction-terminal)' // Share Tech Mono

const signal = (pct: number) => `color-mix(in srgb, ${SIGNAL} ${pct}%, transparent)`

const GRID =
  'repeating-linear-gradient(0deg, transparent, transparent 21px, rgba(37,99,235,0.10) 21px, rgba(37,99,235,0.10) 22px), repeating-linear-gradient(90deg, transparent, transparent 21px, rgba(37,99,235,0.10) 21px, rgba(37,99,235,0.10) 22px)'
const SCANLINES =
  'repeating-linear-gradient(to bottom, transparent, transparent 2px, rgba(74,222,128,0.03) 2px, rgba(74,222,128,0.03) 4px)'

function heading(title: string, eyebrow: string): ReactNode {
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          fontFamily: FONT,
          fontSize: 9,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: signal(65),
          marginBottom: 6,
        }}
      >
        {'>'} {eyebrow}
      </div>
      <h2
        style={{
          fontFamily: FONT,
          fontSize: 24,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: PHOSPHOR,
          margin: 0,
          textShadow: '0 0 8px rgba(74,222,128,0.4)',
        }}
      >
        {title}
      </h2>
      <div style={{ height: 1, marginTop: 8, background: signal(30) }} />
    </div>
  )
}

const kit: ProfileKit = {
  slug: 'singularity',
  dataTheme: 'dark',
  pageBackground: 'var(--faction-singularity-card-bg)',
  pageOverlay: GRID,
  ink: PHOSPHOR,
  muted: signal(70),
  accent: PHOSPHOR,
  surface: VOID,
  border: BORDER,
  displayFont: FONT,
  eyebrowFont: FONT,
  bodyFont: FONT,
  headerStyle: {
    background: VOID,
    border: `1px solid ${BORDER}`,
    boxShadow: `inset 0 0 0 1px ${signal(18)}`,
    padding: '32px 34px',
    marginBottom: 40,
  },
  headerDecoration: (
    <div
      aria-hidden
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: SCANLINES, zIndex: 3 }}
    />
  ),
  nameSize: 48,
  nameExtra: {
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    textShadow: '0 0 12px rgba(74,222,128,0.35)',
  },
  playerEyebrow: '> PLAYER: SINGULARITY // NODE STATUS: ONLINE',
  progressionStyle: {
    marginTop: 22,
    background: VOID,
    border: `1px solid ${signal(40)}`,
    padding: '16px 18px',
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    maxWidth: 440,
  },
  ringLabel: 'lvl',
  barFill: 'linear-gradient(90deg, var(--faction-singularity-border-hard), var(--faction-singularity-card-accent))',
  barTrack: signal(25),
  nextLevelLabel: (next) => `next // lvl ${next}`,
  scoreFootnote: (score) => `> ${score} PTS LOGGED`,
  sectionHeading: heading,
  praxisEyebrow: (name) => `Sealed outputs // by ${name}`,
  praxisEmpty: {
    title: '> NO OUTPUT SEALED',
    body: 'Run a protocol. Cast the first signal.',
  },
  emptyStateStyle: {
    border: `1px dashed ${signal(50)}`,
    padding: 30,
    textAlign: 'center',
    background: VOID,
  },
  laurel: <SpectrumLaurel centerBg={VOID} glyphColor={PHOSPHOR} />,
  badgeTitle: 'Verified',
  badgeBoardStyle: {
    border: `1px solid ${signal(40)}`,
    background: VOID,
    padding: '4px 14px',
  },
  badgeChipStyle: {
    fontFamily: FONT,
    fontSize: 9,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: signal(70),
    marginLeft: 'auto',
    border: `1px solid ${signal(40)}`,
    padding: '3px 9px',
  },
  badgeRow: (badge, last) => (
    <BadgeRow
      badge={badge}
      last={last}
      dividerColor={signal(22)}
      nameStyle={{
        fontFamily: FONT,
        fontSize: 13,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        color: PHOSPHOR,
        lineHeight: 1.2,
      }}
      medallion={(glyph) => (
        <span
          style={{
            flexShrink: 0,
            width: 32,
            height: 32,
            border: `1px solid ${PHOSPHOR}`,
            background: VOID,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: PHOSPHOR,
          }}
        >
          {glyph}
        </span>
      )}
    />
  ),
}

export default function SingularityProfileBody(props: ProfileBodyProps) {
  return <ProfileSkin props={props} kit={kit} />
}
