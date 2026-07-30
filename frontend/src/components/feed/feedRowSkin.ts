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
 * Tokens it already owns. This is a place to REPOINT existing inks, never a
 * reason to mint one, and never a home for a hue measured on some other ground:
 * the whole failure it exists to fix is an ink measured against the app's page
 * being painted on a faction's sheet.
 */
export interface FeedRowInk {
  /**
   * The actor's name.
   *
   * Default `factionCssVar(slug)` — the faction's raw hue, which is what the row
   * has always painted. That default is legible on the app's neutral page and
   * MEASURABLY IS NOT on most faction chassis: at 18px/700 it owes 4.5:1 and
   * pays 1.96:1 on WOW's cream, 2.41:1 on the S.N.I.D.E. slip, 2.98:1 on the
   * Coven ward, 3.67:1 on the Singularity terminal, 4.04:1 on UA's parchment,
   * 4.15:1 on the Ephemerists plate and 4.49:1 on Everymen's paper (light
   * theme; #1252 measured all sixteen). A chassis whose ground fails passes the
   * accent it measured instead.
   *
   * It stays the default rather than becoming `-card-accent` globally because
   * `card-accent` is measured against `-card-bg`, and only three of the eight
   * chassis paint the body on `-card-bg`. The ground decides, so the ground's
   * owner decides.
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
    actor: ink?.actor ?? factionCssVar(slug),
    monogram: ink?.monogram ?? factionCssVar(slug, 'on-fill'),
  }
}

/** The figure the row would otherwise print in its own eyebrow voice. */
export interface FeedRowPoints {
  /** Pre-formatted points string, e.g. "40 pts" / "+12 pts", or null. */
  points: string | null
  level: number | null
}

export interface FeedRowSkin {
  /** Re-point the body's inks for this chassis's ground. */
  ink?: FeedRowInk
  /**
   * Draw the points/level figure instead of the shared eyebrow line.
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
