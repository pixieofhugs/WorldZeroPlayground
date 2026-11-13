/**
 * SingularityProfileBody — phosphor-on-void CRT profile kit (#460): scanlines,
 * `> ` prompt eyebrows, hairline-blue borders, green-glow bar. ALWAYS DARK, so
 * it scopes data-theme="dark" to its container only.
 */
import type { ReactNode } from 'react'

import type { ProfileBodyProps } from '../FactionProfileBody'
import { BadgeRow, ProfileSkin, SpectrumLaurel, type ProfileDress } from './profileSkin'
import { factionRoleVar } from '../../../utils/factionRoles'
import { factionBodyVars } from '../../../utils/factionBodyFace'

/** Roles via `factionRoleVar`, no prefix (#2675): a dress owns no root to
 *  declare one on. */
const VOID = factionRoleVar('singularity', 'paper') // terminal black
const PHOSPHOR = factionRoleVar('singularity', 'accent') // green
const SIGNAL = factionRoleVar('singularity', 'quiet') // blue chrome
const BORDER = 'var(--faction-singularity-border-hard)'
const FONT = 'var(--font-faction-terminal)' // Share Tech Mono

const signal = (pct: number) => `color-mix(in srgb, ${SIGNAL} ${pct}%, transparent)`
const phosphor = (pct: number) => `color-mix(in srgb, ${PHOSPHOR} ${pct}%, transparent)`

/**
 * Phosphor raster ground (#1630): 3px scanlines plus a top-left bloom. Mixed off
 * the accent token rather than the design's raw rgba (#1169), so it follows it.
 */
const PHOSPHOR_GROUND =
  `repeating-linear-gradient(0deg, ${phosphor(5.5)} 0 1px, transparent 1px 3px), radial-gradient(120% 80% at 12% 0%, ${phosphor(12)}, transparent 60%)`
const SCANLINES =
  `repeating-linear-gradient(to bottom, transparent, transparent 2px, ${phosphor(3)} 2px, ${phosphor(3)} 4px)`

function heading(title: ReactNode, eyebrow: string): ReactNode {
  return (
    <div style={{ marginBottom: 'var(--space-lg)' }}>
      {/* No `>` without a command (#2231): an empty eyebrow draws nothing. */}
      {eyebrow ? (
        <div
          style={{
            fontFamily: FONT,
            fontSize: 'var(--text-md)',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: signal(65),
            marginBottom: 'var(--space-sm)',
          }}
        >
          {'>'} {eyebrow}
        </div>
      ) : null}
      <h2
        style={{
          fontFamily: FONT,
          fontSize: 'var(--text-heading)',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: PHOSPHOR,
          margin: 0,
          textShadow: `0 0 8px ${phosphor(40)}`,
        }}
      >
        {title}
      </h2>
      <div style={{ height: 1, marginTop: 'var(--space-sm)', background: signal(30) }} />
    </div>
  )
}

const dress: ProfileDress = {
  slug: 'singularity',
  dataTheme: 'dark',
  pageVars: factionBodyVars('singularity'),
  pageBackground: VOID,
  pageOverlay: PHOSPHOR_GROUND,
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
    padding: 'var(--space-2xl)',
    marginBottom: 'var(--space-3xl)',
  },
  headerDecoration: (
    <div
      aria-hidden
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: SCANLINES, zIndex: 3 }}
    />
  ),
  taglineExtra: {
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    textShadow: `0 0 12px ${phosphor(35)}`,
  },
  progressionStyle: {
    marginTop: 'var(--space-xl)',
    background: VOID,
    border: `1px solid ${signal(40)}`,
    padding: 'var(--space-lg)',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-lg)',
    maxWidth: 440,
  },
  barFill: `linear-gradient(90deg, var(--faction-singularity-border-hard), ${PHOSPHOR})`,
  barTrack: signal(25),
  sectionHeading: heading,
  emptyStateStyle: {
    border: `1px dashed ${signal(50)}`,
    padding: 'var(--space-2xl)',
    textAlign: 'center',
    background: VOID,
  },
  laurel: <SpectrumLaurel centerBg={VOID} glyphColor={PHOSPHOR} />,
  badgeBoardStyle: {
    border: `1px solid ${signal(40)}`,
    background: VOID,
    padding: 'var(--space-xs) var(--space-lg)',
  },
  badgeChipStyle: {
    fontFamily: FONT,
    fontSize: 'var(--text-md)',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: signal(70),
    marginLeft: 'auto',
    border: `1px solid ${signal(40)}`,
    padding: 'var(--space-xs) var(--space-sm)',
  },
  badgeRow: (badge, last) => (
    <BadgeRow
      badge={badge}
      last={last}
      dividerColor={signal(22)}
      nameStyle={{
        fontFamily: FONT,
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
  return (
    <ProfileSkin
      props={props}
      kit={dress}
    />
  )
}
