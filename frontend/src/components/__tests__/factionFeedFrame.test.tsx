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
import FactionFeedFrame, { DefaultFeedFrame } from "../feed/FactionFeedFrame";

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

/**
 * Albescent's card with the light taken off — the wrapper and its one ornament
 * span, and nothing else. What is left must be `DefaultFeedFrame` byte for
 * byte; that is ADR-0048's whole claim for this faction, and the two assertions
 * below are the only place it is checked on this surface.
 *
 * Deliberately literal. It removes exactly the strings the wrapper adds, so a
 * further thing creeping into `AlbescentFeedFrame` — a class, a div, a data
 * attribute — survives the peel and fails the comparison, which is the point.
 *
 * #2499 CHANGED WHAT "THE LIGHT" IS AND THE PEEL STILL WORKS, which is the best
 * evidence this shape was the right one. The wash was a second span; it is now
 * `alb-prism` in the wrapper's class list, setting the na card's own sheet token.
 * One string leaves the peel and one gains a word, and the claim — strip
 * Albescent and this IS the unaffiliated card — is untouched.
 */
const peelTheLight = (html: string) =>
  html
    .replace('<div class="alb-feed alb-prism">', "")
    .replace(
      /<span aria-hidden="true" class="alb-feed-edge"><\/span>/,
      "",
    )
    .replace(/<\/div>$/, "");

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
    // "Strip the wrapper and the two spans and the card is Default byte for
    // byte" is the whole statement, and it is stronger than the equality it
    // replaces. A skin that hand-copied the chrome — the failure this file
    // exists to catch — would drift out of this the first time the shared
    // chassis changed, without anyone editing this test.
    //
    // It USED to be spelled `toContain`, because the two spans were siblings of
    // the card and the neutral chassis was therefore a contiguous substring.
    // #1942 moved them INSIDE it — `.sidebar-card`'s `backdrop-filter` makes it
    // a stacking context, so a wash mounted outside could not be lifted off the
    // actor's photograph within — and a substring can no longer say this.
    // Peeling the light off and comparing what is LEFT says the same property
    // and does not care where the spans hang.
    const neutral = frameFor("no-such-faction");
    const albescent = frameFor("albescent");

    expect(peelTheLight(albescent)).toBe(neutral);
    expect(albescent).not.toBe(neutral);
    // The ring is present and inert: it is decoration over a card full of links
    // and controls, so it is hidden from assistive tech here and
    // `pointer-events: none` in index.css. The ground needs neither, being a
    // background layer rather than an element.
    expect(albescent).toContain('aria-hidden="true" class="alb-feed-edge"');
    expect(albescent).toContain('class="alb-feed alb-prism"');
  });

  it("tints albescent from na's token family, never one of its own (#783)", () => {
    // The half of #783 that survives #1203 intact. `CSS_KEY` maps the slug to
    // `default`, so the chassis paints --faction-default-*. Asserted against
    // `na`'s OWN render rather than against a token name, so the two move
    // together forever — the same discipline
    // utils/__tests__/factionAlbescentHidesInPlainSight.test.ts applies to every
    // other surface, and the reason a --faction-albescent-* block cannot creep
    // back in through this one.
    expect(peelTheLight(frameFor("albescent"))).toBe(frameFor(null));
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

  // #1148, and #983 one level down: the chassis's 4px left edge was
  // `borderLeft: 4px solid card-accent`. A border is a scalar, so the edge could
  // only ever hold that ink — near-black on the na card's cream sheet. Drawn as
  // an element it is a fill, and ADR-0039 gives it the spectrum unamended.
  it("draws the chassis edge as a filled rule, never a border", () => {
    const html = frameFor(null);
    expect(html, "no border on the edge").not.toContain("border-left");
    expect(html, "no accent ink on the edge").not.toContain("card-accent");
    expect(html, "the vertical spectrum instead").toContain(
      "--faction-default-rainbow-vertical",
    );
  });

  it("gives the edge the VERTICAL cut, and hides it from assistive tech", () => {
    // The cut is the whole reason `rule` exists next to `bar`: the 90deg ramp
    // spends seven stops across the rule's 4px and reads as mud. And the rule is
    // pure ornament sitting over a card full of links, so it is `aria-hidden`
    // and `pointer-events: none` like every other ornament layer in this seam.
    const html = frameFor(null);
    expect(html).not.toContain("var(--faction-default-rainbow)");
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("pointer-events:none");
  });

  it("gives albescent the same spectrum edge na gets, not an ink one (#1203)", () => {
    // The blast radius the issue named as na-only is na AND Albescent: #1203
    // added the ninth `feedFrame` claim, and it renders THIS chassis with
    // `slug="albescent"`, which `CSS_KEY` maps to `default`. `albescent ≡ na +
    // drift` (ADR-0048), so repainting one repaints the other by construction —
    // that is the property, not a side effect.
    expect(frameFor("albescent")).toContain("--faction-default-rainbow-vertical");
    expect(frameFor("albescent")).not.toContain("card-accent");
  });

  it("gives a themed faction a flat hue here, never the spectrum", () => {
    // Rendered DIRECTLY, because no themed faction reaches this chassis through
    // dispatch — all eight registered frames claim `feedFrame`, which is what
    // makes the repaint na-and-Albescent-only. Pinned anyway, and pinned
    // honestly: this is not byte-identical to what the border drew. A real
    // faction's `factionFill` is its SPINE hue `var(--faction-{key})`, where the
    // scalar path read its `card-accent` ink — the same substitution every other
    // border-to-fill conversion makes, and invisible today because nothing routes
    // here. What matters is that no faction with a hue of its own picks up a
    // gradient by falling back.
    const html = renderToStaticMarkup(
      <DefaultFeedFrame slug="coven" kicker="Task completed" time="2h ago" tag={null} archive={null}>
        {CARD}
      </DefaultFeedFrame>,
    );
    expect(html).toContain("background:var(--faction-coven)");
    expect(html).not.toContain("--faction-default-rainbow-vertical");
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
