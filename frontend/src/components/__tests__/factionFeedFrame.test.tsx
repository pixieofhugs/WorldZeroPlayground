/**
 * Feed-frame dispatch guard (per-faction surface #12).
 *
 * The activity feed is neutral; each card themes to its faction via a frame.
 * This guards the wiring seam: an unregistered/neutral slug must pass the card
 * through untouched (no content swallowed), and a faction that declares a frame
 * in its manifest must actually wrap the card.
 *
 * Rewritten for #782 to assert RENDERED OUTPUT rather than the shape of a
 * module-level map. The previous version deleted keys out of the live registry
 * and assigned a fake frame into it to simulate a design drop-in; with
 * faction-owned manifests neither hack is needed — an unregistered slug is just
 * a slug no faction claims, and "a new registration is picked up with no
 * dispatcher edit" is covered end to end by the add-a-faction golden test.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import FactionFeedFrame from "../feed/FactionFeedFrame";
import AlbescentFeedFrame from "../feed/AlbescentFeedFrame";

const CARD = <span>card-body</span>;

const DESIGNED_FACTIONS = [
  "everymen",
  "ephemerists",
  "wow",
  "snide",
  "singularity",
  "ua",
  "albescent",
];

function frameFor(slug: string | null): string {
  return renderToStaticMarkup(
    <FactionFeedFrame slug={slug}>{CARD}</FactionFeedFrame>,
  );
}

describe("FactionFeedFrame dispatch", () => {
  it("gives all seven designed factions a bespoke frame", () => {
    // Every designed faction must render something OTHER than the neutral
    // default tint, and must keep the card body intact inside its chrome.
    const neutral = frameFor("no-such-faction");
    for (const slug of DESIGNED_FACTIONS) {
      const html = frameFor(slug);
      expect(html, `${slug} keeps the card body`).toContain(
        "<span>card-body</span>",
      );
      expect(html, `${slug} renders its own frame, not the default`).not.toBe(
        neutral,
      );
    }
  });

  it("wraps the card in the Albescent Record frame without swallowing it (#232)", () => {
    const html = renderToStaticMarkup(
      <AlbescentFeedFrame>{CARD}</AlbescentFeedFrame>,
    );
    expect(html).not.toBe("<span>card-body</span>");
    expect(html).toContain("<span>card-body</span>");
  });

  it("passes a null/neutral slug straight through", () => {
    // era_announcement and friends bring their own chrome — a null slug must be
    // a true passthrough, adding no wrapper at all.
    expect(frameFor(null)).toBe("<span>card-body</span>");
  });

  it("tints an unregistered slug with the default frame, keeping the card", () => {
    // No faction claims this slug, so it falls through to DefaultFeedFrame,
    // which owns the generic card-bg tint.
    const html = frameFor("no-such-faction");
    expect(html).not.toBe("<span>card-body</span>");
    expect(html).toContain("<span>card-body</span>");
    expect(html).toContain("card-bg");
  });
});
