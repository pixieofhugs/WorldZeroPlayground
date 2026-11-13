/**
 * #1979: the Singularity window bar's three lamps are one drawing.
 *   1. Markup: the feed frame once painted a different trio.
 *   2. Source: `Lamp` was declared in several files with nothing linking the
 *      copies, invisible to markup, so it's pinned against the source tree.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import "../../../i18n";
import SingularityFeedFrame from "../../feed/SingularityFeedFrame";
import { sourceFiles, stripComments, toRelative } from "../../../test/sourceScan";

const KIT = fileURLToPath(new URL("../SingularityLamps.tsx", import.meta.url));

/** The one palette. */
const TRIO = [
  "--faction-singularity-led-red",
  "--faction-singularity-led-amber",
  "--faction-singularity-term-cta-bg",
] as const;

/** Shipped source, comments stripped, tests skipped. */
function sources(): { path: string; source: string }[] {
  return sourceFiles().map((path) => ({ path, source: stripComments(readFileSync(path, "utf8")) }));
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
    // Scoped to the cluster: `-term-*` inks are legit elsewhere in the frame.
    const markup = html();
    const open = markup.indexOf(TRIO[0]);
    const close = markup.indexOf(TRIO[2]);
    // Else the slice is empty and asserts nothing.
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
    // More than one: `SingularityScoreStamp` legitimately reads `-led-amber`.
    const restating = sources().filter(
      ({ path, source }) =>
        path !== KIT && TRIO.filter((token) => source.includes(token)).length > 1,
    );
    expect(restating.map((file) => file.path)).toEqual([]);
  });

  it("mounts the kit on every window bar the faction draws", () => {
    // Named, not counted: counts were wrong twice. Both cards share
    // `factionBands` (#2185). Shortening this list? Check you removed a mount,
    // not a surface that stopped drawing the bar.
    const mounts = sources().filter(({ source }) => source.includes("<SingularityLamps"));
    expect(mounts.map((file) => toRelative(file.path)).sort()).toEqual([
      "components/cardMasthead/factionBands.tsx",
      "components/feed/SingularityFeedFrame.tsx",
      // #2353; no process light, since there is no session.
      "pages/characterPaths/archetypes/SingularityCreateCharacter.tsx",
      // #2537.
      "pages/characterPaths/archetypes/SingularityEditCharacter.tsx",
      "pages/editPraxis/archetypes/SingularityEditPraxis.tsx",
      "pages/praxisDetail/archetypes/SingularityPraxisDetail.tsx",
      // #2538.
      "pages/proposeTask/archetypes/SingularityProposeTask.tsx",
      "pages/taskDetail/archetypes/SingularityTaskDetail.tsx",
    ]);
  });
});
