// @vitest-environment jsdom
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import "../../../../i18n";
import type { PraxisOut } from "../../../../api/praxis";
import type { TaskOut } from "../../../../api/tasks";

vi.mock("../../../../hooks/useFormFactor", () => ({ useFormFactor: () => "mobile" }));
import { TaskSlip } from "../shared";

const task = { id: 7, description: "Full recap text", level_required: 1 } as unknown as TaskOut;
const praxis = {
  id: 1,
  task_id: 7,
  task_title: "High Fives",
  task_point_value: 15,
} as unknown as PraxisOut;

describe("TaskSlip on a phone (#3758)", () => {
  it("is one row until tapped, and a second tap collapses it", () => {
    render(
      <MemoryRouter>
        <TaskSlip praxis={praxis} task={task} mark={<i>stamp</i>} />
      </MemoryRouter>,
    );
    const row = screen.getByRole("button", { name: /High Fives/ });
    expect(row.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText("Full recap text")).toBeNull();
    fireEvent.click(row);
    expect(row.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("Full recap text")).toBeTruthy();
    fireEvent.click(row);
    expect(screen.queryByText("Full recap text")).toBeNull();
  });
});
