/**
 * ONE RING, SIX MOUNTS — the collapse is a NO-OP (#2407).
 *
 * Six `mask … exclude` rings became one shared selector list in `index.css`,
 * with travel deferred to `motion.ornament.css`. The seam is the RESOLVED rule
 * (shared rule + per-mount overrides, merged in file order), compared against
 * values measured on `4cd063e8`. A deliberate retune edits the table here.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { stripComments } from "../utils/__tests__/cssVars";
import { readIndexCss } from "../test/indexCss";

const read = (path: string) =>
  readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");

const INDEX = stripComments(readIndexCss());
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
 * Measured on 4cd063e8. Pairs, not object literals: `{ padding: "3px" }` would
 * trip `local/no-raw-style-values`, and the rule must not be widened for tests.
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
      // Was 16px, a copy of the band's inline corner; pairing asserted below.
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

const before = (selector: string): Array<[string, string]> =>
  BEFORE.find(([one]) => one === selector)?.[1] ?? [];

describe("the collapsed spectrum ring resolves to what each mount had (#2407)", () => {
  for (const [selector] of BEFORE) {
    it(`${selector} is the shared masked ring, not a border`, () => {
      const resolved = resolve(selector);
      expect(resolved.size, `no rule matches ${selector}`).toBeGreaterThan(0);
      // `border-image` does not clip to `border-radius`; the exclude idiom does.
      expect(resolved.get("mask"), `${selector} mask`).toBe(MASK);
      expect(resolved.get("-webkit-mask-composite")).toBe("xor");
      expect(resolved.get("background-image"), `${selector} ramp`).toBe(RAMP);
      expect(resolved.get("position")).toBe("absolute");
      expect(resolved.get("pointer-events")).toBe("none");
    });
  }

  it("declares that ring exactly once", () => {
    // Counted by rule + ramp: other unrelated rules use the exclude idiom honestly.
    const rings = RULES.filter(
      (rule) => rule.body.includes("content-box exclude") && rule.body.includes(RAMP),
    );
    expect(
      rings.map((rule) => rule.selectors.join(", ")),
      "a seventh hand-rolled spectrum ring",
    ).toHaveLength(1);
  });

  it("`.alb-profile-edge` inherits a corner the identity band actually has", () => {
    // `inherit` reads the direct parent. One `BAND` const holds the geometry
    // for both paints, so the count is one.
    expect(
      (PROFILE_BODY.match(/borderRadius: 16,/g) ?? []).length,
      "the na identity band lost the 16px corner `.alb-profile-edge` inherits",
    ).toBe(1);
  });
});

/**
 * The comment leaf's ring (#2732, ADR-0088 §3) has no "before", so this pins
 * that it joined correctly — not at the shared hairline defaults (the #2519 bug).
 * Markup end: `albescentWrapperKinds.test.tsx`.
 */
describe("the comment leaf's ring is a full member of the family (#2732)", () => {
  const RING = ".alb-comment-edge";

  it("is the shared masked ring, with the shared loop-cut ramp", () => {
    const resolved = resolve(RING);
    expect(resolved.size, "no rule matches .alb-comment-edge").toBeGreaterThan(0);
    expect(resolved.get("mask")).toBe(MASK);
    expect(resolved.get("-webkit-mask-composite")).toBe("xor");
    expect(resolved.get("background-image")).toBe(RAMP);
    expect(resolved.get("position")).toBe("absolute");
    expect(resolved.get("pointer-events")).toBe("none");
  });

  it("carries the CARRIER's weight, not a hairline's — the #2519 bug", () => {
    // Read off the task card's row, so the carriers can't drift apart.
    const resolved = resolve(RING);
    expect(resolved.get("padding"), "the shared list's hairline default leaked").toBe(
      before(".alb-task-edge").find(([one]) => one === "padding")?.[1],
    );
    expect(resolved.get("opacity"), "a carrier is never dimmed").toBe("1");
  });

  it("takes the sheet's own corner rather than minting a literal", () => {
    // The span's direct parent is the sheet (`SHEET_RADIUS` in CommentThread).
    expect(resolve(RING).get("border-radius")).toBe("inherit");
    expect(
      read("../components/comments/CommentThread.tsx"),
      "the sheet lost the corner the ring inherits",
    ).toContain("const SHEET_RADIUS = 10");
  });

  it("sits above a static body and under the composer's @mention listbox", () => {
    // The composer's listbox sits at 30 inside the same sheet.
    expect(resolve(RING).get("z-index")).toBe("1");
  });

  it("drifts, on the shared keyframe, behind the reduced-motion gate", () => {
    expect(resolve(RING).get("animation"), "colour may not defer; motion must").toBeUndefined();
    const at = MOTION.search(/\.alb-comment-edge(::before)?\s*[,{]/);
    expect(at, "the leaf's ring has no drift rule at all").toBeGreaterThan(0);
    const gateAt = MOTION.lastIndexOf("@media", at);
    expect(
      MOTION.slice(gateAt, at),
      "the leaf travels outside the reduced-motion gate",
    ).toContain("prefers-reduced-motion: no-preference");
    expect(MOTION, "a tenth keyframe where the shared one does").not.toContain(
      "@keyframes alb-comment",
    );
  });
});

describe("the travel moved to the deferred sheet, and only the travel (#2407)", () => {
  it("index.css runs none of the five", () => {
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
    // A transform travels in the child's units, so the profile band differs by width only.
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
      // Own rule or shared list; no line-ending assumption (CRLF checkouts).
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
 * Travel is a transform on a gradient child, not a `background-position` walk
 * (main-thread repaint; #2498). The child exists only inside the gate, so the
 * still ring is unchanged. Arithmetic must survive: child tile = mount's
 * `background-size`, same speed, whole-tile travel (or the loop seams).
 */
describe("the travel is a transform on a pre-painted child (#2498)", () => {
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

  /** The old walk: image-widths travelled, and seconds. */
  const WALK: Array<[string, number, number]> = [
    [".alb-task-edge", 2, 16],
    [".alb-detail-edge", 2, 16],
    [".alb-praxis-edge", 2, 16],
    [".alb-feed-edge", 2, 16],
    [".alb-profile-edge", 1, 9],
  ];

  it("runs a transform, and no alb keyframe walks a gradient parameter", () => {
    // Asserted over what the five rules name, not the sheet's whole inventory.
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

    // Every `alb-` keyframe animates transform only.
    const keyframes = [
      ...MOTION.matchAll(/@keyframes (alb-[\w-]+)\s*\{((?:[^{}]|\{[^{}]*\})*)\}/g),
    ];
    // EXACT, not a floor: raising it needs a written reason.
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
    expect(INDEX).not.toContain("-edge::before");
  });

  it("clips the overflowing child to the ring's own box", () => {
    for (const [selector] of BEFORE) {
      expect(resolve(selector).get("overflow"), `${selector} overflow`).toBe("hidden");
    }
  });
});
