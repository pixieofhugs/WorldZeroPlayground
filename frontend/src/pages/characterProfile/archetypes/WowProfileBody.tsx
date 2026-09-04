/**
 * WowProfileBody — a knight's page (kit §15, #900).
 *
 * Crested header on a cream plate under a gold/plum checker wash, a gilt rope
 * ring round the credential, burnt-gold figures on near-white plates, honours
 * struck on gilt lozenges, and every chronicle row led by a plum rule.
 *
 * Structure is DefaultProfileBody's locked spine via ProfileSkin; only the
 * costume differs (ADR-0016). The kit's own section names map onto that spine
 * one-for-one and are supplied as copy, not as new structure:
 *
 *   the tally of deeds  → the progression panel (level readout + points bar)
 *   Honours & Credentials → ③ badges
 *   Recent Chronicles   → ⑤ praxis, which renders WOW's own chronicle card
 *
 * TWO DEVIATIONS, both forced by the spine. The kit draws a four-up stat grid
 * (Points / Quests / Huzzahs / Rank); the spine has no such slot, and adding one
 * would fork the profile contract for one faction — three of those four numbers
 * are already in the CredentialCard and the progression panel beside it, so the
 * grid would restate them. And the kit's honour rows carry a one-line
 * description; `BadgeOut` has a name and a glyph, so the row is the name on the
 * lozenge, which is what the shared `BadgeRow` renders for every faction.
 *
 * No hardcoded hex, no theme ternary — every value below is a
 * `--faction-wow-*` token and both themes come from the cascade.
 *
 * ONE RENDERER, BOTH WIDTHS (#2996). The FIELD PAVILION — the phone face, #901
 * — was a second skin in this file: a crested header wash and checker from the
 * kit's one phone screen (`components/factionMarks/wowMobile`) over an avatar
 * hoop, a three-up tally of deeds, honour rows and its own segmented switch. It
 * is retired, and `src/__tests__/retiredSurfaces.test.ts` holds its name out of
 * shipped source. The dress below is untouched and is not re-judged: what a WOW
 * player meets at 375px is now this same crested page, restacked by
 * `ProfileSkin`, with the shared Praxis/Tasks switch every kit gets.
 *
 * What the retirement takes with it is the pavilion's two DEVIATIONS from the
 * spine, which is the point of taking it: the phone drew no credential card
 * (its avatar hoop and a visible `<h1>` were the identity) and no level track at
 * all (the tally of deeds stood where the progression panel does), so one
 * faction's players read a different profile on a phone from the one every other
 * faction's read. The pavilion vocabulary itself is unharmed — `wowMobile.tsx`
 * is six mobile skins' shared kit and `WowFieldDesk` is still its consumer.
 *
 * ponytail: `--wow-profile-*` NOW HAS NO DECLARER. The five constants below ask
 * for roles by prefix (#2674) and the only `factionRoleVars('wow',
 * 'wow-profile')` spread in this file was on the pavilion's root, so the desktop
 * half has always read them undeclared — which this file's own note recorded as
 * the neutral, per-SITE fallback case. Ceiling: those reads still fall through,
 * exactly as they did before this change, so the crested page renders as it
 * shipped. Upgrade path is the root-vars slot that note names — `ProfileSkin`
 * owns the page element all nine mount on, so declaring the prefix means a new
 * kit field, and giving WOW's desktop dress five newly-resolving colours is a
 * PAINT decision with screenshots behind it, not a side effect of retiring a
 * phone skin.
 */
import type { ReactNode } from 'react'

import type { ProfileBodyProps } from '../FactionProfileBody'
import { BadgeRow, ProfileSkin, SpectrumLaurel, type ProfileDress } from './profileSkin'

/** THE FIVE CORE ROLES ARE ASKED FOR BY NAME (#2674) — see the ponytail above
 *  for the prefix this file no longer declares a root for. */
const INK = 'var(--wow-profile-ink)'
const MUTED = 'var(--wow-profile-quiet)'
const PLUM = 'var(--wow-profile-accent)'
const GOLD = 'var(--faction-wow-chronicle-gold)'
const FIGURE = 'var(--faction-wow-figure)'
const SURFACE = 'var(--wow-profile-paper)'
const PLATE = 'var(--faction-wow-plate)'
const PLATE_BORDER = 'var(--faction-wow-plate-border)'
const DISPLAY = 'var(--wow-profile-face)'
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
  pageBackground:
    'linear-gradient(165deg, var(--faction-wow-ground-from), var(--faction-wow-ground-to))',
  // court-glow + gilt hatch, the pair the hero and the page backdrop both wear.
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
  // The kit's gold/plum checker laid over the header at a tenth, so the crested
  // banner reads as struck stationery rather than a flat plate.
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
  // The gilt rope ring the kit sets its crest in, here mounting the credential.
  credentialFrame: (card) => (
    <div
      style={{
        // The 4px band IS the drawn gilt rope. §4a's ring-stroke carve-out does
        // NOT apply here: an ON-SCALE value can never be ornament, and 4px is
        // --space-xs exactly, so it takes the token rather than a hatch.
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
      /* Dress only. Seven copy knobs used to be spread on here, resolved from
         `profile.<slug>.*`; #1911 collapsed those families to one shared string
         each, so every kit was passing the same words and `ProfileSkin` reads
         them itself now. */
      kit={dress}
    />
  )
}
