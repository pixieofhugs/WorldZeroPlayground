/**
 * #1379 — two mount-time claims with no value seam (a render-time call, an
 * effect's dependency list), so they read source. The dispatcher slice is bounded
 * by two `if` branches, not a comment, and guarded so an empty slice can't pass.
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
    // The list is keyed on the VIEWER, not the praxis, so it fires at mount
    // beside the praxis read rather than after it.
    expect(hookSource).toMatch(
      /listMetatasks\(\)[\s\S]{0,400}?\}, \[user\?\.character\?\.id\]\)/,
    );
  });
});

describe("the faction archetype chunk does not wait on getTask", () => {
  const dispatcherSource = read("../../EditPraxis.tsx");

  const loadingBranch = dispatcherSource.slice(
    dispatcherSource.indexOf("if (state.loading) {"),
    dispatcherSource.indexOf("if (!state.praxis) {"),
  );

  it("slices the loading branch it means to inspect", () => {
    expect(loadingBranch).toContain("editPraxis.loadingPageTitle");
  });

  it("warms the chunk from the praxis, which lands a round trip earlier", () => {
    expect(loadingBranch).toContain("preloadArchetype");
    // `task_faction_slug` IS `Task.primary_faction_slug` server-side.
    expect(loadingBranch).toContain("task_faction_slug");
  });

  it("still dispatches on the task, so the warm cannot change what renders", () => {
    expect(dispatcherSource).toContain(
      "const slug = state.task?.primary_faction_slug ?? null;",
    );
  });
});
