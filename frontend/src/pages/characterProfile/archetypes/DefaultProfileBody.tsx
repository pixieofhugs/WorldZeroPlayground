/**
 * DefaultProfileBody — the unaffiliated / no-faction player-profile, and THE
 * NINTH KIT (#459, ported from the design system's `templates/default/Default
 * Profile.dc.html`; delegated by #2996).
 *
 * A clean sheet inside the thick spectrum band (all paths open), and the
 * fallback for every faction until its bespoke skin lands (#460). All colours
 * via `--faction-default-*` / global tokens (#418) — no hardcoded hex;
 * light/dark flips through the cascade.
 *
 * IT DELEGATES NOW, LIKE THE OTHER EIGHT. This file used to hand-author a
 * laptop branch and a phone branch, dispatch between them on `useFormFactor()`,
 * and say so in a comment that never justified it. Both are retired, and
 * `src/__tests__/retiredSurfaces.test.ts` is what holds their names out of
 * shipped source — which is why they are not spelt out here. The cost of the
 * two was measurable rather than theoretical: the folding galleries (#2958)
 * landed in two files in one commit, `BadgeRow` existed twice, and the phone's
 * segmented switch existed three times. What is left here is a `ProfileDress` — the
 * costume, and only the costume. The spine is `ProfileSkin`'s, stated there.
 *
 * WHAT THE PORT CHANGED, AND WHY EACH ONE IS DELIBERATE:
 *
 *  - The page gains the shared plate's horizontal inset (`--space-xl`, 24px).
 *    na's `pageBackground` is transparent, so nothing new is painted; the
 *    column is simply inset the way every other profile's is. Vertical padding
 *    is unchanged — `--space-2xl` is exactly the `py-8` this wrapper had.
 *  - One quiet ink in the header instead of two. na drew `--color-text-tertiary`
 *    at the handle, the "lvl" label and the next-rung eyebrow, and
 *    `--color-text-secondary` at the points-into-level line beside them. The
 *    shared header has one `muted` role, so the four tertiary sites DARKEN by a
 *    tier — the safe direction, and the reading every other kit already gets.
 *  - The phone stack's segmented switch is now `ProfileSkin`'s, drawn for all
 *    nine (#2996). Same two keys, same two words. It is the app's own
 *    `SegmentedRail`, so it also gains that control's 44px tap target where na
 *    hand-rolled 36.
 *  - Two laptop measurements take the shared skin's value rather than na's, and
 *    both are the same call: a shared spine may not fork for one kit over a
 *    number neither design argues for. The badge rail is a hard `300px` column
 *    where na wrote `fit-content(300px)`, so the rail no longer shrinks to a
 *    short badge name and the main column no longer takes the slack; and the
 *    identity column's floor is `300` where na wrote `280`, which moves the
 *    header's wrap point 20px earlier. Both are on the PR's eyeball list. If
 *    either turns out to be load-bearing for na, the fix is a kit knob, not a
 *    second grid.
 *  - The absolute-score caption under the level bar (`profile.ptsToNext`) is
 *    unchanged in wording and position, but it is now drawn by the shared skin
 *    for ALL NINE rather than by na alone. Delegating deleted it outright for a
 *    commit — the skin had no slot — which is the one thing here that was a
 *    silent regression rather than a stated change.
 *
 * THIS IS ALSO THE FALL-THROUGH BODY, AND THE SEAM THAT MAKES IT ONE IS
 * `isKnownFaction` (ADR-0039, #749). A faction with no `profileBody` row in its
 * manifest lands here, and it must not be handed na's rainbow: the spectrum is
 * the UNAFFILIATED identity, so a themed slug reaching this file wears its own
 * solid hue through `factionFill(slug, 'bar')` and na, Albescent and an
 * unregistered string wear the ramp. The predicate reads the MAPPED css key, so
 * Albescent resolves to `default` and keeps the spectrum without this file ever
 * naming the society — which is the whole of ADR-0048's posture on this surface.
 *
 * It used to be a PHONE-ONLY seam, because the retired laptop branch painted the
 * spectrum for everyone and only the retired phone branch asked the question.
 * One renderer means one answer, and the phone's is the correct one: it is the
 * half that had read ADR-0039. So the three mounts below take it at both widths,
 * and each is written as two sibling mounts rather than a computed class —
 * `albescentSpectraMove`'s census reads a literal className out of this source,
 * and a `spectrum ? 'spectrum-rule' : undefined` would make all three invisible
 * to the guard that keeps them travelling.
 *
 * The two `.spectrum-dial` mounts (the FDL laurel's ring, the badge medallions)
 * are deliberately NOT on that seam: both retired branches drew them for every
 * slug, and the dial is the top-praxis mark rather than an identity band.
 *
 * THREE SPECTRUM MOUNTS LIVE IN THIS FILE, and they must stay in it (#2500,
 * epic #2496 ruling 3): the section head's hairline, the identity band, and the
 * level bar's fill. `albescentSpectraMove.test.tsx`'s per-mount census reads
 * them from this source and classifies each as ornament or FRAME — `:empty` is
 * the difference, so a hairline that gains a child silently stops travelling.
 * They are na's costume: written into `profileSkin.tsx` instead, they would give
 * all nine factions a rainbow, which is why the shared skin takes them through
 * kit slots (`sectionHeading`, `headerFrame`, `levelBar`) rather than drawing
 * them itself.
 */
import type { CSSProperties, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { factionFill, factionSheet, isKnownFaction } from '../../../utils/factions'
import { factionRoleVars } from '../../../utils/factionRoles'
import type { ProfileBodyProps } from '../FactionProfileBody'
import { BadgeRow, ProfileSkin, type ProfileDress } from './profileSkin'

/**
 * The role map (#2672). Spread on the wrapper below — the one root this file
 * still owns, since `ProfileSkin` owns the page element all nine mount on.
 *
 * Pinned to na: the ground is `.na-backdrop` plus `factionSheet()`, neither of
 * which takes a slug, and an ink may not leave a ground that cannot follow it
 * (#2361, #2669). What the prefix buys is a name a dresser can reach this one
 * surface by — `identityOrnament` is the same motive.
 */
const ROLES = factionRoleVars('na', 'na-profile-body')

const EYEBROW: CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: 'var(--text-base)',
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
  color: 'var(--color-text-tertiary)',
}

/** na's display cut is italic. `displayFont` is a family and cannot say so, so
 *  the slope travels beside it — see `ProfileKit.displayFontStyle`. The object
 *  form is still what the two SLOT styles want (the tagline and the badge name
 *  take a whole `CSSProperties`); the skin's own three sites take the value. */
const ITALIC: CSSProperties = { fontStyle: 'italic' }

/**
 * Section heading: display-italic title + optional eyebrow + a soft rainbow rule.
 *
 * `title` is a NODE because the two gallery headings hand it a `SectionToggle`
 * (#2958) — the disclosure button has to sit inside this `<h2>` to inherit the
 * face, the size and the ink. About passes a plain string.
 *
 * ① of the three spectrum mounts: the hairline is an ORNAMENT and must stay
 * CHILDLESS, or `.alb-moves .spectrum-rule:empty` stops reaching it and an
 * Albescent member's section heads quietly stand still.
 */
const HAIRLINE: CSSProperties = { flex: 1, height: 3, borderRadius: 3, opacity: 0.5 }

/**
 * The identity band's GEOMETRY, written once and spread by both sides of the
 * ramp-or-hue seam. Only the paint differs between them, and the 16px corner in
 * particular may not: `.alb-profile-edge` takes `border-radius: inherit` from
 * whichever band it is mounted on (#2407), and `spectrumRingCollapse.test.ts`
 * counts this one declaration to hold the pairing together.
 */
const BAND: CSSProperties = {
  position: 'relative',
  overflow: 'hidden',
  borderRadius: 16,
  padding: 'var(--space-xs)',
  boxShadow: '0 20px 50px -26px var(--color-cast-shadow)',
  marginBottom: 'var(--space-2xl)',
}

/** The level bar's filled length, likewise — the width is the only per-render
 *  value and the paint is the only per-slug one. */
const BAR: CSSProperties = { height: '100%', borderRadius: 20, transition: 'width 300ms' }

function SectionHeading({
  title,
  eyebrow,
  slug,
}: {
  title: ReactNode
  eyebrow?: string
  /** The viewer's faction, for the ramp-or-hue seam. */
  slug: string
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
      <h2
        className="font-display italic"
        style={{ fontSize: 'var(--text-title)', margin: 0, color: 'var(--color-text-primary)' }}
      >
        {title}
      </h2>
      {eyebrow && <span style={{ ...EYEBROW, letterSpacing: '0.08em' }}>{eyebrow}</span>}
      {isKnownFaction(slug) ? (
        <span aria-hidden style={{ ...HAIRLINE, ...factionFill(slug, 'bar') }} />
      ) : (
        <span aria-hidden className="spectrum-rule" style={HAIRLINE} />
      )}
    </div>
  )
}

/** The FDL laurel stamped on the character's top praxis (highest base+vote
 *  points — `praxis.score` is exactly that sum). Spectrum ring, ink glyph.
 *  Its own dial rather than the shared `SpectrumLaurel`: the ring is a CLASS
 *  here, which is what carries it into Albescent's motion. */
function FdlLaurel() {
  const { t } = useTranslation('common')
  return (
    <span
      title={t('profile.topPraxis')}
      style={{
        position: 'absolute',
        top: -11,
        right: 14,
        zIndex: 20,
        width: 44,
        height: 44,
        // Same cast as the two boxShadows below, and the rule cannot see it:
        // `filter` is not a COLOUR_PROP, so this one was laundered past the
        // ratchet by the property it was written on rather than by its value.
        filter: 'drop-shadow(0 4px 8px var(--color-cast-shadow))',
      }}
    >
      <span
        className="spectrum-dial"
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
        }}
      />
      <span
        style={{
          position: 'absolute',
          inset: 4,
          borderRadius: '50%',
          background: 'var(--color-bg-surface-alt)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-text-primary)',
        }}
      >
        <svg width={18} height={22} viewBox="0 0 40 48" fill="currentColor" aria-hidden>
          <path d="M20 1 C16 10 16 17 20 24 C24 17 24 10 20 1 Z" />
          <path d="M20 22 C14 15 8 15 6 21 C4.6 25 8 29 13.5 27.6 C10.5 25 12.5 21 20 22 Z" />
          <path d="M20 22 C26 15 32 15 34 21 C35.4 25 32 29 26.5 27.6 C29.5 25 27.5 21 20 22 Z" />
          <rect x="11" y="26" width="18" height="4.5" rx="2.2" />
          <path d="M20 30 C17.5 37 16 41 20 47 C24 41 22.5 37 20 30 Z" />
        </svg>
      </span>
    </span>
  )
}

/* A `spectrumRing(degrees, fill)` helper stood here: the level ring's filled
 * arc, cut in the SPECTRUM by a two-layer conic with the track masking the
 * unfilled sweep (#1630). It is deleted with the ring itself (#2213) — the arc
 * and the bar under it plotted the same percentage — and is NOT to be brought
 * back to make a profile look less bare. If a future surface genuinely needs a
 * spectrum-cut arc, ADR-0039's reasoning is the part worth rereading: the
 * unaffiliated identity is a gradient, so it appears wherever a gradient can go,
 * and a `background` is somewhere it can. */

/**
 * The costume, per slug — see the fall-through paragraph in the file docblock.
 *
 * A function rather than a module constant because three of its mounts ask
 * `isKnownFaction`, and a constant can only answer for one slug. Rebuilt each
 * render, which costs an object literal: `ProfileSkin` reads the kit's fields
 * during render and memoizes nothing on its identity, so there is nothing for a
 * stable reference to buy.
 */
function naDress(slug: string): ProfileDress {
  const spectrum = !isKnownFaction(slug)
  return {
  slug: 'na',
  // No plate. na's ground is the `.na-backdrop` wash the wrapper mounts, which
  // is a full-VIEWPORT fixed layer and cannot be a page background value.
  pageBackground: 'transparent',
  ink: 'var(--color-text-primary)',
  muted: 'var(--color-text-secondary)',
  // The level numeral, and its only reader since #2213 deleted the ring. It
  // sits on `--color-bg-surface-alt`, the progression panel's own ground, where
  // the hub disc used to paint the same value.
  accent: 'var(--color-text-primary)',
  surface: 'var(--color-bg-surface-alt)',
  border: 'var(--color-border)',
  displayFont: 'var(--font-display)',
  displayFontStyle: 'italic',
  eyebrowFont: 'var(--font-body)',
  bodyFont: 'var(--font-body)',

  /**
   * ② of the three spectrum mounts: the identity band is a FRAME — a padded
   * spectrum ramp around an opaque sheet — and must KEEP ITS CHILDREN, or
   * `.alb-moves .spectrum-rule:empty` reaches it and a travelling child paints
   * over the credential card it frames. `.alb-profile-edge` already travels on
   * this object, which is the "one carrier per object" #2519 established.
   *
   * The 16px corner is the pairing `.alb-profile-edge`'s `border-radius:
   * inherit` reads (#2407); `spectrumRingCollapse.test.ts` holds the two
   * together, and it is ONE mount now rather than one per form factor.
   */
  headerFrame: (band, ornament) =>
    spectrum ? (
      <div className="spectrum-rule" style={BAND}>
        {ornament}
        {band}
      </div>
    ) : (
      <div style={{ ...BAND, ...factionFill(slug, 'bar') }}>
        {ornament}
        {band}
      </div>
    ),
  // The sheet inside that ramp. `factionSheet()` with no slug is the neutral
  // family — na's own stock, so a themed slug takes the app's alt surface
  // instead, exactly as the retired phone branch did.
  headerStyle: {
    borderRadius: 12,
    ...(spectrum ? factionSheet() : { background: 'var(--color-bg-surface-alt)' }),
    padding: 'var(--space-xl)',
  },
  taglineExtra: {
    ...ITALIC,
    color: spectrum ? 'var(--na-profile-body-ink)' : 'var(--color-text-primary)',
  },

  progressionStyle: {
    marginTop: 'var(--space-xl)',
    border: '1px solid var(--color-border-strong)',
    borderRadius: 12,
    padding: 'var(--space-lg)',
    background: 'var(--color-bg-surface-alt)',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-lg)',
    maxWidth: 440,
  },
  /**
   * ③ of the three spectrum mounts, and the one epic #2496 ruling 3 names by
   * hand: the level bar's fill is an ORNAMENT and must stay CHILDLESS. It is a
   * `levelBar` slot rather than a `barFill` value because the ramp is a CLASS —
   * `.spectrum-rule` is how the stylesheet reaches it, and how Albescent's
   * motion does.
   */
  levelBar: (percent) =>
    spectrum ? (
      <div className="spectrum-rule" style={{ ...BAR, width: `${percent}%` }} />
    ) : (
      <div style={{ ...BAR, width: `${percent}%`, ...factionFill(slug, 'bar') }} />
    ),
  // Unread while `levelBar` is set; declared because `ProfileDress` requires a
  // fill and because it is what the bar would be without the class.
  barFill: 'var(--faction-default-rainbow)',
  barTrack: 'var(--color-border)',

  sectionHeading: (title, eyebrow) => (
    <SectionHeading title={title} eyebrow={eyebrow} slug={slug} />
  ),

  emptyStateStyle: {
    border: '1.5px dashed var(--color-border-strong)',
    borderRadius: 12,
    padding: 'var(--space-2xl)',
    textAlign: 'center',
    background: 'var(--color-bg-surface-alt)',
  },
  laurel: <FdlLaurel />,

  badgeBoardStyle: {
    border: '1px solid var(--color-border)',
    borderRadius: 12,
    background: 'var(--color-bg-surface-alt)',
    padding: 'var(--space-xs) var(--space-lg)',
  },
  badgeChipStyle: {
    ...EYEBROW,
    fontSize: 'var(--text-md)',
    letterSpacing: '0.1em',
    marginLeft: 'auto',
    border: '1px solid var(--color-border-strong)',
    borderRadius: 20,
    padding: 'var(--space-xs) var(--space-sm)',
  },
  badgeRow: (badge, last) => (
    <BadgeRow
      badge={badge}
      last={last}
      dividerColor="var(--color-border)"
      nameStyle={{ fontFamily: 'var(--font-display)', ...ITALIC, color: 'var(--color-text-primary)', lineHeight: 1.15 }}
      medallion={(glyph) => (
        <span
          className="spectrum-dial"
          style={{
            flexShrink: 0,
            width: 34,
            height: 34,
            borderRadius: '50%',
            // eslint-disable-next-line local/no-raw-style-values -- ornament: spectrum ring thickness on a 34px medallion; the nearest rung (4px) is a 60% thicker ring and visibly shrinks the inner disc.
            padding: 2.5,
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
              background: 'var(--color-bg-surface-alt)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-text-primary)',
            }}
          >
            {glyph}
          </span>
        </span>
      )}
    />
  ),
  }
}

/**
 * An inert ornament layer mounted INSIDE the identity band, at both widths.
 *
 * The one seam a skin-fallthrough faction needs and could not otherwise reach.
 * Albescent renders this component whole (ADR-0048: `Default` PLUS a flourish,
 * never a repaint), and its tell is the na spectrum frame coming alive — a
 * flourish that lives ON the band, four pixels wide, which no wrapper outside
 * this component can aim at. The alternative shapes are both worse: an overlay
 * on a wrapper covers the whole page rather than the band, and a `slug ===
 * 'albescent'` branch in here would put the society's name in the very file
 * that exists to make it indistinguishable.
 *
 * It reaches the band through `ProfileSkin`'s `identityOrnament` prop and this
 * kit's `headerFrame` (#2996) — the two exist for each other.
 *
 * Optional, so na and every unskinned slug render byte-identically — #1153's
 * rule, and the same shape `DefaultTaskDetail`'s `worthSlot` and
 * `DefaultPraxisDetail`'s `ornament` already take.
 */
interface DefaultProfileBodyProps extends ProfileBodyProps {
  identityOrnament?: ReactNode
}

export default function DefaultProfileBody({
  identityOrnament,
  ...props
}: DefaultProfileBodyProps) {
  return (
    <div style={{ ...ROLES, position: 'relative' }}>
      {/* Full-page spectrum wash — the na "all paths open" backdrop. The
          `.na-backdrop` rule (raw radial-gradient rgba + a [data-theme="dark"]
          brighten) lives in index.css and is owned by frontend-style. It is
          `position: fixed`, so it is the page's wash rather than this column's,
          and it stays on this wrapper rather than becoming a kit slot: it is
          the only page-level layer any kit has and a slot for one would be
          scaffolding for nobody. */}
      <div className="na-backdrop" aria-hidden />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <ProfileSkin
          props={props}
          kit={naDress(props.character.faction_slug)}
          identityOrnament={identityOrnament}
        />
      </div>
    </div>
  )
}
