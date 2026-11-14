import { describe, it, expect, vi, beforeEach } from "vitest";
import { signupOutcome } from "../useTaskSignup";
import { createPraxis } from "../../api/praxis";
import { aPraxis } from "../../test/fixtures";
import { ApiError } from "../../api/apiError";

vi.mock("../../api/praxis", () => ({ createPraxis: vi.fn() }));

beforeEach(() => vi.clearAllMocks());

describe("signupOutcome", () => {
  it("creates a SOLO praxis for the task and lands on its composer", async () => {
    vi.mocked(createPraxis).mockResolvedValue(aPraxis({ id: 42 }));
    expect(await signupOutcome(7, "fallback")).toEqual({ to: "/praxis/42/edit" });
    expect(createPraxis).toHaveBeenCalledWith({ task_id: 7, type: "solo" });
  });

  it("a failed create stays put and surfaces the server's reason", async () => {
    vi.mocked(createPraxis).mockRejectedValue(new ApiError(new Response(null, { status: 400 }), { detail: "Level too low" }));
    expect(await signupOutcome(7, "fallback")).toEqual({ error: "Level too low" });
  });
});
