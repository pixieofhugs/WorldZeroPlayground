/**
 * One Everymen cog, drawn once, read by every surface (#2121). A source
 * defect (private copies, and a U+2699 system glyph that differs per OS), so
 * it's a walk of the whole tree, plus one render at the task card. `MOUNTS`
 * is a census floor: add a surface when it starts wearing the mark.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";

import "../../../i18n";
import { EVERYMEN_COG_PATH } from "../everymenCogs";
import { readStripped, sourceFiles, toRelative } from "../../../test/sourceScan";

vi.mock("../../../hooks/useFormFactor", () => ({ useFormFactor: () => "desktop" }));
vi.mock("../../vote/useVote", () => ({
  useVote: () => ({ user: { id: 1 }, selected: 0, saving: false, error: "", vote: vi.fn() }),
}));
vi.mock("../../../auth/AuthContext", () => ({
  useAuth: () => ({ user: { id: 1 }, refetch: vi.fn() }),
}));

// Imported after the mock is registered.
import EverymenTaskCard from "../../taskCard/EverymenTaskCard";
import EverymenVote from "../../vote/EverymenVote";
import { VOTE_REFRAMES } from "../../vote/voteReframes";
import { aTask } from "../../../test/fixtures";

/** Built from its codepoint, so this file is not itself a hit for it. */
const GLYPH = String.fromCodePoint(0x2699);

const MOUNTS = [
  "components/taskCard/EverymenTaskCard.tsx",
  "pages/editPraxis/archetypes/EverymenEditPraxis.tsx",
  "pages/taskDetail/archetypes/EverymenTaskDetail.tsx",
  "pages/fieldDesk/mobileArchetypes/EverymenFieldDesk.tsx",
  "pages/praxisDetail/archetypes/EverymenPraxisDetail.tsx",
];

const COG_MODULE = "components/factionMarks/everymenCogs.tsx";
/** The vote row keeps its own gear, on the record in `everymenCogs.tsx`. */
const EXEMPT = [COG_MODULE, "components/vote/EverymenVote.tsx"];

/** Shapes real private copies took, named so a revival reports which. */
const PRIVATE_DRAWINGS: Array<[label: string, pattern: RegExp]> = [
  ["a local gear-path generator", /function\s+(build)?[Gg]ear[Pp]ath\b/],
  ["a local <Gear> component", /function\s+Gear\s*\(/],
  ["a local <Cog>/<CogSeal> component", /function\s+Cog(Seal)?\s*\(/],
  ["the eight-teeth constant block", /GEAR_TEETH\b/],
  ["a hand-rolled teeth ring", /rotate\(\$\{deg\}\s+12\s+12\)/],
];

describe("the Everymen cog is drawn once", () => {
  const shipped = sourceFiles().map((path) => ({ rel: toRelative(path), source: readStripped(path) }));

  it.each(PRIVATE_DRAWINGS)("no file defines %s", (label, pattern) => {
    const offenders = shipped
      .filter(({ rel, source }) => !EXEMPT.includes(rel) && pattern.test(source))
      .map(({ rel }) => rel);
    expect(offenders, `the point of #2121 is that ${label} does not come back`).toEqual([]);
  });

  it("prints the glyph nowhere: it is a system font, not our drawing", () => {
    const offenders = shipped.filter(({ source }) => source.includes(GLYPH)).map(({ rel }) => rel);
    expect(offenders).toEqual([]);
  });

  it("every file that mounts the cog reads the shared mark, and the census holds", () => {
    const wearers = shipped.filter(({ rel, source }) => rel !== COG_MODULE && source.includes("<EverymenCog"));
    expect(wearers.map(({ rel }) => rel)).toEqual(expect.arrayContaining(MOUNTS));
    for (const { rel, source } of wearers) {
      expect(source, rel).toMatch(/from\s+["'][^"']*factionMarks\/everymenCogs["']/);
    }
  });

  it("keeps the identity sigil a separate device", () => {
    // Meshed pair (badge) vs one cog (furniture); never collapse them.
    const importers = shipped.filter(({ source }) => /from\s+["'][^"']*everymenCogs["']/.test(source));
    expect(importers.map(({ rel }) => rel)).not.toContain("components/sigil/EverymenSigil.tsx");
  });
});

describe("what the shared mark actually renders", () => {
  it("is the eight-tooth path on a 24-unit square", () => {
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
    const drawn = new Set(
      [...markup.matchAll(/<path d="(M[^"]*A9\.5,9\.5[^"]*Z)"/g)].map((m) => m[1]),
    );
    expect([...drawn]).toEqual([EVERYMEN_COG_PATH]);
  });

  it("leaves the vote row on its own gear: eight rect teeth per tier, never the shared path", () => {
    const markup = renderToStaticMarkup(<EverymenVote praxisId={1} />);
    expect(markup).not.toContain(EVERYMEN_COG_PATH);
    expect(markup.match(/<rect /g)).toHaveLength(8 * VOTE_REFRAMES["everymen"].tiers.length);
  });
});
