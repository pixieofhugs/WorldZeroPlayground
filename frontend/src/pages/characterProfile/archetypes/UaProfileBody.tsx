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
import { BadgeRow, ProfileSkin, SpectrumLaurel, type ProfileDress } from './profileSkin'
import Lotus from '../../../components/factionMarks/Lotus'
import { UA_DISPLAY, UA_TEXT, uaShade } from '../../../components/factionMarks/uaAtoms'
import { factionRoleVar } from '../../../utils/factionRoles'

/*
 * THE ROLE, NOT THE TOKEN (#2659/#2673) â€” and the SINGULAR resolver, because
 * this file owns no element. `dress` is a config object handed to
 * `ProfileSkin`, which renders the page; there is no root here to spread
 * `factionRoleVars` onto, and a prefix nothing declares is a read that always
 * falls through. `factionRoleVar` returns the same `var(--faction-ua-*)` string
 * these constants already held, so not one value moves â€” what changes is that
 * the surface asks for `ink` rather than naming UA's token for it.
 */
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
  /**
   * The lotus ghosted into the header's ground (#1630).
   *
   * The faction's third device, and the one the mandala's `strength` ruling does
   * NOT govern (§6, #1023): the mandala is radial concentric geometry with a
   * scope of its own, where the lotus is a ground wash — the same wash
   * `UaPraxisCard` floats off its left edge. This is the header's version of it,
   * bleeding off the right.
   *
   * Every number here is layout geometry rather than a spacing decision, which
   * is why none of them is a `--space-*` rung: 340 is the mark's own drawn size
   * (a `size` prop, not a style), and −40 is how far it bleeds past the band's
   * edge before `ProfileSkin`'s `overflow: hidden` crops it. Inert and behind
   * the content, which the shared header lifts to z-index 2.
   */
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
      /* Dress only. Seven copy knobs used to be spread on here, resolved from
         `profile.<slug>.*`; #1911 collapsed those families to one shared string
         each, so every kit was passing the same words and `ProfileSkin` reads
         them itself now. */
      kit={dress}
    />
  )
}
