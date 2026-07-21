/**
 * CovenProfileBody — Cozy Coven scrapbook player-profile skin (#460).
 * Ported from docs/design/profile/templates/Warriors of Whimsy Profile.dc.html:
 * a cork-board mat with push-pin dots, slight tilts, washi-tape strips, and an
 * ".exe window" progression panel. COVEN follows the global light/dark cascade —
 * it reads --faction-coven-* / --faction-coven-card-* tokens (which flip with the
 * theme) and never pins a fixed data-theme.
 *
 * Structure is DefaultProfileBody's locked spine via ProfileSkin. No hardcoded
 * hex — colours via --faction-coven-* vars.
 */
import type { ReactNode } from 'react'

import type { ProfileBodyProps } from '../FactionProfileBody'
import { BadgeRow, ProfileSkin, SpectrumLaurel, type ProfileKit } from './profileSkin'

const INK = 'var(--faction-coven-card-text)'
const MUTED = 'var(--faction-coven-card-muted)'
const ACCENT = 'var(--faction-coven-card-accent)'
const SURFACE = 'var(--faction-coven-notepad-bg)'
const BORDER = 'var(--faction-coven-win-border)'
const MAT = 'var(--faction-coven-light)'
const DISPLAY = 'var(--font-faction-script)' // Caveat
const EYEBROW = 'var(--font-body)'
const BAR = 'linear-gradient(90deg, var(--faction-coven-title-from), var(--faction-coven-card-accent))'

function Pin({ left, right }: { left?: number; right?: number }) {
  return (
    <span
      aria-hidden
      style={{
        position: 'absolute',
        top: 10,
        left,
        right,
        width: 9,
        height: 9,
        borderRadius: '50%',
        background: ACCENT,
        boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
        zIndex: 4,
      }}
    />
  )
}

function heading(title: string, eyebrow: string): ReactNode {
  return (
    <div style={{ marginBottom: 'var(--space-lg)', display: 'inline-flex', alignItems: 'center', gap: 'var(--space-md)' }}>
      <span
        style={{
          fontFamily: DISPLAY,
          fontSize: 'var(--text-heading)',
          color: ACCENT,
          background: 'var(--faction-coven-tape)',
          padding: 'var(--space-xs) var(--space-md)',
          transform: 'rotate(-1.5deg)',
          display: 'inline-block',
        }}
      >
        {title}
      </span>
      <span style={{ fontFamily: EYEBROW, fontSize: 'var(--text-base)', color: MUTED }}>{eyebrow}</span>
    </div>
  )
}

const kit: ProfileKit = {
  slug: 'coven',
  pageBackground: MAT,
  pageOverlay: 'radial-gradient(var(--faction-coven-dot) 1px, transparent 1px)',
  ink: INK,
  muted: MUTED,
  accent: ACCENT,
  surface: SURFACE,
  border: BORDER,
  displayFont: DISPLAY,
  eyebrowFont: EYEBROW,
  headerStyle: {
    background: 'var(--faction-coven-notepad-bg)',
    border: `1px solid ${BORDER}`,
    borderRadius: 16,
    padding: 'var(--space-2xl)',
    marginBottom: 'var(--space-2xl)',
    transform: 'rotate(-0.4deg)',
    boxShadow: '0 12px 30px -18px rgba(0,0,0,0.4)',
  },
  headerDecoration: (
    <>
      <Pin left={12} />
      <Pin right={12} />
    </>
  ),
  credentialFrame: (card) => (
    <div style={{ transform: 'rotate(-1.4deg)', filter: 'drop-shadow(0 8px 14px rgba(0,0,0,0.2))' }}>
      {card}
    </div>
  ),
  nameSize: 56,
  playerEyebrow: 'Player · Warriors of Whimsy',
  progressionStyle: {
    marginTop: 'var(--space-xl)',
    background: SURFACE,
    border: `1px solid ${BORDER}`,
    borderRadius: 10,
    padding: 'var(--space-lg)',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-lg)',
    maxWidth: 440,
  },
  ringLabel: 'lvl',
  barFill: BAR,
  barTrack: 'var(--faction-coven-notepad-border)',
  nextLevelLabel: (next) => `next · lvl ${next}`,
  sectionHeading: heading,
  praxisEyebrow: (name) => `sealed by ${name}`,
  praxisEmpty: {
    title: 'No spells sealed yet',
    body: 'The first bit of mischief is always the hardest ✦',
  },
  emptyStateStyle: {
    border: `1.5px dashed ${ACCENT}`,
    borderRadius: 14,
    padding: 'var(--space-2xl)',
    textAlign: 'center',
    background: SURFACE,
  },
  laurel: <SpectrumLaurel centerBg={SURFACE} glyphColor={ACCENT} rotate={-8} />,
  badgeTitle: 'Charms earned',
  badgeBoardStyle: {
    border: `1px solid ${BORDER}`,
    borderRadius: 12,
    background: SURFACE,
    padding: 'var(--space-xs) var(--space-lg)',
  },
  badgeChipStyle: {
    fontFamily: EYEBROW,
    fontSize: 'var(--text-sm)',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: MUTED,
    marginLeft: 'auto',
    border: `1px solid ${BORDER}`,
    borderRadius: 20,
    padding: 'var(--space-xs) var(--space-sm)',
  },
  badgeRow: (badge, last) => (
    <BadgeRow
      badge={badge}
      last={last}
      dividerColor="var(--faction-coven-notepad-border)"
      nameStyle={{ fontFamily: DISPLAY, color: INK, lineHeight: 1.15 }}
      medallion={(glyph) => (
        <span
          style={{
            flexShrink: 0,
            width: 34,
            height: 34,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 30% 30%, var(--faction-coven-scrap-mid), var(--faction-coven-scrap-deep))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: ACCENT,
            border: `1px solid ${BORDER}`,
          }}
        >
          {glyph}
        </span>
      )}
    />
  ),
}

export default function CovenProfileBody(props: ProfileBodyProps) {
  return <ProfileSkin props={props} kit={kit} />
}
