/**
 * Tasks browse dispatch guard (#496).
 *
 * Mirrors the TaskDetail formFactor branch: mobile viewers get the
 * single-column DefaultTaskList skin, desktop viewers get the existing
 * flex-wrap TaskCard list. Stubs useFormFactor so the branch can be forced
 * either way and mocks the mobile skin with a marker so the assertion pins
 * dispatch, not DefaultTaskList's own rendering (covered separately by
 * mobileArchetypeSlots.test.tsx).
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
// Initialize the i18n catalog so nav/tasks copy keys resolve to English text.
import "../../i18n";

const mockUseFormFactor = vi.fn();
vi.mock("../../hooks/useFormFactor", () => ({
  useFormFactor: () => mockUseFormFactor(),
}));

vi.mock("../tasks/mobileArchetypes/DefaultTaskList", () => ({
  default: () => <div data-testid="default-task-list-marker" />,
}));

import Tasks from "../Tasks";

function render(): string {
  return renderToStaticMarkup(
    <MemoryRouter>
      <Tasks />
    </MemoryRouter>,
  );
}

describe("Tasks browse dispatch", () => {
  it("renders the mobile DefaultTaskList skin when formFactor is mobile", () => {
    mockUseFormFactor.mockReturnValue("mobile");
    const html = render();
    expect(html).toContain('data-testid="default-task-list-marker"');
  });

  it("renders the existing desktop flex-wrap list when formFactor is desktop", () => {
    mockUseFormFactor.mockReturnValue("desktop");
    const html = render();
    expect(html).not.toContain('data-testid="default-task-list-marker"');
    // Desktop keeps the faction filter tabs at the top level (Style Guide §5.3),
    // not nested inside a mobile chip-row skin.
    expect(html).toContain("faction:");
  });
});
