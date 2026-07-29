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

const CARD = <span>card-body</span>;

const DESIGNED_FACTIONS = [
  "everymen",
  "ephemerists",
  "coven",
  "snide",
  "singularity",
  "ua",
];

/** The widened chassis contract (#1194): every frame draws these four. */
function frameFor(slug: string | null, tag: string | null = null): string {
  return renderToStaticMarkup(
    <FactionFeedFrame
      slug={slug}
      kicker="Task completed"
      time="2h ago"
      tag={tag}
      archive={<button type="button">archive-node</button>}
    >
      {CARD}
    </FactionFeedFrame>,
  );
}

describe("FactionFeedFrame dispatch", () => {
  it("gives all six designed factions a bespoke frame", () => {
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

  it("frames an albescent row exactly like an unaffiliated one (#783)", () => {
    // The inverse of what this file used to assert. Albescent had its own
    // Record frame (#232); it now takes the same default chrome as any
    // unthemed slug, because a member reading the feed must be
    // indistinguishable from an unaffiliated player.
    expect(frameFor("albescent")).toBe(frameFor("no-such-faction"));
  });

  it("gives a null/neutral slug the Unaffiliated chassis, NOT a passthrough (#1194)", () => {
    // The reverse of what this used to assert, deliberately. A null slug used to
    // pass straight through because the only card carrying one was
    // era_announcement, which brings its own chrome — and that card no longer
    // routes through here at all (epic #1192 decision 6). A passthrough now would
    // mean a card with no kicker, no time and no way to be dismissed.
    const html = frameFor(null);
    expect(html).not.toBe("<span>card-body</span>");
    expect(html).toContain("<span>card-body</span>");
    expect(html).toContain("card-bg");
  });

  it("tints an unregistered slug with the default frame, keeping the card", () => {
    // No faction claims this slug, so it falls through to DefaultFeedFrame,
    // which owns the generic card-bg tint.
    const html = frameFor("no-such-faction");
    expect(html).not.toBe("<span>card-body</span>");
    expect(html).toContain("<span>card-body</span>");
    expect(html).toContain("card-bg");
  });

  it("draws all four chrome slots on EVERY frame, default included (#1194)", () => {
    // A frame that swallows one of these loses a feature, not a decoration: the
    // kicker is the card's only kind label, the time is its only timestamp (the
    // row stopped drawing one), and the archive node is the entire keyboard and
    // screen-reader route to the archive.
    for (const slug of [...DESIGNED_FACTIONS, "wow", "albescent", null]) {
      const html = frameFor(slug, "Still waiting");
      expect(html, `${slug} draws the kicker`).toContain("Task completed");
      expect(html, `${slug} draws the time`).toContain("2h ago");
      expect(html, `${slug} draws the tag`).toContain("Still waiting");
      expect(html, `${slug} places the archive node`).toContain("archive-node");
    }
  });
});
