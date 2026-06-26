/**
 * Feed-frame dispatch guard (per-faction surface #12).
 *
 * The activity feed is neutral; each card themes to its faction via a frame.
 * This guards the wiring seam so a future design-file drop-in works: an
 * unregistered/neutral slug must pass the card through untouched (no content
 * swallowed), and a registered faction frame must actually wrap the card.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect, afterEach } from "vitest";
import FactionFeedFrame, {
  FACTION_FEED_FRAMES,
} from "../feed/FactionFeedFrame";

const CARD = <span>card-body</span>;

// Snapshot the real registrations at module load — the manual drop-in test's
// afterEach mutates the live map, so capture before anything clears it.
const REGISTERED_AT_LOAD = new Set(Object.keys(FACTION_FEED_FRAMES));

afterEach(() => {
  // Frames are registered into a module-level map; keep tests isolated.
  for (const key of Object.keys(FACTION_FEED_FRAMES)) {
    delete FACTION_FEED_FRAMES[key];
  }
});

describe("FactionFeedFrame dispatch", () => {
  it("registers the five designed faction frames (ua undesigned)", () => {
    for (const slug of ["everymen", "ephemerists", "wow", "snide", "singularity"]) {
      expect(REGISTERED_AT_LOAD.has(slug), `${slug} frame registered`).toBe(true);
    }
    // UA feed is undesigned — it must fall through to the neutral default.
    expect(REGISTERED_AT_LOAD.has("ua"), "ua feed undesigned").toBe(false);
  });

  it("passes the card through unchanged for a neutral (slug-less) card", () => {
    // Neutral cards (era_announcement etc.) bring their own chrome — the default
    // frame must add nothing.
    for (const slug of [null, undefined, ""]) {
      const html = renderToStaticMarkup(
        <FactionFeedFrame slug={slug}>{CARD}</FactionFeedFrame>,
      );
      expect(html).toBe("<span>card-body</span>");
    }
  });

  it("tints (does not swallow) a non-null unregistered faction card", () => {
    // The default frame owns the faction tint lifted off the cards: ua/aged_out
    // have no bespoke frame, so they get the neutral tinted chrome here — but the
    // card body must still render inside it.
    for (const key of Object.keys(FACTION_FEED_FRAMES)) delete FACTION_FEED_FRAMES[key];
    const html = renderToStaticMarkup(
      <FactionFeedFrame slug="ua">{CARD}</FactionFeedFrame>,
    );
    expect(html).not.toBe("<span>card-body</span>");
    expect(html).toContain("<span>card-body</span>");
    expect(html).toContain("card-bg");
  });

  it("wraps the card in a registered faction frame (design drop-in)", () => {
    FACTION_FEED_FRAMES.everymen = ({ children }) => (
      <div className="everymen-feed-frame">{children}</div>
    );
    const html = renderToStaticMarkup(
      <FactionFeedFrame slug="everymen">{CARD}</FactionFeedFrame>,
    );
    expect(html).toBe(
      '<div class="everymen-feed-frame"><span>card-body</span></div>',
    );
  });
});
