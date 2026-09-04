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
 * `DesktopProfile` and a `MobileProfile` and say so in a comment that never
 * justified it. The cost was measurable rather than theoretical: the folding
 * galleries (#2958) landed in two files in one commit, `BadgeRow` existed twice,
 * and `SegTab` existed three times. What is left here is a `ProfileDress` — the
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
 *  - The phone's band and bar were `factionFill(slug, 'bar')` — a per-slug seam
 *    for a themed faction with no `profileBody` row of its own. The laptop half
 *    never had it and painted the spectrum for everyone, so the collapse takes
 *    the laptop's answer. Every live slug but na and Albescent has its own row.
 *  - The phone stack's segmented switch is now `ProfileSkin`'s, drawn for all
 *    nine (#2996). Same two keys, same two words.
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

import { factionSheet } from '../../../utils/factions'
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
 *  the trait travels beside it — see `ProfileKit.displayExtra`. */
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
function SectionHeading({ title, eyebrow }: { title: ReactNode; eyebrow?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
      <h2
        className="font-display italic"
        style={{ fontSize: 'var(--text-title)', margin: 0, color: 'var(--color-text-primary)' }}
      >
        {title}
      </h2>
      {eyebrow && <span style={{ ...EYEBROW, letterSpacing: '0.08em' }}>{eyebrow}</span>}
      <span
        aria-hidden
        className="spectrum-rule"
        style={{
          flex: 1,
          height: 3,
          borderRadius: 3,
          opacity: 0.5,
        }}
      />
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

const dress: ProfileDress = {
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
  displayExtra: ITALIC,
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
  headerFrame: (band, ornament) => (
    <div
      className="spectrum-rule"
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 16,
        padding: 'var(--space-xs)',
        boxShadow: '0 20px 50px -26px var(--color-cast-shadow)',
        marginBottom: 'var(--space-2xl)',
      }}
    >
      {ornament}
      {band}
    </div>
  ),
  // The sheet inside that ramp. `factionSheet()` with no slug is the neutral
  // family — the same stock the phone stack painted for an unaffiliated player.
  headerStyle: {
    borderRadius: 12,
    ...factionSheet(),
    padding: 'var(--space-xl)',
  },
  taglineExtra: { ...ITALIC, color: 'var(--na-profile-body-ink)' },

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
  levelBar: (percent) => (
    <div
      className="spectrum-rule"
      style={{
        height: '100%',
        borderRadius: 20,
        width: `${percent}%`,
        transition: 'width 300ms',
      }}
    />
  ),
  // Unread while `levelBar` is set; declared because `ProfileDress` requires a
  // fill and because it is what the bar would be without the class.
  barFill: 'var(--faction-default-rainbow)',
  barTrack: 'var(--color-border)',

  sectionHeading: (title, eyebrow) => <SectionHeading title={title} eyebrow={eyebrow} />,

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
        <ProfileSkin props={props} kit={dress} identityOrnament={identityOrnament} />
      </div>
    </div>
  )
}
