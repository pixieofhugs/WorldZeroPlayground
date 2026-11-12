/**
 * One Everymen cog, drawn once, read by every surface (#2121). A source
 * defect (private copies, and a U+2699 system glyph that differs per OS), so
 * it's tested on the surface files themselves, plus one render at the task
 * card. `MOUNTS` is a census: add a surface when it starts wearing the mark.
 * `EverymenVote` is a recorded exception (see `everymenCogs.tsx`).
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

const MOUNTS = [
  "components/taskCard/EverymenTaskCard.tsx",
  "pages/editPraxis/archetypes/EverymenEditPraxis.tsx",
  "pages/taskDetail/archetypes/EverymenTaskDetail.tsx",
  "pages/fieldDesk/mobileArchetypes/EverymenFieldDesk.tsx",
  "pages/praxisDetail/archetypes/EverymenPraxisDetail.tsx",
];

const read = (rel: string): string => readFileSync(SRC + rel, "utf8");

/** Shapes real private copies took, named so a revival reports which. */
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

    expect(source).toMatch(/from\s+["'][^"']*factionMarks\/everymenCogs["']/);
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
    // Meshed pair (badge) vs one cog (furniture); never collapse them.
    expect(read("components/sigil/EverymenSigil.tsx")).not.toContain("everymenCogs");
    expect(read("components/factionMarks/everymenCogs.tsx")).not.toContain(
      "EverymenSigil({",
    );
  });

  it("leaves the gearworks vote row out, on the record", () => {
    // If the vote row adopts the mark, move it into MOUNTS.
    const vote = read("components/vote/EverymenVote.tsx");
    expect(vote).not.toMatch(/^import .*everymenCogs/m);
    // Recorded at both ends.
    expect(vote).toContain("everymenCogs");
    expect(read("components/factionMarks/everymenCogs.tsx")).toContain(
      "components/vote/EverymenVote",
    );
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
});
