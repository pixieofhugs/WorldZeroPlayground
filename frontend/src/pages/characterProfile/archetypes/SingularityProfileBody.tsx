/**
 * SingularityProfileBody — terminal / phosphor-on-void CRT player-profile skin
 * (#460). Ported from docs/design/profile/templates/Singularity Profile.dc.html:
 * a void panel under a phosphor raster (#1630 swapped the blue graticule out —
 * see PHOSPHOR_GROUND), green scanline overlay, `> ` command-prompt eyebrows,
 * boxy hairline-blue borders, and a green-glow progress
 * bar. Singularity is ALWAYS DARK — its --faction-singularity-* tokens are
 * identical in both themes, so the container scopes data-theme="dark" to itself
 * and never mutates the global theme.
 *
 * Structure is DefaultProfileBody's locked spine via ProfileSkin. No hardcoded
 * hex — colours via --faction-singularity-* vars.
 */
import type { ReactNode } from 'react'

import type { ProfileBodyProps } from '../FactionProfileBody'
import { BadgeRow, ProfileSkin, SpectrumLaurel, type ProfileDress } from './profileSkin'
import { factionRoleVar } from '../../../utils/factionRoles'

/**
 * Three ROLES and no prefix (#2675). This file is a DRESS, not a surface: every
 * value below travels into `ProfileSkin`, which owns the page root and the
 * `data-theme` on it, so there is no element here to declare `--profile-*` on
 * and a read of one would resolve nowhere. `factionRoleVar` is the law's answer
 * for that — the same string, asked for by role.
 */
const VOID = factionRoleVar('singularity', 'paper') // terminal black
const PHOSPHOR = factionRoleVar('singularity', 'accent') // green
const SIGNAL = factionRoleVar('singularity', 'quiet') // blue chrome
const BORDER = 'var(--faction-singularity-border-hard)'
const FONT = 'var(--font-faction-terminal)' // Share Tech Mono

const signal = (pct: number) => `color-mix(in srgb, ${SIGNAL} ${pct}%, transparent)`
const phosphor = (pct: number) => `color-mix(in srgb, ${PHOSPHOR} ${pct}%, transparent)`

/**
 * The page ground: a PHOSPHOR TERMINAL, not graph paper (#1630).
 *
 * This was a blue graticule — two crossed repeating-linear-gradients in
 * `rgba(37,99,235,.10)` — which is the Ephemerists' ruled plate, drawn in
 * Singularity's chrome blue. A faction whose whole identity is a CRT should not
 * be grounded on somebody else's ruled paper, so the raster replaces it: hard
 * scanlines on a 3px pitch over one faint bloom off the top-left corner, the way
 * a phosphor tube lights unevenly.
 *
 * The design writes both as literal `rgba(74,222,128,·)`, which is the card
 * accent's own hue with an alpha — #1169's "a raw rgba of a token's own hue is a
 * hardcoded hex wearing a costume". Said as `color-mix` off the accent instead,
 * they follow the token when the cascade flips the phosphor (§6: the chassis
 * stays black, the phosphor moves), and the file loses two hand-written hexes.
 */
const PHOSPHOR_GROUND =
  `repeating-linear-gradient(0deg, ${phosphor(5.5)} 0 1px, transparent 1px 3px), radial-gradient(120% 80% at 12% 0%, ${phosphor(12)}, transparent 60%)`
const SCANLINES =
  `repeating-linear-gradient(to bottom, transparent, transparent 2px, ${phosphor(3)} 2px, ${phosphor(3)} 4px)`

function heading(title: string, eyebrow: string): ReactNode {
  return (
    <div style={{ marginBottom: 'var(--space-lg)' }}>
      {/* A prompt with no command is not a prompt (#2231). Six kits dress the
          eyebrow slot in nothing but a margin, so a heading that asks for a
          bare title — praxis since #2231, About since #1626 — costs them
          nothing; this is the one kit whose slot draws ink of its own. */}
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
      /* Dress only. Seven copy knobs used to be spread on here, resolved from
         `profile.<slug>.*`; #1911 collapsed those families to one shared string
         each, so every kit was passing the same words and `ProfileSkin` reads
         them itself now. */
      kit={dress}
    />
  )
}
