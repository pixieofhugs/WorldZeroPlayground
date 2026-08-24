/**
 * ONE RING, SIX MOUNTS — the collapse is a NO-OP (#2407).
 *
 * `.spectrum-frame::before` (#2404) and the five hand-rolled Albescent edges
 * were the same `mask … exclude` device six times over. #2407 merged them into
 * one selector list in `src/index.css` and moved their travel into the deferred
 * `src/motion.ornament.css`. That is a byte reclaim and nothing else: every one
 * of the six must still resolve to the pixels it resolved to before.
 *
 * THE SEAM IS THE RESOLVED RULE, not the markup and not a screenshot. Each mount
 * now takes most of its ring from a shared rule near the top of the sheet and
 * states its own differences in a rule further down, which wins on source order
 * at equal specificity. That resolution is the only thing the collapse could
 * have got wrong, so it is what this file reads: every top-level rule in
 * index.css whose selector list contains the class, merged in file order, then
 * compared against the values measured on `4cd063e8` — the commit before the
 * collapse. A retune that means to change a mount edits the table here and says
 * so; a collapse that silently repaints one fails.
 *
 * `border-radius: inherit` is the one value that legitimately CHANGED text
 * (`.alb-profile-edge` had a hardcoded 16px), so the pairing it now depends on —
 * the identity band's own inline corner, in both of DefaultProfileBody's form
 * factors — is asserted here too. That coupling used to be a comment.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { stripComments } from "../utils/__tests__/cssVars";

const read = (path: string) =>
  readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");

const INDEX = stripComments(read("../index.css"));
const MOTION = stripComments(read("../motion.ornament.css"));
const PROFILE_BODY = read(
  "../pages/characterProfile/archetypes/DefaultProfileBody.tsx",
);

/** Every top-level `selector { body }` in a sheet, at-rules skipped whole. */
function topLevelRules(css: string): Array<{ selectors: string[]; body: string }> {
  const rules: Array<{ selectors: string[]; body: string }> = [];
  let cursor = 0;
  while (cursor < css.length) {
    const open = css.indexOf("{", cursor);
    if (open === -1) break;
    let depth = 1;
    let index = open + 1;
    while (index < css.length && depth > 0) {
      if (css[index] === "{") depth += 1;
      else if (css[index] === "}") depth -= 1;
      index += 1;
    }
    const prelude = css.slice(cursor, open).trim();
    if (!prelude.startsWith("@")) {
      rules.push({
        selectors: prelude.split(",").map((one) => one.trim()),
        body: css.slice(open + 1, index - 1),
      });
    }
    cursor = index;
  }
  return rules;
}

const RULES = topLevelRules(INDEX);

/** The cascade for one selector, in file order — later declarations win. */
function resolve(selector: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const rule of RULES) {
    if (!rule.selectors.includes(selector)) continue;
    for (const [, property, value] of rule.body.matchAll(
      /([-\w]+)\s*:\s*([^;]+)/g,
    )) {
      out.set(property.trim(), value.trim().replace(/\s+/g, " "));
    }
  }
  return out;
}

/** The loop cut, reached through the rail's suppression hook — unset here. */
const RAMP = "var(--spectrum-frame-image, var(--faction-default-rainbow-loop))";
const MASK = "linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0)";

/**
 * Measured on 4cd063e8, the commit before the collapse: corner, width, tile,
 * opacity, stacking.
 *
 * Pairs rather than an object literal on purpose. These are ASSERTIONS ABOUT A
 * STYLESHEET, not styles, but `{ padding: "3px" }` is indistinguishable from an
 * inline style to `local/no-raw-style-values` — and the right answer to a
 * ratchet that cannot tell them apart is to not write the shape it matches,
 * never to widen the rule that catches the real thing.
 */
const BEFORE: Array<[string, Array<[string, string]>]> = [
  [
    ".alb-task-edge",
    [
      ["border-radius", "14px"],
      ["padding", "3px"],
      ["background-size", "300% 100%"],
      ["opacity", "1"],
      ["z-index", "1"],
    ],
  ],
  [
    ".alb-detail-edge",
    [
      ["border-radius", "18px"],
      ["padding", "2px"],
      ["background-size", "300% 100%"],
      ["opacity", "0.75"],
      ["z-index", "2"],
    ],
  ],
  [
    ".alb-praxis-edge",
    [
      ["border-radius", "18px"],
      ["padding", "2px"],
      ["background-size", "300% 100%"],
      ["opacity", "0.72"],
      ["z-index", "2"],
    ],
  ],
  [
    ".alb-feed-edge",
    [
      ["border-radius", "var(--radius-xl)"],
      ["padding", "1px"],
      ["background-size", "300% 100%"],
      ["opacity", "0.6"],
      ["z-index", "1"],
    ],
  ],
  [
    ".alb-profile-edge",
    [
      // The one legitimately changed value: 16px was a copy of the band's own
      // inline corner, which `inherit` now reads directly. Asserted below.
      ["border-radius", "inherit"],
      ["padding", "var(--space-xs)"],
      ["background-size", "200% 100%"],
      ["opacity", "1"],
    ],
  ],
  [
    ".spectrum-frame::before",
    [
      ["border-radius", "inherit"],
      ["padding", "1px"],
      ["background-size", "220px 100%"],
      ["opacity", "0.6"],
      ["z-index", "1"],
    ],
  ],
];

/** One row of BEFORE, by selector. */
const before = (selector: string): Array<[string, string]> =>
  BEFORE.find(([one]) => one === selector)?.[1] ?? [];

describe("the collapsed spectrum ring resolves to what each mount had (#2407)", () => {
  for (const [selector, expected] of BEFORE) {
    it(`${selector} keeps its width, tile, opacity and corner`, () => {
      const resolved = resolve(selector);
      expect(resolved.size, `no rule matches ${selector}`).toBeGreaterThan(0);
      for (const [property, value] of expected) {
        expect(resolved.get(property), `${selector} { ${property} }`).toBe(value);
      }
    });

    it(`${selector} is the shared masked ring, not a border`, () => {
      const resolved = resolve(selector);
      // `border-image` does not clip to `border-radius`; the exclude idiom does.
      expect(resolved.get("mask"), `${selector} mask`).toBe(MASK);
      expect(resolved.get("-webkit-mask-composite")).toBe("xor");
      expect(resolved.get("background-image"), `${selector} ramp`).toBe(RAMP);
      expect(resolved.get("position")).toBe("absolute");
      expect(resolved.get("pointer-events")).toBe("none");
    });
  }

  it("declares that ring exactly once", () => {
    // The point of the change: six copies of the idiom became one. Counted by
    // RULE rather than by string, because the exclude idiom is the general
    // radius-safe ring and two unrelated rules use it honestly — the level gem's
    // rotated stroke and the filter rail's top band. What must stay singular is
    // the SPECTRUM ring, the one drawing this ramp.
    const rings = RULES.filter(
      (rule) => rule.body.includes("content-box exclude") && rule.body.includes(RAMP),
    );
    expect(
      rings.map((rule) => rule.selectors.join(", ")),
      "a seventh hand-rolled spectrum ring",
    ).toHaveLength(1);
  });

  it("`.alb-profile-edge` inherits a corner the identity band actually has", () => {
    // `inherit` reads the DIRECT parent. It replaced a hardcoded 16 that had to
    // track this, so the band's own corner is the pairing, in both form factors.
    expect(
      (PROFILE_BODY.match(/borderRadius: 16,/g) ?? []).length,
      "DefaultProfileBody's identity band lost its 16px corner in one branch",
    ).toBe(2);
  });
});

describe("the travel moved to the deferred sheet, and only the travel (#2407)", () => {
  it("index.css runs none of the five", () => {
    // Motion may arrive late for free; colour and layout may never. What stays
    // in the render-blocking sheet is the resting ring on every one of them.
    for (const [selector] of BEFORE) {
      expect(resolve(selector).get("animation"), `${selector} animation`).toBeUndefined();
    }
    for (const retired of ["alb-task-edge", "alb-detail-edge", "alb-praxis-edge", "alb-feed-edge"]) {
      expect(INDEX, `@keyframes ${retired} did not retire`).not.toContain(
        `@keyframes ${retired}`,
      );
    }
  });

  it("five mounts share one keyframe", () => {
    expect(MOTION).toContain("@keyframes alb-edge-travel");
    // #2498 retired the fifth. It existed because a `background-position` walk
    // states its travel in the TILE's units, so the profile band's 200% tile
    // needed its own end stop; a transform states travel in the CHILD's units,
    // and the child carries the difference as a width. One keyframe, two widths.
    expect(MOTION, "@keyframes alb-profile-edge did not retire").not.toContain(
      "@keyframes alb-profile-edge",
    );
    expect(INDEX).not.toContain("@keyframes alb-profile-edge");
  });

  it("reduced motion still stops every one of the five", () => {
    for (const selector of [
      ".alb-task-edge",
      ".alb-detail-edge",
      ".alb-praxis-edge",
      ".alb-feed-edge",
      ".alb-profile-edge",
    ]) {
      // Either its own rule or a member of the shared list — and no line-ending
      // assumption, which is a real trap on a checkout that normalises to CRLF.
      // Since #2498 the travel is on a `::before` of each of the five, so the
      // pseudo-element is optional here rather than assumed either way.
      const at = MOTION.search(
        new RegExp(`\\${selector}(::before)?\\s*[,{]`),
      );
      expect(at, `${selector} has no drift rule at all`).toBeGreaterThan(0);
      const gateAt = MOTION.lastIndexOf("@media", at);
      expect(
        MOTION.slice(gateAt, at),
        `${selector} travels outside the reduced-motion gate`,
      ).toContain("prefers-reduced-motion: no-preference");
    }
  });
});

/**
 * THE TRAVEL STOPS WALKING A GRADIENT PARAMETER (#2498, epic #2496).
 *
 * `background-position` is not a compositor property, so a walk repaints the
 * whole ring every frame on the main thread. The epic's technique ruling names
 * the replacement exactly: "translate a 300%-wide gradient child inside
 * `overflow: hidden` rather than walking `background-position`."
 *
 * THE CHILD EXISTS ONLY INSIDE THE GATE, which is what keeps this free. Under
 * reduced motion — or with the deferred sheet not yet delivered — there is no
 * `::before` at all, and the still ring is the mount's own background painted
 * from index.css exactly as it was before this change. The child arrives already
 * registered with it: at `translateX(0)` its first tile starts at the padding
 * box's left edge, which is where `background-position: 0%` put the image.
 *
 * SO THE SEAM IS ARITHMETIC, not a screenshot. Two numbers have to survive the
 * change of idiom, and both are derived here rather than retyped:
 *
 *   the TILE   — `width × background-size-x` must equal the mount's own
 *                `background-size`, or turning motion on changes the stripe
 *                width, which is a design change wearing a perf change's clothes.
 *   the SPEED  — travel per second. The old walk moved `tile × loops` per
 *                duration; the new one moves half the child's width per
 *                duration. A wrong width or a wrong duration is invisible to
 *                every test that only asks whether something animates.
 *
 * And the travel must be a whole number of tiles, or the loop seams.
 */
describe("the travel is a transform on a pre-painted child (#2498)", () => {
  /** The travelling child of one mount, resolved over the deferred sheet. */
  function child(selector: string): Map<string, string> {
    const out = new Map<string, string>();
    for (const [, prelude, body] of MOTION.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      if (!prelude.split(",").some((one) => one.trim() === `${selector}::before`)) {
        continue;
      }
      for (const [, property, value] of body.matchAll(/([-\w]+)\s*:\s*([^;]+)/g)) {
        out.set(property.trim(), value.trim().replace(/\s+/g, " "));
      }
    }
    return out;
  }

  /** `600%` and `50% 100%` both read as their first number: 600, 50. */
  const percent = (value: string | undefined): number =>
    Number((value ?? "").trim().split(/\s+/)[0].replace("%", ""));

  /** The last `<n>s` an `animation` shorthand or an override states. */
  const seconds = (rule: Map<string, string>): number =>
    Number(
      `${rule.get("animation") ?? ""} ${rule.get("animation-duration") ?? ""}`
        .split(/\s+/)
        .map((word) => word.match(/^([\d.]+)s$/)?.[1])
        .filter(Boolean)
        .at(-1),
    );

  /** How the walk used to be stated: whole image-widths, and over how long. */
  const WALK: Array<[string, number, number]> = [
    // `background-position: 0% 50%` → `300% 50%` over a 300% tile is -6 mount
    // widths, i.e. TWO image widths; the 200% band's `0%` → `200%` is one.
    [".alb-task-edge", 2, 16],
    [".alb-detail-edge", 2, 16],
    [".alb-praxis-edge", 2, 16],
    [".alb-feed-edge", 2, 16],
    [".alb-profile-edge", 1, 9],
  ];

  it("runs a transform, and no alb keyframe walks a gradient parameter", () => {
    // FIVE KEYFRAMES BECAME ONE — asserted over what the five rules NAME, not
    // over the sheet's whole inventory of `alb-` keyframes. #2498's second half
    // moved nine more Albescent ornament motions here off the blocking sheet,
    // and an inventory assertion would have read that as this collapse coming
    // undone. What it is really claiming is that no mount needs a keyframe of
    // its own, and that is a statement about the five rules.
    const named = [
      ...new Set(
        WALK.map(([selector]) => child(selector).get("animation")?.split(/\s+/)[0]),
      ),
    ];
    expect(named, "the five mounts' one keyframe").toEqual(["alb-edge-travel"]);
    const at = MOTION.indexOf("@keyframes alb-edge-travel");
    expect(
      MOTION.slice(at, MOTION.indexOf("}", MOTION.indexOf("}", at) + 1)).replace(
        /\s+/g,
        " ",
      ),
    ).toContain("transform: translateX(-50%)");

    // The other half of the title, now that there is a population to say it
    // about: every `alb-` keyframe on this sheet moves a transform and nothing
    // else. A gradient parameter — `background-position`, or an `@property`
    // angle — reappearing in any of them is the expensive idiom coming back.
    const keyframes = [
      ...MOTION.matchAll(/@keyframes (alb-[\w-]+)\s*\{((?:[^{}]|\{[^{}]*\})*)\}/g),
    ];
    // Was 8 until #2499 retired `alb-task-drift`, `alb-detail-drift`,
    // `alb-praxis-drift`, `alb-feed-drift` and `alb-detail-sheen` with the five
    // aurora overlays they breathed. EXACT, not a floor: the number going UP
    // without a reason written here is a mount minting a keyframe of its own,
    // which is what #2407 and #2498 each spent a PR collapsing.
    expect(keyframes.length, "no alb keyframes found — the regex has rotted").toBe(3);
    for (const [, name, body] of keyframes) {
      expect(
        [...new Set([...body.matchAll(/([-\w]+)\s*:/g)].map(([, one]) => one))],
        `@keyframes ${name} animates something a compositor cannot`,
      ).toEqual(["transform"]);
    }
  });

  for (const [selector, loops, duration] of WALK) {
    it(`${selector} keeps its tile, its speed and its seamless loop`, () => {
      const rule = child(selector);
      expect(rule.size, `${selector} has no travelling child`).toBeGreaterThan(0);
      expect(rule.get("background-image"), "one ramp, declared once").toBe("inherit");

      const mount = percent(new Map(before(selector)).get("background-size"));
      const span = percent(rule.get("width"));
      const tile = (span * percent(rule.get("background-size"))) / 100;
      expect(tile, `${selector} tile, as a % of the mount`).toBe(mount);

      // `translateX(-50%)` of the child, so half its width per cycle.
      expect(span / 2 / tile, `${selector} loop is not a whole tile`).toBe(1);
      expect(span / 2 / seconds(rule), `${selector} travels at a new speed`).toBe(
        (mount * loops) / duration,
      );
    });
  }

  it("declares that child nowhere but inside the gate", () => {
    // A resting `::before` in index.css would be a second, still ring under the
    // travelling one — and a byte on the render-blocking sheet, for motion.
    expect(INDEX).not.toContain("-edge::before");
  });

  it("clips the overflowing child to the ring's own box", () => {
    for (const [selector] of BEFORE) {
      expect(resolve(selector).get("overflow"), `${selector} overflow`).toBe("hidden");
    }
  });
});
