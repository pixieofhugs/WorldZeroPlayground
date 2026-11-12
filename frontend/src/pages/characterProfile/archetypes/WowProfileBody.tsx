/**
 * WowProfileBody — a knight's page (kit §15, #900): crested header under a
 * gold/plum checker, gilt rope ring round the credential, honours on gilt
 * lozenges. Kit sections map onto the spine as copy (tally of deeds →
 * progression; Honours → ③ badges; Chronicles → ⑤ praxis). The kit's stat grid
 * and honour descriptions are dropped: the spine has no slot for them.
 *
 * The ink/face/paper roles are NOT dressed yet (deferral, not a decision; see
 * #2996's follow-up): they are written as what the page inherits (`inherit`,
 * `transparent`), and `factionContrast.test.ts` measures that.
 */
import type { ReactNode } from 'react'

import type { ProfileBodyProps } from '../FactionProfileBody'
import { BadgeRow, ProfileSkin, SpectrumLaurel, type ProfileDress } from './profileSkin'
import { factionBodyVars } from '../../../utils/factionBodyFace'

/* `inherit`, not a `--color-text-*` token: `local/no-global-ink-on-faction-
   surface` bans those here (wrong tier on WOW's plates). Resolves to `body`'s ink
   and face today. Inheritance has no tiers, so MUTED and PLUM equal INK. */
const INK = 'inherit'
const MUTED = INK
const PLUM = INK
const SURFACE = 'transparent'
const DISPLAY = 'inherit'

/* The kit's own tokens. */
const GOLD = 'var(--faction-wow-chronicle-gold)'
const FIGURE = 'var(--faction-wow-figure)'
const PLATE = 'var(--faction-wow-plate)'
const PLATE_BORDER = 'var(--faction-wow-plate-border)'
const BODY = 'var(--faction-wow-body-font)'

function heading(title: ReactNode, eyebrow: string): ReactNode {
  return (
    <div style={{ marginBottom: 'var(--space-lg)' }}>
      <div
        className="label-heading"
        style={{
          fontFamily: DISPLAY,
          letterSpacing: '0.14em',
          color: 'var(--faction-wow-accent-deep)',
          marginBottom: 'var(--space-xs)',
        }}
      >
        {eyebrow}
      </div>
      <h2
        style={{
          fontFamily: DISPLAY,
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
  slug: 'wow',
  pageVars: factionBodyVars('wow'),
  pageBackground:
    'linear-gradient(165deg, var(--faction-wow-ground-from), var(--faction-wow-ground-to))',
  // court-glow + gilt hatch, shared with the hero and page backdrop.
  pageOverlay:
    'radial-gradient(circle at 82% 12%, var(--faction-wow-court-glow), transparent 46%), repeating-linear-gradient(135deg, transparent 0 22px, var(--faction-wow-hatch) 22px 24px)',
  ink: INK,
  muted: MUTED,
  accent: PLUM,
  surface: SURFACE,
  border: GOLD,
  displayFont: DISPLAY,
  eyebrowFont: DISPLAY,
  bodyFont: BODY,
  headerStyle: {
    background:
      'linear-gradient(180deg, var(--faction-wow-ground-from), var(--faction-wow-ground-to))',
    border: `2px solid ${GOLD}`,
    borderRadius: 'var(--radius-xl)',
    padding: 'var(--space-xl) var(--space-2xl)',
    marginBottom: 'var(--space-3xl)',
  },
  // Gold/plum checker at a tenth.
  headerDecoration: (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        opacity: 0.1,
        pointerEvents: 'none',
        background: `repeating-linear-gradient(90deg, ${GOLD} 0 16px, var(--faction-wow-plum-surface) 16px 32px)`,
      }}
    />
  ),
  credentialFrame: (card) => (
    <div
      style={{
        // The gilt rope; on-scale, so a token not the §4a hatch.
        padding: 'var(--space-xs)',
        background: 'var(--faction-wow-avatar-ring)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: '0 12px 30px -18px var(--faction-wow-chronicle-shadow)',
      }}
    >
      <div
        style={{
          background: SURFACE,
          border: `2px solid var(--faction-wow-plum-surface)`,
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
        }}
      >
        {card}
      </div>
    </div>
  ),
  progressionStyle: {
    marginTop: 'var(--space-xl)',
    background: PLATE,
    border: `1px solid ${PLATE_BORDER}`,
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-lg)',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-lg)',
    maxWidth: 440,
  },
  barFill: `linear-gradient(90deg, var(--faction-wow-plum-surface), ${GOLD})`,
  barTrack: PLATE_BORDER,
  sectionHeading: heading,
  emptyStateStyle: {
    border: `1px dashed ${GOLD}`,
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-2xl)',
    textAlign: 'center',
    background: PLATE,
  },
  laurel: <SpectrumLaurel centerBg={SURFACE} glyphColor={FIGURE} />,
  badgeBoardStyle: {
    border: `1px solid ${PLATE_BORDER}`,
    borderLeft: `4px solid var(--faction-wow-plum-surface)`,
    borderRadius: 'var(--radius-lg)',
    background: PLATE,
    padding: 'var(--space-xs) var(--space-lg)',
  },
  badgeChipStyle: {
    fontFamily: DISPLAY,
    fontSize: 'var(--text-md)',
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: 'var(--faction-wow-accent-deep)',
    marginLeft: 'auto',
    border: `1px solid ${PLATE_BORDER}`,
    borderRadius: 999,
    padding: 'var(--space-xs) var(--space-sm)',
  },
  badgeRow: (badge, last) => (
    <BadgeRow
      badge={badge}
      last={last}
      dividerColor={PLATE_BORDER}
      nameStyle={{ fontFamily: DISPLAY, color: INK, lineHeight: 1.15 }}
      medallion={(glyph) => (
        <span
          style={{
            flexShrink: 0,
            width: 34,
            height: 34,
            borderRadius: 'var(--radius-md)',
            background:
              'linear-gradient(180deg, var(--faction-wow-avatar-pill-from), var(--faction-wow-avatar-pill-to))',
            border: `1.5px solid var(--faction-wow-avatar-pill-border)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxSizing: 'border-box',
            color: 'var(--faction-wow-avatar-pill-text)',
          }}
        >
          {glyph}
        </span>
      )}
    />
  ),
}

export default function WowProfileBody(props: ProfileBodyProps) {
  return (
    <ProfileSkin
      props={props}
      kit={dress}
    />
  )
}
