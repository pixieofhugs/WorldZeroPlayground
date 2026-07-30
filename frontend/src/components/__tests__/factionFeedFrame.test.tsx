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

  it("frames an albescent row as the unaffiliated card PLUS light (#1203)", () => {
    // THE SECOND REVERSAL OF THIS ASSERTION, and each one narrowed it rather
    // than flipping a verdict. It first demanded Albescent's own Record frame
    // (#232). #783 demanded byte equality with an unthemed slug, because a
    // member reading the feed must be indistinguishable from an unaffiliated
    // player. ADR-0048 then made "frozen" mean "frozen UNTIL DESIGNED", and
    // #1203 is that design: still the unaffiliated card, still not one colour of
    // its own, with two ornament layers washed over it.
    //
    // Containment is the whole statement, and it is stronger than the equality
    // it replaces: the unaffiliated chassis appears INSIDE the Albescent one,
    // untouched and contiguous, so strip the wrapper and the two spans and the
    // card is Default byte for byte. A skin that hand-copied the chrome — the
    // failure this file exists to catch — would drift out of this the first time
    // the shared chassis changed, without anyone editing this test.
    const neutral = frameFor("no-such-faction");
    const albescent = frameFor("albescent");

    expect(albescent).toContain(neutral);
    expect(albescent).not.toBe(neutral);
    // Both flourishes present, and both inert: they are decoration over a card
    // full of links and controls, so they are hidden from assistive tech here
    // and `pointer-events: none` in index.css.
    expect(albescent).toContain('aria-hidden="true" class="alb-feed-aurora"');
    expect(albescent).toContain('aria-hidden="true" class="alb-feed-edge"');
  });

  it("tints albescent from na's token family, never one of its own (#783)", () => {
    // The half of #783 that survives #1203 intact. `CSS_KEY` maps the slug to
    // `default`, so the chassis paints --faction-default-*. Asserted against
    // `na`'s OWN render rather than against a token name, so the two move
    // together forever — the same discipline
    // utils/__tests__/factionAlbescentHidesInPlainSight.test.ts applies to every
    // other surface, and the reason a --faction-albescent-* block cannot creep
    // back in through this one.
    expect(frameFor("albescent")).toContain(frameFor(null));
    expect(frameFor("albescent")).not.toContain("--faction-albescent");
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
