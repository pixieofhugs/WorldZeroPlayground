/**
 * The Albescent prism is ONE ground token (#2499, #2497), not per-mount
 * overlays (which is how the cards diverged). Asserted on stylesheet source:
 *  1. Arity: image/blend/clip lists must match; CSS cycles short lists.
 *  2. No overlay span comes back.
 *  3. The reduced-motion rest frame is paint in index.css, not the deferred
 *     `motion.ornament.css`.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { stripComments } from "../utils/__tests__/cssVars";
import { readIndexCss } from "../test/indexCss";

const read = (path: string) =>
  readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");

const INDEX = stripComments(readIndexCss());
const MOTION = stripComments(read("../motion.ornament.css"));

const SHEET = "--faction-default-card-sheet";
const DARK = '[data-theme="dark"]';
const BLEND = `${SHEET}-blend`;
const CLIP = `${SHEET}-clip`;

/** Split a background list on its TOP-LEVEL commas, never a gradient's own. */
function layers(value: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of value) {
    if (ch === "(") depth += 1;
    else if (ch === ")") depth -= 1;
    if (ch === "," && depth === 0) {
      out.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim() !== "") out.push(current.trim());
  return out;
}

/** Rules at any depth with enclosing at-rules (`cssVars.ruleBodies` is top-level only). */
interface Rule {
  prelude: string;
  body: string;
  /** Enclosing `@media …` preludes, outermost first. */
  gates: string[];
}

function rules(css: string, gates: string[] = []): Rule[] {
  const out: Rule[] = [];
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
    const body = css.slice(open + 1, index - 1);
    if (prelude.startsWith("@")) {
      // `@keyframes` bodies are steps, not rules.
      if (!prelude.startsWith("@keyframes")) {
        out.push(...rules(body, [...gates, prelude]));
      }
    } else {
      out.push({ prelude: prelude.replace(/\s+/g, " "), body, gates });
    }
    cursor = index;
  }
  return out;
}

const ALL = rules(INDEX);

/** Every rule whose selector list names this class as a whole token. */
const bodies = (selector: string): string[] =>
  ALL.filter((rule) =>
    rule.prelude
      .split(",")
      .some((one) => new RegExp(`(^|[^-\\w])${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^-\\w])`).test(one)),
  ).map((rule) => rule.body);

const declared = (body: string, name: string): string | undefined =>
  body.match(new RegExp(`${name}\\s*:\\s*([^;]+)`))?.[1].trim().replace(/\s+/g, " ");

/** In source order. */
const PRISM = ALL.filter(
  (rule) => rule.prelude.includes(".alb-prism") && rule.body.includes(SHEET),
);
const prismRules = PRISM.map((rule) => rule.body);

describe("the prism is declared as a matched triple, in every cascade (#2499)", () => {
  it("has all four rules — light, dark, and a rest frame for each", () => {
    expect(prismRules).toHaveLength(4);
  });

  for (const [index, body] of prismRules.entries()) {
    it(`rule ${index + 1}: image, blend and clip declare the same number of layers`, () => {
      const image = declared(body, SHEET);
      const blend = declared(body, BLEND);
      const clip = declared(body, CLIP);
      expect(image, "the prism declares no sheet").toBeDefined();
      const count = layers(image as string).length;
      expect(count, "the sheet declares no layers at all").toBeGreaterThan(1);
      expect(
        layers(blend as string).length,
        "blend would CYCLE across the prism's layers rather than pad",
      ).toBe(count);
      expect(
        layers(clip as string).length,
        "clip would CYCLE across the prism's layers rather than pad",
      ).toBe(count);
    });

    it(`rule ${index + 1}: ends on the ground ramp, clipped to the padding box`, () => {
      // Last layer is the card colour (blending over nothing is a no-op);
      // `factionSheet` appends the trailing `border-box` itself.
      const image = layers(declared(body, SHEET) as string);
      expect(image.at(-1)).toBe(
        "linear-gradient(var(--faction-default-card-bg), var(--faction-default-card-bg))",
      );
      expect(declared(body, BLEND)?.split(",").at(-1)?.trim()).toBe("normal");
      expect(new Set(declared(body, CLIP)?.split(",").map((one) => one.trim()))).toEqual(
        new Set(["padding-box"]),
      );
    });
  }
});

describe("light multiplies and dark screens, because na's sheet is white (#2499)", () => {
  // Screen does nothing on white; swapped, both still render, just wrong.
  const light = prismRules.filter((_, i) => i % 2 === 0);
  const dark = prismRules.filter((_, i) => i % 2 === 1);

  it("the two light rules blend every prism layer with multiply", () => {
    for (const body of light) {
      const modes = declared(body, BLEND)?.split(",").map((one) => one.trim()) ?? [];
      expect(new Set(modes.slice(0, -1))).toEqual(new Set(["multiply"]));
    }
  });

  it("the two dark rules blend every prism layer with screen", () => {
    for (const body of dark) {
      const modes = declared(body, BLEND)?.split(",").map((one) => one.trim()) ?? [];
      expect(new Set(modes.slice(0, -1))).toEqual(new Set(["screen"]));
    }
  });
});

describe("the rest frame is paint, and it is deeper (epic ruling 6)", () => {
  it("lives in index.css and NEVER in the deferred sheet", () => {
    // The deferred sheet may never arrive.
    expect(MOTION).not.toContain("alb-prism");
    expect(MOTION).not.toContain("prefers-reduced-motion: reduce");
  });

  it("deepens by compositing the same drawing twice — no second colour value", () => {
    // Rest frame = base ornament layers listed twice, then the ground.
    const [lightBase, darkBase, lightRest, darkRest] = prismRules;
    for (const [base, rest, name] of [
      [lightBase, lightRest, "light"],
      [darkBase, darkRest, "dark"],
    ] as const) {
      const baseLayers = layers(declared(base, SHEET) as string);
      const restLayers = layers(declared(rest, SHEET) as string);
      const ornament = baseLayers.slice(0, -1);
      expect(
        restLayers,
        `the ${name} rest frame is not the ${name} ground composited with itself`,
      ).toEqual([...ornament, ...ornament, baseLayers.at(-1)]);
    }
  });

  it("is the reduce gate, not the no-preference one", () => {
    // Unlike the house `no-preference` form: this paint is FOR the reduce reader.
    const [lightBase, darkBase, lightRest, darkRest] = PRISM;
    for (const base of [lightBase, darkBase]) {
      expect(base.gates, "the base ground is behind a query").toEqual([]);
    }
    for (const rest of [lightRest, darkRest]) {
      expect(rest.gates).toEqual(["@media (prefers-reduced-motion: reduce)"]);
    }
  });
});

/**
 * One Albescent ground everywhere, the cards' (#2550, superseding epic ruling 9).
 * Exhaustive: no `.alb-` rule may declare the card sheet except the prism's four.
 */
describe("one Albescent ground, declared once (#2550)", () => {
  it("no `.alb-` rule declares the card sheet except the prism's four", () => {
    const declaring = ALL.filter(
      (rule) => rule.body.includes(SHEET) && rule.prelude.includes(".alb-"),
    );
    // Faction hero/body join the prism's selector lists rather than copy values.
    expect(
      declaring
        .filter((rule) => !rule.prelude.includes(".alb-prism"))
        .map((rule) => rule.prelude),
      "a second Albescent ground is declared beside the prism",
    ).toEqual([]);
    expect(declaring).toHaveLength(4);
  });

  it("the faction hero and body read the prism in BOTH cascades", () => {
    for (const selector of [".alb-faction-hero", ".alb-faction-body"]) {
      const rules = ALL.filter(
        (rule) => rule.body.includes(SHEET) && rule.prelude.includes(selector),
      );
      expect(rules, `${selector} does not read the prism`).toHaveLength(4);
      const dark = rules.filter((rule) => rule.prelude.includes(DARK));
      expect(dark, `${selector} has no dark ground`).toHaveLength(2);
      expect(
        rules.filter((rule) => rule.gates.length > 0),
        `${selector} has no reduced-motion rest frame`,
      ).toHaveLength(2);
    }
  });

  it("declares neither of the two superseded rules", () => {
    // The old faction-page cut's unique tells (bare `0.06` is too common).
    expect(INDEX, "the faction page's own radial geometry is back").not.toContain(
      "radial-gradient(46% 120%",
    );
    for (const bloom of [
      "rgba(230, 185, 79, 0.06)",
      "rgba(74, 222, 128, 0.06)",
      "rgba(58, 160, 164, 0.06)",
      "rgba(96, 165, 250, 0.06)",
      "rgba(244, 114, 182, 0.06)",
    ]) {
      expect(INDEX, `the faction page's ${bloom} bloom is back`).not.toContain(bloom);
    }
    expect(INDEX, "the faction page's own light ramp is back").not.toContain(
      "linear-gradient(114deg, #ffffff 0%",
    );
  });
});

describe("no Albescent surface keeps a ground OVERLAY (#2499)", () => {
  it("declares none of the five retired washes", () => {
    for (const retired of [
      ".alb-rainbow",
      ".alb-task-aurora",
      ".alb-detail-aurora",
      ".alb-praxis-aurora",
      ".alb-feed-aurora",
      ".alb-detail-foil::after",
    ]) {
      expect(INDEX, `${retired} is back`).not.toContain(`${retired} {`);
      expect(INDEX, `${retired} is back`).not.toContain(`${retired},`);
    }
  });

  it("keeps `alb-drift` only because the RAIL still walks it", () => {
    // If this fails, the keyframe is dead and should go.
    expect(INDEX).toContain("@keyframes alb-drift");
    expect(MOTION).toContain("data-spectrum-drift");
    expect(MOTION).toContain("animation: alb-drift");
  });
});

/**
 * The component owns its ground. A descendant `background-blend-mode` reaches
 * a nested card without the prism layer, tinting its fill with its own border
 * spectrum. `.alb-prism` declares only custom properties; the real blend is
 * written beside `background-image` on the same element, and doesn't inherit.
 */
describe("no Albescent rule blends a DESCENDANT's background (#2499)", () => {
  /** Rules whose subject is a `.alb-` class with something after it. */
  const descendants = ALL.filter((rule) =>
    rule.prelude.split(",").some((one) => {
      const selector = one.trim();
      if (!/\.alb-/.test(selector)) return false;
      // A combinator after the `.alb-` class; `.alb-x.alb-y` doesn't count.
      const after = selector.slice(selector.lastIndexOf(".alb-"));
      return /[\s>+~]/.test(after.replace(/^\.alb-[\w-]+/, ""));
    }),
  );

  it("found descendant rules to check at all", () => {
    // Non-vacuity.
    expect(descendants.length).toBeGreaterThan(2);
  });

  it("sets `background-blend-mode` on no descendant, ever", () => {
    expect(
      descendants
        .filter((rule) => /background-blend-mode\s*:/.test(rule.body))
        .map((rule) => rule.prelude),
      `These Albescent rules blend a DESCENDANT's background. A nested card — the
praxis gallery inside a task or praxis detail, the card on a profile — owns its
own ground, and \`background-blend-mode\` does not inherit, so reaching it from
outside hands it a blend with no layer behind it: its border spectrum multiplies
into its own fill and it reads brighter than every card beside it. Set the sheet
TRIPLE on the element that carries the class and let the component compose it.`,
    ).toEqual([]);
  });

  it("paints a descendant's background nowhere at all", () => {
    // Empty since #2519. An ornament class (not a ground) could legitimately
    // appear here; such an entry must argue its case in this comment.
    expect(
      descendants
        .filter((rule) => /(^|[;\s])background(-image|-color|-clip|-origin)?\s*:/.test(rule.body))
        .map((rule) => rule.prelude),
    ).toEqual([]);
  });

  it("never sets a background property beside the prism triple", () => {
    // Custom properties only, so the triple can't travel separately.
    for (const body of prismRules) {
      expect(
        /(^|[;\s])background[\w-]*\s*:/.test(
          body.replace(/--faction-default-card-sheet[\w-]*\s*:/g, ""),
        ),
      ).toBe(false);
    }
  });
});

describe("the two cards are the same material (#2499 — the owner's report)", () => {
  it("their rings are one rule at one width and one strength", () => {
    // One rule declares both rings, so they can't diverge.
    const shared = bodies(".alb-praxis-card-edge").filter((body) =>
      /padding\s*:\s*3px/.test(body),
    );
    expect(shared, "the praxis card's ring is not the task card's").toHaveLength(1);
    expect(shared[0]).toMatch(/opacity\s*:\s*1/);
    expect(
      bodies(".alb-task-edge").filter((body) => /padding\s*:\s*3px/.test(body)),
      "…and it is the SAME rule, not a copy of it",
    ).toEqual(shared);
  });

  it("both rings travel on the shared keyframe, not the rail's walk", () => {
    const shared = rules(MOTION).find((rule) =>
      rule.prelude.includes(".alb-praxis-card-edge::before"),
    );
    expect(shared, "the praxis card's ring has no travelling child").toBeDefined();
    expect(
      shared?.prelude,
      "the praxis card's ring left the shared travelling child",
    ).toContain(".alb-task-edge::before");
    expect(shared?.body).toContain("alb-edge-travel");
    expect(shared?.gates.join(" ")).toContain("prefers-reduced-motion: no-preference");
  });
});

/**
 * The white reveal register is deleted (#2632). Read RAW, comments included:
 * a commented-out declaration is how a deleted register creeps back.
 */
describe("the reveal register is deleted (#2632)", () => {
  it("declares no --albescent-reveal- anywhere, not even in a comment", () => {
    expect(readIndexCss()).not.toContain("--albescent-reveal-");
  });
});
