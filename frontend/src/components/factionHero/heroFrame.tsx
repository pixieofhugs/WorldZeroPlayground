import { Fragment } from "react";
import type { CSSProperties, ReactNode } from "react";
import i18n from "../../i18n";

/**
 * The faction hero frame (#2997): five slug-blind slots nine kits mount. The
 * frame is TREE, the kit is PAINT (ADR-0090); still one file per faction.
 *   mark     {@link HeroMark}: a marker only; the frame never draws a mark.
 *   kicker   {@link HeroKicker}: caller supplies words (na's shared key vs the
 *            kits' `factionHero.{slug}.eyebrow` must not collapse).
 *   name     {@link HeroWordmark}: the `<h1>`, with the wrap rule pinned.
 *   tagline  {@link HeroTagline}: the select tile's key (#2805); kit owns the box.
 *   counts   {@link heroCounts} / {@link HeroCounts}: one order, shared labels;
 *            the caller names only `members`.
 *
 * The frame owns elements, not just positions, because per-kit decisions went
 * wrong (UA drew no tagline; "EVER / YMEN"). Invariants land AFTER the kit's
 * `style` so a kit can't override them. Phone reflow is CSS (`.faction-hero*` in
 * `06-faction-chrome-2.css`), not `useFormFactor()` (#3002). No description slot:
 * the blurb is the body's (#2137).
 */

export type HeroCountKey = "members" | "tasks" | "praxes";

export interface HeroCount {
  key: HeroCountKey;
  value: number;
  label: string;
}

/**
 * Counts in the one order. `membersLabel` is resolved by the caller with
 * `{ count }` so the noun agrees (#3178).
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

/** A lookup, not a branch (#2805); `defaultValue` admits the computed key. */
function heroTagline(slug: string): string {
  return i18n.t(`feed:factionSelect.${slug}.tagline`, { defaultValue: "" });
}

/**
 * A marker for guards, not a drawing. `display: contents` so it isn't a box:
 * parents' grids/flex (and `alb-spin`) measure the mark itself.
 */
export function HeroMark({ children }: { children: ReactNode }) {
  return (
    <div data-hero-slot="mark" style={{ display: "contents" }}>
      {children}
    </div>
  );
}

/** The line above the wordmark. `margin: 0` is a default the kit may override. */
export function HeroKicker({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <p data-hero-slot="kicker" className={className} style={{ margin: 0, ...style }}>
      {children}
    </p>
  );
}

/**
 * No string, no element: a missing key resolves to `""` and kits wrap it in
 * ornament boxes that would draw around nothing. `as` is the kit's call.
 */
export function HeroTagline({
  slug,
  as: Tag = "div",
  className,
  style,
}: {
  slug: string;
  as?: "p" | "div";
  className?: string;
  style?: CSSProperties;
}) {
  const tagline = heroTagline(slug);
  if (!tagline) return null;
  return (
    <Tag data-hero-slot="tagline" className={className} style={style}>
      {tagline}
    </Tag>
  );
}

/**
 * A faction name is a mark, never broken mid-word (#2000); pinned after the
 * kit's `style`. Making it FIT is each kit's own paint.
 */
export function HeroWordmark({
  className,
  style,
  children,
}: {
  className?: string;
  style?: CSSProperties;
  /** The name, or the kit's dressing of it (Snide plates a span). */
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
 * Frame owns the entries and order; the kit styles the container and each
 * entry, but can't drop, reorder or rename the shared labels.
 */
export function HeroCounts({
  counts,
  className,
  style,
  children,
}: {
  counts: readonly HeroCount[];
  className?: string;
  style?: CSSProperties;
  /** Draws one entry; the frame supplies the key. */
  children: (count: HeroCount, index: number) => ReactNode;
}) {
  return (
    <div data-hero-slot="counts" className={className} style={style}>
      {/* Keyed Fragment: no box between the kit's flex parent and entry. */}
      {counts.map((count, index) => (
        <Fragment key={count.key}>{children(count, index)}</Fragment>
      ))}
    </div>
  );
}
