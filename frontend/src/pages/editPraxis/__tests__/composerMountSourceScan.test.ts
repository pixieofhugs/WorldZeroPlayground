/**
 * #1379 — the two mount-time claims that have no value seam.
 *
 * These were the rest of `composerWaterfall.test.ts` before #2881 turned the
 * load decision into `planInitialLoad`. They are kept, not deleted, because
 * that plan gives neither of them a replacement: one is a call made during a
 * page component's render, which needs a DOM this repo does not have (vitest
 * runs in `node`, `vite.config.ts` declares no `environment`), and the other is
 * an effect's dependency list, which is not a value at all.
 *
 * They read source, in the posture `searchQueryParamAdoption.test.ts` set. What
 * #2881 removed is the part that was dangerous about that: the old file sliced
 * the HOOK between a comment banner and a dependency array, so renaming either
 * emptied the slice and passed every assertion on air — a comment was
 * load-bearing. The dispatcher slice below is bounded by two `if` branches
 * rather than a comment, and it keeps the guard-the-guard the deleted one
 * needed, because the claim really is "during the loading branch" and a
 * whole-file scan would pass on a warm that had drifted below the gate.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const HERE = path.dirname(fileURLToPath(import.meta.url));

function read(relativePath: string): string {
  return readFileSync(path.join(HERE, relativePath), "utf8");
}

describe("the seal list does not wait on the praxis", () => {
  const hookSource = read("../useEditPraxis.ts");

  it("is fetched from its own viewer-keyed effect", () => {
    // It sat inside the praxis `.then()`, which made it wait a whole round trip
    // on a payload it reads nothing from — the list is keyed on the VIEWER
    // (`eligible_for_current_user`), not on the praxis. The dependency list is
    // the claim: an effect keyed on the viewer is one that fires at mount,
    // beside the praxis read, rather than after it.
    expect(hookSource).toMatch(
      /listMetatasks\(\)[\s\S]{0,400}?\}, \[user\?\.character\?\.id\]\)/,
    );
  });
});

describe("the faction archetype chunk does not wait on getTask", () => {
  const dispatcherSource = read("../../EditPraxis.tsx");

  /** Everything the dispatcher does while `state.loading` is still true. */
  const loadingBranch = dispatcherSource.slice(
    dispatcherSource.indexOf("if (state.loading) {"),
    dispatcherSource.indexOf("if (!state.praxis) {"),
  );

  it("slices the loading branch it means to inspect", () => {
    expect(loadingBranch).toContain("editPraxis.loadingPageTitle");
  });

  it("warms the chunk from the praxis, which lands a round trip earlier", () => {
    expect(loadingBranch).toContain("preloadArchetype");
    // `task_faction_slug` IS `Task.primary_faction_slug` — one builder,
    // server-side — so the warm and the dispatch below can never disagree.
    expect(loadingBranch).toContain("task_faction_slug");
  });

  it("still dispatches on the task, so the warm cannot change what renders", () => {
    expect(dispatcherSource).toContain(
      "const slug = state.task?.primary_faction_slug ?? null;",
    );
  });
});
