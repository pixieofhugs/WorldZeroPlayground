/**
 * #2453 — a background layer that paints clear of the text is not its ground.
 *
 * THE SEAM is `scanPageForContrast` itself, run here against a stand-in DOM.
 * Until now nothing executed the scanner before the nightly browser did, which
 * is why its one geometric blind spot survived: it read ANY `background-image`
 * as covering the whole box. The nav wordmark draws its rainbow rule as a
 * single layer sized to the bottom 2px of the span (#3100), under the glyphs
 * rather than behind them, and the sweep measured the ink against the rule's
 * worst stop — 3.17:1 in light, 1.41:1 in dark, on all nine kits.
 *
 * The stand-in is a handful of plain objects, not jsdom: jsdom does no layout,
 * and layout (two boxes that do or do not overlap) is the whole question. Each
 * element is handed the rect and the computed style a browser would report.
 *
 * The cases after the first are the ones that matter most: a gradient the
 * text really does sit on must still be handed to the node side as a fill.
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

/**
 * The nav wordmark's span as NavBar.tsx styles it: 18px of line, 2px of bottom
 * padding that the rule is drawn in, and a 2px transparent bottom border.
 */
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
    // Ruled out, and SAID so — a layer dropped silently is a sweep that checks less.
    expect(finding.clearedLayers).toEqual([RAINBOW]);
  });

  it("rules out a band on an ancestor that the text sits clear of", () => {
    // A card with a 4px accent stripe across its top; the copy starts 20px down.
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
});
