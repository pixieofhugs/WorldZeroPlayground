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
 * ── THE LAPTOP PAGE HAS NEVER BEEN DRESSED, AND THIS PR DOES NOT DRESS IT ──
 *
 * Five of the constants below asked for roles through a `--wow-profile-*`
 * prefix (#2674). That prefix had exactly ONE declarer in the repo and it was
 * the pavilion's page root — a phone-only element — so on the laptop all five
 * `var()` reads were invalid at computed-value time and the page fell back to
 * the cascade: `color` and `font-family` INHERITED from `body`, and `background`
 * went to its initial `transparent`. The file's old note called that "the
 * neutral case the law builds pixel-identity out of", which was true and read
 * as if it were deliberate. It was a hole.
 *
 * Retiring the pavilion takes the declarer with it, and every way of closing
 * that hole paints something: `factionTokensDeclared.test.ts` rejects an
 * orphaned read, and both fixes for an orphan (the singular `factionRoleVar`,
 * or a root-vars slot) resolve the roles to WOW's own tokens for the first
 * time. Resolving them is a PAINT change — #2996's acceptance criteria say no
 * faction's ground, ornament, face or role map may change — and it is not a
 * free one: `--faction-wow-card-muted` measures 4.09:1 on the bottom stop of
 * this kit's own page ramp in light. See the follow-up issue.
 *
 * SO THE FIVE POINT AT WHAT THE PAGE ACTUALLY PAINTED, EXPLICITLY. `body` is
 * `@apply text-ink font-body` — `--color-text-primary` and the shell's body
 * face — and that is precisely what those reads inherited, so writing it down
 * preserves the pre-PR laptop rendering BY CONSTRUCTION rather than by
 * argument. Note `quiet` and `accent` take the SAME value as `ink`: an invalid
 * `var()` in `color` inherits, it does not fall back to a quieter tier, so all
 * three really were one colour on this page. `paper` was `transparent` for the
 * same reason on a `background`.
 *
 * This is deferral, not a decision. The dress WOW's laptop should wear is a
 * paint question with screenshots behind it and a contrast row per stop; the
 * rows for what it wears TODAY are in `factionContrast.test.ts`, which is more
 * than the undressed page had before. The kit's own tokens are untouched and
 * still dress everything this page does draw in them — the plate, the gold, the
 * plum, the checker, the badge lozenges.
 */
import type { ReactNode } from 'react'

import type { ProfileBodyProps } from '../FactionProfileBody'
import { BadgeRow, ProfileSkin, SpectrumLaurel, type ProfileDress } from './profileSkin'

/* The five that were undeclared reads — see the note above. Each is what the
   cascade gave the laptop page before #2996, written down.

   `inherit` RATHER THAN THE TOKEN IT RESOLVES TO, for two reasons. It is what
   actually happened — an invalid `var()` in an inherited property computes to
   the inherited value, which is not the same as falling back to a named tier —
   so this is faithful by construction and stays faithful if an ancestor is ever
   dressed. And `local/no-global-ink-on-faction-surface` bans naming
   `--color-text-*` on a faction-dispatched surface, correctly: the neutral is a
   real token at the wrong TIER and it measures 2.01–2.27:1 on three of the nine
   plates. Writing the ban's own subject here to describe an accident would read
   as a choice.

   What it resolves to TODAY is `body { @apply text-ink font-body }` —
   `--color-text-primary` and the shell's body face — which is what the contrast
   rows in `factionContrast.test.ts` measure, and they say so. */
/** What an invalid `color` inherited: `body`'s ink. */
const INK = 'inherit'
/** The same ink, and not a quieter one — inheritance has no tiers. */
const MUTED = INK
/** Likewise the level numeral: the "plum" here has never been plum. */
const PLUM = INK
/** `background`'s initial value, which is what an invalid one computed to. */
const SURFACE = 'transparent'
/** `body`'s face, inherited the same way. */
const DISPLAY = 'inherit'

/* The kit's own tokens, which have always resolved and are untouched. */
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
