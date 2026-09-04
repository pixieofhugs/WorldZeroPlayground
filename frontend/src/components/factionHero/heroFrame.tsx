import { Fragment } from "react";
import type { CSSProperties, ReactNode } from "react";
import i18n from "../../i18n";

/**
 * THE FACTION HERO'S FRAME (#2997) — the shared anatomy nine kits mount.
 *
 * FIVE SLOTS, AND NOT ONE OF THEM KNOWS A SLUG.
 *   mark     the kit's own, always (#2997 ruling 2). Seven bespoke marks, and
 *            `FactionSigil` dispatched for na and Albescent. No hero is routed
 *            through the sigil that was not already: they are designed objects
 *            — a confetti scatter, a notation band, a slapped sticker — and the
 *            frame never names or draws one.
 *   kicker   {@link HeroKicker}. The frame renders the element; the CALLER
 *            resolves the string, because the key is not one family: the seven
 *            bespoke kits read `factionHero.{slug}.eyebrow` in their own voice
 *            and na reads the shared `factions:detail.eyebrow`. A frame that
 *            resolved the key itself would collapse the two scopes into one.
 *   name     {@link HeroWordmark}. The frame renders the `<h1>` and pins the
 *            wrap rule ON it; the kit dresses it through `style`.
 *   tagline  the faction's tagline out of the copy catalog, through
 *            {@link heroTagline} — the same string its select tile draws, and
 *            since #2805 the same KEY. The frame owns the KEY and not the
 *            element: the nine draw it as a plain line, a ruled cartouche, a
 *            struck plaque and a rotated sticker, and those are ornament.
 *   counts   {@link heroCounts} for the data and {@link HeroCounts} for the
 *            row. Three raw numbers the page passes, in one order, under two
 *            shared labels — each faction renames only `members`, in its own
 *            voice, which is why that one label is the caller's.
 *
 * WHAT THE FRAME OWNS, AND WHY IT IS THE ELEMENTS AND NOT JUST THE POSITIONS.
 * The rejected alternative was a slots-only shell: five named positions, each
 * kit still authoring its own `<h1>` and its own counts row. Two guards already
 * exist because that is what the family was — `heroDrawsTheTileTagline` after
 * **ua drew no tagline at all**, and `factionWordmarkWrap` after four heroes
 * separately licensed a mid-word break, so "Everymen" printed as "EVER / YMEN"
 * on a phone. Both are one defect: a decision that should be made once, made
 * eight times, wrong in some of them. A shell that keeps each kit writing its
 * own wordmark buys tidiness without buying correctness.
 *
 * SO THE INVARIANTS ARE PINNED AFTER THE KIT'S `style`, NOT BEFORE — the
 * mechanism `profileSkin`'s `TaglineSlot` already proves. A kit spreads in
 * first and the frame's own declarations land on top, so a kit cannot take one
 * back by passing it; the seven hand-written "No overflow-wrap" comments this
 * replaces were each only a promise. Everything the frame does NOT pin stays
 * the kit's: ground, ink, face, size, tracking, transform, ornament.
 *
 * ADR-0090's line, in this family's terms: the frame is TREE, the kit is PAINT.
 * ONE FILE PER FACTION STILL STANDS — there is no runtime skin table here and
 * no component rendering nine trees.
 *
 * THE PHONE REFLOW IS CSS AND MUST STAY CSS. The structural rules live in
 * `06-faction-chrome-2.css` under `.faction-hero*`, including the stack, which
 * is a media query rather than `useFormFactor()`: nothing in this family
 * branches on width, so there is no reason to make the browser wait for JS to
 * find that out. #3002 measures the cost of the other direction — 62
 * `useFormFactor()` call sites, at least 54 of them values-only — so matching
 * "the other chassis" here would be adopting the thing #3002 is open to fix.
 *
 * NO DESCRIPTION SLOT (#2137). A hero is the identity band; the blurb is the
 * body's, and every `*FactionBody` already draws it.
 */

/** The three counts a hero draws, in the order it draws them. */
export type HeroCountKey = "members" | "tasks" | "praxes";

export interface HeroCount {
  /** Stable identity for the row — the frame's key, and the order it fixes. */
  key: HeroCountKey;
  value: number;
  label: string;
}

/**
 * The counts, in the ONE order, under the two shared labels.
 *
 * This is the half of the counts row that was written nine times: every hero
 * hand-typed `feed:factionHero.stats.tasks` and `feed:factionHero.stats.praxes`
 * beside its own members label, so the shared strings were shared by convention
 * and the ORDER was a coincidence nine files agreed on.
 *
 * `membersLabel` is the caller's, and deliberately not derived from the slug.
 * Each faction renames `members` in its own voice under
 * `factionHero.{slug}.stats.members`; na has no such block and reads the shared
 * `factionHero.stats.members`. A slug-driven lookup with a fallback would also
 * pick up `factionHero.albescent.stats.members` — a key that exists, says
 * "Players", and is NOT what Albescent's hero draws today. Passing the string
 * keeps that a decision rather than an accident.
 */
export function heroCounts(
  membersLabel: string,
  counts: { members: number; tasks: number; praxes: number },
): HeroCount[] {
  return [
    { key: "members", value: counts.members, label: membersLabel },
    { key: "tasks", value: counts.tasks, label: i18n.t("feed:factionHero.stats.tasks") },
    { key: "praxes", value: counts.praxes, label: i18n.t("feed:factionHero.stats.praxes") },
  ];
}

/**
 * The tagline's KEY, resolved once for all nine (#2805).
 *
 * A LOOKUP, not a branch: the key is built from the slug, so a faction gets a
 * tagline by having copy rather than by a file learning its name. `defaultValue`
 * is what lets a computed key past the generated key union, and is what an
 * unregistered slug resolves to.
 */
export function heroTagline(slug: string): string {
  return i18n.t(`feed:factionSelect.${slug}.tagline`, { defaultValue: "" });
}

/**
 * The kicker — the small line above the wordmark.
 *
 * Singularity had none until #2997: its boot sequence was read as filling the
 * slot, and the owner ruled that uniformity wins. That is the slot's whole
 * history in one sentence, and the reason it is an element here rather than a
 * position: a slot each kit decides separately to draw is a slot one kit
 * eventually does not.
 *
 * `margin: 0` is a DEFAULT, ahead of the kit's `style`, not an invariant behind
 * it — six kits drew this as a `<div>` and set their own bottom margin, and a
 * `<p>` that ignored them would close the gap they measured.
 */
export function HeroKicker({
  text,
  className,
  style,
}: {
  /** Resolved by the caller — see the frame's note on the two eyebrow scopes. */
  text: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <p data-hero-slot="kicker" className={className} style={{ margin: 0, ...style }}>
      {text}
    </p>
  );
}

/**
 * The wordmark, and the one declaration that used to be seven comments.
 *
 * A faction name is a MARK, not copy (#2000). `overflow-wrap: anywhere`
 * licenses a break at any character, which is how "Everymen" printed as
 * "EVER / YMEN" on a phone, and the same declaration sat on Coven, UA and WOW
 * waiting for a name to grow or a webfont to fall back to a wider face. Each
 * hero then carried a hand-written comment promising not to set it again.
 *
 * The promise is a declaration now, and it lands AFTER the kit's `style`, so a
 * kit cannot pass one that wins. Whether the name then FITS is layout, and
 * stays each kit's own problem: Everymen buys the fit with `min(76px, 20vw)`
 * and a floored track, Singularity with `min(56px, 14cqw)` against an
 * inline-size container. Those are paint and they stay in the kits.
 */
export function HeroWordmark({
  className,
  style,
  children,
}: {
  className?: string;
  style?: CSSProperties;
  /** The name, or the kit's own dressing of it — Snide plates it on a span. */
  children: ReactNode;
}) {
  return (
    <h1
      className={className}
      style={{ ...style, overflowWrap: "normal", wordBreak: "normal" }}
    >
      {children}
    </h1>
  );
}

/**
 * The counts row.
 *
 * The frame owns that the row exists, which three entries it holds and what
 * order they come in; the kit owns what one entry LOOKS like, because those are
 * designed objects and not a table — a dark ledger line, a candle-lit panel, an
 * acid chit slapped at an angle, a hairline-ruled cell, a terminal readout row.
 * Three of them have their own guards (`wowHeroConfetti`,
 * `ephemeristsHeroNotationBand`, `snidePlateClearsTheSubhead`); if one goes red,
 * the frame has taken something that was the kit's.
 *
 * The kit styles the CONTAINER too — it is the ledger panel, the side column,
 * the strip under the plate — because the row's placement is part of each
 * design. What it cannot do is drop an entry, reorder the three, or rename the
 * two shared labels.
 */
export function HeroCounts<T extends HeroCount>({
  counts,
  className,
  style,
  children,
}: {
  counts: readonly T[];
  className?: string;
  style?: CSSProperties;
  /** Draws one entry in the kit's own chrome. The frame supplies the key. */
  children: (count: T, index: number) => ReactNode;
}) {
  return (
    <div data-hero-slot="counts" className={className} style={style}>
      {/* A keyed Fragment, so the frame owns the key without putting a box
          between the kit's container and the kit's entry — several of these
          containers are flex parents whose gap and alignment measure their
          direct children. */}
      {counts.map((count, index) => (
        <Fragment key={count.key}>{children(count, index)}</Fragment>
      ))}
    </div>
  );
}
