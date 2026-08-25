/**
 * THE PRISM SWEEP IS ONE DRAWING, AND IT IS A GROUND (#2499, epic #2496).
 *
 * The owner, looking at the running site: *"the background and borders on the
 * praxis and task cards are still different from each other."* They were, and
 * the reason they could be is the thing this file guards. Every Albescent wash
 * was invented at its own mount as an OVERLAY — a span the stylesheet could hang
 * off a wrapper, because the card's ground was a component's inline style and
 * nothing in CSS could reach it. Five mounts, five drawings, no shared value:
 *
 *   `.alb-rainbow`         a 190% rainbow tile rotated 24deg      (praxis card)
 *   `.alb-task-aurora`     six blurred radials at 0.34            (task card)
 *   `.alb-detail-aurora`   seven blooms at 0.22                   (task detail)
 *   `.alb-praxis-aurora`   seven blooms at 0.20                   (praxis detail)
 *   `.alb-feed-aurora`     the composer's aurora token, re-blended (feed row)
 *
 * #2497 made the ground a TOKEN, so the whole class of divergence closes: one
 * value, read by every `Default*` sheet, overridden once under one wrapper class.
 *
 * ## The seam
 *
 * THE STYLESHEET, read as source text. There is no DOM in this harness and no
 * compositor anywhere in CI, so nothing here can prove a pixel. What it can prove
 * is the three ways this is silently wrong:
 *
 *  1. **Arity.** A background is a list in THREE properties at once, and CSS
 *     cycles the short ones rather than padding them. Light is two layers and
 *     dark is six; a blend list of one is right by accident in one cascade and
 *     wrong in the other. Nothing renders that defect as an error.
 *  2. **An overlay coming back.** A span beside the token is how the two cards
 *     diverged in the first place, and it would pass every render test.
 *  3. **The rest frame going missing.** Epic ruling 6: under
 *     `prefers-reduced-motion: reduce` the ground deepens. It has to be PAINT, in
 *     this sheet — `motion.ornament.css` is deferred, so a rest frame written
 *     there would be absent for exactly the reader it exists for.
 *
 * The pixels themselves are visual QA and are stated as outstanding on the PR.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { stripComments } from "../utils/__tests__/cssVars";

const read = (path: string) =>
  readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");

const INDEX = stripComments(read("../index.css"));
const MOTION = stripComments(read("../motion.ornament.css"));

const SHEET = "--faction-default-card-sheet";
/** The dark cascade's attribute selector, spelled once (#2550). */
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

/**
 * Every rule in a stylesheet, at any nesting depth, with the at-rules it sits
 * inside. `ruleBodies` in `cssVars` walks TOP-LEVEL rules only, and half of what
 * this file is about lives inside a media query.
 */
interface Rule {
  prelude: string;
  body: string;
  /** The `@media …` preludes enclosing it, outermost first. */
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
      // `@keyframes` bodies are percentage steps, not rules; everything else
      // conditional (`@media`, `@supports`) holds rules in its own right.
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

/** The declared value of one custom property inside a rule body. */
const declared = (body: string, name: string): string | undefined =>
  body.match(new RegExp(`${name}\\s*:\\s*([^;]+)`))?.[1].trim().replace(/\s+/g, " ");

/** Every rule that declares the prism sheet, in source order. */
const PRISM = ALL.filter(
  (rule) => rule.prelude.includes(".alb-prism") && rule.body.includes(SHEET),
);
const prismRules = PRISM.map((rule) => rule.body);

describe("the prism is declared as a matched triple, in every cascade (#2499)", () => {
  it("has all four rules — light, dark, and a rest frame for each", () => {
    // Two base rules and two inside the reduced-motion gate. A zero here, or a
    // three, means one cascade lost its ground or its rest frame.
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
      // The LAST layer is the na card's own colour, so the prism composites
      // against something — a multiply or a screen over nothing is a no-op. And
      // every layer stops at the padding box: `factionSheet` appends the trailing
      // `border-box` that keeps the COLOUR running out under a dark card's
      // translucent hairline.
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
  // The design board's own words: "Unaffiliated is a white sheet… Screen and
  // soft-light blends do nothing on white; only a multiply can show colour."
  // Swap them and the light card shows nothing at all while the dark card blows
  // out — and both still render, which is why this is asserted rather than seen.
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
    // `motion.ornament.css` is reached only across a chunk boundary, so a reader
    // may never receive it. A rest frame written there would be missing for
    // precisely the reader it exists for — and worse, "the sheet did not arrive"
    // and "this player is not in Albescent" would render identically, which is
    // the equivalence the deferral's safety argument rests on NOT existing.
    expect(MOTION).not.toContain("alb-prism");
    expect(MOTION).not.toContain("prefers-reduced-motion: reduce");
  });

  it("deepens by compositing the same drawing twice — no second colour value", () => {
    // "Deeper" is not a re-tune by eye: the rest frame is the base list, listed
    // again, under the same blend. Asserted as arithmetic over the two rules, so
    // a hand-tuned second palette fails here rather than drifting quietly.
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
    // The repo's house form is `no-preference` (opt IN to motion). This is the
    // one Albescent rule that wants the other half, because it is paint added
    // FOR the reader who asked for none — writing `no-preference` here would
    // deepen the ground for everyone except them, which renders, and looks
    // plausible, and is exactly backwards.
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
 * ONE ALBESCENT GROUND, AND IT IS THE CARDS' (#2550).
 *
 * The faction hero and the faction body carried a SECOND prism — #2504's own
 * fainter cut of the same idea: five blooms at 0.06 against `.alb-prism`'s five
 * at 0.16, a different geometry, different centres, a different light ramp, and
 * nothing at all in light on the body. Side by side with a task card they did
 * not read as the same faction, which is the same report #2499 answered for the
 * two cards, and the same answer: not a re-tune, one drawing.
 *
 * EPIC #2496 RULING 9 IS REVERSED BY THIS, deliberately. Ruling 9 made the
 * hero/body light-dark asymmetry — hero alone by day, hero and body by night —
 * a looks decision, and index.css said so directly above `.alb-prism`. The
 * owner's ruling on #2550 supersedes it: Albescent backgrounds are the task and
 * praxis cards', everywhere.
 *
 * The seam is the stylesheet as source text, and the claim is exhaustive rather
 * than per-class: NO Albescent selector may declare the card sheet except the
 * prism's own four rules. A second ground added at a sixth mount fails here even
 * though nobody thought to name it in a test.
 */
describe("one Albescent ground, declared once (#2550)", () => {
  it("no `.alb-` rule declares the card sheet except the prism's four", () => {
    const declaring = ALL.filter(
      (rule) => rule.body.includes(SHEET) && rule.prelude.includes(".alb-"),
    );
    // Every one of them IS a prism rule. `.alb-faction-hero` and
    // `.alb-faction-body` are in that list by joining the prism's selectors, not
    // by copying its values — there is one declaration of this ground and it
    // cannot drift again.
    expect(
      declaring
        .filter((rule) => !rule.prelude.includes(".alb-prism"))
        .map((rule) => rule.prelude),
      "a second Albescent ground is declared beside the prism",
    ).toEqual([]);
    expect(declaring).toHaveLength(4);
  });

  it("the faction hero and body read the prism in BOTH cascades", () => {
    // Light too. `.alb-faction-body` declared nothing at all in light before
    // this, so by daylight the faction page's body was na's chrome exactly —
    // the half of the divergence a dark-mode screenshot cannot show.
    for (const selector of [".alb-faction-hero", ".alb-faction-body"]) {
      const rules = ALL.filter(
        (rule) => rule.body.includes(SHEET) && rule.prelude.includes(selector),
      );
      expect(rules, `${selector} does not read the prism`).toHaveLength(4);
      const dark = rules.filter((rule) => rule.prelude.includes(DARK));
      expect(dark, `${selector} has no dark ground`).toHaveLength(2);
      // …and the rest frame reaches it too, in both cascades. That is the
      // reader who asked for no motion, and epic ruling 6 owes them the deeper
      // composite rather than the base one.
      expect(
        rules.filter((rule) => rule.gates.length > 0),
        `${selector} has no reduced-motion rest frame`,
      ).toHaveLength(2);
    }
  });

  it("declares neither of the two superseded rules", () => {
    // #2504's fainter cut, by the tells that belong to it alone: the 46%/120%
    // radial geometry, and its five bloom stops. Bare `0.06` would be far too
    // wide a net — it is a common alpha in this sheet and matches ten unrelated
    // tokens — so the hue is asserted with it.
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
    // And its light ramp, whose first stop is opaque white where the prism's is
    // `transparent 10%` — the half of the divergence that only showed by day.
    expect(INDEX, "the faction page's own light ramp is back").not.toContain(
      "linear-gradient(114deg, #ffffff 0%",
    );
  });
});

describe("no Albescent surface keeps a ground OVERLAY (#2499)", () => {
  it("declares none of the five retired washes", () => {
    // The class of defect, not five instances of it: each of these was one
    // surface's private drawing of the shared idea, and having any of them back
    // beside the token is how the two cards diverge again.
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
    // The keyframe outlived `.alb-rainbow`, its only non-rail consumer. That is
    // deliberate and it is conditional: if the rail's ring ever becomes a span
    // it joins `alb-edge-travel` and the last `background-position` walk in the
    // kit retires. If this fails, the keyframe is dead and should go.
    expect(INDEX).toContain("@keyframes alb-drift");
    expect(MOTION).toContain("data-spectrum-drift");
    expect(MOTION).toContain("animation: alb-drift");
  });
});

/**
 * THE COMPONENT OWNS ITS GROUND — the defect the design board hit and patched.
 *
 * `Character-Profile.dc.html` carries a hand-written wall:
 *
 *     .alb-task .alb-praxis-card, .alb-task .alb-praxis-card *
 *       { background-blend-mode: normal !important }
 *
 * with the reason above it: *"The shipped Albescent praxis card was picking up
 * the page's multiply blend without the prism layer that goes with it, so its
 * cream fill was being tinted by its own border spectrum and the card read
 * brighter than every other surface."*
 *
 * That is the same class of thing the owner reported about the two cards — one
 * surface visibly out of step with the ones beside it — and it is what a broad
 * DESCENDANT selector buys you: `background-blend-mode` reaches a nested card
 * that never got the layer the blend was for.
 *
 * THE BUILD MAKES IT IMPOSSIBLE RATHER THAN FORBIDDEN, and these are the
 * assertions that keep it that way. `.alb-prism` declares three CUSTOM
 * PROPERTIES and no background property at all; the real `background-blend-mode`
 * is written only where `background-image` is written, from the same family, on
 * the same element. `background-blend-mode` does not inherit, so a nested card
 * either composes the whole triple or gets `normal`. Reach for a descendant
 * selector and the guarantee is gone — hence the shape of the tests rather than
 * a value check.
 */
describe("no Albescent rule blends a DESCENDANT's background (#2499)", () => {
  /** Rules whose subject is a `.alb-` class with something after it. */
  const descendants = ALL.filter((rule) =>
    rule.prelude.split(",").some((one) => {
      const selector = one.trim();
      if (!/\.alb-/.test(selector)) return false;
      // A combinator AFTER the `.alb-` class is the shape that reaches a
      // component the page does not own. `.alb-x.alb-y` and
      // `[data-theme="dark"] .alb-x` are not — the class is still the subject.
      const after = selector.slice(selector.lastIndexOf(".alb-"));
      return /[\s>+~]/.test(after.replace(/^\.alb-[\w-]+/, ""));
    }),
  );

  it("found descendant rules to check at all", () => {
    // Without this the selector arithmetic above can rot to zero matches and
    // everything below passes by having nothing to say.
    expect(descendants.length).toBeGreaterThan(2);
  });

  it("sets `background-blend-mode` on no descendant, ever", () => {
    // THE EXACT DEFECT, stated as narrowly as it is true. A blend that reaches a
    // nested card without the layer that justifies it makes the card's own
    // border spectrum multiply into its cream fill.
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
    // WAS EXACTLY ONE, AND IS NOW NONE (#2519). The one legitimate mount was
    // `.alb-desk .spectrum-rule` (#2505) — one of na's own ornament classes,
    // put there for a dresser to reach, re-cut from `--faction-default-rainbow`
    // to the seamless loop so the field desk's identity bar could tile and
    // travel. The design canvas takes that bar OFF (one carrier per object: the
    // card grows a ring of its own), so the rule is a `display: none` now and
    // this list is empty.
    //
    // AN ENTRY HERE HAS TO ARGUE ITS CASE IN THIS COMMENT, and the bar is why
    // the standard above is about the BLEND rather than about backgrounds: an
    // ornament class is not a component's ground and takes the whole background
    // rather than half of one. That door stays open; nothing is behind it.
    expect(
      descendants
        .filter((rule) => /(^|[;\s])background(-image|-color|-clip|-origin)?\s*:/.test(rule.body))
        .map((rule) => rule.prelude),
    ).toEqual([]);
  });

  it("never sets a background property beside the prism triple", () => {
    // The same claim from the other side: these four rules are custom properties
    // only. A `background-image` here would be the page painting a ground its
    // children could not opt out of, and it is what turns the triple back into
    // three things that can travel separately.
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
    // The border half of the report. `DefaultPraxisCard` gained the task card's
    // 3px spectrum border, so its travelling ring had to grow from the rail's
    // 1px-at-0.6 to the task card's 3px-at-1 — otherwise a thin dim ring sits
    // inside a thick bright border and the two cards read as different objects.
    // ONE rule declares both, which is what makes them un-divergeable.
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
 * THE VELLUM REGISTER IS GONE, AND THE CENSUS IS WHAT KEEPS IT GONE (#2632).
 *
 * `--albescent-reveal-*` was the last hand-authored register in the kit: a pure
 * white sheet by day, worn by four surfaces that each wrote `background:
 * var(--albescent-reveal-surface)` INLINE — which is why no wrapper class could
 * ever ground them, and why the prism above reached every Albescent surface but
 * those four. Owner ruling on #2632: the white aesthetic is purged from the
 * codebase and Albescent commits entirely to the prism.
 *
 * The seam is the STYLESHEET, read RAW — comments included, deliberately. A
 * commented-out declaration is exactly how a deleted register creeps back, and
 * the claim being made is that the name has no readers and no home rather than
 * that it is currently switched off. Each surface's own paint is asserted where
 * that surface renders; this is the token half of the same deletion.
 */
describe("the reveal register is deleted (#2632)", () => {
  it("declares no --albescent-reveal- anywhere, not even in a comment", () => {
    expect(read("../index.css")).not.toContain("--albescent-reveal-");
  });
});
