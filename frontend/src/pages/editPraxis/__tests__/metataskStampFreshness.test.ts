/**
 * #2464 — a seal mutation's answer is never discarded.
 *
 * The composer's score stamp reads `praxis.score` and `praxis.metatask_points`.
 * `useMetataskApply` used to update only `appliedMetataskList`, so sealing a
 * +100 metatask onto a task worth 10 left the stamp printing 10 until a reload
 * — and peeling one off left it printing the higher total. Both mutations
 * answer with the re-scored praxis, so the fix is to write that answer back.
 *
 * WHY THIS IS A SOURCE ASSERTION
 * ------------------------------
 * vitest runs in the `node` environment here — no jsdom, no `renderHook` (see
 * `hooks/__tests__/useTheme.test.tsx` and `searchQueryParamAdoption.test.ts`,
 * which take the same posture for the same reason). A hook whose whole defect
 * is *which state cell a callback writes* cannot be rendered to observe it, so
 * the available check is the one below: every mutation call in the hook is
 * consumed rather than awaited into the void.
 *
 * The compiler already covers the other half. `applyMetatask`/`removeMetatask`
 * are typed `Promise<PraxisOut>`, and `useMetataskApply` takes `setPraxis` as a
 * required property — so a mount that forgets to thread it, or a client that
 * stops returning a praxis, fails `tsc` rather than needing a test here. What
 * `tsc` cannot see is a call written back as a bare `await`, which is exactly
 * the state this file found the hook in.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const HOOK_SOURCE = readFileSync(
  fileURLToPath(new URL("../useMetataskApply.ts", import.meta.url)),
  "utf8",
);

/** Every line that calls one of the two mutations, comments and imports aside. */
function mutationCallLines(): string[] {
  return HOOK_SOURCE.split("\n")
    .map((line) => line.trim())
    .filter(
      (line) =>
        !line.startsWith("*") &&
        !line.startsWith("//") &&
        !line.startsWith("import") &&
        /\b(applyMetatask|removeMetatask)\(/.test(line),
    );
}

describe("useMetataskApply keeps the praxis each mutation returns", () => {
  /**
   * Four, not three: `toggleMetatask` has an apply branch AND a remove branch,
   * and the remove branch is the one a test is most likely to skip. `>=` rather
   * than `===` so a fifth path is held to the rule below rather than failing
   * here for existing.
   */
  it("still has all four mutation call sites", () => {
    expect(mutationCallLines().length).toBeGreaterThanOrEqual(4);
  });

  it("writes every one of them back through setPraxis", () => {
    const discarded = mutationCallLines().filter(
      (line) => !/setPraxis\(await (apply|remove)Metatask\(/.test(line),
    );

    expect(discarded,
      "These calls throw away the re-scored praxis the server just sent, so " +
        "the score stamp keeps printing the pre-mutation total until a reload " +
        "(#2464). Write each one back — `setPraxis(await applyMetatask(...))` " +
        "— and do NOT reach for a refetch: the number is already on the wire.",
    ).toEqual([]);
  });
});
