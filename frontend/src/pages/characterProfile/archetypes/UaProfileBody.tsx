/**
 * UaProfileBody — University of Asthmatics gilt-salon player-profile skin (#460).
 * Ported from docs/design/profile/templates/UA Profile.dc.html: a gilt double-
 * border frame around the shared CredentialCard, paper-grain dot texture, burnt-
 * amber accent, ANNO/roman-numeral motif. UA is ALWAYS LIGHT — its --faction-ua-*
 * / --ua-* tokens are identical in both themes, so the container scopes
 * data-theme="light" to itself and never mutates the global theme.
 *
 * Structure is DefaultProfileBody's locked spine via ProfileSkin; only the
 * costume differs. No hardcoded hex — all colours via --ua-* / --faction-ua-*.
 */
import type { ReactNode } from 'react'

import type { ProfileBodyProps } from '../FactionProfileBody'
import { BadgeRow, ProfileSkin, SpectrumLaurel, type ProfileKit } from './profileSkin'

const INK = 'var(--ua-ink)'
const MUTED = 'var(--ua-muted)'
const ACCENT = 'var(--ua-orange)'
const GILT = 'var(--ua-gilt)'
const PAPER = 'var(--ua-paper)'
const LINE = 'var(--ua-line)'
const DISPLAY = 'var(--font-faction-old)' // IM Fell English — salon display serif
const EYEBROW = 'var(--font-body)' // Courier Prime mono labels
const BODY = "'EB Garamond', Georgia, serif"

function heading(title: string, eyebrow: string): ReactNode {
  return (
    <div style={{ marginBottom: 'var(--space-lg)' }}>
      <div
        style={{
          fontFamily: EYEBROW,
          fontSize: 'var(--text-xs)',
          letterSpacing: '0.26em',
          textTransform: 'uppercase',
          color: MUTED,
          marginBottom: 'var(--space-sm)',
        }}
      >
        {eyebrow}
      </div>
      <h2 style={{ fontFamily: DISPLAY, fontSize: 'var(--text-heading)', lineHeight: 1, color: INK, margin: 0 }}>
        {title}
      </h2>
    </div>
  )
}

const kit: ProfileKit = {
  slug: 'ua',
  dataTheme: 'light',
  pageBackground: 'var(--ua-wall)',
  pageOverlay:
    'radial-gradient(70% 50% at 8% 0%, rgba(221,147,34,.07), transparent 70%), radial-gradient(rgba(140,106,30,.045) 1px, transparent 1px)',
  ink: INK,
  muted: MUTED,
  accent: ACCENT,
  surface: PAPER,
  border: LINE,
  displayFont: DISPLAY,
  eyebrowFont: EYEBROW,
  bodyFont: BODY,
  headerStyle: {
    background: PAPER,
    border: `1px solid ${LINE}`,
    boxShadow: 'inset 0 0 0 4px var(--ua-paper), inset 0 0 0 5px var(--ua-line-soft)',
    padding: 'var(--space-2xl) var(--space-3xl)',
    marginBottom: 'var(--space-3xl)',
  },
  headerDecoration: (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        backgroundImage: 'radial-gradient(rgba(60,40,10,.03) 1px, transparent 1px)',
        backgroundSize: '6px 6px',
      }}
    />
  ),
  credentialFrame: (card) => (
    <div style={{ padding: 'var(--space-md)', background: GILT }}>
      <div style={{ padding: 'var(--space-xs)', background: 'linear-gradient(135deg, var(--ua-gold), var(--ua-gold-pale))' }}>
        {card}
      </div>
    </div>
  ),
  nameSize: 56,
  playerEyebrow: 'Player · University of Asthmatics',
  progressionStyle: {
    marginTop: 'var(--space-xl)',
    background: 'var(--ua-paper-warm)',
    border: `1px solid ${ACCENT}`,
    boxShadow: 'inset 0 0 0 3px var(--ua-paper-warm), inset 0 0 0 4px var(--ua-line-soft)',
    padding: 'var(--space-lg)',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-lg)',
    maxWidth: 440,
  },
  ringLabel: 'anno',
  barFill: 'linear-gradient(90deg, var(--ua-gold-lt), var(--ua-orange))',
  barTrack: 'var(--ua-line-soft)',
  levelUnitLabel: 'pts this anno',
  nextLevelLabel: (next) => `next · anno ${next}`,
  sectionHeading: heading,
  praxisEyebrow: (name) => `Exhibited by ${name}`,
  praxisEmpty: {
    title: 'Nothing hung in the Salon yet',
    body: 'The first piece exhibited is always the boldest.',
  },
  emptyStateStyle: {
    border: `1.5px dashed ${ACCENT}`,
    padding: 'var(--space-2xl)',
    textAlign: 'center',
    background: PAPER,
  },
  laurel: <SpectrumLaurel centerBg={PAPER} glyphColor={ACCENT} />,
  badgeTitle: 'Distinctions',
  badgeBoardStyle: {
    border: `1px solid ${LINE}`,
    background: PAPER,
    padding: 'var(--space-xs) var(--space-lg)',
  },
  badgeChipStyle: {
    fontFamily: EYEBROW,
    fontSize: 'var(--text-sm)',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: MUTED,
    marginLeft: 'auto',
    border: `1px solid ${LINE}`,
    borderRadius: 20,
    padding: 'var(--space-xs) var(--space-sm)',
  },
  badgeRow: (badge, last) => (
    <BadgeRow
      badge={badge}
      last={last}
      dividerColor={LINE}
      nameStyle={{ fontFamily: DISPLAY, color: INK, lineHeight: 1.15 }}
      medallion={(glyph) => (
        <span
          style={{
            flexShrink: 0,
            width: 34,
            height: 34,
            borderRadius: '50%',
            // eslint-disable-next-line local/no-raw-style-values -- ornament: gilt ring thickness on a 34px medallion; the nearest rung (4px) is a 60% thicker ring and visibly shrinks the inner disc.
            padding: 2.5,
            background: GILT,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxSizing: 'border-box',
          }}
        >
          <span
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              background: PAPER,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: ACCENT,
            }}
          >
            {glyph}
          </span>
        </span>
      )}
    />
  ),
}

export default function UaProfileBody(props: ProfileBodyProps) {
  return <ProfileSkin props={props} kit={kit} />
}
