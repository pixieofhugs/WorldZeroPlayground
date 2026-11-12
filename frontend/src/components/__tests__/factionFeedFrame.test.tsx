/**
 * Feed-frame dispatch: a registered frame wraps the card, an unknown or neutral
 * slug gets the default chassis, and no frame swallows content.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import FactionFeedFrame from "../feed/FactionFeedFrame";
import DefaultFeedFrame from "../feed/DefaultFeedFrame";

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
 * Albescent's card minus the wrapper and its ornament span must be
 * `DefaultFeedFrame` byte for byte (ADR-0048). Deliberately literal, so anything
 * else creeping into `AlbescentFeedFrame` fails the comparison.
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
    // ADR-0048: the unaffiliated card plus light. A skin that hand-copied the
    // chrome would drift out of this when the shared chassis changed. The spans
    // sit inside the card (#1942), hence the peel rather than `toContain`.
    const neutral = frameFor("no-such-faction");
    const albescent = frameFor("albescent");

    expect(peelTheLight(albescent)).toBe(neutral);
    expect(albescent).not.toBe(neutral);
    // Decoration over links: aria-hidden here, `pointer-events: none` in index.css.
    expect(albescent).toContain('aria-hidden="true" class="alb-feed-edge"');
    expect(albescent).toContain('class="alb-feed alb-prism"');
  });

  it("tints albescent from na's token family, never one of its own (#783)", () => {
    // `CSS_KEY` maps albescent to `default`; compared against na's own render so
    // the two move together (cf. factionAlbescentHidesInPlainSight.test.ts).
    expect(peelTheLight(frameFor("albescent"))).toBe(frameFor(null));
    expect(frameFor("albescent")).not.toContain("--faction-albescent");
  });

  it("gives a null/neutral slug the Unaffiliated chassis, NOT a passthrough (#1194)", () => {
    // A passthrough would leave a card with no kicker, time or archive.
    const html = frameFor(null);
    expect(html).not.toBe("<span>card-body</span>");
    expect(html).toContain("<span>card-body</span>");
    expect(html).toContain("card-bg");
  });

  it("tints an unregistered slug with the default frame, keeping the card", () => {
    const html = frameFor("no-such-faction");
    expect(html).not.toBe("<span>card-body</span>");
    expect(html).toContain("<span>card-body</span>");
    expect(html).toContain("card-bg");
  });

  // #1148: a border is a scalar and cannot hold the na spectrum; a fill can.
  it("draws the chassis edge as a filled rule, never a border", () => {
    const html = frameFor(null);
    expect(html, "no border on the edge").not.toContain("border-left");
    expect(html, "no accent ink on the edge").not.toContain("card-accent");
    expect(html, "the vertical spectrum instead").toContain(
      "--faction-default-rainbow-vertical",
    );
  });

  it("gives the edge the VERTICAL cut, and hides it from assistive tech", () => {
    // A 90deg ramp across 4px is mud. Pure ornament, so hidden and inert.
    const html = frameFor(null);
    expect(html).not.toContain("var(--faction-default-rainbow)");
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("pointer-events:none");
  });

  it("gives albescent the same spectrum edge na gets, not an ink one (#1203)", () => {
    // albescent ≡ na + drift (ADR-0048), by construction.
    expect(frameFor("albescent")).toContain("--faction-default-rainbow-vertical");
    expect(frameFor("albescent")).not.toContain("card-accent");
  });

  it("gives a themed faction a flat hue here, never the spectrum", () => {
    // Rendered directly: no themed faction reaches this chassis via dispatch.
    // Pins that a faction with its own hue never falls back to a gradient.
    const html = renderToStaticMarkup(
      <DefaultFeedFrame slug="coven" kicker="Task completed" time="2h ago" tag={null} archive={null}>
        {CARD}
      </DefaultFeedFrame>,
    );
    expect(html).toContain("background:var(--faction-coven)");
    expect(html).not.toContain("--faction-default-rainbow-vertical");
  });

  it("draws all four chrome slots on EVERY frame, default included (#1194)", () => {
    // Each is the card's only one (kind label, timestamp, keyboard archive route).
    for (const slug of [...DESIGNED_FACTIONS, "wow", "albescent", null]) {
      const html = frameFor(slug, "Still waiting");
      expect(html, `${slug} draws the kicker`).toContain("Task completed");
      expect(html, `${slug} draws the time`).toContain("2h ago");
      expect(html, `${slug} draws the tag`).toContain("Still waiting");
      expect(html, `${slug} places the archive node`).toContain("archive-node");
    }
  });
});
