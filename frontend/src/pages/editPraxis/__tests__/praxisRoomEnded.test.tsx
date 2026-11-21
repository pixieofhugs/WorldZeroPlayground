// @vitest-environment jsdom
/** #3645 acceptance: a 1008 close ends the room, and the body editor goes read-only. */
import { act, cleanup, render } from "@testing-library/react";
import { Awareness } from "y-protocols/awareness";
import { afterEach, describe, expect, it, vi } from "vitest";
import "../../../i18n";
import { anEditPraxisState } from "../../../test/fixtures";

const fake = vi.hoisted(() => ({ providers: [] as unknown[] }));
vi.mock("y-websocket", () => ({
  WebsocketProvider: class {
    synced = true;
    wsUnsuccessfulReconnects = 0;
    awareness: Awareness;
    handlers = new Map<string, (arg: never) => void>();
    constructor(_url: string, _name: string, doc: import("yjs").Doc) {
      this.awareness = new Awareness(doc);
      fake.providers.push(this);
    }
    on(name: string, fn: (arg: never) => void) {
      this.handlers.set(name, fn);
    }
    off(name: string) {
      this.handlers.delete(name);
    }
    emit(name: string, arg: unknown) {
      this.handlers.get(name)?.(arg as never);
    }
    destroy() {}
  },
}));
vi.mock("y-indexeddb", () => ({
  IndexeddbPersistence: class {
    on() {}
    off() {}
    destroy() {
      return Promise.resolve();
    }
  },
}));

const { PraxisRoomProvider, usePraxisRoom } = await import("../praxisRoom");
const { BodyTextarea } = await import("../archetypes/controls");

type Seen = { current: ReturnType<typeof usePraxisRoom> };

function Probe({ seen }: { seen: Seen }) {
  seen.current = usePraxisRoom();
  return <BodyTextarea {...anEditPraxisState()} skin={{ textareaStyle: {} }} />;
}

function mount(onEnded: () => Promise<"live" | "removed">) {
  const seen: Seen = { current: null };
  const tree = (praxisId: number | null) => (
    <PraxisRoomProvider praxisId={praxisId} roomGeneration={0} onEnded={onEnded}>
      <Probe seen={seen} />
    </PraxisRoomProvider>
  );
  const view = render(tree(7));
  const provider = fake.providers.at(-1) as { emit(n: string, a: unknown): void };
  return { seen, view, provider, tree };
}

afterEach(() => {
  cleanup();
  fake.providers.length = 0;
});

describe("the praxis room on a 1008 close", () => {
  it("ends the room, resolves the reason, and makes the body non-editable", async () => {
    const { seen, view, provider } = mount(async () => "removed");
    const editable = () =>
      view.container.querySelector(".cm-content")?.getAttribute("contenteditable");
    expect(seen.current?.ended).toBe(false);
    expect(editable()).toBe("true");

    await act(async () => provider.emit("closed", { code: 1008 }));

    expect(seen.current?.ended).toBe(true);
    expect(seen.current?.endReason).toBe("removed");
    expect(editable()).toBe("false");
  });

  it("drops a reason that resolves after the room is torn down (cancelled guard)", async () => {
    let resolve!: (r: "live") => void;
    const { seen, view, provider, tree } = mount(() => new Promise((r) => (resolve = r)));
    await act(async () => provider.emit("closed", { code: 1008 }));
    expect(seen.current?.ended).toBe(true);
    view.rerender(tree(null));
    await act(async () => resolve("live"));
    expect(seen.current).toBeNull();
    view.rerender(tree(8));
    expect(seen.current?.endReason).toBeNull();
  });

  it("does not end the room on an ordinary drop", async () => {
    const { seen, provider } = mount(async () => "live");
    await act(async () => provider.emit("closed", { code: 1006 }));
    expect(seen.current?.ended).toBe(false);
    expect(seen.current?.unreachable).toBe(true);
  });
});
