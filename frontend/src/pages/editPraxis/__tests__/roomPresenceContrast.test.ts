/**
 * #2267 — the other half of `roomPresence.ts`'s `local/no-faction-hue-as-ink`
 * exemption. The presence value becomes the caret's border/dot colour (WCAG
 * 1.4.11, 3:1), measured over the runtime cross-product a lint can't see: remote
 * hue x viewer ground x theme. The bare hue failed 21/64 light pairings (worst
 * 1.86:1).
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
import { resolveRoleReads } from "../../../test/sourceScan";
import { readIndexCss } from "../../../test/indexCss";

const THEMES = readThemes(
  readIndexCss(),
);
const BOTH_THEMES: Theme[] = ["light", "dark"];

/**
 * Each archetype's body-editor field: `ground` under the caret, `ink` as its
 * `currentColor`. Eight rows: `na`/`albescent` resolve to `default` (ADR-0039).
 */
const COMPOSER_GROUNDS = [
  { key: "snide", ground: "--faction-snide-composer-field", ink: "--faction-snide-composer-ink", source: "../archetypes/SnideEditPraxis.tsx" },
  { key: "coven", ground: "--faction-coven-ward-page", ink: "--faction-coven-slip-ink", source: "../archetypes/CovenEditPraxis.tsx" },
  { key: "default", ground: "--faction-default-composer-field", ink: "--faction-default-card-text", source: "../archetypes/DefaultEditPraxis.tsx" },
  // Ephemerists' plate primitives live in the shared mark module.
  { key: "ephemerists", ground: "--faction-ephemerists-plate-inner", ink: "--faction-ephemerists-plate-ink", source: "../../../components/factionMarks/ephemeristsPlate.tsx" },
  { key: "everymen", ground: "--faction-everymen-sheet-panel", ink: "--everymen-paper-text", source: "../archetypes/EverymenEditPraxis.tsx" },
  { key: "singularity", ground: "--faction-singularity-term-panel", ink: "--faction-singularity-term-ink", source: "../archetypes/SingularityEditPraxis.tsx" },
  { key: "ua", ground: "--faction-ua-panel", ink: "--faction-ua-card-text", source: "../archetypes/UaEditPraxis.tsx" },
  { key: "wow", ground: "--faction-wow-chronicle-panel", ink: "--faction-wow-card-text", source: "../archetypes/WowEditPraxis.tsx" },
] as const;

const REMOTE_SLUGS = [
  "ua", "wow", "coven", "snide", "ephemerists", "singularity", "everymen", "na", "albescent",
] as const;

/** No yjs needed (`AwarenessLike` is structural); the wire is `roomPresence.test.ts`. */
function paintedColorFor(slug: string): string {
  const states = new Map([[1, { user: { characterId: 7, name: "Wren", factionSlug: slug } }]]);
  const awareness: AwarenessLike = { getStates: () => states, setLocalStateField: () => {} };
  const seen = paintedAwareness(awareness).getStates().get(1);
  return (seen?.user as { color: string }).color;
}

/**
 * Deliberately narrow: any other shape throws. BARE is unused today but kept so
 * the regression it represents stays measurable.
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

/** sRGB `color-mix` of two opaque colours is `compositeOver` with p as alpha. */
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
  // 1.4.11: non-text UI, so 3:1.
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
 * The hover label (#2297) is TEXT (4.5:1). On the caret's mixed ground no ink
 * could pass (best 3.91:1), so `bodyEditorTheme.ts` grounds it on the remote's
 * solid hue with its `-on-fill` ink. Rules are parsed from the mounted theme and
 * matched by the same `[style*=…]` needle the browser uses.
 */
const LABEL_NEEDLE = /\[style\*="([^"]+)"\]/;

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
    // `inherit` or a `color-mix()` reopens the unsatisfiable pairing.
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
   * Stops a contrast fix flattening everyone to one ink. Floor 10; measured min
   * deltaE76 is ~15 (S.N.I.D.E., light) vs ~21 for bare hues.
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
  // The rows are hand-written; guard them against the skin source.
  for (const ground of COMPOSER_GROUNDS) {
    it(`${ground.key} still dresses its body field with ${ground.ground}`, () => {
      // A migrated composer reads the `ink` ROLE; `resolveRoleReads` folds it back.
      const source = resolveRoleReads(
        readFileSync(fileURLToPath(new URL(ground.source, import.meta.url)), "utf8"),
      );
      expect(source).toContain(ground.ground);
      expect(source).toContain(ground.ink);
    });
  }
});
