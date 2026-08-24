/**
 * #2578 — the praxis card printed the raw markdown SOURCE of a body.
 *
 * Reported from an Everymen card, which showed
 * `## ****I be this is invalid**** **Let's GO** *Le…` — syntax and all. Every
 * praxis DETAIL page already renders the same text through `MarkdownPreview`
 * (react-markdown + remark-gfm), so one body read two different ways depending
 * on which surface you were standing on.
 *
 * SEAM: `PraxisExcerpt` itself. It is the only card-side render of a praxis
 * body — `praxisCard/shared.tsx` and `praxisCard/desktop/shared.tsx` are its
 * two consumers and nothing else mounts it — so all nine cards inherit whatever
 * it does, and a fix here is a fix everywhere.
 *
 * THE RULING (owner, 2026-08-23) HAS TWO HALVES, and both are asserted below.
 *
 *  1. **Rendering it AS markdown is not the fix.** A `##` would become a
 *     heading and a list a `<ul>`, inside a two-line clamp, inside a card that
 *     is itself a link — and a nested `<a>` is invalid HTML, not merely untidy.
 *     So the parser's output is flattened to inline text.
 *
 *  2. **Reuse the real parser; do NOT hand-roll a stripper.** A regex that
 *     removes syntax is a second markdown implementation, and it would disagree
 *     with remark on exactly the input that produced this report:
 *     `****I be this is invalid****` is malformed, and two parsers resolve
 *     malformed emphasis differently. Reusing remark makes the card's reading of
 *     a body identical to the detail page's BY CONSTRUCTION rather than by
 *     maintenance — which is the property worth having, and the one a
 *     hand-rolled stripper cannot offer at any level of care.
 *
 * The reported string is used verbatim as a case, so the specific input that
 * embarrassed the card is the one that can never regress.
 */
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";
import "../../../i18n";
import type { PraxisCardOut } from "../../../api/praxis";
import { PraxisExcerpt } from "../shared";
import { aPraxisCard } from "../../../test/fixtures";

function excerpt(body: string): { html: string; text: string } {
  const praxis: PraxisCardOut = { ...aPraxisCard(), body_text: body };
  const element: ReactElement = <PraxisExcerpt praxis={praxis} />;
  const html = renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>);
  return { html, text: decode(html.replace(/<[^>]*>/g, "")) };
}

/** `renderToStaticMarkup` escapes `& < > " '`; undo it so `text` is what the card SAYS. */
function decode(value: string): string {
  return value
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

describe("praxis card excerpt — markdown resolves to its text (#2578)", () => {
  it("prints the reported body as words, not as source", () => {
    // Verbatim from the report.
    const { text } = excerpt("## ****I be this is invalid**** **Let's GO** *Level up*");
    expect(text, "no heading marker").not.toContain("#");
    expect(text, "no emphasis markers").not.toContain("*");
    expect(text, "the words survive").toContain("I be this is invalid");
    expect(text, "and the rest of them").toContain("Let's GO");
    expect(text, "and the rest of them").toContain("Level up");
  });

  it("draws no block structure inside the clamp", () => {
    const { html } = excerpt(
      "# Heading\n\n- first item\n- second item\n\n> quoted\n\n```\ncode\n```",
    );
    for (const tag of ["<h1", "<h2", "<ul", "<ol", "<li", "<blockquote", "<pre", "<hr"]) {
      expect(html, `${tag} must not reach the card`).not.toContain(tag);
    }
    // The words themselves still have to be there — a flattener that ate the
    // content would pass every assertion above.
    expect(decode(html.replace(/<[^>]*>/g, "")), "list items survive").toContain("first item");
  });

  it("draws no nested anchor, because the card is itself a link", () => {
    const { html, text } = excerpt("see [the write-up](https://example.com/x) for more");
    expect(html, "no nested <a>").not.toContain("<a ");
    expect(html, "no href at all").not.toContain("href");
    expect(text, "the link's words stay").toContain("the write-up");
    expect(text, "and the URL does not").not.toContain("example.com");
  });

  it("drops an image to its alt text rather than fetching it", () => {
    const { html, text } = excerpt("before ![a pressed flower](https://example.com/p.png) after");
    expect(html, "no <img> on a card").not.toContain("<img");
    expect(text, "the alt is the text").toContain("a pressed flower");
    expect(text, "the surrounding words survive").toContain("before");
    expect(text, "the surrounding words survive").toContain("after");
  });

  it("keeps blocks from running into one word", () => {
    // `## Title` immediately followed by a paragraph must not read "TitleBody".
    const { text } = excerpt("## Title\n\nBody follows");
    expect(text).not.toContain("TitleBody");
    expect(text).toContain("Title");
    expect(text).toContain("Body follows");
  });

  it("still renders nothing at all for an empty body", () => {
    const praxis: PraxisCardOut = { ...aPraxisCard(), body_text: "" };
    expect(renderToStaticMarkup(<PraxisExcerpt praxis={praxis} />)).toBe("");
  });

  it("keeps the two-line clamp it always had", () => {
    const { html } = excerpt("plain words with no syntax in them");
    expect(html, "the clamp is the point of the slot").toContain("-webkit-line-clamp:2");
    expect(html, "still one paragraph box").toContain("<p");
  });
});
