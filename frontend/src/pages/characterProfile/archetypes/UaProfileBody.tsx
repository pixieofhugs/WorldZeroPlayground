/**
 * UaProfileBody — University of Asthmatics profile kit (#460, #851): mesa-sand
 * ground, card stock in a neutral hairline, orange only on accent and bar.
 * Follows the app theme (#848).
 */
import type { ReactNode } from 'react'

import type { ProfileBodyProps } from '../FactionProfileBody'
import { BadgeRow, ProfileSkin, SpectrumLaurel, type ProfileDress } from './profileSkin'
import Lotus from '../../../components/factionMarks/Lotus'
import { UA_DISPLAY, UA_TEXT, uaShade } from '../../../components/factionMarks/uaAtoms'
import { factionRoleVar } from '../../../utils/factionRoles'
import { factionBodyVars } from '../../../utils/factionBodyFace'

/* Roles via the singular `factionRoleVar` (#2673): a dress owns no root. */
const INK = factionRoleVar('ua', 'ink')
const MUTED = factionRoleVar('ua', 'quiet')
const ACCENT = factionRoleVar('ua', 'accent')
const SURFACE = factionRoleVar('ua', 'paper')
const PANEL = 'var(--faction-ua-panel)'
const RULE = 'var(--faction-ua-rule)'
const HAIR = 'var(--faction-ua-hair)'

function heading(title: ReactNode, eyebrow: string): ReactNode {
  return (
    <div style={{ marginBottom: 'var(--space-lg)' }}>
      <div
        style={{
          fontFamily: UA_TEXT,
          fontSize: 'var(--text-md)',
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: MUTED,
          marginBottom: 'var(--space-sm)',
        }}
      >
        {eyebrow}
      </div>
      <h2
        style={{
          fontFamily: UA_DISPLAY,
          fontWeight: 600,
          fontSize: 'var(--text-heading)',
          lineHeight: 1.05,
          color: INK,
          margin: 0,
        }}
      >
        {title}
      </h2>
    </div>
  )
}

const dress: ProfileDress = {
  slug: 'ua',
  pageVars: factionBodyVars('ua'),
  pageBackground: 'var(--faction-ua-page)',
  // Warm wash, mixed from a token so it follows the theme.
  pageOverlay:
    'radial-gradient(70% 50% at 8% 0%, color-mix(in srgb, var(--faction-ua-glow) 9%, transparent), transparent 70%)',
  ink: INK,
  muted: MUTED,
  accent: ACCENT,
  surface: SURFACE,
  border: RULE,
  displayFont: UA_DISPLAY,
  eyebrowFont: UA_TEXT,
  bodyFont: UA_TEXT,
  headerStyle: {
    background: SURFACE,
    border: `1px solid ${RULE}`,
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-2xl) var(--space-3xl)',
    marginBottom: 'var(--space-3xl)',
  },
  /** Lotus ground wash bleeding off the right (#1630); not governed by the
   *  mandala's `strength` ruling (§6, #1023). Geometry, not spacing rungs. */
  headerDecoration: (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        top: '50%',
        right: -40,
        transform: 'translateY(-50%)',
        zIndex: 0,
        pointerEvents: 'none',
        lineHeight: 0,
      }}
    >
      <Lotus size={340} color={factionRoleVar('ua', 'fill')} opacity={0.1} />
    </div>
  ),
  credentialFrame: (card) => (
    <div
      style={{
        padding: 'var(--space-xs)',
        background: PANEL,
        border: `1px solid ${RULE}`,
        borderRadius: 'var(--radius-md)',
        boxShadow: `0 12px 30px -20px ${uaShade(50)}`,
      }}
    >
      {card}
    </div>
  ),
  progressionStyle: {
    marginTop: 'var(--space-xl)',
    background: PANEL,
    border: `1px solid ${RULE}`,
    borderRadius: 'var(--radius-sm)',
    padding: 'var(--space-lg)',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-lg)',
    maxWidth: 440,
  },
  barFill:
    'linear-gradient(90deg, var(--faction-ua-glow), var(--faction-ua-vermil))',
  barTrack: HAIR,
  sectionHeading: heading,
  emptyStateStyle: {
    border: `1px dashed var(--faction-ua-border)`,
    borderRadius: 'var(--radius-sm)',
    padding: 'var(--space-2xl)',
    textAlign: 'center',
    background: SURFACE,
  },
  laurel: <SpectrumLaurel centerBg={SURFACE} glyphColor={ACCENT} />,
  badgeBoardStyle: {
    border: `1px solid ${RULE}`,
    borderRadius: 'var(--radius-sm)',
    background: SURFACE,
    padding: 'var(--space-xs) var(--space-lg)',
  },
  badgeChipStyle: {
    fontFamily: UA_TEXT,
    fontSize: 'var(--text-md)',
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    color: MUTED,
    marginLeft: 'auto',
    border: `1px solid ${RULE}`,
    borderRadius: 999,
    padding: 'var(--space-xs) var(--space-sm)',
  },
  badgeRow: (badge, last) => (
    <BadgeRow
      badge={badge}
      last={last}
      dividerColor={HAIR}
      nameStyle={{ fontFamily: UA_DISPLAY, fontWeight: 600, color: INK, lineHeight: 1.15 }}
      medallion={(glyph) => (
        <span
          style={{
            flexShrink: 0,
            width: 34,
            height: 34,
            borderRadius: '50%',
            background: PANEL,
            border: `1px solid var(--faction-ua-border)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxSizing: 'border-box',
            color: ACCENT,
          }}
        >
          {glyph}
        </span>
      )}
    />
  ),
}

export default function UaProfileBody(props: ProfileBodyProps) {
  return (
    <ProfileSkin
      props={props}
      kit={dress}
    />
  )
}
