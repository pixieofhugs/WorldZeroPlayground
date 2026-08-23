/**
 * The pairing `local/no-faction-hue-as-ink` cannot see (#2267).
 *
 * `roomPresence.ts` is the one file exempted from that rule, and the exemption
 * is right about the NODE: the value is a `y-codemirror.next` presence field,
 * not a CSS declaration, so a rule that matches property names has nothing to
 * judge. It was wrong about the CONSEQUENCE. One library hop later the value is
 * interpolated into `style="background-color: …; border-color: …"` on
 * `.cm-ySelectionCaret`, whose 1px left/right borders ARE the caret, and is
 * inherited by the `.4em` `.cm-ySelectionCaretDot` — two graphical marks, each
 * owing WCAG 1.4.11's 3:1 against the ground it lands on.
 *
 * WHY A LINT RULE COULD NEVER HAVE CAUGHT IT, even unexempted. The hue is the
 * REMOTE's and the ground is the VIEWER's, so the thing to measure is a
 * cross-product that exists only at runtime: 8 composer grounds x 8 reachable
 * hues x 2 themes. With the bare spine hue, 21 of the 64 light pairings sat
 * under 3:1 — worst 1.86:1, a UA viewer watching an Ephemerists co-author.
 * All 64 dark pairings passed, which is why it survived review.
 *
 * So the exemption stays and this file is its other half: the rule goes on
 * ignoring the node, and this measures the value the node hands the library.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

import {
  AA_LARGE,
  AA_NORMAL,
  compositeOver,
  contrastRatio,
  deltaE76,
  formatRatio,
  parseColor,
  type Rgba,
} from "../../../utils/contrast";
import { readThemes, resolveVar, type Theme } from "../../../utils/__tests__/cssVars";
import { paintedAwareness, type AwarenessLike } from "../roomPresence";
import { BODY_EDITOR_BASE_THEME } from "../archetypes/bodyEditorTheme";

const THEMES = readThemes(
  readFileSync(fileURLToPath(new URL("../../../index.css", import.meta.url)), "utf8"),
);
const BOTH_THEMES: Theme[] = ["light", "dark"];

/**
 * Every ground a remote caret can be drawn on, and the ink `currentColor`
 * resolves to there.
 *
 * Each row is one composer archetype's `fieldBox`, which every skin spreads
 * into its `textareaStyle` — that box IS the body editor's host, so its
 * `background` is the caret's ground and its `color` is what the caret widget
 * inherits inside `.cm-content`. Eight rows, not nine: `na` and `albescent`
 * both resolve to `default` (ADR-0039).
 */
const COMPOSER_GROUNDS = [
  { key: "snide", ground: "--faction-snide-composer-field", ink: "--faction-snide-composer-ink", source: "../archetypes/SnideEditPraxis.tsx" },
  { key: "coven", ground: "--faction-coven-ward-page", ink: "--faction-coven-slip-ink", source: "../archetypes/CovenEditPraxis.tsx" },
  { key: "default", ground: "--faction-default-composer-field", ink: "--faction-default-card-text", source: "../archetypes/DefaultEditPraxis.tsx" },
  // Ephemerists names its plate primitives once, in the mark module both the
  // composer and the waiting surface import them from.
  { key: "ephemerists", ground: "--faction-ephemerists-plate-inner", ink: "--faction-ephemerists-plate-ink", source: "../../../components/factionMarks/ephemeristsPlate.tsx" },
  { key: "everymen", ground: "--faction-everymen-sheet-panel", ink: "--everymen-paper-text", source: "../archetypes/EverymenEditPraxis.tsx" },
  { key: "singularity", ground: "--faction-singularity-term-panel", ink: "--faction-singularity-term-ink", source: "../archetypes/SingularityEditPraxis.tsx" },
  { key: "ua", ground: "--faction-ua-panel", ink: "--faction-ua-card-text", source: "../archetypes/UaEditPraxis.tsx" },
  { key: "wow", ground: "--faction-wow-chronicle-panel", ink: "--faction-wow-card-text", source: "../archetypes/WowEditPraxis.tsx" },
] as const;

/** Every slug a remote can publish. `na`/`albescent` fold onto `default`. */
const REMOTE_SLUGS = [
  "ua", "wow", "coven", "snide", "ephemerists", "singularity", "everymen", "na", "albescent",
] as const;

/**
 * What `paintUser` hands the library for a remote flying `slug`.
 *
 * `AwarenessLike` is structural, so this needs no yjs and no socket: the wire
 * path — a hostile remote's `color` being dropped rather than relayed — is the
 * sibling `roomPresence.test.ts`'s subject. This file is only about the VALUE.
 */
function paintedColorFor(slug: string): string {
  const states = new Map([[1, { user: { characterId: 7, name: "Wren", factionSlug: slug } }]]);
  const awareness: AwarenessLike = { getStates: () => states, setLocalStateField: () => {} };
  const seen = paintedAwareness(awareness).getStates().get(1);
  return (seen?.user as { color: string }).color;
}

/**
 * The two shapes this can resolve: a bare hue, and a hue anchored to
 * `currentColor`. Deliberately narrow rather than a general `color-mix()`
 * parser — anything else must throw, so a future rewrite of `paintUser` cannot
 * silently start measuring a value that is no longer shipped.
 *
 * The bare arm is kept on purpose even though nothing emits it now: it is the
 * regression this file exists to catch, and it has to be MEASURABLE to be
 * caught. Deleting it would turn a 1.86:1 caret back into an unresolved string.
 */
const BARE = /^var\((--faction-[a-z]+)\)$/;
const ANCHORED = /^color-mix\(in srgb, var\((--faction-[a-z]+)\) (\d+)%, currentColor\)$/;

function solid(name: string, theme: Theme): Rgba {
  const raw = resolveVar(name, theme, THEMES);
  const color = raw === null ? null : parseColor(raw);
  if (color === null) {
    throw new Error(`${name} (${theme}) resolved to "${raw}" — not a solid color`);
  }
  return color;
}

/**
 * Resolve what the browser will actually paint: the emitted `color-mix()`, with
 * `currentColor` standing in for the viewer skin's own body ink.
 *
 * `color-mix(in srgb, A p%, B)` between two opaque colors is channel-wise
 * `A*p + B*(1-p)` in sRGB byte space — which is exactly `compositeOver` with
 * `p` as the alpha, so there is no second colour-math implementation here.
 */
function paintedOn(slug: string, ground: (typeof COMPOSER_GROUNDS)[number], theme: Theme): Rgba {
  const emitted = paintedColorFor(slug);
  const bare = BARE.exec(emitted);
  if (bare) return solid(bare[1], theme);

  const anchored = ANCHORED.exec(emitted);
  if (anchored === null) {
    throw new Error(`paintUser emitted "${emitted}", which this test cannot resolve`);
  }
  return compositeOver(
    { ...solid(anchored[1], theme), a: Number(anchored[2]) / 100 },
    solid(ground.ink, theme),
  );
}

describe("a remote caret is a graphical mark on the VIEWER's composer ground (#2267)", () => {
  // 1.4.11: a caret bar and its dot are non-text UI, so 3:1 — not the 4.5:1
  // body copy owes. The bare spine hue missed even this, on 21 light pairings.
  for (const theme of BOTH_THEMES) {
    for (const ground of COMPOSER_GROUNDS) {
      it(`clears ${AA_LARGE}:1 for every remote on the ${ground.key} composer (${theme})`, () => {
        for (const slug of REMOTE_SLUGS) {
          const ratio = contrastRatio(paintedOn(slug, ground, theme), solid(ground.ground, theme));
          expect(
            ratio,
            `a ${slug} co-author's caret on the ${ground.key} composer (${theme}) is ${formatRatio(ratio)} on ${ground.ground}`,
          ).toBeGreaterThanOrEqual(AA_LARGE);
        }
      });
    }
  }
});

/**
 * The hover label's own pairing (#2297) — a DIFFERENT question from the caret's.
 *
 * `y-codemirror.next` draws the name label as a child of the caret span with
 * `color: white` on `background-color: inherit`, so until now its ground WAS
 * the value measured above, and the ink was the library's white. That failed AA
 * on all 64 dark pairings at 1.20:1, and no ink could have rescued it: contrast
 * is luminance distance only, so the ink maximising the worst pairing over a
 * fixed set of grounds is pure black or pure white, and the better of the two
 * against the worst viewer measures 3.91:1 in light. The GROUND had to move.
 *
 * It moved to the remote's SOLID hue, inked with that slug's `-on-fill`, in
 * `bodyEditorTheme.ts`. That collapses the cross-product: the viewer's composer
 * is no longer a term, so this is 8 pairings x 2 themes rather than 64 x 2. And
 * the ground is 4.5:1 territory, not 3:1 — the label is TEXT, not a mark.
 *
 * Measured end to end rather than restated: the grounds and inks below are
 * parsed out of the CSS the theme will actually mount, and matched to a remote
 * by the same `[style*=…]` needle the browser will match, against the very
 * `style` attribute the library builds out of `paintUser`'s value. A theme rule
 * that stopped covering a slug, or covered it with the wrong tier, fails here.
 */
const LABEL_NEEDLE = /\[style\*="([^"]+)"\]/;

/** Every `.cm-ySelectionInfo` colour rule the body editor's theme mounts. */
const LABEL_RULES = EditorState.create({ extensions: [BODY_EDITOR_BASE_THEME] })
  .facet(EditorView.styleModule)
  .flatMap((module) => module.getRules().split("\n"))
  .filter((rule) => rule.includes(".cm-ySelectionInfo") && LABEL_NEEDLE.test(rule))
  .map((rule) => {
    const body = rule.slice(rule.indexOf("{") + 1, rule.lastIndexOf("}"));
    const declarations = new Map(
      body
        .split(";")
        .filter((part) => part.includes(":"))
        .map((part) => [
          part.slice(0, part.indexOf(":")).trim(),
          part.slice(part.indexOf(":") + 1).trim(),
        ]),
    );
    return {
      needle: LABEL_NEEDLE.exec(rule)![1],
      ground: declarations.get("background-color") ?? "",
      ink: declarations.get("color") ?? "",
    };
  });

/** The `style` attribute `YRemoteCaretWidget.toDOM` builds, verbatim. */
function caretStyleAttribute(slug: string): string {
  const color = paintedColorFor(slug);
  return `background-color: ${color}; border-color: ${color}`;
}

/** The `var(--token)` a declaration is, or `null` if it is anything else. */
function tokenIn(declaration: string): string | null {
  return /^var\((--[a-z-]+)\)$/.exec(declaration)?.[1] ?? null;
}

describe("a co-author's hover label stands on that co-author's own hue (#2297)", () => {
  for (const slug of REMOTE_SLUGS) {
    it(`matches exactly one label rule for a ${slug} co-author`, () => {
      const style = caretStyleAttribute(slug);
      const matched = LABEL_RULES.filter((rule) => style.includes(rule.needle));
      expect(
        matched.map((rule) => rule.needle),
        `the caret style attribute for ${slug} is "${style}"`,
      ).toHaveLength(1);
    });
  }

  it("grounds every label on a bare faction hue, not on the caret's mix", () => {
    // The whole ruling in one assertion. `inherit` — the library's value — or
    // any `color-mix()` here puts the viewer's own ink back under the label and
    // reopens the unsatisfiable pairing.
    for (const rule of LABEL_RULES) {
      expect(tokenIn(rule.ground), `label ground "${rule.ground}"`).toMatch(
        /^--faction-[a-z]+$/,
      );
      expect(tokenIn(rule.ink), `label ink "${rule.ink}"`).toMatch(
        /^--faction-[a-z]+-on-fill$/,
      );
    }
  });

  for (const theme of BOTH_THEMES) {
    it(`clears ${AA_NORMAL}:1 for every remote, whoever is watching (${theme})`, () => {
      for (const slug of REMOTE_SLUGS) {
        const rule = LABEL_RULES.find((candidate) =>
          caretStyleAttribute(slug).includes(candidate.needle),
        )!;
        const ratio = contrastRatio(
          solid(tokenIn(rule.ink)!, theme),
          solid(tokenIn(rule.ground)!, theme),
        );
        expect(
          ratio,
          `a ${slug} co-author's name label (${theme}) is ${formatRatio(ratio)}: ${rule.ink} on ${rule.ground}`,
        ).toBeGreaterThanOrEqual(AA_NORMAL);
      }
    });
  }
});

describe("presence colour still tells collaborators apart (#2267)", () => {
  /**
   * The feature, asserted so a future contrast fix cannot quietly buy its
   * ratios by flattening everyone toward one legible ink — which is what #2108
   * did to the feed actor, and the opposite of what presence is for.
   *
   * 10 is the floor, not the measurement: the eight painted hues sit at a
   * minimum pairwise deltaE76 of ~15 on the tightest ground (S.N.I.D.E., light)
   * against ~21 for the bare hues, so anchoring costs some separation and
   * nowhere near all of it.
   */
  const DISTINCT = 10;

  for (const theme of BOTH_THEMES) {
    for (const ground of COMPOSER_GROUNDS) {
      it(`keeps the hues apart on the ${ground.key} composer (${theme})`, () => {
        const painted = COMPOSER_GROUNDS.map((remote) => ({
          key: remote.key,
          color: paintedOn(remote.key === "default" ? "na" : remote.key, ground, theme),
        }));
        for (let i = 0; i < painted.length; i += 1) {
          for (let j = i + 1; j < painted.length; j += 1) {
            const gap = deltaE76(painted[i].color, painted[j].color);
            expect(
              gap,
              `${painted[i].key} and ${painted[j].key} carets are deltaE ${gap.toFixed(1)} apart on the ${ground.key} composer (${theme})`,
            ).toBeGreaterThanOrEqual(DISTINCT);
          }
        }
      });
    }
  }
});

describe("the ground manifest above still matches the skins (#2267)", () => {
  // The rows are hand-written, so they can rot the moment an archetype
  // repoints its field. Cheap guard: the tokens must still be named in the
  // module that dresses that skin's body field.
  for (const ground of COMPOSER_GROUNDS) {
    it(`${ground.key} still dresses its body field with ${ground.ground}`, () => {
      const source = readFileSync(fileURLToPath(new URL(ground.source, import.meta.url)), "utf8");
      expect(source).toContain(ground.ground);
      expect(source).toContain(ground.ink);
    });
  }
});
