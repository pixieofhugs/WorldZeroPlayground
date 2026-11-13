/**
 * #2453: a background layer that paints clear of the text is not its ground
 * (e.g. the nav wordmark's 2px rainbow rule). Runs `scanPageForContrast` on
 * plain-object stubs, not jsdom, which does no layout. A gradient the text does
 * sit on must still be reported as a fill.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import { scanPageForContrast } from "../contrastScan";

/** `--faction-default-total-rainbow` as Chromium computes it in the light theme. */
const RAINBOW =
  "linear-gradient(90deg, rgb(193, 39, 45), rgb(202, 138, 4) 40%, rgb(22, 163, 74) 60%, rgb(37, 99, 235))";
const INK = "rgb(26, 18, 9)";
const NAV_GROUND = "rgb(255, 253, 249)";

type Box = { left: number; top: number; width: number; height: number };
type Stub = { parentElement: Stub | null; style: Record<string, string> };

function element(box: Box, style: Record<string, string>, parent: Stub | null, text = ""): Stub {
  return {
    tagName: "SPAN",
    className: "",
    parentElement: parent,
    childNodes: text ? [{ nodeType: 3, textContent: text }] : [],
    getAttribute: () => null,
    matches: () => false,
    getBoundingClientRect: () => ({
      ...box,
      right: box.left + box.width,
      bottom: box.top + box.height,
    }),
    style: {
      color: INK,
      opacity: "1",
      visibility: "visible",
      display: "block",
      // eslint-disable-next-line local/no-raw-style-values -- a browser's COMPUTED value handed to the scanner, not an authored style: getComputedStyle only ever answers in px.
      fontSize: "18px",
      fontWeight: "400",
      backgroundColor: "rgba(0, 0, 0, 0)",
      backgroundImage: "none",
      backgroundSize: "auto",
      backgroundPosition: "0% 0%",
      backgroundRepeat: "repeat",
      backgroundOrigin: "padding-box",
      backgroundAttachment: "scroll",
      overflowX: "visible",
      overflowY: "visible",
      transform: "none",
      ...Object.fromEntries(
        ["Top", "Right", "Bottom", "Left"].flatMap((side) => [
          [`padding${side}`, "0px"],
          [`border${side}Width`, "0px"],
        ]),
      ),
      ...style,
    },
  } as Stub;
}

function scan(...elements: Stub[]) {
  vi.stubGlobal("Node", { TEXT_NODE: 3 });
  vi.stubGlobal("document", { body: { querySelectorAll: () => elements } });
  vi.stubGlobal("window", { getComputedStyle: (node: Stub) => node.style });
  return scanPageForContrast();
}

afterEach(() => vi.unstubAllGlobals());

const nav = () => element({ left: 0, top: 0, width: 1280, height: 56 }, { backgroundColor: NAV_GROUND }, null);

/** The nav wordmark span as NavBar.tsx styles it. */
const wordmark = (parent: Stub, style: Record<string, string> = {}) =>
  element(
    { left: 24, top: 17, width: 90, height: 22 },
    {
      // eslint-disable-next-line local/no-raw-style-values -- computed value, as above: NavBar.tsx's `paddingBottom: 2` as the browser reports it.
      paddingBottom: "2px",
      borderBottomWidth: "2px",
      backgroundImage: RAINBOW,
      backgroundSize: "100% 2px",
      backgroundPosition: "50% 100%",
      backgroundRepeat: "no-repeat",
      ...style,
    },
    parent,
    "World Zero",
  );

describe("a background layer is the text's ground only where it paints behind the text (#2453)", () => {
  it("measures the nav wordmark against the bar, not against the rule drawn under it", () => {
    const bar = nav();
    const [finding] = scan(wordmark(bar));

    expect(finding.background).toBe(NAV_GROUND);
    expect(finding.ratio).toBeGreaterThan(finding.required);
    // Reported, not silently dropped.
    expect(finding.clearedLayers).toEqual([RAINBOW]);
  });

  it("still rules out the rule when the bar above the wordmark is sticky (the live nav)", () => {
    // Sticky on the shared ancestor keeps relative geometry (#3297).
    const bar = nav();
    bar.style.position = "sticky";
    const [finding] = scan(wordmark(bar));

    expect(finding.background).toBe(NAV_GROUND);
    expect(finding.clearedLayers).toEqual([RAINBOW]);
  });

  it("rules out a band on an ancestor that the text sits clear of", () => {
    const card = element(
      { left: 0, top: 0, width: 300, height: 120 },
      {
        backgroundColor: NAV_GROUND,
        backgroundImage: RAINBOW,
        backgroundSize: "100% 4px",
        backgroundPosition: "0% 0%",
        backgroundRepeat: "no-repeat",
      },
      null,
    );
    const copy = element({ left: 16, top: 20, width: 200, height: 18 }, {}, card, "Body copy");
    const [finding] = scan(copy);

    expect(finding.background).toBe(NAV_GROUND);
    expect(finding.clearedLayers).toEqual([RAINBOW]);
  });

  it.each([
    ["covers the whole box", { backgroundSize: "auto", backgroundPosition: "0% 0%", backgroundRepeat: "repeat" }],
    ["is a band tall enough to reach the glyphs", { backgroundSize: "100% 8px" }],
    ["is a band that tiles", { backgroundRepeat: "repeat" }],
    ["is a band placed behind the glyphs", { backgroundPosition: "50% 50%" }],
    ["is sized by a keyword the scan cannot place", { backgroundSize: "cover" }],
    ["is anchored to the viewport", { backgroundAttachment: "fixed" }],
  ])("still reports a gradient that %s as a fill under the text", (_name, style) => {
    const [finding] = scan(wordmark(nav(), style));

    expect(finding.background).toBeNull();
    expect(finding.unresolvedKind).toBe("opaque-gradient");
    expect(finding.backdropCss).toBe(RAINBOW);
    expect(finding.clearedLayers).toEqual([]);
  });

  /** Where geometry can't be trusted, don't clear: a wrong clear is a silent pass. */
  const stillAFill = (finding: ReturnType<typeof scan>[number]) => {
    expect(finding.background).toBeNull();
    expect(finding.backdropCss).toBe(RAINBOW);
    expect(finding.clearedLayers).toEqual([]);
  };

  /** A card with a 4px top stripe; copy 20px down. */
  const striped = (style: Record<string, string> = {}) =>
    element(
      { left: 0, top: 0, width: 300, height: 120 },
      {
        backgroundColor: NAV_GROUND,
        backgroundImage: RAINBOW,
        backgroundSize: "100% 4px",
        backgroundPosition: "0% 0%",
        backgroundRepeat: "no-repeat",
        ...style,
      },
      null,
    );
  const copyIn = (parent: Stub) => element({ left: 16, top: 20, width: 200, height: 18 }, {}, parent, "Body copy");

  it.each([
    // The band stays put while the text scrolls onto it.
    ["scrolls its content", { overflowY: "auto" }],
    ["clips its content on the other axis", { overflowX: "hidden" }],
    // The rect is transformed; the computed px beside it are not.
    ["is transformed", { transform: "matrix(2, 0, 0, 2, 0, 0)" }],
    // Inline boxes paint per line fragment.
    ["is an inline box", { display: "inline" }],
  ])("does not rule out a band whose own element %s", (_name, style) => {
    stillAFill(scan(wordmark(nav(), style))[0]);
  });

  it("does not rule out a band when something between it and the text scrolls", () => {
    const scroller = element({ left: 0, top: 10, width: 300, height: 100 }, { overflowY: "scroll" }, striped());
    stillAFill(scan(copyIn(scroller))[0]);
  });

  it("does not rule out a band when something between it and the text is transformed", () => {
    const moved = element({ left: 0, top: 10, width: 300, height: 100 }, { transform: "matrix(1, 0, 0, 1, 0, 8)" }, striped());
    stillAFill(scan(copyIn(moved))[0]);
  });

  it("does not rule out a band when an ancestor of both is transformed", () => {
    const scaled = element({ left: 0, top: 0, width: 1280, height: 56 }, { transform: "matrix(2, 0, 0, 2, 0, 0)" }, null);
    stillAFill(scan(wordmark(scaled))[0]);
  });

  it.each(["sticky", "fixed"])("does not rule out a band when something between it and the text is %s", (position) => {
    const floating = element({ left: 0, top: 10, width: 300, height: 100 }, { position }, striped());
    stillAFill(scan(copyIn(floating))[0]);
  });

  it.each(["BODY", "HTML"])("never rules out a band on %s, whose background belongs to the canvas", (tagName) => {
    stillAFill(scan(copyIn(Object.assign(striped(), { tagName })))[0]);
  });
});
