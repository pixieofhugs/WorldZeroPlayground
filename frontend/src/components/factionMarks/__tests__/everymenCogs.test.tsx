/**
 * One Everymen cog, drawn once, read by every surface (#2121).
 *
 * ## The seam
 *
 * The defect is a SOURCE defect: six Everymen surfaces each held a private
 * drawing of the faction's cog, three of them generating byte-identical paths
 * from copy-pasted arithmetic, one drawing a different device under the same
 * name, and one printing the literal character U+2699 GEAR — a system-font glyph, a different
 * gear on every OS, which is the pair of shapes the bug report screenshotted.
 * Nothing rendered was "wrong" at any one mount, so a per-mount render assertion
 * cannot see the bug. What has to hold is that the drawing exists ONCE and each
 * mount reaches it, so this tests at the module seam: the surface files
 * themselves, read off disk.
 *
 * A render assertion rides along at the cheapest mount (the task card) so the
 * source grep is not the only evidence that the shared path is what actually
 * reaches the DOM.
 *
 * ## The list below is the census, and a census has been wrong here before
 *
 * A surface omitted from `MOUNTS` is invisible to this file, not red. #2121's
 * own census named `EverymenPraxisCard` as holding two of those characters; by the
 * time the issue ran, #2185's masthead band had stood those cogs down and the
 * praxis card draws no gear at all — so it is deliberately NOT in the list. Add
 * a surface here when it starts wearing the mark.
 *
 * `components/vote/EverymenVote` is the one Everymen surface that draws a gear
 * and does NOT read this module, for the reason recorded in `everymenCogs.tsx`:
 * the rating row needs an outline state this solid mark has no mode for. It is
 * asserted as a deliberate exception rather than left unmentioned, so that a
 * future sweep meets the reason instead of the omission.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";

import "../../../i18n";
import { EVERYMEN_COG_PATH } from "../everymenCogs";

vi.mock("../../../hooks/useFormFactor", () => ({ useFormFactor: () => "desktop" }));

// Imported after the mock is registered.
import EverymenTaskCard from "../../taskCard/EverymenTaskCard";
import { aTask } from "../../../test/fixtures";

const SRC = fileURLToPath(new URL("../../../", import.meta.url));

/** Built from its codepoint, so this file is not itself a hit for it. */
const GLYPH = String.fromCodePoint(0x2699);

/** Every Everymen surface that draws the ornament cog, and where it lives. */
const MOUNTS = [
  "components/taskCard/EverymenTaskCard.tsx",
  "pages/editPraxis/archetypes/EverymenEditPraxis.tsx",
  "pages/taskDetail/archetypes/EverymenTaskDetail.tsx",
  "pages/fieldDesk/mobileArchetypes/EverymenFieldDesk.tsx",
  "pages/praxisDetail/archetypes/EverymenPraxisDetail.tsx",
];

const read = (rel: string): string => readFileSync(SRC + rel, "utf8");

/**
 * The shapes a private cog takes. Each one is a drawing that was really in this
 * codebase before #2121, named so a re-introduction reports which copy came back
 * rather than "a file changed".
 */
const PRIVATE_DRAWINGS: Array<[label: string, pattern: RegExp]> = [
  ["a local gear-path generator", /function\s+(build)?[Gg]ear[Pp]ath\b/],
  ["a local <Gear> component", /function\s+Gear\s*\(/],
  ["a local <Cog>/<CogSeal> component", /function\s+Cog(Seal)?\s*\(/],
  ["the eight-teeth constant block", /GEAR_TEETH\b/],
  ["a hand-rolled teeth ring", /rotate\(\$\{deg\}\s+12\s+12\)/],
];

describe("the Everymen cog is drawn once", () => {
  it.each(MOUNTS)("%s reads the shared mark and draws none of its own", (rel) => {
    const source = read(rel);

    expect(source).toMatch(/from\s+"[^"]*factionMarks\/everymenCogs"/);
    expect(source).toContain("EverymenCog");

    for (const [label, pattern] of PRIVATE_DRAWINGS) {
      expect(
        pattern.test(source),
        `${rel} still defines ${label} — the point of #2121 is that it does not`,
      ).toBe(false);
    }
  });

  it("prints the glyph nowhere: it is a system font, not our drawing", () => {
    const offenders = MOUNTS.filter((rel) => read(rel).includes(GLYPH));
    expect(offenders).toEqual([]);
  });

  it("keeps the identity sigil a separate device", () => {
    // Two cogs in mesh (the badge) vs one cog (the furniture). Collapsing them
    // is explicitly out of bounds, so the sigil must not reach for this module
    // and this module must not draw a sigil.
    expect(read("components/sigil/EverymenSigil.tsx")).not.toContain("everymenCogs");
    expect(read("components/factionMarks/everymenCogs.tsx")).not.toContain(
      "EverymenSigil({",
    );
  });

  it("leaves the gearworks vote row out, on the record", () => {
    // Not an omission — a refusal with a reason. If the vote row ever adopts the
    // shared mark, move it into MOUNTS; if this assertion is what fails, the
    // reason in `everymenCogs.tsx` is what needs revisiting first.
    const vote = read("components/vote/EverymenVote.tsx");
    expect(vote).not.toContain("everymenCogs");
    expect(read("components/factionMarks/everymenCogs.tsx")).toContain(
      "components/vote/EverymenVote",
    );
  });
});

describe("what the shared mark actually renders", () => {
  it("is the eight-tooth path on a 24-unit square", () => {
    // Pins the geometry: eight teeth means eight rim arcs and one closed path.
    expect(EVERYMEN_COG_PATH.startsWith("M")).toBe(true);
    expect(EVERYMEN_COG_PATH.endsWith("Z")).toBe(true);
    expect(EVERYMEN_COG_PATH.match(/A9\.5,9\.5 0 0 1 /g)).toHaveLength(8);
  });

  it("reaches the DOM from a real surface", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <EverymenTaskCard
          task={aTask({ description: "Fix the lamp on the corner nobody owns." })}
          basePoints={137}
          multiplier={1}
          inProgressCount={0}
        />
      </MemoryRouter>,
    );

    expect(markup).toContain(`d="${EVERYMEN_COG_PATH}"`);
    // Every cog the card draws is the SAME cog: no second `d=` on a 24-square.
    const drawn = new Set(
      [...markup.matchAll(/<path d="(M[^"]*A9\.5,9\.5[^"]*Z)"/g)].map((m) => m[1]),
    );
    expect([...drawn]).toEqual([EVERYMEN_COG_PATH]);
  });
});
