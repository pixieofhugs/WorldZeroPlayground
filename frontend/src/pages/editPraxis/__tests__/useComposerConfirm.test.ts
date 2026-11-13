import { describe, it, expect, vi } from "vitest";
import { createConfirmSlot } from "../useComposerConfirm";
import type { ConfirmRequest } from "../../../components/confirm/composerConfirms";

const req = (kind: string) => ({ kind }) as unknown as ConfirmRequest;

describe("createConfirmSlot", () => {
  it("shows the request, and accept resolves true and clears the dialog", async () => {
    const show = vi.fn();
    const slot = createConfirmSlot(show);
    const answer = slot.ask(req("a"));
    expect(show).toHaveBeenLastCalledWith(req("a"));
    slot.settle(true);
    await expect(answer).resolves.toBe(true);
    expect(show).toHaveBeenLastCalledWith(null);
  });

  it("dismiss resolves false (a destructive action must not proceed)", async () => {
    const slot = createConfirmSlot(vi.fn());
    const answer = slot.ask(req("a"));
    slot.settle(false);
    await expect(answer).resolves.toBe(false);
  });

  it("a second ask declines the first instead of leaving it awaiting forever", async () => {
    const slot = createConfirmSlot(vi.fn());
    const first = slot.ask(req("a"));
    const second = slot.ask(req("b"));
    await expect(first).resolves.toBe(false);
    slot.settle(true);
    await expect(second).resolves.toBe(true);
  });

  it("settling with nothing open is a harmless no-op, and cannot answer a later ask", async () => {
    const slot = createConfirmSlot(vi.fn());
    expect(() => slot.settle(true)).not.toThrow();
    const answer = slot.ask(req("a"));
    slot.settle(false);
    await expect(answer).resolves.toBe(false);
  });

  it("a double settle answers once", async () => {
    const slot = createConfirmSlot(vi.fn());
    const answer = slot.ask(req("a"));
    slot.settle(true);
    slot.settle(false);
    await expect(answer).resolves.toBe(true);
  });
});
