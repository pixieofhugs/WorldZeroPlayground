/**
 * UaProfileBody — the University of Asthmatics player-profile skin (#460,
 * rebuilt for #851).
 *
 * The gilt double-border frame, the paper-grain dot texture, the gold progress
 * bar and the ANNO regalia are gone with the salon. What is left is the
 * practice's own dress: mesa-sand ground, card stock inside a neutral hairline,
 * an uppercase eyebrow, and orange used once — on the accent and the bar.
 *
 * The skin no longer scopes `data-theme="light"` to itself. UA dims now (#848),
 * so every token below resolves through the `[data-theme="dark"]` cascade and
 * the profile follows the app's theme like every other faction's.
 *
 * Structure is DefaultProfileBody's locked spine via ProfileSkin; only the
 * costume differs (ADR-0016). No hardcoded hex — every colour is a token.
 */
import type { ReactNode } from 'react'

import type { ProfileBodyProps } from '../FactionProfileBody'
import { BadgeRow, ProfileSkin, SpectrumLaurel, type ProfileKit } from './profileSkin'
import { UA_DISPLAY, UA_TEXT, uaShade } from '../../../components/cards/uaAtoms'

const INK = 'var(--faction-ua-card-text)'
const MUTED = 'var(--faction-ua-card-muted)'
const ACCENT = 'var(--faction-ua-card-accent)'
const SURFACE = 'var(--faction-ua-card-bg)'
const PANEL = 'var(--faction-ua-panel)'
const RULE = 'var(--faction-ua-rule)'
const HAIR = 'var(--faction-ua-hair)'

function heading(title: string, eyebrow: string): ReactNode {
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

const kit: ProfileKit = {
  slug: 'ua',
  pageBackground: 'var(--faction-ua-page)',
  // One faint warm wash off the top-left. Mixed from the ornament token so it
  // inverts with the theme; the mandala itself stays on the page backdrop.
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
  nameSize: 56,
  playerEyebrow: 'Practising · University of Asthmatics',
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
  ringLabel: 'anno',
  barFill:
    'linear-gradient(90deg, var(--faction-ua-glow), var(--faction-ua-vermil))',
  barTrack: HAIR,
  levelUnitLabel: 'marks this anno',
  nextLevelLabel: (next) => `next · anno ${next}`,
  sectionHeading: heading,
  praxisEyebrow: (name) => `Sealed by ${name}`,
  praxisEmpty: {
    title: 'Nothing sealed yet',
    body: 'One true mark, then another. The first is always the boldest.',
  },
  emptyStateStyle: {
    border: `1px dashed var(--faction-ua-border)`,
    borderRadius: 'var(--radius-sm)',
    padding: 'var(--space-2xl)',
    textAlign: 'center',
    background: SURFACE,
  },
  laurel: <SpectrumLaurel centerBg={SURFACE} glyphColor={ACCENT} />,
  badgeTitle: 'Marks of the practice',
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
  return <ProfileSkin props={props} kit={kit} />
}
