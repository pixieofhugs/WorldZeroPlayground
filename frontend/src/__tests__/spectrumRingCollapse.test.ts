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

/** Measured on 4cd063e8, the commit before the collapse. */
const BEFORE: Record<string, Record<string, string>> = {
  ".alb-task-edge": {
    "border-radius": "14px",
    padding: "3px",
    "background-size": "300% 100%",
    opacity: "1",
    "z-index": "1",
  },
  ".alb-detail-edge": {
    "border-radius": "18px",
    padding: "2px",
    "background-size": "300% 100%",
    opacity: "0.75",
    "z-index": "2",
  },
  ".alb-praxis-edge": {
    "border-radius": "18px",
    padding: "2px",
    "background-size": "300% 100%",
    opacity: "0.72",
    "z-index": "2",
  },
  ".alb-feed-edge": {
    "border-radius": "var(--radius-xl)",
    padding: "1px",
    "background-size": "300% 100%",
    opacity: "0.6",
    "z-index": "1",
  },
  ".alb-profile-edge": {
    // The one legitimately changed byte: 16px was a copy of the band's own
    // inline corner, which `inherit` now reads directly. Asserted below.
    "border-radius": "inherit",
    padding: "var(--space-xs)",
    "background-size": "200% 100%",
    opacity: "1",
  },
  ".spectrum-frame::before": {
    "border-radius": "inherit",
    padding: "1px",
    "background-size": "220px 100%",
    opacity: "0.6",
    "z-index": "1",
  },
};

describe("the collapsed spectrum ring resolves to what each mount had (#2407)", () => {
  for (const [selector, expected] of Object.entries(BEFORE)) {
    it(`${selector} keeps its width, tile, opacity and corner`, () => {
      const resolved = resolve(selector);
      expect(resolved.size, `no rule matches ${selector}`).toBeGreaterThan(0);
      for (const [property, value] of Object.entries(expected)) {
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
    for (const selector of Object.keys(BEFORE)) {
      expect(resolve(selector).get("animation"), `${selector} animation`).toBeUndefined();
    }
    for (const retired of ["alb-task-edge", "alb-detail-edge", "alb-praxis-edge", "alb-feed-edge"]) {
      expect(INDEX, `@keyframes ${retired} did not retire`).not.toContain(
        `@keyframes ${retired}`,
      );
    }
  });

  it("four identical keyframes became one, and the fifth is not a duplicate", () => {
    expect(MOTION).toContain("@keyframes alb-edge-travel");
    // 200%, not 300%, because the profile band's tile is 200% — the travel and
    // the tile are one number stated twice. Retiring this one would jump.
    expect(MOTION).toContain(
      "@keyframes alb-profile-edge { from { background-position: 0% 50%; } to { background-position: 200% 50%; } }",
    );
    expect(BEFORE[".alb-profile-edge"]["background-size"]).toBe("200% 100%");
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
      const at = MOTION.search(
        new RegExp(`\\${selector}\\s*[,{]`),
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
