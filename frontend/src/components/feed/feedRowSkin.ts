import { createContext } from 'react'
import type { ReactNode } from 'react'
import { factionCssVar } from '../../utils/factions'

/**
 * The body seam (#1252): how a feed chassis re-inks/dresses the shared,
 * faction-blind row (WORLD_ZERO_STYLE §3: add the ink prop once; same shape as
 * `DuelCardInk` #1153 / `DuelSlotTheme` #1168).
 *
 * 1. Every field defaults to what the body painted before (except `monogram`,
 *    whose old default failed AA).
 * 2. Resolve field-by-field, never by spread: an explicit `undefined` must not
 *    erase a default (#1168).
 *
 * A context, not a prop: `FeedCardRouter` builds the body and hands it as
 * `children`, so the frame has no call site; threading through the router
 * would revive the slug→skin registry #782 deleted. Context resolves by
 * rendered position, so wrapping built `children` works (cf.
 * `VoteFactionContext`, #855).
 *
 * Put only tokens the chassis owns here: repoint an existing (role, ground) ink
 * first; mint a sibling only if the family has none (#1341: Everymen's
 * `--everymen-paper-accent`).
 */
export interface FeedRowInk {
  /**
   * The actor's name. Default is the neutral `--color-text-primary` (#2108):
   * bare spine hues fail 4.5:1 on `--faction-default-card-bg` for three
   * factions. The hue stays on the monogram FILL. Darkening hues was rejected:
   * it breaks the `-on-fill` pairs measured against them. Bespoke chassis
   * override this (`feedRowInk.test.tsx` re-measures each).
   */
  actor?: string
  /**
   * The monogram glyph. Default `factionCssVar(slug, 'on-fill')` (#1252): white
   * failed 4.5:1 on 12 of 14 disc fills; `-on-fill` (#649) is gated by
   * `factionContrast.test.ts`. A chassis may override because the disc is a
   * gradient whose lower half composites over the chassis ground. Unused on
   * `na`/albescent rows (neutral interior, repointable via cascade).
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

interface FeedRowPoints {
  /** e.g. "40 pts" / "+12 pts". */
  points: string | null
  level: number | null
}

export interface FeedRowSkin {
  ink?: FeedRowInk
  /**
   * Replaces the shared caption line. A renderer, not a style bag: the asks are
   * structure (WOW's crooked plaque, Everymen's stamped seal). Called under the
   * same condition the default line renders, so no empty-figure guard needed.
   */
  points?: (figure: FeedRowPoints) => ReactNode
}

/** Default empty: outside a provider the body renders unchanged. */
export const FeedRowSkinContext = createContext<FeedRowSkin>({})
