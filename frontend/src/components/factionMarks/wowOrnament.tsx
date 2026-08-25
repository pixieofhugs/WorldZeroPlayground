import type { CSSProperties, ReactNode } from "react";

import { factionRoleVar } from "../../utils/factionRoles";

/**
 * Warriors of Whimsy — THE SHARED ORNAMENT VOCABULARY (#1121).
 *
 * WOW's three signature devices, drawn ONCE and consumed everywhere:
 *
 *  - {@link Zig} — the wavy gold→plum rule that divides every WOW section.
 *  - {@link BalloonBunch} — the googly-eyed balloons, on their strings.
 *  - {@link Bunting} — the gold/plum pennants strung across a page head.
 *
 * WORLD_ZERO_STYLE §6 ("A faction's ornament is one primitive at named
 * strengths", #849): a faction's signature device is one parameterized
 * component, never re-drawn per surface — a page with its own hand-tuned
 * balloons and a card with another is how a faction stops looking like one
 * faction. `WowTaskCard` (#1023) and `WowTaskDetail` (#1037) each carried a
 * private copy of the first two; the praxis-detail skin (#1121) would have been
 * the third, so the vocabulary moved here and both older surfaces now import it.
 * The extraction is byte-faithful: the `Zig` path, the balloon geometry and the
 * pennant strip are exactly what those two files drew.
 *
 * Sibling to `components/duel/wowLists.tsx` (the tourney vocabulary) and
 * `components/factionMarks/wowMobile.tsx` (the field-pavilion vocabulary), and named
 * the same way.
 *
 * Every colour is a shipped `--faction-wow-*` token, so all three flip through
 * the `[data-theme="dark"]` cascade with no `dark ?` branch — except the gold,
 * which is theme-INVARIANT on purpose (§3: struck metal does not repaint itself
 * when the lights go out).
 *
 * Motion is CLASS-gated on `prefers-reduced-motion: no-preference`
 * (`.wow-balloon-bunch`, `.wow-balloon-eye` in `index.css`), never an inline
 * `animation:` that would bypass the gate. Stilled, every device still reads.
 *
 * Ornament geometry (`width`/`height`/`viewBox`/`r`/`top`) stays in raw pixels —
 * illustration, not layout (§4a).
 */

/** Frame + rule gold. Theme-invariant, and never an ink: 2.24:1 on the cream. */
const GOLD = "var(--faction-wow-chronicle-gold)";
/**
 * Plum as INK — this one DOES flip with the theme.
 *
 * A ROLE, ASKED FOR DIRECTLY, BECAUSE THIS MODULE HAS NO ROOT (#2674). The
 * surfaces in lane 04 spread `factionRoleVars(slug, '<their own prefix>')` and
 * read `var(--<prefix>-accent, …)` below it. This file is shared vocabulary
 * mounted under six different roots — including `WowTaskDetail`'s and
 * `WowCreateCharacter`'s — so it has no prefix of its own to declare, and one
 * prefix shared between the ornament and its six hosts would BE the `--kit-*`
 * namespace the law declines. `factionRoleVar` is the resolver's answer for a
 * single role with no all-or-nothing seam to protect; it returns the identical
 * string this constant held before.
 */
const PLUM = factionRoleVar("wow", "accent");
/**
 * Plum as ORNAMENT (#1830).
 *
 * The design's skin row splits the two in dark and only in dark: the ink lifts
 * to `#C79BE0` so it can be read, while the plum that is only ever a *shape* —
 * the zigzag's far stop, the odd balloon — stays at `#8A5AAE`, one step off the
 * light value it is theme-invariantly meant to look like. `-stamp-chip-bg`
 * dereferences `-card-accent` in light, so the two are the same swatch by day
 * and it is the night that tells them apart.
 */
const PLUM_ORNAMENT = "var(--faction-wow-stamp-chip-bg)";

/**
 * The wavy rule's path, stretched to whatever its container gives it.
 *
 * Built rather than written out: a `T`-chained quadratic of twenty segments is
 * not a string anyone should maintain by hand, and `vectorEffect:
 * non-scaling-stroke` is what keeps the line one weight however far it stretches.
 */
const ZIG_PATH = (() => {
  let path = "M0,4 Q3,1 6,4";
  for (let x = 12; x <= 120; x += 6) path += ` T${x},4`;
  return path;
})();

/**
 * The wavy gold→plum rule.
 *
 * `id` namespaces the SVG gradient, which is a document-global name: two rules
 * sharing an id both resolve to whichever paints first. They are identical
 * gradients, so a collision is invisible — but each surface still passes its own
 * ids so the markup stays honest.
 */
export function Zig({ id, style }: { id: string; style?: CSSProperties }) {
  const gradientId = `wow-zig-${id}`;
  return (
    <span aria-hidden="true" style={{ display: "block", minWidth: 24, ...style }}>
      <svg
        width="100%"
        height={8}
        viewBox="0 0 120 8"
        preserveAspectRatio="none"
        style={{ display: "block", overflow: "visible" }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor={GOLD} />
            <stop offset="1" stopColor={PLUM_ORNAMENT} />
          </linearGradient>
        </defs>
        <path
          d={ZIG_PATH}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth="1.6"
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity="0.85"
        />
      </svg>
    </span>
  );
}

/**
 * One googly balloon on its string. The pupils travel on `.wow-balloon-eye`, the
 * faction's reduced-motion-guarded wiggle, staggered per eye via
 * `--wow-eye-delay` so no two in a bunch move together.
 */
function Balloon({
  cx,
  cy,
  fill,
  delay,
}: {
  cx: number;
  cy: number;
  fill: string;
  delay: number;
}) {
  const eye = (offset: number, eyeDelay: number) => (
    <>
      <circle
        cx={cx + offset}
        cy={cy - 1}
        r={2.4}
        fill="var(--faction-wow-balloon-eye-white)"
        stroke="var(--faction-wow-balloon-eye-ring)"
        strokeWidth={0.8}
      />
      <circle
        className="wow-balloon-eye"
        cx={cx + offset}
        cy={cy - 0.2}
        r={1}
        fill="var(--faction-wow-balloon-eye)"
        style={{ "--wow-eye-delay": `${eyeDelay}s` } as CSSProperties}
      />
    </>
  );
  return (
    <g>
      <ellipse
        cx={cx}
        cy={cy}
        rx={9}
        ry={11}
        fill={fill}
        stroke="var(--faction-wow-balloon-outline)"
        strokeWidth={1.2}
      />
      <path
        d={`M${cx - 2},${cy + 10.3} L${cx + 2},${cy + 10.3} L${cx},${cy + 13.3} Z`}
        fill={fill}
        stroke="var(--faction-wow-balloon-outline)"
        strokeWidth={1.1}
        strokeLinejoin="round"
      />
      {eye(-3, delay)}
      {eye(3, delay + 0.3)}
    </g>
  );
}

/**
 * The bunch: three balloons and their strings, at a caller-chosen size.
 *
 * `bob` is the strength dial (§6, the UaMandala shape). A bunch that is the
 * page's live ornament BOBS; one tucked into a card corner as a still device
 * does not, because a card in a flex-wrap grid of forty is not a place to run
 * forty infinite animations.
 */
export function BalloonBunch({
  size,
  bob = true,
  style,
}: {
  /** Drawn width; the bunch is 1.25× as tall. Geometry, so a raw number. */
  size: number;
  bob?: boolean;
  style?: CSSProperties;
}) {
  return (
    <span
      className={bob ? "wow-balloon-bunch" : undefined}
      aria-hidden="true"
      style={{ display: "inline-block", flex: "0 0 auto", width: size, height: size * 1.25, ...style }}
    >
      <svg width={size} height={size * 1.25} viewBox="0 0 44 56" style={{ display: "block" }}>
        <g fill="none" stroke="var(--faction-wow-balloon-string)" strokeWidth={1}>
          <path d="M12,28 Q16,41 22,51" />
          <path d="M31,25 Q28,41 22,51" />
          <path d="M22,36 Q23,44 22,51" />
        </g>
        <Balloon cx={12} cy={15} fill="var(--faction-wow-balloon-5)" delay={0} />
        <Balloon cx={31} cy={12} fill="var(--faction-wow-balloon-5)" delay={0.2} />
        {/* The odd balloon takes the ORNAMENT plum, not the vote plate's first
            ramp rung (`--faction-wow-balloon-1`), which is frozen at the LIGHT
            plum in both themes because the ramp it belongs to is theme-
            invariant. Same swatch by day, the design's lifted `#8A5AAE` by
            night (#1830). */}
        <Balloon cx={22} cy={27} fill={PLUM_ORNAMENT} delay={0.4} />
        {/* The tie-off knot is struck metal, so it takes the theme-invariant
            frame gold rather than the burnt `-stamp-total`, which is an INK
            and moves with the theme (#1830). */}
        <circle cx={22} cy={51} r={1.6} fill={GOLD} />
      </svg>
    </span>
  );
}

/** How many pennants a strip carries. They flex, so this is a density, not a width. */
const BUNTING_PENNANTS = 30;

/** Gold and plum pennants strung across the head of a page. */
export function Bunting({ style }: { style?: CSSProperties }): ReactNode {
  return (
    <div
      aria-hidden="true"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "var(--space-xs)",
        height: 22,
        overflow: "hidden",
        opacity: 0.9,
        ...style,
      }}
    >
      {Array.from({ length: BUNTING_PENNANTS }).map((_, index) => (
        <span
          key={index}
          style={{
            flex: 1,
            minWidth: 0,
            height: 0,
            borderLeft: "7px solid transparent",
            borderRight: "7px solid transparent",
            borderTop: `18px solid ${index % 2 ? PLUM : GOLD}`,
            transform: `translateY(${index % 2 ? 2 : 0}px)`,
          }}
        />
      ))}
    </div>
  );
}
