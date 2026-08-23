/**
 * #1979 — the Singularity window bar's three lamps are ONE drawing.
 *
 * Two seams, because the defect lived where only one of them can see it.
 *
 *   1. MARKUP. The feed frame's chrome bar painted the cluster in
 *      `-term-dim` / `-term-blue` / `-term-bright` — green, blue, green — while
 *      the praxis card, the task card, the praxis detail and the task detail
 *      painted `-led-red` / `-led-amber` / `-led-green`. Two palettes on one
 *      faction's window, which is what the issue reported by eye. Asserted
 *      against the rendered frame, the same SSR-only harness the other frame
 *      tests use (renderToStaticMarkup, no DOM, effects never run).
 *
 *   2. SOURCE. `Lamp` was declared FOUR separate times and the praxis card had
 *      a fifth, inline twin (a bare `ledStyle` spread onto three spans, 7px
 *      where the others were 8px). Nothing imported anything, so nothing linked
 *      the copies — a repaint in one leaves four standing and every test stays
 *      green, because each file renders perfectly on its own. That is invisible
 *      to the import graph and invisible to markup, and it is the mechanism the
 *      issue asked to remove rather than the symptom. Pinned the way #1638 and
 *      #1654 pinned the Ephemerists plate: against the source tree.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import "../../../i18n";
import SingularityFeedFrame from "../../feed/SingularityFeedFrame";

const SRC = fileURLToPath(new URL("../../..", import.meta.url));
const KIT = fileURLToPath(new URL("../SingularityLamps.tsx", import.meta.url));

/** The one palette. */
const TRIO = [
  "--faction-singularity-led-red",
  "--faction-singularity-led-amber",
  "--faction-singularity-led-green",
] as const;

/**
 * Every shipped `.ts`/`.tsx` under `src/`, comments stripped and tests skipped.
 * Both exclusions matter: this file names the retired constants in prose, and a
 * docblock explaining what was deleted must not answer for a live copy.
 */
function sources(): { path: string; source: string }[] {
  const found: { path: string; source: string }[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "__tests__" || entry.name === "node_modules") continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.tsx?$/.test(entry.name)) {
        found.push({
          path: full,
          source: readFileSync(full, "utf8")
            .replace(/\/\*[\s\S]*?\*\//g, "")
            .replace(/^\s*\/\/.*$/gm, ""),
        });
      }
    }
  };
  walk(SRC);
  return found;
}

describe("the feed frame's window bar wears the same lamps as every other (#1979)", () => {
  const html = () =>
    renderToStaticMarkup(
      <SingularityFeedFrame
        kicker="Task completed"
        time="2h ago"
        tag={null}
        archive={<button type="button">archive-node</button>}
      >
        <span>card-body</span>
      </SingularityFeedFrame>,
    );

  it("paints the LED trio", () => {
    const markup = html();
    for (const token of TRIO) expect(markup, `${token} is unpainted`).toContain(token);
  });

  it("no longer paints a lamp in the chassis' own phosphor and blue", () => {
    // Scoped to the BAR — `-term-dim`, `-term-blue` and `-term-bright` are the
    // chassis' inks and stay everywhere else in the file (the window title, the
    // prompt, the handle). What must not come back is a lamp drawn in them, so
    // this reads the cluster's own markup rather than the frame's.
    const markup = html();
    const open = markup.indexOf(TRIO[0]);
    const close = markup.indexOf(TRIO[2]);
    // Both ends located, or the slice below is the empty string and this test
    // asserts nothing — the shape that passes loudest while the bug ships.
    expect(open, "the cluster is on the bar at all").toBeGreaterThan(-1);
    expect(close).toBeGreaterThan(open);
    expect(markup.slice(open, close)).not.toContain("--faction-singularity-term-");
  });
});

describe("the lamp cluster is declared once, and in the kit (#1979)", () => {
  it("leaves no second Lamp anywhere in the tree", () => {
    const declared = sources().filter(({ source }) =>
      /\b(?:function|const)\s+Lamp\b/.test(source),
    );
    expect(declared.map((file) => file.path)).toEqual([KIT]);
  });

  it("keeps the palette in the kit — no surface restates the trio", () => {
    // More than ONE of the three in a file is a transcribed cluster. Deliberately
    // not "any led token outside the kit": `SingularityScoreStamp` reads
    // `-led-amber` alone as the computed total's ink, which is type on a stamp
    // and not a lamp on a bar. A blanket sweep would either fail on it or force
    // an exception list, and an exception list is where the next copy hides.
    const restating = sources().filter(
      ({ path, source }) =>
        path !== KIT && TRIO.filter((token) => source.includes(token)).length > 1,
    );
    expect(restating.map((file) => file.path)).toEqual([]);
  });

  it("mounts the kit on every window bar the faction draws", () => {
    // Named rather than counted, because a count is what let the census be
    // wrong twice. The issue named four sites; the first pass found five (the
    // task detail carried a copy nobody had counted, and the praxis card's was
    // an inline twin with no `Lamp` in it at all — which is why this counts
    // MOUNTS and not declarations). It was SIX. The edit-praxis composer mapped
    // its own `[MUTED, BLUE, ACCENT]` onto three dots, so it was invisible to
    // both scans above at once: no `Lamp` identifier to find, and no LED token
    // to find either. Only a roll-call of the surfaces can see that, and only
    // if it is written down.
    //
    // IT IS FIVE NOW, AND THAT IS A MERGE RATHER THAN A LOSS (#2185). The task
    // card and the praxis card wear the SAME window bar, mounted from
    // `cardMasthead/factionBands` — so the two card mounts became one and the
    // bar they share is `SingularityBand`. Four window bars still draw their own
    // (the feed frame and the three page surfaces). A future reader shortening
    // this list further should check they are removing a mount and not a
    // SURFACE: a card that stopped drawing the bar at all is the regression this
    // roll-call exists to catch, and it looks identical to this edit from here.
    const rel = (path: string) => path.slice(SRC.length).replace(/\\/g, "/");
    const mounts = sources().filter(({ source }) => source.includes("<SingularityLamps"));
    expect(mounts.map((file) => rel(file.path)).sort()).toEqual([
      "components/cardMasthead/factionBands.tsx",
      "components/feed/SingularityFeedFrame.tsx",
      // The sixth window bar (#2353): character creation, dressed as a terminal
      // session. It mounts the cluster and NOT `SingularityProcessLight` — the
      // bar it wears is this frame's and the card band's rather than the
      // composer's, because a page with no session has no process to light.
      "pages/characterPaths/archetypes/SingularityCreateCharacter.tsx",
      "pages/editPraxis/archetypes/SingularityEditPraxis.tsx",
      "pages/praxisDetail/archetypes/SingularityPraxisDetail.tsx",
      "pages/taskDetail/archetypes/SingularityTaskDetail.tsx",
    ]);
  });
});
