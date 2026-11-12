/**
 * #2578 — the praxis card printed raw markdown source. `PraxisExcerpt` is the
 * only card-side body render. Owner ruling: flatten to inline text (blocks or a
 * nested `<a>` inside a link card are invalid), and reuse remark rather than a
 * hand-rolled stripper, so malformed emphasis reads as on the detail page.
 * The reported string is a verbatim case.
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
    // A flattener that ate the content would pass the above.
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
