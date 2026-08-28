import { createContext } from 'react'
import type { ReactNode } from 'react'
import { factionCssVar } from '../../utils/factions'

/**
 * THE BODY SEAM (#1252) — how a feed CHASSIS dresses and re-inks the shared row.
 *
 * ## Why this exists
 *
 * #1194 split a feed card into three layers: `FeedItemSlot` (the archive) →
 * `FactionFeedFrame` (the chassis, one per faction) → the body (`FeedRowContent`,
 * faction-blind). A chassis receives only `children`, so the body was unreachable
 * from the one layer a dress issue is allowed to rewrite. Four independent agents
 * in epic #1192 hit that wall on four different parts of the row and all four
 * refused the two available workarounds — special-casing a payload from the
 * chassis, or drawing a second copy of a figure the body already prints.
 *
 * That is the seam WORLD_ZERO_STYLE §3 names: *when a shared component's ink is
 * wrong on your ground, add the ink prop once rather than working around it eight
 * times*. It is `DuelCardInk` (#1153) and `DuelSlotTheme` (#1168) a third time,
 * and it keeps their two load-bearing details:
 *
 *   1. **Every field defaults to what the body painted before**, so a faction
 *      that supplies nothing is byte-identical. The ONE deliberate exception is
 *      `monogram` — see its docblock; leaving that default alone would be
 *      preserving a measured AA failure.
 *   2. **Resolve field-by-field, never by spread.** `{...DEFAULTS, ...ink}` lets
 *      an explicit `undefined` in a partially-filled bag erase a default, which
 *      Everymen's duel-seal skin relies on not happening (#1168).
 *
 * ## Why a context and not a prop
 *
 * `DuelCard` takes props because its dresser MOUNTS it. This body's dresser does
 * not: `FeedCardRouter` builds `<FeedRowContent>` and hands it to the chassis as
 * `children`, so a frame has no call site to pass props at. Threading the bag
 * through the router instead would put a slug→skin registry back in a shared
 * file, which is the per-surface map #782 deleted, and would mean eight dress
 * branches editing one file — the shape that reddened `main` twice.
 *
 * A context inverts that: the frame publishes, the body reads, and a faction's
 * dress lives in the faction's own file. React resolves context by position in
 * the rendered tree rather than by where the element was created, so wrapping
 * already-built `children` works. `VoteFactionContext` (#855) is the same move
 * for the same reason — reading from above leaves nine parallel call sites
 * untouched.
 *
 * ## What a frame may put here
 *
 * Tokens it already owns. This is a place to REPOINT existing inks and never a
 * home for a hue measured on some other ground: the whole failure it exists to
 * fix is an ink measured against the app's page being painted on a faction's
 * sheet.
 *
 * It used to say "never a reason to mint one", and #1341 is the exception that
 * had to be written down. Repointing needs a rung that already survives the
 * chassis's ground, and three of the four chassis #1252 left had one — the acid
 * S.N.I.D.E. had already walked down for type on the slip, the pink Coven strikes
 * its numerals in, the nile Ephemerists sets its links in. Everymen had none: its
 * red misses in light on `--everymen-paper`, `-red-deep` misses in dark, and
 * `-sheet-accent` is the same red measured on the lighter sheet PANEL. So the
 * rule is about ORDER, not prohibition — look for the existing (role, ground)
 * ink first, and mint the sibling only once the family is shown not to have one.
 * `--everymen-paper-accent` is #1173's split applied to the accent role.
 */
export interface FeedRowInk {
  /**
   * The actor's name.
   *
   * Default `--color-text-primary` — a NEUTRAL text tier, not a faction hue
   * (#2108). The default used to be `factionCssVar(slug)`, the bare spine hue,
   * and its docstring asserted that was "legible on the app's neutral page".
   * That assertion was true of the pre-#2068 hue set and is not true of this
   * one: on the neutral feed ground `--faction-default-card-bg` (#fffdf9) the
   * Ephemerists' brass reads 2.36:1, S.N.I.D.E.'s acid 2.67:1 and Coven's pink
   * 3.10:1, for an 18px/700 name that owes 4.5:1 — 700 weight reaches the
   * large-text 3:1 exemption only at 18.66px. Three of the eight failed, not
   * one. `--color-text-primary` reads 18.22:1 light and 13.75:1 dark there.
   *
   * THE HUE DOES NOT LEAVE THE ROW, ONLY THE TYPE. It still fills the monogram
   * disc beside the name, which carries its own measured `-on-fill` glyph — the
   * §3 rule stated exactly as it is written: a faction hue is a FILL, not an ink.
   *
   * A LIGHT-MODE INK VALUE FOR EVERY SPINE HUE WAS CONSIDERED AND REJECTED
   * (#2108). Darkening a hue breaks `--faction-<slug>-on-fill`, which is measured
   * AGAINST that hue, so moving one stops the pair clearing; and the blast radius
   * — twelve sites, five files, all on neutral ground where a free neutral tier
   * already exists — does not pay for a token family.
   *
   * A chassis still overrides this: it knows its own ground, and its own accent
   * is measured on it. All seven bespoke frames pass one (#1252, then #1341), and
   * `feedRowInk.test.tsx` renders each frame around the shared body and
   * re-measures the pairing it publishes. What changed here is only what happens
   * when NOBODY answers — the default/Albescent rows, which is exactly where no
   * one wearing a faction skin would ever have seen it.
   */
  actor?: string
  /**
   * The monogram glyph inside the faction-tinted avatar disc.
   *
   * Default `factionCssVar(slug, 'on-fill')` — and this one is a CHANGE from
   * what the body painted before (#1252). It read the global
   * `--color-text-on-accent` (#ffffff), which is a statement about the app's
   * accent buttons and not about legibility on a faction hue: white fails 4.5:1
   * on twelve of the fourteen (faction × theme) disc fills, down to 1.21:1 on
   * S.N.I.D.E. in dark. `--faction-{key}-on-fill` is the ink #649 minted for
   * exactly this question and `factionContrast.test.ts` has gated all fourteen
   * pairs since; it clears 4.59:1–15.55:1. This is §3's rule that *a fill gets a
   * named ink, never a nearby neutral* (#1169).
   *
   * A chassis still gets the slot because the disc is a GRADIENT — 135°, the hue
   * down to 53% of it — so its lower half composites over the chassis ground and
   * the answer stops being a property of the hue alone.
   *
   * Unused on an `na`/albescent row: that monogram rides a neutral interior
   * inside the spectrum ring, painted from `--color-text-primary` on
   * `--color-bg-surface-alt`, and both of those a chassis can already repoint
   * through the `[data-theme="dark"]`-style cascade (`SingularityFeedFrame` does).
   */
  monogram?: string
}

/** What the body paints when a chassis hands in nothing. */
export function resolveFeedRowInk(
  ink: FeedRowInk | undefined,
  slug: string | null,
): Required<FeedRowInk> {
  return {
    actor: ink?.actor ?? 'var(--color-text-primary)',
    monogram: ink?.monogram ?? factionCssVar(slug, 'on-fill'),
  }
}

/** The figure the row would otherwise print in its own caption voice. */
interface FeedRowPoints {
  /** Pre-formatted points string, e.g. "40 pts" / "+12 pts", or null. */
  points: string | null
  level: number | null
}

export interface FeedRowSkin {
  /** Re-point the body's inks for this chassis's ground. */
  ink?: FeedRowInk
  /**
   * Draw the points/level figure instead of the shared caption line.
   *
   * A renderer rather than a style bag because the four asks are STRUCTURE, not
   * colour: WOW's sheet strikes a crooked gold plaque (`rotate(-2deg)`) with a ✦
   * beside the total, and the Everymen slip stamps a 66px circular seal at
   * `rotate(-4deg)` inside a double red ring. Neither is reachable by repainting
   * a `<span>`.
   *
   * It is called under exactly the condition the default line renders under — a
   * row with a headline and at least one of points/level — so a skin never has
   * to guard for an empty figure, and a row that printed nothing before still
   * prints nothing.
   */
  points?: (figure: FeedRowPoints) => ReactNode
}

/**
 * Published by a faction chassis, read by the shared body. The default is empty:
 * a card rendered outside any provider — and every one of the eight frames that
 * publishes nothing — keeps today's rendering.
 */
export const FeedRowSkinContext = createContext<FeedRowSkin>({})
