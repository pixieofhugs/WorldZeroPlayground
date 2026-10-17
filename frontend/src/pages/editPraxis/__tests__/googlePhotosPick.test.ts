/**
 * THE SEAM: `runPick`, the Google Photos state machine (#559), driven through
 * fake `PickDeps` — no browser, no Google. The real consent -> pick -> ingest
 * path cannot run in CI; the owner checks it on dev. Plus the button's presence,
 * by `renderToStaticMarkup` (no jsdom).
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import "../../../i18n";
import { ApiError } from "../../../api/apiError";
import { extractError } from "../../../utils/errors";
import { GooglePhotosButton } from "../archetypes/controls";
import { runPick, type PickDeps, type PickPopup } from "../googlePhotosPick";

const READY = {
  status: "ready" as const,
  session_id: "s1",
  picker_uri: "https://photos.example/pick/autoclose",
  poll_interval_seconds: 1,
};
const NEEDS_AUTH = { status: "authorization_needed" as const, session_id: null, picker_uri: null, poll_interval_seconds: null };

function fakes(over: Partial<PickDeps> & { polls?: Array<"waiting" | "picked" | "expired"> } = {}) {
  const calls: string[] = [];
  const polls = [...(over.polls ?? ["picked"])];
  const popup: PickPopup & { closed: boolean } = {
    closed: false,
    navigate: (url) => calls.push(`navigate ${url}`),
    close: () => calls.push("close"),
  };
  const deps: PickDeps = {
    openPopup: () => (calls.push("open"), popup),
    start: async () => (calls.push("start"), READY),
    poll: async () => (calls.push("poll"), polls.shift() ?? "waiting"),
    abandon: async (id) => void calls.push(`abandon ${id}`),
    ingest: async (id) => (calls.push(`ingest ${id}`), []),
    awaitAuthorization: async () => (calls.push("await"), "ok"),
    sleep: async () => {},
    ...over,
  };
  return { deps, calls, popup };
}

describe("runPick", () => {
  it("ready -> picked -> ingest, with no DELETE after a clean ingest", async () => {
    const { deps, calls } = fakes({ polls: ["waiting", "picked"] });
    const out = await runPick(deps, new AbortController().signal);
    expect(out.kind).toBe("ingested");
    expect(calls).toEqual([
      "open", "start", `navigate ${READY.picker_uri}`, "poll", "poll", "ingest s1",
    ]);
  });

  it("authorization_needed -> authorize popup -> asks again -> picker", async () => {
    let n = 0;
    const { deps, calls } = fakes({
      start: async () => (calls.push("start"), n++ === 0 ? NEEDS_AUTH : READY),
    });
    const out = await runPick(deps, new AbortController().signal);
    expect(out.kind).toBe("ingested");
    expect(calls.slice(0, 5)).toEqual([
      "open", "start", expect.stringContaining("/auth/google/photos/authorize"), "await", "start",
    ]);
  });

  it("a failed or closed authorization ends the pick without a session", async () => {
    const failed = fakes({ awaitAuthorization: async () => "failed" });
    failed.deps.start = async () => NEEDS_AUTH;
    expect((await runPick(failed.deps, new AbortController().signal)).kind).toBe("authFailed");
    const closed = fakes({ awaitAuthorization: async () => "closed" });
    closed.deps.start = async () => NEEDS_AUTH;
    expect((await runPick(closed.deps, new AbortController().signal)).kind).toBe("abandoned");
    expect(closed.calls.some((c) => c.startsWith("abandon"))).toBe(false);
  });

  it("expired is reported, not ingested", async () => {
    const { deps, calls } = fakes({ polls: ["expired"] });
    expect((await runPick(deps, new AbortController().signal)).kind).toBe("expired");
    expect(calls.some((c) => c.startsWith("ingest"))).toBe(false);
  });

  it("aborting while waiting DELETEs the session", async () => {
    const abort = new AbortController();
    const { deps, calls } = fakes({
      polls: ["waiting", "waiting"],
      sleep: async () => abort.abort(),
    });
    expect((await runPick(deps, abort.signal)).kind).toBe("abandoned");
    expect(calls).toContain("abandon s1");
  });

  it("a picker window closed with nothing picked is abandoned after the grace", async () => {
    const { deps, calls, popup } = fakes({ polls: [] });
    popup.closed = true;
    // popup.closed at start would reopen; keep one fake popup for the picker.
    deps.openPopup = () => popup;
    expect((await runPick(deps, new AbortController().signal)).kind).toBe("abandoned");
    expect(calls).toContain("abandon s1");
  });

  it("a blocked popup is reported", async () => {
    const { deps } = fakes({ openPopup: () => null });
    expect((await runPick(deps, new AbortController().signal)).kind).toBe("popupBlocked");
  });

  it("a 403 propagates, and its catalog error is what the player reads", async () => {
    const err = new ApiError(new Response(null, { status: 403 }), { detail: { code: "GOOGLE_PHOTOS_UNAVAILABLE", message: "x" } });
    const { deps } = fakes({ start: async () => { throw err; } });
    await expect(runPick(deps, new AbortController().signal)).rejects.toBe(err);
    expect(extractError(err)).toBe("Google Photos is only available when you sign in with Google.");
  });
});

describe("GooglePhotosButton", () => {
  const pick = async () => {};
  const html = (provider: string | undefined) =>
    renderToStaticMarkup(createElement(GooglePhotosButton, { provider, pick }));
  it("shows for a Google viewer", () => {
    expect(html("google")).toContain("Add from Google Photos");
  });
  it("is absent for anyone else", () => {
    expect(html("discord")).toBe("");
    expect(html(undefined)).toBe("");
  });
});
